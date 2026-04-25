require("dotenv/config");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth");
const portalRoutes = require("./routes/portal");
const resultsRoutes = require("./routes/results");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api", portalRoutes);
app.use("/api", resultsRoutes);
app.use("/api/admin", adminRoutes);

const { logger } = require("./utils/logger");

app.use((err, req, res, next) => {
  logger.error('UNCAUGHT_EXCEPTION', { 
    error: err.message, 
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});