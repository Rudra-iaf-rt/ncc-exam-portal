const nodemailer = require("nodemailer");

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set`);
  }
  return v;
}

function getTransport() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  const user = requireEnv("SMTP_USER");
  const pass = requireEnv("SMTP_PASS");

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendMail({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) {
    throw new Error("SMTP_FROM or SMTP_USER is required");
  }

  const transporter = getTransport();
  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendMail };

