const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { prisma } = require("../lib/prisma");
const { signToken } = require("../utils/jwt");
const { HttpError } = require("../utils/http-error");
const { cacheGetJson, cacheSetJson, cacheDel } = require("../lib/cache");
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
    canManageExams: user.canManageExams,
  };
}

async function issueSessionTokens(user, options = {}) {
  const oldTokenHash = options.oldTokenHash ? String(options.oldTokenHash) : null;
  const accessToken = signToken({ sub: user.id, role: user.role, collegeCode: user.collegeCode || null });
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
  if (!user.isActive) {
    throw new HttpError(403, "Account is disabled");
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
  if (!user.isActive) {
    throw new HttpError(403, "Account is disabled");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new HttpError(401, "Invalid credentials");
  }

  return issueSessionTokens(user);
}

async function getMe(userId) {
  const parsedId = parseInt(userId, 10);
  if (isNaN(parsedId)) {
    throw new HttpError(401, "Authentication required");
  }

  // Cache the user profile for 60s — this is hit on every authenticated
  // page load (GET /api/auth/me) and was previously doing a full DB round-trip
  // each time (~4s on a remote DB connection).
  const cacheKey = `auth:me:${parsedId}`;
  const cached = await cacheGetJson(cacheKey);
  if (cached) return cached;

  const user = await prisma.user.findUnique({
    where: { id: parsedId },
    include: { college: true }
  });
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  if (!user.isActive) {
    throw new HttpError(403, "Account is disabled");
  }
  const sanitized = sanitizeUser(user);
  // Fire-and-forget cache write — never block the response
  cacheSetJson(cacheKey, 60, sanitized);
  return sanitized;
}

async function refreshSession(userId) {
  const parsedId = parseInt(userId, 10);
  if (isNaN(parsedId)) {
    throw new HttpError(401, "Authentication required");
  }

  const user = await prisma.user.findUnique({
    where: { id: parsedId },
    include: { college: true }
  });
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  if (!user.isActive) {
    throw new HttpError(403, "Account is disabled");
  }
  return issueSessionTokens(user);
}

async function refreshSessionWithToken(rawRefreshToken) {
  const refreshToken = String(rawRefreshToken || "").trim();
  if (!refreshToken) {
    throw new HttpError(401, "refreshToken is required");
  }

  const tokenHash = sha256(refreshToken);
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { college: true } } },
  });

  if (!record || !record.user) {
    throw new HttpError(401, "Invalid refresh token");
  }
  if (!record.user.isActive) {
    throw new HttpError(403, "Account is disabled");
  }
  if (record.revokedAt) {
    const gracePeriodMs = 30 * 1000;
    const isWithinGrace = (Date.now() - record.revokedAt.getTime()) < gracePeriodMs;
    if (!isWithinGrace) {
      throw new HttpError(401, "Refresh token revoked");
    }
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw new HttpError(401, "Refresh token expired");
  }

  return issueSessionTokens(record.user, { oldTokenHash: tokenHash });
}

async function registerStudent(body = {}) {
  const {
    name,
    regimentalNumber,
    email,
    mobile,
    college,
    batch,
    year,
    password,
  } = body;

  if (!name || !regimentalNumber || !password) {
    throw new HttpError(400, "name, regimentalNumber and password are required");
  }
  if (String(password).length < 6) {
    throw new HttpError(400, "password must be at least 6 characters");
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { regimentalNumber: String(regimentalNumber).trim() },
        email ? { email: String(email).trim().toLowerCase() } : undefined,
      ].filter(Boolean),
    },
  });
  if (existing) {
    throw new HttpError(409, "User already exists");
  }

  const hashed = await bcrypt.hash(String(password), SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name: String(name).trim(),
      regimentalNumber: String(regimentalNumber).trim(),
      password: hashed,
      role: ROLES.STUDENT,
      email: email ? String(email).trim().toLowerCase() : null,
      mobile: mobile ? String(mobile).trim() : null,
      batch: batch ? String(batch).trim() : null,
      yearOfStudy: year ? String(year).trim() : null,
      collegeCode: college ? String(college).trim().toUpperCase() : null,
      isActive: true,
    },
    include: { college: true },
  });
  return issueSessionTokens(user);
}

async function logoutWithRefreshToken(rawRefreshToken) {
  const refreshToken = String(rawRefreshToken || "").trim();
  if (!refreshToken) {
    return { ok: true };
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

async function logoutAllForUser(userIdRaw) {
  const userId = Number(userIdRaw);
  if (!Number.isFinite(userId)) {
    return { ok: true };
  }
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return { ok: true };
}

async function requestPasswordReset({ identifier, email }) {
  const idNorm = String(identifier || email || "").trim();
  if (!idNorm) return;

  const isEmail = EMAIL_RE.test(idNorm.toLowerCase());

  const user = await prisma.user.findFirst({
    where: isEmail
      ? { email: idNorm.toLowerCase() }
      : { regimentalNumber: idNorm.toUpperCase() },
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

  const appResetUrlBase = process.env.APP_RESET_URL_BASE || process.env.APP_PUBLIC_URL || "https://ncc-exam-portal.vercel.app/";
  const resetUrl = buildPasswordResetLink(rawToken, appResetUrlBase);

  const subject = "Reset your NCC Exam Portal password";
  const text = [
    `Hello ${user.name || "Cadet"},`,
    "",
    "We received a request to reset your password for the NCC Exam Portal.",
    "Use the link below to set a new password:",
    resetUrl,
    "",
    `This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes.`,
    "If you did not request this, you can safely ignore this email.",
  ].join("\n");

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset your password</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F4F2EC; font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F4F2EC; padding: 48px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border: 1px solid #E8E4D8; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              
              <!-- Header -->
              <tr>
                <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #F4F2EC;">
                  <span style="font-size: 16px; font-weight: 700; color: #1A2744; letter-spacing: -0.2px;">NCC Exam Portal</span>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 32px; color: #1C1C18; font-size: 15px; line-height: 1.6;">
                  <p style="margin: 0 0 16px 0; color: #1C1C18;">
                    Hello <strong>${user.name || "Cadet"}</strong>,
                  </p>
                  <p style="margin: 0 0 24px 0; color: #3A3A34;">
                    We received a request to reset the password for your account. Click the button below to set a new password:
                  </p>

                  <!-- CTA Button -->
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                    <tr>
                      <td align="left">
                        <a href="${resetUrl}" target="_blank" style="background-color: #1A2744; color: #FFFFFF; padding: 11px 22px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
                          Reset password
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 0 0 24px 0; font-size: 13px; color: #6A6A60;">
                    This link expires in <strong>${RESET_TOKEN_TTL_MINUTES} minutes</strong>. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.
                  </p>
                 
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #F9F8F4; padding: 20px 32px; border-top: 1px solid #E8E4D8; text-align: left;">
                  <p style="font-size: 12px; color: #9A9A8E; margin: 0; line-height: 1.5;">
                    National Cadet Corps Examination Portal
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await sendMail({
    to: user.email,
    subject,
    text,
    html,
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

async function verifyPasswordResetToken({ token }) {
  const rawToken = String(token || "").trim();
  if (!rawToken) {
    throw new HttpError(400, "token is required");
  }

  const tokenHash = sha256(rawToken);
  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          regimentalNumber: true,
        },
      },
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

  return record.user;
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
  registerStudent,
  sanitizeUser,
  loginStudent,
  loginStaff,
  getMe,
  refreshSession,
  refreshSessionWithToken,
  logoutWithRefreshToken,
  logoutAllForUser,
  requestPasswordReset,
  resetPassword,
  verifyPasswordResetToken,
  changePassword,
};
