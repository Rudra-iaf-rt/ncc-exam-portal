const { HttpError } = require("./http-error");

function parsePositiveInt(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new HttpError(400, `${label} must be a positive number`);
  }
  return n;
}

module.exports = {
  parsePositiveInt
};
