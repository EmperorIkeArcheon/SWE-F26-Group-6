const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  const result = await pool.query(
    `SELECT e.id, f.name, e.grams, e.meal,
    f.calories * e.grams / 100 AS calories,
    f.protein * e.grams / 100 AS protein,
    f.carbs * e.grams / 100 AS carbs,
    f.fat * e.grams / 100 AS fat
    FROM food_log_entries e
    JOIN foods f ON f.id = e.food_id
    WHERE e.user_id = $1 AND e.logged_on = $2
    ORDER BY e.id`,
    [req.userId, req.query.date]
  );
  res.json(result.rows);
});

router.get("/summary", async (req, res) => {
  const result = await pool.query(
    `SELECT e.logged_on::text AS logged_on,
    SUM(f.calories * e.grams / 100) AS calories,
    SUM(f.protein * e.grams / 100) AS protein,
    SUM(f.carbs * e.grams / 100) AS carbs,
    SUM(f.fat * e.grams / 100) AS fat
    FROM food_log_entries e
    JOIN foods f ON f.id = e.food_id
    WHERE e.user_id = $1 AND e.logged_on BETWEEN $2 AND $3
    GROUP BY e.logged_on
    ORDER BY e.logged_on`,
    [req.userId, req.query.from, req.query.to]
  );
  res.json(result.rows);
});

router.post("/", async (req, res) => {
  const { food_id, grams, meal, logged_on } = req.body;

  if (!["breakfast", "lunch", "dinner", "snack"].includes(meal)) {
    return res.status(400).json({ error: "meal must be breakfast, lunch, dinner, or snack" });
  }

  if (!(grams > 0)) {
    return res.status(400).json({ error: "grams must be greater than 0" });
  }

  const result = await pool.query(
    "INSERT INTO food_log_entries (user_id, food_id, grams, meal, logged_on) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [req.userId, food_id, grams, meal, logged_on]
  );
  res.status(201).json(result.rows[0]);
});

router.delete("/:id", async (req, res) => {
  await pool.query("DELETE FROM food_log_entries WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
  res.status(204).end();
});

module.exports = router;
