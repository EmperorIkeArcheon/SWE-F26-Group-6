import { expect, test } from '@playwright/test'
import {
  cmToFtIn,
  emptyForm,
  ftInToCm,
  isProfileComplete,
  switchUnits,
  toPayload,
  validateStep,
} from '../src/profile.ts'
import type { OnboardingForm } from '../src/profile.ts'

// Onboarding validation is pure logic, so these run without a browser, Clerk, or the API.

const imperial: OnboardingForm = {
  ...emptyForm,
  name: 'Alex Gator',
  age: '21',
  sex: 'male',
  heightFt: '5',
  heightIn: '8',
  weight: '150',
  goal: 'maintain',
}

test('ONB-1: a profile counts as complete only when every field is saved', () => {
  expect(isProfileComplete(null)).toBe(false)
  expect(
    isProfileComplete({
      height_cm: null,
      weight_kg: null,
      age: null,
      sex: null,
      goal: null,
      role: 'member',
    }),
  ).toBe(false)
  expect(
    isProfileComplete({
      height_cm: 172,
      weight_kg: 60,
      age: 21,
      sex: 'male',
      goal: null,
    }),
  ).toBe(false)
  expect(
    isProfileComplete({
      height_cm: 172,
      weight_kg: 60,
      age: 21,
      sex: 'male',
      goal: 'maintain',
    }),
  ).toBe(true)
})

test('ONB-2: each step explains what is missing', () => {
  expect(Object.keys(validateStep(0, emptyForm))).toEqual([
    'name',
    'age',
    'sex',
  ])
  expect(Object.keys(validateStep(1, emptyForm))).toEqual([
    'heightFt',
    'weight',
  ])
  expect(
    Object.keys(validateStep(1, { ...emptyForm, units: 'metric' })),
  ).toEqual(['heightCm', 'weight'])
  expect(Object.keys(validateStep(2, emptyForm))).toEqual(['goal'])
  for (const step of [0, 1, 2]) expect(validateStep(step, imperial)).toEqual({})
})

test('ONB-3: age and measurements outside the server limits are rejected', () => {
  expect(validateStep(0, { ...imperial, age: '12' }).age).toBeDefined()
  expect(validateStep(0, { ...imperial, age: '121' }).age).toBeDefined()
  expect(validateStep(0, { ...imperial, age: '20.5' }).age).toBeDefined()
  expect(validateStep(0, { ...imperial, age: 'abc' }).age).toBeDefined()
  expect(validateStep(1, { ...imperial, heightFt: '2' }).heightFt).toBeDefined()
  expect(validateStep(1, { ...imperial, heightFt: '9' }).heightFt).toBeDefined()
  expect(validateStep(1, { ...imperial, weight: '20' }).weight).toBeDefined()
  expect(validateStep(1, { ...imperial, weight: '900' }).weight).toBeDefined()
  expect(
    validateStep(1, {
      ...imperial,
      units: 'metric',
      heightCm: '30',
      weight: '70',
    }).heightCm,
  ).toBeDefined()
})

test('ONB-4: the saved payload is always metric', () => {
  expect(
    toPayload({ ...imperial, units: 'metric', heightCm: '172', weight: '60' }),
  ).toEqual({
    height_cm: 172,
    weight_kg: 60,
    age: 21,
    sex: 'male',
    goal: 'maintain',
  })
  const payload = toPayload(imperial)
  expect(payload.height_cm).toBe(ftInToCm(5, 8))
  expect(payload.height_cm).toBeCloseTo(172.7, 1)
  expect(payload.weight_kg).toBeCloseTo(68, 0)
})

test('ONB-5: switching units converts what was typed', () => {
  const metric = switchUnits(imperial, 'metric')
  expect(metric.units).toBe('metric')
  expect(Number(metric.heightCm)).toBeCloseTo(172.7, 1)
  expect(Number(metric.weight)).toBeCloseTo(68, 0)
  const back = switchUnits(metric, 'imperial')
  expect(back.heightFt).toBe('5')
  expect(back.heightIn).toBe('8')
  expect(back.weight).toBe('150')
  expect(cmToFtIn(180)).toEqual({ ft: 5, inches: 11 })
  // Blank fields stay blank rather than becoming "NaN".
  expect(switchUnits(emptyForm, 'metric').heightCm).toBe('')
})
