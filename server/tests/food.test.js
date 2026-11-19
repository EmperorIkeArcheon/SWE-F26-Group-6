const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");

const pool = require("../db");
const { toRow } = require("../usda");
const { saveFood } = require("../foodStore");
const foodsRouter = require("../routes/foods");


const cleanup = () => pool.query("DELETE FROM foods WHERE fdc_id BETWEEN 999000000 AND 999000999");

const fakeUsdaFood = (fdcId) => ({
  fdcId,
  description: "Test Banana",
  foodNutrients: [
    { nutrient: { id: 1008 }, amount: 89 },
    { nutrient: { id: 1003 }, amount: 1.1 },
    { nutrient: { id: 1004 }, amount: 0.3 },
    { nutrient: { id: 1005 }, amount: 22.8 },
  ],
});


const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.userId = 1;
  next();
});
app.use("/foods", foodsRouter);

describe("food storing", () => {
  const realFetch = global.fetch;
  let usdaCalls = 0;

  before(async () => {
    await cleanup();
    
    global.fetch = async (url) => {
      usdaCalls++;
      const fdcId = Number(String(url).split("/food/")[1].split("?")[0]);
      return { ok: true, json: async () => fakeUsdaFood(fdcId) };
    };
  });

  after(async () => {
    global.fetch = realFetch;
    await cleanup();
    await pool.end(); 
  });

  describe("toRow (USDA format -> table row)", () => {
    test("picks out name and the four macros", () => {
      assert.deepEqual(toRow(fakeUsdaFood(1)), {
        fdc_id: 1,
        name: "Test Banana",
        calories: 89,
        protein: 1.1,
        carbs: 22.8,
        fat: 0.3,
      });
    });

    test("falls back to the alternate energy id when 1008 is missing", () => {
      const food = { fdcId: 2, description: "Atwater food", foodNutrients: [{ nutrient: { id: 2047 }, amount: 120 }] };
      assert.equal(toRow(food).calories, 120);
    });

    test("uses 0 for nutrients USDA doesn't report (columns are NOT NULL)", () => {
      const row = toRow({ fdcId: 3, description: "Empty food" });
      assert.deepEqual([row.calories, row.protein, row.carbs, row.fat], [0, 0, 0, 0]);
    });

    test("keeps a real 0 instead of treating it as missing", () => {
      const food = { fdcId: 4, description: "Zero fat", foodNutrients: [{ nutrient: { id: 1004 }, amount: 0 }] };
      assert.equal(toRow(food).fat, 0);
    });
  });

  describe("saveFood (writes to the foods table)", () => {
    test("inserts a row and returns it with its new id", async () => {
      const saved = await saveFood(toRow(fakeUsdaFood(999000001)));
      assert.equal(typeof saved.id, "number");
      assert.equal(saved.fdc_id, 999000001);
      assert.equal(saved.name, "Test Banana");
      assert.equal(saved.calories, 89);
    });

    test("saving the same fdc_id again updates the row instead of duplicating it", async () => {
      await saveFood({ fdc_id: 999000002, name: "Old name", calories: 10, protein: 1, carbs: 1, fat: 1 });
      const updated = await saveFood({ fdc_id: 999000002, name: "New name", calories: 20, protein: 2, carbs: 2, fat: 2 });

      const { rows } = await pool.query("SELECT * FROM foods WHERE fdc_id = 999000002");
      assert.equal(rows.length, 1);
      assert.equal(updated.name, "New name");
      assert.equal(rows[0].calories, 20);
    });
  });

  describe("POST /foods/import", () => {
    test("fetches from USDA, saves the food, and returns 201", async () => {
      usdaCalls = 0;
      const res = await request(app).post("/foods/import").send({ fdc_id: 999000010 });

      assert.equal(res.status, 201);
      assert.equal(res.body.name, "Test Banana");
      assert.equal(res.body.calories, 89);
      assert.equal(usdaCalls, 1);

      const { rows } = await pool.query("SELECT * FROM foods WHERE fdc_id = 999000010");
      assert.equal(rows.length, 1);
    });

    test("importing a food we already have returns it without calling USDA", async () => {
      await request(app).post("/foods/import").send({ fdc_id: 999000011 });
      usdaCalls = 0;

      const res = await request(app).post("/foods/import").send({ fdc_id: 999000011 });
      assert.equal(res.status, 200);
      assert.equal(usdaCalls, 0);
    });

    test("rejects an fdc_id that isn't an integer", async () => {
      const res = await request(app).post("/foods/import").send({ fdc_id: "abc" });
      assert.equal(res.status, 400);
    });

    test("rejects a request with no fdc_id", async () => {
      const res = await request(app).post("/foods/import").send({});
      assert.equal(res.status, 400);
    });
  });

  describe("GET /foods/saved", () => {
    test("finds saved foods by part of the name, ignoring case", async () => {
      await saveFood({ fdc_id: 999000020, name: "Zzz Unique Test Food", calories: 1, protein: 1, carbs: 1, fat: 1 });
      const res = await request(app).get("/foods/saved").query({ q: "zzz unique" });

      assert.equal(res.status, 200);
      assert.ok(res.body.some((f) => f.fdc_id === 999000020));
    });
  });
});