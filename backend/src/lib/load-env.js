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

module.exports = { backendRoot };
