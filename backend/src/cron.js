const cron = require("node-cron");

/**
 * Initialize all scheduled background tasks.
 * NOTE: The Google Drive nightly revalidation cron has been removed.
 * B2 materials are always VERIFIED since we control the storage — no revalidation needed.
 */
function initCron() {
  console.log("[Cron] Initializing scheduled tasks...");
  // Future cron jobs go here
  console.log("[Cron] No scheduled tasks configured.");
}

module.exports = { initCron };
