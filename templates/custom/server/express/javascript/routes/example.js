const express = require("express");
const router = express.Router();

// GET /api/example
router.get("/", (req, res) => {
  res.json({ message: "Example route works!" });
});

module.exports = router;
