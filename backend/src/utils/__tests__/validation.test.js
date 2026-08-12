const { parsePositiveInt } = require('../validation');
const { HttpError } = require('../http-error');

describe('validation - parsePositiveInt', () => {
  it.each([
    [1, 1],
    ['42', 42],
    [3.14, 3.14]
  ])('should return %p when input is %p', (input, expected) => {
    // Act
    const result = parsePositiveInt(input, 'testLabel');

    // Assert
    expect(result).toBe(expected);
  });

  it.each([
    [0, '0'],
    [-1, 'negative number'],
    [-5.5, 'negative float'],
    ['abc', 'non-numeric string'],
    [null, 'null'],
    [undefined, 'undefined'],
    [NaN, 'NaN'],
    [Infinity, 'Infinity'],
    [-Infinity, '-Infinity']
  ])('should throw HttpError when input is invalid (%p)', (input) => {
    // Act
    const action = () => parsePositiveInt(input, 'TestField');

    // Assert
    expect(action).toThrow(HttpError);
    expect(action).toThrow('TestField must be a positive number');
    
    try {
      action();
    } catch (error) {
      expect(error.status).toBe(400);
    }
  });
});
