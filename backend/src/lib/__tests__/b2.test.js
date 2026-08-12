jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  }))
}));

jest.mock('../load-env', () => ({}));

describe('b2.js client setup', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    // Provide defaults so require works
    process.env.B2_KEY_ID = 'test_key';
    process.env.B2_APPLICATION_KEY = 'test_app_key';
    process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
    process.env.B2_BUCKET_NAME = 'test-bucket';
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  it('should initialize S3Client successfully when all B2 vars are present', () => {
    const { S3Client } = require('@aws-sdk/client-s3');
    const { b2Client, B2_BUCKET_NAME } = require('../b2');
    
    expect(B2_BUCKET_NAME).toBe('test-bucket');
    expect(S3Client).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: 'https://s3.us-east-005.backblazeb2.com',
      region: 'us-east-005',
      forcePathStyle: true,
      credentials: {
        accessKeyId: 'test_key',
        secretAccessKey: 'test_app_key'
      }
    }));
    expect(console.log).toHaveBeenCalledWith('[B2] Client initialized for bucket: test-bucket');
  });

  it.each([
    'B2_KEY_ID',
    'B2_APPLICATION_KEY',
    'B2_ENDPOINT',
    'B2_BUCKET_NAME'
  ])('should throw an error if %s is missing', (missingVar) => {
    delete process.env[missingVar];
    
    expect(() => {
      require('../b2');
    }).toThrow(`[B2] Missing required environment variable: ${missingVar}.`);
  });
});
