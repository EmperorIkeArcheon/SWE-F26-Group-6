import { expect, test } from '@playwright/test'
import {
  buildPayload,
  emptyDraft,
  heightToCm,
  switchUnits,
  validateStep,
  weightToKg,
} from '../src/profileForm.ts'
import type { Draft } from '../src/profileForm.ts'
import { isProfileComplete } from '../src/types.ts'

// Logic-only tests: no browser page is used, so they run quickly in both projects.

const imperial: Draft = {
  ...emptyDraft('  Sam Rivera '),
  age: '24',
  sex: 'female',
  heightFt: '5',
  heightIn: '8',
  weight: '150',
  goal: 'maintain',
}

test('SP1-6: imperial height and weight convert to cm and kg', () => {
  expect(heightToCm(imperial)).toBe(172.7)
  expect(weightToKg(imperial)).toBe(68)
  // Blank inches count as zero.
  expect(heightToCm({ ...imperial, heightFt: '6', heightIn: '' })).toBe(182.9)
})

test('SP1-6: every step reports its blank required fields', () => {
  expect(Object.keys(validateStep(0, emptyDraft())).sort()).toEqual([
    'age',
    'name',
    'sex',
  ])
  expect(Object.keys(validateStep(1, emptyDraft())).sort()).toEqual([
    'height',
    'weight',
  ])
  expect(Object.keys(validateStep(2, emptyDraft()))).toEqual(['goal'])
})

test('SP1-6: age must be a whole number from 13 to 120', () => {
  for (const age of ['12', '121', '20.5', 'abc', '-3'])
    expect(validateStep(0, { ...imperial, age }).age).toBeTruthy()
  for (const age of ['13', '24', '120'])
    expect(validateStep(0, { ...imperial, age }).age).toBeUndefined()
})

test('SP1-6: name is trimmed, required, and limited to 60 characters', () => {
  expect(validateStep(0, { ...imperial, name: '   ' }).name).toBeTruthy()
  expect(
    validateStep(0, { ...imperial, name: 'x'.repeat(61) }).name,
  ).toBeTruthy()
  expect(
    validateStep(0, { ...imperial, name: 'x'.repeat(60) }).name,
  ).toBeUndefined()
})

test('SP1-6: out-of-range measurements are explained in the chosen units', () => {
  const short = validateStep(1, { ...imperial, heightFt: '2', heightIn: '0' })
  expect(short.height).toContain('ft')
  const light = validateStep(1, { ...imperial, weight: '20' })
  expect(light.weight).toContain('lb')

  const metric: Draft = {
    ...imperial,
    units: 'metric',
    heightCm: '300',
    weight: '500',
  }
  const errors = validateStep(1, metric)
  expect(errors.height).toContain('cm')
  expect(errors.weight).toContain('kg')
  expect(validateStep(1, imperial)).toEqual({})
})

test('SP1-6: switching units keeps what was already entered', () => {
  const metric = switchUnits(imperial, 'metric')
  expect(metric.units).toBe('metric')
  expect(metric.heightCm).toBe('172.7')
  expect(metric.weight).toBe('68')

  const back = switchUnits(metric, 'imperial')
  expect(back.heightFt).toBe('5')
  expect(back.heightIn).toBe('8')
  expect(back.weight).toBe('149.9')

  // Blank stays blank rather than turning into 0.
  expect(switchUnits(emptyDraft(), 'metric').heightCm).toBe('')
})

test('SP1-6: buildPayload returns cm/kg values for the server, or null', () => {
  expect(buildPayload(imperial)).toEqual({
    name: 'Sam Rivera',
    age: 24,
    sex: 'female',
    height_cm: 172.7,
    weight_kg: 68,
    goal: 'maintain',
  })
  expect(buildPayload({ ...imperial, goal: '' })).toBeNull()
  expect(buildPayload({ ...imperial, weight: '' })).toBeNull()
})

test('SP1-6: a profile only counts as onboarded when every field is set', () => {
  const complete = {
    name: 'Sam',
    age: 24,
    sex: 'female',
    height_cm: 172.7,
    weight_kg: 68,
    goal: 'maintain',
    role: 'member',
  }
  expect(isProfileComplete(complete)).toBe(true)
  expect(isProfileComplete({ ...complete, name: null })).toBe(false)
  expect(isProfileComplete({ ...complete, name: '  ' })).toBe(false)
  expect(isProfileComplete({ ...complete, weight_kg: null })).toBe(false)
  expect(isProfileComplete({ ...complete, goal: 'bulk' })).toBe(false)
})
