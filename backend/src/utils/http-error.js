/** Operational HTTP errors (mapped to JSON by the global error handler). */
class HttpError extends Error {
  /**
   * @param {number} status - HTTP status code
   * @param {string} message - Safe to expose to the client
   */
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

module.exports = { HttpError };
