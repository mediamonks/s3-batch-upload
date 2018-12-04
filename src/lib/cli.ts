#!/usr/bin/env node

const yargs = require('yargs');
import Uploader from './Uploader';

yargs
  .usage('Usage: $0 <command> [options]')
  .command(['$0', 'upload'], 'Upload files to s3', () => {}, (argv) => {
    new Uploader(argv).upload();
  })
  .example('$0 -b bucket-name -p ./files  -r /data', 'Upload files from a local folder to a s3 bucket path')
  .example('$0 ... -a "max-age: 300"', 'Set cache-control for all files')
  .example('$0 ... -a \'{ "**/*.json": "max-age: 300", "**/*.*": "3600" }\'', 'Upload files from a local folder to a s3 bucket path')
  .example('$0 -d ...', 'Dry run upload')
  .option('d', {
    alias: 'dry-run',
    default: false,
    describe: 'Do a dry run, don\'t do any upload.',
    type: 'boolean'
  })
  .option('b', {
    alias: 'bucket',
    default: undefined,
    describe: 'The bucket to upload to.',
    type: 'string',
    nargs: 1,
  })
  .option('p', {
    alias: 'local-path',
    default: undefined,
    describe: 'The path to the folder to upload.',
    type: 'string',
    nargs: 1,
  })
  .option('r', {
    alias: 'remote-path',
    default: undefined,
    describe: 'The remote path in the bucket to upload the files to.',
    type: 'string',
    nargs: 1,
  })
  .option('C', {
    alias: 'concurrency',
    default: 100,
    describe: 'The amount of simultaneous uploads, increase on faster internet connection.',
    type: 'number',
    nargs: 1,
  })
  .option('g', {
    alias: 'glob',
    default: '*.*',
    describe: 'A glob on filename level to filter the files to upload',
    type: 'string',
    nargs: 1,
  })
  .option('a', {
    alias: 'cache-control',
    default: '',
    describe: 'Cache control for uploaded files, can be string for single value or list of glob settings',
    type: 'string',
    nargs: 1,
    coerce: (value) => {
      try {
        // try to see if it's an object
        const cc = JSON.parse(value);
        if (typeof cc === 'object') {
          return cc;
        }
      } catch (e) { }
      return value;
    }
  })
  // NOTE: For more info, see https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-json-file.html
  .option('c', {
    alias: 'config',
    default: undefined,
    describe: 'The AWS config json path to load S3 credentials with loadFromPath.',
    type: 'string',
    nargs: 1,
  })
  .demandOption(['bucket', 'local-path', 'remote-path'], 'Please provide at least the required arguments to upload.')
  .group(['bucket', 'local-path', 'remote-path'], 'Required:')
  .help('h')
  .alias('h', 'help')
  .epilogue('for more information about AWS authentication, please visit https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html')
  .version(false)
  .wrap(Math.min(120, yargs.terminalWidth()))
  .argv;
