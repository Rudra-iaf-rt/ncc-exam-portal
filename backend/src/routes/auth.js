const express = require("express");
const bcrypt = require("bcrypt");
const { prisma } = require("../lib/prisma");
const { signToken } = require("../utils/jwt");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const ROLES = {
  STUDENT: "STUDENT",
  ADMIN: "ADMIN",
  INSTRUCTOR: "INSTRUCTOR",
};

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    regimentalNumber: user.regimentalNumber,
    email: user.email,
    role: user.role,
    college: user.college,
  };
}

const SALT_ROUNDS = 10;

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

  const token = signToken({
    sub: user.id,
    role: user.role,
  });

  return res.status(201).json({
    token,
    user: sanitizeUser(user),
  });
});

/** Shared: student sign-in with regimental number + password */
async function loginStudentCredentials(req, res) {
  const { regimentalNumber, password } = req.body ?? {};

  if (!regimentalNumber || !password) {
    return res.status(400).json({
      error: "regimentalNumber and password are required",
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      regimentalNumber: String(regimentalNumber).trim(),
      role: ROLES.STUDENT,
    },
  });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({
    sub: user.id,
    role: user.role,
  });

  return res.json({
    token,
    user: sanitizeUser(user),
  });
}

/** POST /api/auth/login — regimentalNumber + password (student) */
router.post("/login", loginStudentCredentials);

/** POST /api/auth/login/student — same as /login */
router.post("/login/student", loginStudentCredentials);

/** POST /api/auth/login/staff — email + password (admins & instructors) */
router.post("/login/staff", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({
      error: "email and password are required",
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      role: { in: [ROLES.ADMIN, ROLES.INSTRUCTOR] },
    },
  });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({
    sub: user.id,
    role: user.role,
  });

  return res.json({
    token,
    user: sanitizeUser(user),
  });
});

/** GET /api/auth/me — optional: validate token and return user */
router.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({ user: sanitizeUser(user) });
});

module.exports = router;
