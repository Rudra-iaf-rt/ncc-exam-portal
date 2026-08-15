const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");
const examRoutes = require("./routes/exams.routes");
const resultsRoutes = require("./routes/results.routes");
const materialsRoutes = require("./routes/materials.routes");
const usersRoutes = require("./routes/users.routes");
const adminRoutes = require('./routes/admin');
const collegesRoutes = require('./routes/colleges.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const errorsRoutes = require('./routes/errors.routes');

const notificationsRoutes = require("./routes/notifications.routes");
const antiCheatRoutes = require("./routes/anti-cheat.routes");
const perfRoutes = require("./routes/perf.routes");
const { requestContext } = require("./middleware/security");
const { csrfGuard } = require("./middleware/csrf");
const { telemetry } = require("./middleware/telemetry");
const { serverTiming } = require("./middleware/server-timing");
const { notFoundHandler, errorHandler } = require("./middleware/error-handler");

const app = express();

const helmet = require("helmet");
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "http:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.set("trust proxy", 1);

const allowedOrigins = [
  ...(process.env.CLIENT_URLS ? process.env.CLIENT_URLS.split(",") : []),
  process.env.CLIENT_URL,
  "https://ncc-exam-portal.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:8081",
  "http://localhost:8080",
].map((x) => String(x || "").trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(requestContext);
app.use(serverTiming);
app.use(telemetry);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(csrfGuard);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api", materialsRoutes);
app.use("/api", examRoutes);
app.use("/api", resultsRoutes);
app.use("/api", usersRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', collegesRoutes);
app.use('/api/errors', errorsRoutes);

app.use("/api", notificationsRoutes);
app.use("/api", antiCheatRoutes);
app.use("/api/admin", perfRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
