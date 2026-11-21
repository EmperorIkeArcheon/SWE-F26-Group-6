const express = require("express");

// Mounted at /admin in app.js behind requireUser and requireAdmin.
const router = express.Router();

router.get("/test", (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
