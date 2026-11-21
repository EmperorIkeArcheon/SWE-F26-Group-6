const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateProfile } = require("../profileValidation");

const valid = { height_cm: 172, weight_kg: 60, age: 21, sex: "male", goal: "maintain" };

test("validateProfile accepts a complete profile", () => {
  assert.equal(validateProfile(valid), null);
});

test("validateProfile rejects a missing body", () => {
  assert.notEqual(validateProfile(undefined), null);
});

test("validateProfile rejects an unknown goal or sex", () => {
  assert.match(validateProfile({ ...valid, goal: "maintai" }), /goal/);
  assert.match(validateProfile({ ...valid, sex: "other" }), /sex/);
});

test("validateProfile rejects missing, non-numeric, and out-of-range measurements", () => {
  assert.match(validateProfile({ ...valid, height_cm: null }), /height_cm/);
  assert.match(validateProfile({ ...valid, weight_kg: "60" }), /weight_kg/);
  assert.match(validateProfile({ ...valid, weight_kg: 5 }), /weight_kg/);
  assert.match(validateProfile({ ...valid, height_cm: 400 }), /height_cm/);
  assert.match(validateProfile({ ...valid, age: 7 }), /age/);
  assert.match(validateProfile({ ...valid, age: NaN }), /age/);
});

test("validateProfile requires a whole-number age", () => {
  assert.match(validateProfile({ ...valid, age: 20.5 }), /whole number/);
});
