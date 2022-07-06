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
        upload() {
          return {
            async promise() {
              return null;
            }
          }
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

    it('should upload with access control level options', async function() {
      this.timeout(10000);

      const s3 = {
        upload() {
          return {
            async promise() {
              return null;
            }
          }
        }
      };
      spy(s3, "upload");

      uploader = new Uploader({
        localPath: 'test/files',
        remotePath: 'fake',
        bucket: 'fake',
        glob: '**/demo.png',
        s3Client: <any>s3,
        accessControlLevel: 'bucket-owner-full-control'
      });

      await uploader.upload();

      const { Body, ...args} = (<any>s3.upload).lastCall.args[0];


      expect(args).to.deep.equal({
        ACL: 'bucket-owner-full-control',
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
        upload() {
          return {
            async promise() {
              return null;
            }
          }
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

    describe('with option overwrite: false', () => {
      it('should not overwrite existing file', async function() {
        this.timeout(10000);

        const s3 = {
          upload() {
            return {
              async promise() {
                return null;
              }
            }
          },
          headObject() {
            return {
              async promise() {
                return null;
              }
            }
          }
        };
        const uploadSpy = spy(s3, 'upload');
        spy(s3, 'headObject');

        uploader = new Uploader({
          localPath: 'test/files',
          remotePath: 'fake',
          bucket: 'fake',
          glob: '**/demo.png',
          s3Client: <any>s3,
          overwrite: false,
        });

        await uploader.upload();

        const args = (<any>s3.headObject).lastCall.args[0]
        expect(args).to.deep.equal({
          Bucket: 'fake',
          Key: 'fake/demo.png',
        });
        expect(uploadSpy).to.have.callCount(0);
        (<any>s3.upload).restore();
      });

      it('should upload existing file', async function() {
        this.timeout(10000);

        const s3 = {
          upload() {
            return {
              async promise() {
                return null;
              }
            }
          },
          headObject(_) {
            return {
              async promise() {
                const err: any = new Error()
                err.code = 'NotFound'
                throw err;
              }
            }
          }
        };
        const uploadSpy = spy(s3, 'upload');
        spy(s3, 'headObject');

        uploader = new Uploader({
          localPath: 'test/files',
          remotePath: 'fake',
          bucket: 'fake',
          glob: '**/demo.png',
          s3Client: <any>s3,
          overwrite: false,
        });

        await uploader.upload();

        const args = (<any>s3.headObject).lastCall.args[0]
        expect(args).to.deep.equal({
          Bucket: 'fake',
          Key: 'fake/demo.png',
        });
        expect(uploadSpy).to.have.callCount(1);
        (<any>s3.upload).restore();
      });
    })
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

    describe('with uploadFile', () => {
      it('should return the uploaded path', async function() {
        this.timeout(5000);

        const s3 = {
          upload() {
            return {
              async promise() {
                return null;
              }
            }
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

        const result = await uploader.uploadFile('files/demo.png', 'foo\\bar.png');

        expect(result).to.equal('foo/bar.png');

        (<any>s3.upload).restore();
      });
    });

    describe('with uploadFile', () => {
      it('should return the uploaded paths', async function() {
        this.timeout(10000);

        const s3 = {
          upload() {
            return {
              async promise() {
                return null;
              }
            }
          }
        };
        spy(s3, "upload");

        uploader = new Uploader({
          localPath: 'test/files',
          remotePath: 'fake',
          bucket: 'fake',
          glob: '**/demo.png',
          s3Client: <any>s3,
          accessControlLevel: 'bucket-owner-full-control'
        });

        const results = await uploader.upload();

        expect(results).to.deep.equal([
          'fake/demo.png'
        ]);

        (<any>s3.upload).restore();
      });
    });

  });
});
