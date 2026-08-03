require("./src/lib/load-env");

const { app } = require("./src/app");
const { initCron } = require("./src/cron");
require("./src/workers/assignment.worker"); // Start BullMQ workers

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  initCron();
});
// Trigger restart
