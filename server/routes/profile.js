const express = require("express");
const pool = require("../db");
const {calculateGoals} = require("../goals");

const router = express.Router();

const PROFILE_COLUMNS = "name, height_cm, weight_kg, age, sex, goal, role";

// Keep these in sync with client/src/profileForm.ts
const LIMITS = {
  age: { min: 13, max: 120 },
  height_cm: { min: 100, max: 250 },
  weight_kg: { min: 25, max: 400 },
};
const MAX_NAME_LENGTH = 60;

function inRange(value, { min, max }) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

// Returns an object of { field: message }. Empty object means the profile is valid.
function validateProfile(body) {
  const { name, height_cm, weight_kg, age, sex, goal } = body;
  const fields = {};

  if (typeof name !== "string" || name.trim() === "") {
    fields.name = "name is required";
  } else if (name.trim().length > MAX_NAME_LENGTH) {
    fields.name = `name must be ${MAX_NAME_LENGTH} characters or fewer`;
  }

  if (!inRange(age, LIMITS.age) || !Number.isInteger(age)) {
    fields.age = `age must be a whole number between ${LIMITS.age.min} and ${LIMITS.age.max}`;
  }

  if (!["male", "female"].includes(sex)) {
    fields.sex = "sex must be male or female";
  }

  if (!inRange(height_cm, LIMITS.height_cm)) {
    fields.height_cm = `height_cm must be between ${LIMITS.height_cm.min} and ${LIMITS.height_cm.max}`;
  }

  if (!inRange(weight_kg, LIMITS.weight_kg)) {
    fields.weight_kg = `weight_kg must be between ${LIMITS.weight_kg.min} and ${LIMITS.weight_kg.max}`;
  }

  if (!["lose", "maintain", "gain"].includes(goal)) {
    fields.goal = "goal must be lose, maintain, or gain";
  }

  return fields;
}

router.get("/", async (req, res) => {
  const result = await pool.query(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = $1`, [req.userId]);
  res.json(result.rows[0]);
});

router.put("/", async (req, res) => {
  const body = req.body ?? {};
  const fields = validateProfile(body);

  if (Object.keys(fields).length > 0) {
    // `error` is a single readable message; `fields` lets the frontend flag each input.
    return res.status(400).json({ error: Object.values(fields)[0], fields });
  }

  const { name, height_cm, weight_kg, age, sex, goal } = body;

  const result = await pool.query(
    `UPDATE users SET name = $1, height_cm = $2, weight_kg = $3, age = $4, sex = $5, goal = $6 WHERE id = $7 RETURNING ${PROFILE_COLUMNS}`,
    [name.trim(), height_cm, weight_kg, age, sex, goal, req.userId]
  );
  res.json(result.rows[0]);
});

router.get("/goals", async (req, res) => {
  const result = await pool.query("SELECT height_cm, weight_kg, age, sex, goal FROM users WHERE id = $1", [req.userId]);
  const profile = result.rows[0];

  if (Object.values(profile).includes(null)) {
    return res.status(404).json({error: "Complete your profile to get goals"});
  }

  res.json(calculateGoals(profile));
});

module.exports = router;
