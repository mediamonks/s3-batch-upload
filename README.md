# s3-batch-upload

Super fast batched S3 folder uploads from CLI or API.

## Installation

```sh
yarn add s3-batch-upload
```

```sh
npm i -S s3-batch-upload
```


## Basic Usage

### CLI

```sh
# with config
s3-batch-upload -c ./config/configS3.json -b bucket-name -p ./files -r remote/path/in/bucket

# with env vars
AWS_ACCESS_KEY_ID=AKIA...Q AWS_SECRET_ACCESS_KEY=jY...uJ s3-batch-upload -b bucket-name -p ./files -r remote/path/in/bucket -g "*.jpg -C 200 -d"
```

### API
```ts
import Uploader from 's3-batch-upload';

await new Uploader({
  config: './config/configS3.json', // can also use environment variables
  bucket: 'bucket-name',
  localPath: './files',
  remotePath: 'remote/path/in/bucket',
  glob: '*.jpg', // default is '*.*'
  concurrency: '200', // default is 100
  dryRun: true, // default is false
}).upload();
```


## Documentation

View the [generated documentation](http://mediamonks.github.io/s3-batch-upload/).


## Building

In order to build s3-batch-upload, ensure that you have [Git](http://git-scm.com/downloads)
and [Node.js](http://nodejs.org/) installed.

Clone a copy of the repo:
```sh
git clone https://github.com/mediamonks/s3-batch-upload.git
```

Change to the s3-batch-upload directory:
```sh
cd s3-batch-upload
```

Install dev dependencies:
```sh
yarn
```

Use one of the following main scripts:
```sh
yarn build            # build this project
yarn dev              # run compilers in watch mode, both for babel and typescript
yarn test             # run the unit tests incl coverage
yarn test:dev         # run the unit tests in watch mode
yarn lint             # run eslint and tslint on this project
yarn doc              # generate typedoc documentation
```

When installing this module, it adds a pre-commit hook, that runs lint and prettier commands
before committing, so you can be sure that everything checks out.


## Contribute

View [CONTRIBUTING.md](./CONTRIBUTING.md)


## Changelog

View [CHANGELOG.md](./CHANGELOG.md)


## Authors

View [AUTHORS.md](./AUTHORS.md)


## LICENSE

[MIT](./LICENSE) © MediaMonks


