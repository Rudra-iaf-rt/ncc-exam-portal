const jwt = require('jsonwebtoken');

describe('jwt utility', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // clears the cache
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should throw an error on load if JWT_SECRET is not set', () => {
    // Arrange
    delete process.env.JWT_SECRET;
    
    // Act & Assert
    expect(() => {
      require('../jwt');
    }).toThrow('JWT_SECRET is not set');
  });

  describe('with valid environment', () => {
    let jwtUtil;
    const testSecret = 'test-secret';
    const testRefreshSecret = 'test-refresh-secret';

    beforeEach(() => {
      process.env.JWT_SECRET = testSecret;
      process.env.JWT_REFRESH_SECRET = testRefreshSecret;
      process.env.JWT_EXPIRES_IN = '1h';
      process.env.JWT_REFRESH_EXPIRES_IN = '7d';
      
      jwtUtil = require('../jwt');
    });

    it('signToken should create a token with correct payload and expiration', () => {
      // Arrange
      const payload = { userId: 1 };
      
      // Act
      const token = jwtUtil.signToken(payload);
      
      // Assert
      const decoded = jwt.verify(token, testSecret);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.exp).toBeDefined();
    });

    it('signRefreshToken should create a token with correct payload and refresh expiration', () => {
      // Arrange
      const payload = { userId: 2 };
      
      // Act
      const token = jwtUtil.signRefreshToken(payload);
      
      // Assert
      const decoded = jwt.verify(token, testRefreshSecret);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.exp).toBeDefined();
    });

    it('verifyToken should successfully decode a valid access token', () => {
      // Arrange
      const payload = { role: 'admin' };
      const token = jwtUtil.signToken(payload);
      
      // Act
      const decoded = jwtUtil.verifyToken(token);
      
      // Assert
      expect(decoded.role).toBe('admin');
    });

    it('verifyRefreshToken should successfully decode a valid refresh token', () => {
      // Arrange
      const payload = { session: 'abc' };
      const token = jwtUtil.signRefreshToken(payload);
      
      // Act
      const decoded = jwtUtil.verifyRefreshToken(token);
      
      // Assert
      expect(decoded.session).toBe('abc');
    });

    it('verifyToken should throw on invalid token', () => {
      // Arrange
      const invalidToken = 'not.a.real.token';
      
      // Act & Assert
      expect(() => {
        jwtUtil.verifyToken(invalidToken);
      }).toThrow();
    });
  });
});
