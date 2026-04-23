const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const examRoutes = require("./routes/exams.routes");
const resultsRoutes = require("./routes/results.routes");
const materialsRoutes = require("./routes/materials.routes");
const { notFoundHandler, errorHandler } = require("./middleware/error-handler");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api", materialsRoutes);
app.use("/api", examRoutes);
app.use("/api", resultsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
