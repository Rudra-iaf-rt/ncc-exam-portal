const bcrypt = require("bcrypt");
const { prisma } = require("../lib/prisma");
const { signToken } = require("../utils/jwt");
const { HttpError } = require("../utils/http-error");
const { ROLES } = require("../middleware/roles");

const SALT_ROUNDS = 10;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    regimentalNumber: user.regimentalNumber,
    email: user.email,
    mobile: user.mobile,
    batch: user.batch,
    yearOfStudy: user.yearOfStudy,
    role: user.role,
    college: user.college,
  };
}

/** Legacy seed / simple API: name, regimentalNumber, password, college only. */
async function registerStudentLegacy({ name, regimentalNumber, password, college }) {
  if (!name || !regimentalNumber || !password || !college) {
    throw new HttpError(400, "name, regimentalNumber, password, and college are required");
  }

  const reg = String(regimentalNumber).trim();
  if (reg.length < 2) {
    throw new HttpError(400, "Invalid regimental number");
  }
  if (String(password).length < 6) {
    throw new HttpError(400, "Password must be at least 6 characters");
  }

  const existing = await prisma.user.findFirst({
    where: { regimentalNumber: reg },
  });
  if (existing) {
    throw new HttpError(409, "Regimental number already registered");
  }

  const hashed = await bcrypt.hash(String(password), SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: String(name).trim(),
      regimentalNumber: reg,
      email: null,
      mobile: null,
      batch: null,
      yearOfStudy: null,
      password: hashed,
      role: ROLES.STUDENT,
      college: String(college).trim(),
    },
  });

  const token = signToken({ sub: user.id, role: user.role });
  return { token, user: sanitizeUser(user) };
}

/**
 * Cadet self-registration (mobile app).
 * Body: name, regimentalNumber, email, mobile, college, batch, year, password
 * (`year` stored as yearOfStudy, e.g. "1st")
 */
async function registerStudent(body) {
  const {
    name,
    regimentalNumber,
    email,
    mobile,
    college,
    batch,
    year,
    password,
  } = body ?? {};

  if (!email) {
    return registerStudentLegacy({ name, regimentalNumber, password, college });
  }

  if (
    !name ||
    !regimentalNumber ||
    !email ||
    !mobile ||
    !college ||
    !batch ||
    !year ||
    !password
  ) {
    throw new HttpError(
      400,
      "name, regimentalNumber, email, mobile, college, batch, year, and password are required"
    );
  }

  const reg = String(regimentalNumber).trim();
  if (reg.length < 2) {
    throw new HttpError(400, "Invalid regimental number");
  }

  const emailNorm = String(email).trim().toLowerCase();
  if (!EMAIL_RE.test(emailNorm)) {
    throw new HttpError(400, "Invalid email address");
  }

  const mobileDigits = String(mobile).replace(/\D/g, "");
  if (mobileDigits.length !== 10) {
    throw new HttpError(400, "Mobile number must be 10 digits");
  }

  if (String(password).length < 6) {
    throw new HttpError(400, "Password must be at least 6 characters");
  }

  const existingReg = await prisma.user.findFirst({
    where: { regimentalNumber: reg },
  });
  if (existingReg) {
    throw new HttpError(409, "Regimental number already registered");
  }

  const existingEmail = await prisma.user.findFirst({
    where: { email: emailNorm },
  });
  if (existingEmail) {
    throw new HttpError(409, "Email already registered");
  }

  const hashed = await bcrypt.hash(String(password), SALT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        regimentalNumber: reg,
        email: emailNorm,
        mobile: mobileDigits,
        batch: String(batch).trim(),
        yearOfStudy: String(year).trim(),
        password: hashed,
        role: ROLES.STUDENT,
        college: String(college).trim(),
      },
    });

    const token = signToken({ sub: user.id, role: user.role });
    return { token, user: sanitizeUser(user) };
  } catch (e) {
    if (e && typeof e === "object" && e.code === "P2002") {
      throw new HttpError(409, "Email or regimental number already registered");
    }
    throw e;
  }
}

async function loginStudent({ regimentalNumber, password }) {
  if (!regimentalNumber || !password) {
    throw new HttpError(400, "regimentalNumber and password are required");
  }

  const user = await prisma.user.findFirst({
    where: {
      regimentalNumber: String(regimentalNumber).trim(),
      role: ROLES.STUDENT,
    },
  });

  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new HttpError(401, "Invalid credentials");
  }

  const token = signToken({ sub: user.id, role: user.role });
  return { token, user: sanitizeUser(user) };
}

async function loginStaff({ email, password }) {
  if (!email || !password) {
    throw new HttpError(400, "email and password are required");
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      role: { in: [ROLES.ADMIN, ROLES.INSTRUCTOR] },
    },
  });

  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new HttpError(401, "Invalid credentials");
  }

  const token = signToken({ sub: user.id, role: user.role });
  return { token, user: sanitizeUser(user) };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  return sanitizeUser(user);
}

module.exports = {
  sanitizeUser,
  registerStudent,
  loginStudent,
  loginStaff,
  getMe,
};
