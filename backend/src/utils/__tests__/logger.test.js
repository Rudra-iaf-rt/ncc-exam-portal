const fs = require('fs');
const fsPromises = fs.promises;

jest.mock('fs', () => {
  return {
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    promises: {
      appendFile: jest.fn()
    }
  };
});

describe('logger', () => {
  let originalConsoleLog;
  let originalConsoleWarn;
  let originalConsoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods to prevent test output pollution
    originalConsoleLog = console.log;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;
    
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    
    // Reset fs mocks
    fs.existsSync.mockReturnValue(true); // default to dir exists
    fsPromises.appendFile.mockResolvedValue();
  });

  afterEach(() => {
    // Restore console
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  it('should initialize and create logs directory if it does not exist', () => {
    // Arrange
    jest.isolateModules(() => {
      fs.existsSync.mockReturnValueOnce(false);
      
      // Act
      require('../logger');
      
      // Assert
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });
  });

  describe('logging methods', () => {
    let logger;
    
    beforeEach(() => {
      jest.isolateModules(() => {
        logger = require('../logger').logger;
      });
      // Lock the date to ensure consistent JSON formatting in tests
      jest.useFakeTimers().setSystemTime(new Date('2023-01-01T00:00:00Z'));
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });

    it('logger.info should log with INFO level and call console.log and appendFile', () => {
      // Arrange
      const action = 'USER_LOGIN';
      const data = { userId: 1 };
      const actor = 'USER';
      
      // Act
      logger.info(action, data, actor);
      
      // Assert
      const expectedLogObj = {
        timestamp: '2023-01-01T00:00:00.000Z',
        level: 'INFO',
        actor: 'USER',
        action: 'USER_LOGIN',
        userId: 1
      };
      const expectedString = JSON.stringify(expectedLogObj);
      
      expect(console.log).toHaveBeenCalledWith(expectedString);
      expect(fsPromises.appendFile).toHaveBeenCalledWith(expect.any(String), expectedString + '\n');
    });

    it('logger.warn should log with WARN level and call console.warn and appendFile', () => {
      // Arrange
      const action = 'LOGIN_FAILED';
      
      // Act
      logger.warn(action); // omitting data and actor to test defaults
      
      // Assert
      const expectedLogObj = {
        timestamp: '2023-01-01T00:00:00.000Z',
        level: 'WARN',
        actor: 'SYSTEM',
        action: 'LOGIN_FAILED'
      };
      const expectedString = JSON.stringify(expectedLogObj);
      
      expect(console.warn).toHaveBeenCalledWith(expectedString);
      expect(fsPromises.appendFile).toHaveBeenCalledWith(expect.any(String), expectedString + '\n');
    });

    it('logger.error should log with ERROR level and call console.error and appendFile', () => {
      // Arrange
      const action = 'DB_ERROR';
      const data = { error: 'Connection timeout' };
      
      // Act
      logger.error(action, data);
      
      // Assert
      const expectedLogObj = {
        timestamp: '2023-01-01T00:00:00.000Z',
        level: 'ERROR',
        actor: 'SYSTEM',
        action: 'DB_ERROR',
        error: 'Connection timeout'
      };
      const expectedString = JSON.stringify(expectedLogObj);
      
      expect(console.error).toHaveBeenCalledWith(expectedString);
      expect(fsPromises.appendFile).toHaveBeenCalledWith(expect.any(String), expectedString + '\n');
    });

    it('logger.audit should prepend [AUDIT] to console.log and call appendFile', () => {
      // Arrange
      const action = 'PASSWORD_RESET';
      
      // Act
      logger.audit(action);
      
      // Assert
      const expectedLogObj = {
        timestamp: '2023-01-01T00:00:00.000Z',
        level: 'AUDIT',
        actor: 'SYSTEM',
        action: 'PASSWORD_RESET'
      };
      const expectedString = JSON.stringify(expectedLogObj);
      
      expect(console.log).toHaveBeenCalledWith(`[AUDIT] ${expectedString}`);
      expect(fsPromises.appendFile).toHaveBeenCalledWith(expect.any(String), expectedString + '\n');
    });

    it('should catch errors when fsPromises.appendFile fails without crashing', async () => {
      // Arrange
      fsPromises.appendFile.mockRejectedValue(new Error('Disk full'));
      
      // Act
      // The error is caught asynchronously, so it doesn't throw.
      logger.info('TEST');
      
      // We must wait for the promise to resolve in the event loop before asserting on console.error
      await Promise.resolve();
      
      // Assert
      // First call is from the logger itself, second is the error catch
      expect(console.error).toHaveBeenCalledWith('[LOGGER] Non-blocking file append failed:', 'Disk full');
    });
  });
});
