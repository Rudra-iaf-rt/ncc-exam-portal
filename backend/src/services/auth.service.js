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
const REFRESH_TOKEN_BYTES = 48;
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);

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
    collegeCode: user.collegeCode,
    college: user.college?.name || user.collegeCode,
    wing: user.wing,
    isActive: user.isActive,
  };
}

async function issueSessionTokens(user, options = {}) {
  const oldTokenHash = options.oldTokenHash ? String(options.oldTokenHash) : null;
  const accessToken = signToken({ sub: user.id, role: user.role });
  const refreshToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
  const tokenHash = sha256(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    if (oldTokenHash) {
      await tx.refreshToken.updateMany({
        where: {
          tokenHash: oldTokenHash,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }
    await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });
  });

  return {
    token: accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
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
    include: { college: true }
  });

  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new HttpError(401, "Invalid credentials");
  }

  return issueSessionTokens(user);
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
    include: { college: true }
  });

  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new HttpError(401, "Invalid credentials");
  }

  return issueSessionTokens(user);
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { college: true }
  });
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  return sanitizeUser(user);
}

async function refreshSession(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { college: true }
  });
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  return issueSessionTokens(user);
}

async function refreshSessionWithToken(rawRefreshToken) {
  const refreshToken = String(rawRefreshToken || "").trim();
  if (!refreshToken) {
    throw new HttpError(400, "refreshToken is required");
  }

  const tokenHash = sha256(refreshToken);
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { college: true } } },
  });

  if (!record || !record.user) {
    throw new HttpError(401, "Invalid refresh token");
  }
  if (record.revokedAt) {
    throw new HttpError(401, "Refresh token revoked");
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw new HttpError(401, "Refresh token expired");
  }

  return issueSessionTokens(record.user, { oldTokenHash: tokenHash });
}

async function logoutWithRefreshToken(rawRefreshToken) {
  const refreshToken = String(rawRefreshToken || "").trim();
  if (!refreshToken) {
    throw new HttpError(400, "refreshToken is required");
  }
  const tokenHash = sha256(refreshToken);
  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
  return { ok: true };
}

async function requestPasswordReset({ email }) {
  const emailNorm = String(email || "").trim().toLowerCase();
  if (!emailNorm || !EMAIL_RE.test(emailNorm)) {
    // Always succeed to avoid enumeration (and to keep API shape stable).
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: emailNorm },
    select: { id: true, email: true, name: true, role: true },
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
    `Hello ${user.name || "User"},`,
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
async function changePassword({ userId, oldPassword, newPassword }) {
  if (!oldPassword || !newPassword) {
    throw new HttpError(400, "oldPassword and newPassword are required");
  }
  if (newPassword.length < 6) {
    throw new HttpError(400, "newPassword must be at least 6 characters");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const match = await bcrypt.compare(String(oldPassword), user.password);
  if (!match) {
    throw new HttpError(403, "Invalid current password");
  }

  const hashed = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });
}

module.exports = {
  sanitizeUser,
  loginStudent,
  loginStaff,
  getMe,
  refreshSession,
  refreshSessionWithToken,
  logoutWithRefreshToken,
  requestPasswordReset,
  resetPassword,
  changePassword,
};
