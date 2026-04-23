const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { prisma } = require("../lib/prisma");
const { signToken } = require("../utils/jwt");
const { HttpError } = require("../utils/http-error");
const { ROLES } = require("../middleware/roles");
const { sendMail } = require("./mailer.service");

const SALT_ROUNDS = 10;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30);

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/** Email / deep-link target for password reset (Expo scheme: `ncc-exam://reset-password?token=`). */
function buildPasswordResetLink(rawToken, base) {
  const qs = `token=${encodeURIComponent(rawToken)}`;
  const b = String(base || "").trim();
  if (!b) {
    return `reset-password?${qs}`;
  }
  if (b.endsWith("://")) {
    return `${b}reset-password?${qs}`;
  }
  const trimmed = b.replace(/\/+$/, "");
  return `${trimmed}/reset-password?${qs}`;
}

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
  console.log("Body",email,password)
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

async function refreshSession(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  const token = signToken({ sub: user.id, role: user.role });
  return { token, user: sanitizeUser(user) };
}

async function requestPasswordReset({ email }) {
  const emailNorm = String(email || "").trim().toLowerCase();
  if (!emailNorm || !EMAIL_RE.test(emailNorm)) {
    // Always succeed to avoid enumeration (and to keep API shape stable).
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: emailNorm, role: ROLES.STUDENT },
    select: { id: true, email: true, name: true },
  });
  if (!user || !user.email) {
    return;
  }

  const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const appResetUrlBase = process.env.APP_RESET_URL_BASE || process.env.APP_PUBLIC_URL || "";
  const resetUrl = buildPasswordResetLink(rawToken, appResetUrlBase);

  const subject = "Reset your NCC Exam Portal password";
  const text = [
    `Hello ${user.name || "Cadet"},`,
    "",
    "We received a request to reset your password.",
    "Use the link below to set a new password:",
    resetUrl,
    "",
    `This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes.`,
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  await sendMail({
    to: user.email,
    subject,
    text,
  });
}

async function resetPassword({ token, newPassword }) {
  const rawToken = String(token || "").trim();
  if (!rawToken) {
    throw new HttpError(400, "token is required");
  }
  if (!newPassword || String(newPassword).length < 6) {
    throw new HttpError(400, "newPassword must be at least 6 characters");
  }

  const tokenHash = sha256(rawToken);
  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
    },
    select: {
      id: true,
      userId: true,
      usedAt: true,
      expiresAt: true,
    },
  });

  if (!record) {
    throw new HttpError(400, "Invalid or expired reset token");
  }
  if (record.usedAt) {
    throw new HttpError(400, "Reset token already used");
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw new HttpError(400, "Invalid or expired reset token");
  }

  const hashed = await bcrypt.hash(String(newPassword), SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
}

module.exports = {
  sanitizeUser,
  registerStudent,
  loginStudent,
  loginStaff,
  getMe,
  refreshSession,
  requestPasswordReset,
  resetPassword,
};
