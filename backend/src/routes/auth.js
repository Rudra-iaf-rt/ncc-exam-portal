const express = require("express");
const bcrypt = require("bcrypt");
const { prisma } = require("../lib/prisma");
const { signToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const { authenticate } = require("../middleware/auth");
const { logger } = require("../utils/logger");

const router = express.Router();

const ROLES = {
  STUDENT: "STUDENT",
  ADMIN: "ADMIN",
  INSTRUCTOR: "INSTRUCTOR",
};

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    regimentalNumber: user.regimentalNumber,
    email: user.email,
    role: user.role,
    college: user.college,
    wing: user.wing,
    batch: user.batch,
    isActive: user.isActive,
  };
}

async function generateTokens(user, res) {
  const payload = { sub: user.id, role: user.role };
  const accessToken = signToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Store hashed refresh token in DB
  const hashedRefreshToken = await bcrypt.hash(refreshToken, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashedRefreshToken },
  });

  // Set refresh token in httpOnly cookie
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return accessToken;
}

/** POST /api/auth/register — new student account */
router.post("/register", async (req, res) => {
  const { name, regimentalNumber, password, college } = req.body ?? {};

  if (!name || !regimentalNumber || !password || !college) {
    return res.status(400).json({
      error: "name, regimentalNumber, password, and college are required",
    });
  }

  const reg = String(regimentalNumber).trim();
  if (reg.length < 2) {
    return res.status(400).json({ error: "Invalid regimental number" });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { regimentalNumber: reg },
    });
    if (existing) {
      return res.status(409).json({ error: "Regimental number already registered" });
    }

    const hashed = await bcrypt.hash(String(password), SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        regimentalNumber: reg,
        email: null,
        password: hashed,
        role: ROLES.STUDENT,
        college: String(college).trim(),
      },
    });

    const accessToken = await generateTokens(user, res);
    
    logger.audit('USER_REGISTER', { userId: user.id, regimentalNumber: reg }, user.id);

    return res.status(201).json({
      token: accessToken,
      user: sanitizeUser(user),
    });
  } catch (err) {
    logger.error('REGISTER_FAILED', { error: err.message, regimentalNumber: reg });
    return res.status(500).json({ error: "Internal server error" });
  }
});

/** Shared: credentials check logic */
async function validateCredentials(identifier, password, isStaff = false) {
  const where = isStaff 
    ? { email: String(identifier).trim().toLowerCase(), role: { in: [ROLES.ADMIN, ROLES.INSTRUCTOR] } }
    : { regimentalNumber: String(identifier).trim(), role: ROLES.STUDENT };

  const user = await prisma.user.findFirst({ where });
  if (!user) return null;

  if (user.isActive === false) {
    throw new Error("ACCOUNT_DISABLED");
  }

  const match = await bcrypt.compare(password, user.password);
  return match ? user : null;
}

/** POST /api/auth/login — regimentalNumber + password (student) */
router.post("/login", async (req, res) => {
  try {
    const { regimentalNumber, password } = req.body ?? {};
    if (!regimentalNumber || !password) {
      return res.status(400).json({ error: "regimentalNumber and password are required" });
    }

    const user = await validateCredentials(regimentalNumber, password, false);
    if (!user) {
      logger.warn('LOGIN_FAILED', { regimentalNumber });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const accessToken = await generateTokens(user, res);
    logger.info('USER_LOGIN', { userId: user.id, role: user.role }, user.id);
    
    return res.json({ token: accessToken, user: sanitizeUser(user) });
  } catch (err) {
    if (err.message === "ACCOUNT_DISABLED") {
      return res.status(403).json({ error: "Your account has been disabled. Contact Unit HQ." });
    }
    logger.error('LOGIN_CRASH', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/auth/login/staff — email + password (admins & instructors) */
router.post("/login/staff", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await validateCredentials(email, password, true);
    if (!user) {
      logger.warn('STAFF_LOGIN_FAILED', { email });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const accessToken = await generateTokens(user, res);
    logger.audit('STAFF_LOGIN', { userId: user.id, role: user.role }, user.id);
    
    return res.json({ token: accessToken, user: sanitizeUser(user) });
  } catch (err) {
    if (err.message === "ACCOUNT_DISABLED") {
      return res.status(403).json({ error: "Your account has been disabled. Contact Unit HQ." });
    }
    logger.error('STAFF_LOGIN_CRASH', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/auth/refresh — renew access token */
router.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
  if (!refreshToken) return res.status(401).json({ error: "Refresh token missing" });

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });

    if (!user || !user.refreshToken) {
      return res.status(401).json({ error: "User not found or session expired" });
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isMatch) return res.status(401).json({ error: "Invalid refresh token" });

    const accessToken = await generateTokens(user, res);
    return res.json({ token: accessToken });
  } catch (_err) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

/** POST /api/auth/logout — clear session */
router.post("/logout", authenticate, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null },
    });

    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME);
    logger.info('USER_LOGOUT', { userId: req.user.id }, req.user.id);
    return res.json({ ok: true });
  } catch (_err) {
    return res.status(500).json({ error: "Logout failed" });
  }
});

/** GET /api/auth/me — validate token and return user */
router.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  return res.json({ user: sanitizeUser(user) });
});

module.exports = router;
