// Shared rules for the onboarding / profile form. The client mirrors these limits
// in client/src/profile.ts so users see the same messages before the request is sent.
const LIMITS = {
  height_cm: { min: 90, max: 250 },
  weight_kg: { min: 25, max: 350 },
  age: { min: 13, max: 120 },
};

function validateProfile(body) {
  const { height_cm, weight_kg, age, sex, goal } = body ?? {};

  if (!["lose", "maintain", "gain"].includes(goal)) {
    return "goal must be lose, maintain, or gain";
  }

  if (!["male", "female"].includes(sex)) {
    return "sex must be male or female";
  }

  for (const [name, value] of [["height_cm", height_cm], ["weight_kg", weight_kg], ["age", age]]) {
    const { min, max } = LIMITS[name];
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
      return `${name} must be a number between ${min} and ${max}`;
    }
  }

  if (!Number.isInteger(age)) {
    return "age must be a whole number";
  }

  return null;
}

module.exports = { validateProfile, LIMITS };
