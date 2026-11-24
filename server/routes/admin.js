const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/test", (req, res) => {
  res.json({ ok: true });
});

const FOOD_LIMITS = { name: 200, calories: 900, macro: 100, macroTotal: 101 };

function validateFood(body) {
  const { name, calories, protein, carbs, fat } = body ?? {};

  if (typeof name !== "string" || !name.trim()) {
    return "name is required";
  }
  if (name.trim().length > FOOD_LIMITS.name) {
    return `name must be ${FOOD_LIMITS.name} characters or fewer`;
  }

  for (const [field, value, max] of [
    ["calories", calories, FOOD_LIMITS.calories],
    ["protein", protein, FOOD_LIMITS.macro],
    ["carbs", carbs, FOOD_LIMITS.macro],
    ["fat", fat, FOOD_LIMITS.macro],
  ]) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) {
      return `${field} must be a number between 0 and ${max}`;
    }
  }

  if (protein + carbs + fat > FOOD_LIMITS.macroTotal) {
    return "protein + carbs + fat can't total more than about 100 g per 100 g of food";
  }

  return null;
}

router.put("/foods/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "food id must be an integer" });
  }

  const problem = validateFood(req.body);
  if (problem) {
    return res.status(400).json({ error: problem });
  }

  const { name, calories, protein, carbs, fat } = req.body;
  const result = await pool.query(
    `UPDATE foods SET name = $1, calories = $2, protein = $3, carbs = $4, fat = $5
     WHERE id = $6 RETURNING *`,
    [name.trim(), calories, protein, carbs, fat, id]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: "food not found" });
  }
  res.json(result.rows[0]);
});

module.exports = router;