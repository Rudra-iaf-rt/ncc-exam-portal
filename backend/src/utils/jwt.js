const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + "_refresh";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

const ACCESS_TOKEN_EXPIRE = process.env.JWT_EXPIRES_IN || "1h";
const REFRESH_TOKEN_EXPIRE = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRE });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

module.exports = { 
  signToken, 
  signRefreshToken, 
  verifyToken, 
  verifyRefreshToken 
};
