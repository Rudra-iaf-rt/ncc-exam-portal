const cron = require("node-cron");
const materialsService = require("./services/materials.service");

/**
 * Initialize all scheduled background tasks
 */
function initCron() {
  console.log("[Cron] Initializing scheduled tasks...");

  // Nightly revalidation of Google Drive links at 02:00 AM
  cron.schedule("0 2 * * *", () => {
    materialsService.revalidateAllMaterials().catch(err => {
      console.error("[Cron] Drive revalidation job failed:", err);
    });
  });

  console.log("[Cron] Scheduled: Nightly Drive access revalidation at 02:00 AM.");
}

module.exports = { initCron };
