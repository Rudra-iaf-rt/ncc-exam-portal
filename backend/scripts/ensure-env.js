/**
 * Creates `backend/.env` from `.env.example` if `.env` is missing.
 * Run before seed/migrate so DATABASE_URL and JWT_SECRET are defined.
 */
const fs = require("fs");
const path = require("path");

const backendRoot = path.resolve(__dirname, "..");
const dest = path.join(backendRoot, ".env");
const src = path.join(backendRoot, ".env.example");

if (fs.existsSync(dest)) {
  process.exit(0);
}

if (!fs.existsSync(src)) {
  console.error("backend/.env is missing and backend/.env.example was not found.");
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.log(
  "Created backend/.env from .env.example — edit DATABASE_URL (and JWT_SECRET) if needed, then re-run your command."
);
