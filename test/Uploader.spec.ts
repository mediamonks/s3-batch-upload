import { expect, use } from 'chai';
import { spy } from 'sinon';
import sinonChai from 'sinon-chai';
import chaiStream from 'chai-stream';

import Uploader from '../src/lib/Uploader';
use(sinonChai);
use(chaiStream);

let uploader:Uploader;

describe('Uploader', () => {
  describe('uploadFile', () => {
    it('should upload', async function() {
      this.timeout(10000);

      const s3 = {
        upload(_, cb) {
          cb(null);
        }
      };
      spy(s3, "upload");

      uploader = new Uploader({
        localPath: 'test/files',
        remotePath: 'fake',
        bucket: 'fake',
        glob: '**/demo.png',
        s3Client: <any>s3,
      });

      await uploader.upload();

      const { Body, ...args} = (<any>s3.upload).lastCall.args[0];


      expect(args).to.deep.equal({
        Bucket: 'fake',
        Key: 'fake/demo.png',
        ContentType: 'image/png',
        CacheControl: '',
      });

      (<any>expect(Body).to.be.a).ReadableStream;

      (<any>s3.upload).restore();
    });

    it('should fix windows paths', async function() {
      this.timeout(5000);

      const s3 = {
        upload(_, cb) {
          cb(null);
        }
      };
      spy(s3, "upload");

      uploader = new Uploader({
        localPath: 'test/files',
        remotePath: 'fake',
        bucket: 'fake',
        glob: '**/demo.png',
        s3Client: <any>s3,
      });

      await uploader.uploadFile('files/demo.png', 'foo\\bar.png');

      const { Body, ...args} = (<any>s3.upload).lastCall.args[0];


      expect(args).to.deep.equal({
        Bucket: 'fake',
        Key: 'foo/bar.png',
        ContentType: 'image/png',
        CacheControl: '',
      });

      (<any>expect(Body).to.be.a).ReadableStream;

      (<any>s3.upload).restore();
    });
  });

  describe('getCacheControlValue', () => {
    describe('with no config value', () => {
      it('should return default value', () => {
        uploader = new Uploader({
            localPath: '',
            remotePath: '',
            bucket: 'a',
          });

        expect(uploader.getCacheControlValue('foo.bar')).to.equal('');
      });
    });

    describe('with static config value', () => {
      it('should return config value', () => {
        uploader = new Uploader({
          localPath: '',
          remotePath: '',
          bucket: 'a',
          cacheControl: '1'
        });

        expect(uploader.getCacheControlValue('foo.bar')).to.equal('1');
      });
    });

    describe('with glob config value', () => {
      it('should return config value', () => {
        uploader = new Uploader({
          localPath: '',
          remotePath: '',
          bucket: 'a',
          cacheControl: {
            '**/*.json': '10',
            '**/*.*': '100',
          }
        });

        expect(uploader.getCacheControlValue('files/foo.json')).to.equal('10');
        expect(uploader.getCacheControlValue('files/foo.jpg')).to.equal('100');
        expect(uploader.getCacheControlValue('foo.jpg')).to.equal('100');
      });
    });

  });
});
