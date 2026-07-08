const express = require("express");
const router = express.Router();
const fs = require("fs");

router.post("/client", (req, res) => {
  try {
    const { message, stack, url, componentStack, level } = req.body;

    // Structured logging as per engineering constitution
    const logData = {
      message: message || "Unknown Client Error",
      stack,
      componentStack,
      url,
      level,
      actor: req.user?.id || 'anonymous',
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    };

    console.error(`[CLIENT ERROR] ${logData.level || 'COMPONENT'}: ${logData.message}`, logData);

    // File logging for persistent tracking
    try {
      const logMsg = `[${logData.timestamp}] [CLIENT ${logData.level || 'ERROR'}] URL: ${logData.url} | MSG: ${logData.message}\nSTACK: ${logData.stack}\nCOMPONENT_STACK: ${logData.componentStack}\n\n`;
      fs.promises.appendFile("backend-error.log", logMsg).catch((e) => {
        console.error("[LOGGER] Non-blocking error file append failed:", e.message);
      });
    } catch (e) {
      console.error("[LOGGER] Failed to write to log file", e.message);
    }

    res.status(202).json({ ok: true, message: "Error logged securely." });
  } catch (error) {
    console.error("[CLIENT ERROR LOGGER] Failed to process incoming error log", error);
    res.status(500).json({ error: "Failed to log error" });
  }
});

module.exports = router;
