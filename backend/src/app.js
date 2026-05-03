const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const examRoutes = require("./routes/exams.routes");
const resultsRoutes = require("./routes/results.routes");
const materialsRoutes = require("./routes/materials.routes");
const usersRoutes = require("./routes/users.routes");
const adminRoutes = require('./routes/admin');
const collegesRoutes = require('./routes/colleges.routes');

const notificationsRoutes = require("./routes/notifications.routes");
const antiCheatRoutes = require("./routes/anti-cheat.routes");
const { requestContext, securityHeaders } = require("./middleware/security");
const { notFoundHandler, errorHandler } = require("./middleware/error-handler");

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://ncc-exam-portal.vercel.app",
  
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(requestContext);
app.use(securityHeaders);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api", materialsRoutes);
app.use("/api", examRoutes);
app.use("/api", resultsRoutes);
app.use("/api", usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', collegesRoutes);

app.use("/api", notificationsRoutes);
app.use("/api", antiCheatRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
