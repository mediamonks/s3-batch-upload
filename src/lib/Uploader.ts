import streamBatch from './batch';
import S3 from 'aws-sdk/clients/s3';

const glob = require('glob');
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

    this.s3 = new AWS.S3();
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

  private uploadFile(localFilePath:string, remotePath:string): Promise<void> {
    return new Promise((resolve) => {
      const body = fs.createReadStream(localFilePath);
      const params = {
        Bucket: this.options.bucket,
        Key: remotePath,
        Body: body,
        ContentType: mime.getType(localFilePath),
      };
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
}



