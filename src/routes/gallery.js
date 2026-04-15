const express = require("express");
const { stmts, deleteManyById } = require("../db");
const logger = require("../logger");
const router = express.Router();

router.get("/gallery", (req, res) => {
  try {
    const rows = stmts.getAll.all();
    const images = rows.map((row) => ({ id: row.id, created_at: row.created_at }));
    res.render("gallery", { images });
  } catch (err) {
    logger.error("Failed to load gallery: %s", err.message);
    res.status(500).render("error", { message: "Failed to load gallery." });
  }
});

router.post("/gallery/delete", (req, res) => {
  const raw = [].concat(req.body?.ids ?? []);
  if (raw.length === 0) {
    return res.redirect("/gallery");
  }
  const ids = raw.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) {
    return res.redirect("/gallery");
  }
  try {
    deleteManyById(ids);
    logger.info("Bulk deleted %d image(s): %s", ids.length, ids.join(","));
  } catch (err) {
    logger.error("Bulk delete failed: %s", err.message);
  }
  return res.redirect("/gallery");
});

module.exports = router;
