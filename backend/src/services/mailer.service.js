function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set`);
  }
  return v;
}

async function sendMail({ to, subject, text, html }) {
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  // Brevo API keys are often the same as the SMTP password, but it's best to have a dedicated key.
  const apiKey = process.env.BREVO_API_KEY || process.env.SMTP_PASS;

  if (!fromEmail) {
    throw new Error("SMTP_FROM or SMTP_USER is required");
  }
  if (!apiKey) {
    throw new Error("BREVO_API_KEY or SMTP_PASS is required");
  }

  // We use Brevo's REST API instead of SMTP because platforms like Render (Free Tier)
  // block outbound SMTP ports (25, 465, 587, 2525). The REST API operates over HTTPS (443).
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: "NCC Exam Portal" },
      to: [{ email: to }],
      subject: subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Brevo API error: ${response.status} ${errText}`);
  }
}

module.exports = { sendMail };

