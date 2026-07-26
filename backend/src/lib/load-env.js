const path = require("path");
const dotenv = require("dotenv");

/** Absolute path to the `backend/` folder (this file lives in `backend/src/lib/`). */
const backendRoot = path.resolve(__dirname, "..", "..");

// Prefer backend/.env (works no matter what the process cwd is)
dotenv.config({ path: path.join(backendRoot, ".env") });
// Optional: repo-root .env for monorepos (`ncc-exam-portal/.env`)
dotenv.config({ path: path.join(backendRoot, "..", ".env") });
// Last: default cwd-based .env
dotenv.config();

const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET", "CLIENT_URL"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(
    `[FATAL] Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
  console.error("The application cannot start without these variables.");
  process.exit(1);
}

module.exports = { backendRoot };
