import streamBatch from './batch';
import S3 from 'aws-sdk/clients/s3';
import { ConfigurationOptions } from 'aws-sdk/lib/config';

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
  config?: string | ConfigurationOptions;
  glob?: string;
  globOptions?: object;
  concurrency?: number;
  dryRun?: boolean;
  cacheControl?: string | { [key: string]: string };
  s3Client?: S3;
  accessControlLevel?: S3.ObjectCannedACL;
  overwrite?: boolean;
};

const defaultOptions = {
  dryRun: false,
  concurrency: 100,
  glob: '*.*',
  globOptions: {},
  overwrite: true,
};

export default class Uploader {
  private s3: S3;
  private options: Options;
  private bar: any;

  constructor(options: Options) {
    this.options = {
      ...defaultOptions,
      ...options,
    };

    if (this.options.config) {
      if (typeof this.options.config === 'string') {
        AWS.config.loadFromPath(this.options.config);
      } else if (typeof this.options.config === 'object') {
        AWS.config.constructor(this.options.config);
      } else {
        throw new Error('unsupported config is passed as a argument.');
      }
    }

    // TODO: more checks on other options?
    if (!this.options.bucket) {
      throw new Error('No bucket defined!');
    }

    this.s3 = this.options.s3Client || new AWS.S3();
  }

  /**
   * Executes the upload operation based on the provided options in the Uploader constructor.
   * @returns A list of paths of the upload files relative to the bucket.
   */
  public upload(): Promise<string[]> {
    return this.run();
  }

  private async run(): Promise<string[]> {
    const files = await this.getFiles();
    const { concurrency, localPath, remotePath } = this.options;

    // a nice progress bar to show during upload
    this.bar = new ProgressBar('[:bar] :percent | :etas | :current / :total | :rate/fps ', {
      total: files.length,
      complete: '=',
      incomplete: ' ',
      width: 20,
    });

    // do the work!
    const results = await streamBatch({
      files,
      concurrency,
      processItem: (file: string): Promise<string> => {
        const key = path.join(remotePath, file);
        return this.uploadFile(path.resolve(localPath, file), key);
      },
      onProgress: () => this.bar.tick(),
    });

    // tslint:disable-next-line no-console
    console.log('Upload complete!');

    return results;
  }

  /**
   * Based on the local path and the provided glob pattern, this util function will find all relevant
   * files, which will be used to upload in another step.
   * @returns A list of resolved files based on the glob pattern
   */
  private getFiles(): Promise<Array<string>> {
    const { localPath, glob: globPath, globOptions } = this.options;
    const gatheringSpinner = ora(`Gathering files from ${chalk.blue(localPath)} (please wait) ...`);

    gatheringSpinner.start();

    return new Promise((resolve, reject) => {
      glob(`**/${globPath}`, { ...globOptions, cwd: path.resolve(localPath) }, (err, files) => {
        if (err) {
          gatheringSpinner.fail(err);
          reject(err);
        }

        gatheringSpinner.succeed(
          `Found ${chalk.green(files.length)} files at ${chalk.blue(localPath)}, starting upload:`,
        );

        resolve(files);
      });
    });
  }

  /**
   * Uploads a single file to S3 from the local to the remote path with the available options,
   * and returns the uploaded location.
   *
   * @param localFilePath Path to the local file, either relative to cwd, or absolute
   * @param remotePath The path to upload the file to in the bucket
   * @returns The remote path upload location relative to the bucket
   */
  public async uploadFile(localFilePath: string, remotePath: string): Promise<string> {
    const { dryRun, bucket: Bucket, accessControlLevel: ACL } = this.options;
    const baseParams = {
      Bucket,
      Key: remotePath.replace(/\\/g, '/'),
    };
    if (!this.options.overwrite) {
      try {
        await this.s3.headObject(baseParams).promise();
        // tslint:disable-next-line no-console
        console.log('File exists, skipping: ', baseParams.Key);
        return baseParams.Key;
      } catch (err) {
        if (err.code !== 'NotFound') {
          // tslint:disable-next-line no-console
          console.error('err:', err);
          throw err;
        }
      }
    }
    const body = fs.createReadStream(localFilePath);
    const params: S3.PutObjectRequest = {
      ...baseParams,
      Body: body,
      ContentType: mime.getType(localFilePath),
      CacheControl: this.getCacheControlValue(localFilePath),
    };
    if (ACL) {
      params.ACL = ACL;
    }

    if (!dryRun) {
      try {
        await this.s3.upload(params).promise();
      } catch (err) {
        // tslint:disable-next-line no-console
        console.error('err:', err);
        throw err;
      }
    }
    return params.Key;
  }

  /**
   *
   * @param file Path to a local file, either relative to cwd, or absolute
   * @return The resolved CacheControl value based on the provided settings
   */
  public getCacheControlValue(file: string): string {
    const { cacheControl } = this.options;
    if (cacheControl) {
      // return single option for all files
      if (typeof cacheControl === 'string') {
        return cacheControl;
      }

      // find match in glob patterns
      const match = Object.keys(cacheControl).find(key => minimatch(file, key));
      return (match && cacheControl[match]) || '';
    }

    // return default value
    return '';
  }
}
