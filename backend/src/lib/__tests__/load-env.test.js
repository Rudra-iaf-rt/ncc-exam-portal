jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('load-env', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    // Provide minimum required env vars so it doesn't process.exit(1) on require
    process.env.DATABASE_URL = 'mock_url';
    process.env.JWT_SECRET = 'mock_secret';
    process.env.CLIENT_URL = 'mock_client';
    
    // Mock console.error and process.exit
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit called with ${code}`);
    });
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  it('should call dotenv.config successfully and not exit if required vars exist', () => {
    // Act
    const { backendRoot } = require('../load-env');
    const dotenv = require('dotenv');
    
    // Assert
    expect(dotenv.config).toHaveBeenCalledTimes(3);
    expect(backendRoot).toBeDefined();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('should call process.exit(1) if required variables are missing', () => {
    // Arrange
    delete process.env.DATABASE_URL; // missing a required var
    
    // Act & Assert
    expect(() => {
      require('../load-env');
    }).toThrow('process.exit called with 1');
    
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[FATAL] Missing required environment variables: DATABASE_URL')
    );
  });
});
