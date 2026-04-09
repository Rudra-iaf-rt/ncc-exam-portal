require("dotenv/config");
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const portalRoutes = require("./routes/portal");
const resultsRoutes = require("./routes/results");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api", portalRoutes);
app.use("/api", resultsRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
