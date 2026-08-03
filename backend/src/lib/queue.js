const { Queue } = require("bullmq");
const { redis } = require("./redis");

// Using the existing ioredis connection
const connection = redis;

// Check if we are using the dummy redis mock from redis.js
// If it's the dummy, it won't have typical ioredis prototype properties like 'status'
const isDummyRedis = typeof redis.sadd === "function" && typeof redis.call === "function" && !redis.status;

let assignmentQueue = null;

if (!isDummyRedis) {
  assignmentQueue = new Queue("exam-assignments", { connection });
} else {
  console.warn("[Queue] BullMQ queues are disabled because REDIS_URL is not set.");
  // Provide a dummy queue for local dev without redis
  assignmentQueue = {
    add: async (name, data, opts) => {
      console.log(`[Queue Mock] Job '${name}' enqueued with data:`, data);
      return { id: `mock-job-${Date.now()}` };
    }
  };
}

module.exports = {
  assignmentQueue
};
