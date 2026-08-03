const { Worker } = require("bullmq");
const { redis } = require("../lib/redis");
const adminService = require("../services/admin.service");

const isDummyRedis = typeof redis.sadd === "function" && typeof redis.call === "function" && !redis.status;

let assignmentWorker = null;

if (!isDummyRedis) {
  assignmentWorker = new Worker("exam-assignments", async (job) => {
    const { examId, targetUserIds, adminId, examTitle } = job.data;
    console.log(`[Worker] Processing bulk assign for examId: ${examId} (${targetUserIds.length} users)`);
    
    try {
      const result = await adminService.processBulkAssignJob(examId, targetUserIds, adminId, examTitle);
      console.log(`[Worker] Successfully assigned ${result.count} users for examId: ${examId}`);
      return result;
    } catch (err) {
      console.error(`[Worker] Failed to process bulk assign for examId: ${examId}`, err);
      throw err;
    }
  }, { 
    connection: redis,
    concurrency: 5 // Adjust as needed
  });

  assignmentWorker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });
} else {
  console.log("[Worker] BullMQ worker disabled because REDIS_URL is not set.");
}

module.exports = {
  assignmentWorker
};
