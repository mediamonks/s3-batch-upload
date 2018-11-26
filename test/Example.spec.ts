import Uploader from '../src/lib/Uploader';
import {expect} from 'chai';

let example:Uploader;

describe('Example', () => {
  beforeEach(() => {
    example = new Uploader({
      localPath: '',
      remotePath: '',
      bucket: '',
    });
  });

  it('should return the correct environment', () => {
  });

  it('should return the default environment when none has been supplied', () => {
    expect(example).to.equal('baz');
  });
});
