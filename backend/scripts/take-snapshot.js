const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

try {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (e) {
  console.warn("dotenv not found, relying on existing environment variables.");
}

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error(" Error: DATABASE_URL not found in environment or backend/.env");
  process.exit(1);
}

let cleanDbUrl;
try {
  const parsedUrl = new URL(dbUrl);
  parsedUrl.searchParams.delete('pgbouncer');
  parsedUrl.searchParams.delete('connection_limit');
  cleanDbUrl = parsedUrl.toString();
} catch (e) {
  console.error(" Error: DATABASE_URL is not a valid URL.");
  process.exit(1);
}

// Generate timestamp for filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
// Save to the root of the project
const backupFile = path.join(__dirname, `../../neon_snapshot_${timestamp}.sql`);

console.log(`Starting database snapshot...`);
console.log(`Output file: ${backupFile}`);

try {
  const cmd = `pg_dump "${cleanDbUrl}" --clean --if-exists --no-owner --no-privileges -f "${backupFile}"`;
  
  execSync(cmd, { stdio: 'inherit' });
  
  console.log(`\n Snapshot successful! Saved to: ${backupFile}`);
  console.log(`\n======================================================`);
  console.log(`  To restore this to a NEW Neon database, run:`);
  console.log(`   psql "YOUR_NEW_NEON_DATABASE_URL" -f "${backupFile}"`);
  console.log(`======================================================\n`);
} catch (error) {
  console.error("\n Snapshot failed.");
  console.error("Please ensure you have PostgreSQL command-line tools ('pg_dump') installed and added to your system PATH.");
  console.error("Error details:", error.message);
  process.exit(1);
}
