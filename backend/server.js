require("./src/lib/load-env");

const { app } = require("./src/app");
const { initCron } = require("./src/cron");

// BullMQ workers disabled to save Upstash free tier polling limits. 
// Bulk assignment is now handled asynchronously without a persistent queue.
// require("./src/workers/assignment.worker");

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
console.log(`Server listening on http://localhost:${PORT}`);
  initCron();
});
// Trigger restart
 
