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
      <title>Reset Password - NCC Exam Portal</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F4F2EC; font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F4F2EC; padding: 40px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #FDFCF8; border: 1px solid #CCC8BC; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(26, 39, 68, 0.05);">
              
              <!-- Official Tri-Service Accent Stripe (Crimson, Navy, Gold) -->
              <tr>
                <td style="height: 4px; background: #8B1A1A; background: linear-gradient(90deg, #8B1A1A 0%, #8B1A1A 33.3%, #1A2744 33.3%, #1A2744 66.6%, #B8860B 66.6%, #B8860B 100%); font-size: 0; line-height: 0;">&nbsp;</td>
              </tr>

              <!-- Header Section -->
              <tr>
                <td style="background-color: #1A2744; padding: 28px 36px; text-align: left;">
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="display: inline-block; margin-bottom: 12px;">
                    <tr>
                      <td style="background-color: rgba(184, 134, 11, 0.15); border: 1px solid #B8860B; border-radius: 6px; padding: 4px 10px; font-family: 'Noto Sans', sans-serif; font-size: 11px; font-weight: 700; color: #F0DC82; letter-spacing: 1px; text-transform: uppercase;">
                        🛡️ NCC EXAM PORTAL
                      </td>
                    </tr>
                  </table>
                  <h1 style="color: #FDFCF8; margin: 0 0 4px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; line-height: 1.2;">
                    Password Reset Request
                  </h1>
                  <p style="color: #B8C8E0; margin: 0; font-size: 13px; font-weight: 400;">
                    National Cadet Corps • Authentication Services
                  </p>
                </td>
              </tr>

              <!-- Body Content -->
              <tr>
                <td style="padding: 36px 36px 28px 36px; color: #1C1C18; line-height: 1.6; font-size: 15px;">
                  <p style="margin-top: 0; margin-bottom: 16px; font-size: 16px; color: #1C1C18;">
                    Jai Hind <strong>${user.name || "Cadet"}</strong>,
                  </p>
                  <p style="margin-top: 0; margin-bottom: 24px; color: #3A3A34; line-height: 1.6;">
                    We received a password reset request for your NCC Exam Portal account. If you submitted this request, please click the button below to establish a new password:
                  </p>

                  <!-- Primary CTA Button -->
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                    <tr>
                      <td align="center">
                        <a href="${resetUrl}" target="_blank" style="background-color: #1A2744; color: #FDFCF8; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; display: inline-block; border: 1px solid #253660; box-shadow: 0 2px 6px rgba(26, 39, 68, 0.15);">
                          RESET PASSWORD NOW &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Expiry & Security Notice Box -->
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #EDF1F8; border-left: 4px solid #1A2744; border-radius: 0 6px 6px 0; margin: 24px 0 28px 0;">
                    <tr>
                      <td style="padding: 16px 20px;">
                        <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #1A2744; text-transform: uppercase; letter-spacing: 0.5px;">
                          ⏱️ Security Notice
                        </p>
                        <p style="margin: 0; font-size: 13px; color: #3A3A34; line-height: 1.5;">
                          This reset link will expire in <strong>${RESET_TOKEN_TTL_MINUTES} minutes</strong>. For your protection, this link can only be used once.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Fallback Direct Link -->
                  <div style="border-top: 1px dashed #CCC8BC; padding-top: 20px; margin-top: 24px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #6A6A60; text-transform: uppercase; letter-spacing: 0.5px;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0; word-break: break-all; font-family: 'Noto Sans Mono', Consolas, monospace; font-size: 12px; background-color: #F9F8F4; padding: 10px 14px; border: 1px solid #E8E4D8; border-radius: 4px;">
                      <a href="${resetUrl}" style="color: #4A6090; text-decoration: none;">${resetUrl}</a>
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer Section -->
              <tr>
                <td style="background-color: #F9F8F4; padding: 24px 36px; border-top: 1px solid #E8E4D8; text-align: center;">
                  <p style="font-size: 12px; color: #6A6A60; margin: 0 0 8px 0; line-height: 1.5;">
                    If you did not request a password reset, please ignore this email or notify your Unit HQ / Administrator immediately.
                  </p>
                  <p style="font-size: 11px; color: #9A9A8E; margin: 12px 0 0 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                    National Cadet Corps • Official Examination Portal
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
