/**
 * NCC Exam API — entrypoint.
 * Loads env from backend/.env then starts Express (see src/app.js).
 */
require("./src/lib/load-env");

const { app } = require("./src/app");

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
