const { HttpError } = require('../http-error');

describe('HttpError', () => {
  it('should initialize with correct status, message, and name', () => {
    // Arrange
    const status = 404;
    const message = 'Not Found';

    // Act
    const error = new HttpError(status, message);

    // Assert
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(status);
    expect(error.message).toBe(message);
    expect(error.name).toBe('HttpError');
  });

  it('should be throwable and catchable as an Error', () => {
    // Arrange
    const throwError = () => {
      throw new HttpError(500, 'Server Error');
    };

    // Act & Assert
    expect(throwError).toThrow(HttpError);
    expect(throwError).toThrow('Server Error');
  });
});
