import streamBatch from './batch';
import S3 from 'aws-sdk/clients/s3';

const glob = require('glob');
const minimatch = require('minimatch');
const path = require('path');
const AWS = require('aws-sdk');
const ProgressBar = require('progress');
const ora = require('ora');
const chalk = require('chalk');
const fs = require('fs');
const mime = require('mime');


export type Options = {
  bucket: string;
  localPath: string;
  remotePath: string;
  config?: string;
  glob?: string;
  concurrency?: number;
  dryRun?: boolean;
  cacheControl?: string | { [key: string]: string; };
  s3Client?: S3;
};

const defaultOptions = {
  dryRun: false,
  concurrency: 100,
  glob: '*.*',
};

export default class Uploader {
  private s3: S3;
  private options: Options;
  private bar: any;

  constructor(options: Options)
  {
    this.options = {
      ...defaultOptions,
      ...options,
    };

    if (this.options.config)
    {
      AWS.config.loadFromPath(this.options.config);
    }

    // TODO: more checks on other options?
    if (!this.options.bucket)
    {
      throw new Error('No bucket defined!');
    }

    this.s3 = this.options.s3Client || new AWS.S3();
  }

  public upload(): Promise<void> {
    return this.run();
  }

  private async run():Promise<void> {
    const files = await this.getFiles();

    // a nice progress bar to show during upload
    this.bar = new ProgressBar('[:bar] :percent | :etas | :current / :total | :rate/fps ', {
      total: files.length,
      complete: '=',
      incomplete: ' ',
      width: 20,
    });

    // do the work!
    await streamBatch({
      files,
      concurrency: this.options.concurrency,
      processItem: (file:string):Promise<void> => {
        const key = path.join(this.options.remotePath, file);
        return this.uploadFile(
          path.resolve(this.options.localPath, file),
          key,
        );
      },
      onProgress: () => this.bar.tick(),
    });

    // tslint:disable-next-line no-console
    console.log('Upload complete!');
  }

  private getFiles(): Promise<Array<string>> {
    const gatheringSpinner = ora(
      `Gathering files from ${chalk.blue(this.options.localPath)} (please wait) ...`,
    );
    gatheringSpinner.start();

    return new Promise((resolve, reject) => {
      glob(`**/${this.options.glob}`, { cwd: path.resolve(this.options.localPath) }, (err, files) => {
        if (err) {
          gatheringSpinner.fail(err);
          reject(err);
        }

        gatheringSpinner.succeed(
          `Found ${chalk.green(files.length)} files at ${chalk.blue(
            this.options.localPath,
          )}, starting upload:`,
        );

        resolve(files);
      });
    });
  }

  uploadFile(localFilePath:string, remotePath:string): Promise<void> {
    const body = fs.createReadStream(localFilePath);

    const params = {
      Bucket: this.options.bucket,
      Key: remotePath.replace(/\\/, '/'),
      Body: body,
      ContentType: mime.getType(localFilePath),
      CacheControl: this.getCacheControlValue(localFilePath),
    };

    return new Promise((resolve) => {
      if (!this.options.dryRun) {
        this.s3.upload(params, err => {
          // tslint:disable-next-line no-console
          if (err) console.error('err:', err);
          resolve();
        });
      } else {
        resolve();
      }
    })
  }

  getCacheControlValue(file:string ): string {
    if (this.options.cacheControl) {
      // return single option for all files
      if (typeof this.options.cacheControl === 'string') {
        return this.options.cacheControl;
      }

      // find match in glob patterns
      const match = Object.keys(this.options.cacheControl).find(key => minimatch(file, key));
      return match && this.options.cacheControl[match] || '';
    }

    // return default value
    return '';
  }
}



