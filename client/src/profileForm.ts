import type { Goal, ProfilePayload, Sex } from './types.ts'

// Pure form logic for onboarding: unit conversion, validation, and building the
// payload. No React or browser APIs here so it can be unit tested directly.

export type UnitSystem = 'imperial' | 'metric'
export type Step = 0 | 1 | 2

// Keep these in sync with server/routes/profile.js
export const LIMITS = {
  age: { min: 13, max: 120 },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 25, max: 400 },
}
export const MAX_NAME_LENGTH = 60

const CM_PER_INCH = 2.54
const LB_PER_KG = 2.20462

export interface Draft {
  name: string
  age: string
  sex: Sex | ''
  units: UnitSystem
  heightCm: string
  heightFt: string
  heightIn: string
  weight: string
  goal: Goal | ''
}

export type Field = 'name' | 'age' | 'sex' | 'height' | 'weight' | 'goal'
export type DraftErrors = Partial<Record<Field, string>>

/** Which fields are asked on each step of the wizard. */
export const STEP_FIELDS: Record<Step, Field[]> = {
  0: ['name', 'age', 'sex'],
  1: ['height', 'weight'],
  2: ['goal'],
}

export function emptyDraft(name = ''): Draft {
  return {
    name,
    age: '',
    sex: '',
    units: 'imperial',
    heightCm: '',
    heightFt: '',
    heightIn: '',
    weight: '',
    goal: '',
  }
}

function parse(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const number = Number(trimmed)
  return Number.isFinite(number) ? number : null
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}

/** Height in centimetres (1 decimal), or null if the inputs are blank or not numbers. */
export function heightToCm(draft: Draft): number | null {
  if (draft.units === 'metric') {
    const cm = parse(draft.heightCm)
    return cm === null ? null : round1(cm)
  }
  const feet = parse(draft.heightFt)
  const inches = draft.heightIn.trim() === '' ? 0 : parse(draft.heightIn)
  if (feet === null || inches === null) return null
  return round1((feet * 12 + inches) * CM_PER_INCH)
}

/** Weight in kilograms (1 decimal), or null if blank or not a number. */
export function weightToKg(draft: Draft): number | null {
  const weight = parse(draft.weight)
  if (weight === null) return null
  return round1(draft.units === 'metric' ? weight : weight / LB_PER_KG)
}

function feetAndInches(totalInches: number) {
  const feet = Math.floor(totalInches / 12)
  return `${feet} ft ${Math.round(totalInches - feet * 12)} in`
}

function heightRangeMessage(units: UnitSystem) {
  const { min, max } = LIMITS.heightCm
  if (units === 'metric') return `Enter a height between ${min} and ${max} cm.`
  const low = feetAndInches(Math.ceil(min / CM_PER_INCH))
  const high = feetAndInches(Math.floor(max / CM_PER_INCH))
  return `Enter a height between ${low} and ${high}.`
}

function weightRangeMessage(units: UnitSystem) {
  const { min, max } = LIMITS.weightKg
  if (units === 'metric') return `Enter a weight between ${min} and ${max} kg.`
  return `Enter a weight between ${Math.ceil(min * LB_PER_KG)} and ${Math.floor(max * LB_PER_KG)} lb.`
}

/** Returns an error message per invalid field on the given step. Empty = valid. */
export function validateStep(step: Step, draft: Draft): DraftErrors {
  const errors: DraftErrors = {}

  if (step === 0) {
    const name = draft.name.trim()
    if (!name) errors.name = 'Please enter your name.'
    else if (name.length > MAX_NAME_LENGTH)
      errors.name = `Please use ${MAX_NAME_LENGTH} characters or fewer.`

    const age = parse(draft.age)
    if (age === null) errors.age = 'Please enter your age.'
    else if (
      !Number.isInteger(age) ||
      age < LIMITS.age.min ||
      age > LIMITS.age.max
    )
      errors.age = `Enter a whole number between ${LIMITS.age.min} and ${LIMITS.age.max}.`

    if (!draft.sex) errors.sex = 'Please choose an option.'
  }

  if (step === 1) {
    const cm = heightToCm(draft)
    if (
      draft.units === 'metric'
        ? draft.heightCm.trim() === ''
        : draft.heightFt.trim() === ''
    )
      errors.height = 'Please enter your height.'
    else if (
      cm === null ||
      cm < LIMITS.heightCm.min ||
      cm > LIMITS.heightCm.max
    )
      errors.height = heightRangeMessage(draft.units)

    const kg = weightToKg(draft)
    if (draft.weight.trim() === '') errors.weight = 'Please enter your weight.'
    else if (
      kg === null ||
      kg < LIMITS.weightKg.min ||
      kg > LIMITS.weightKg.max
    )
      errors.weight = weightRangeMessage(draft.units)
  }

  if (step === 2) {
    if (!draft.goal) errors.goal = 'Please choose a goal.'
  }

  return errors
}

/** Validates every step and returns the payload for PUT /profile, or null if invalid. */
export function buildPayload(draft: Draft): ProfilePayload | null {
  for (const step of [0, 1, 2] as const) {
    if (Object.keys(validateStep(step, draft)).length) return null
  }
  const age = parse(draft.age)
  const height_cm = heightToCm(draft)
  const weight_kg = weightToKg(draft)
  if (age === null || height_cm === null || weight_kg === null) return null
  if (!draft.sex || !draft.goal) return null
  return {
    name: draft.name.trim(),
    age,
    sex: draft.sex,
    height_cm,
    weight_kg,
    goal: draft.goal,
  }
}

/** Switches unit system, carrying over any height/weight already entered. */
export function switchUnits(draft: Draft, units: UnitSystem): Draft {
  if (draft.units === units) return draft
  const cm = heightToCm(draft)
  const kg = weightToKg(draft)
  const next: Draft = { ...draft, units }

  if (units === 'metric') {
    next.heightCm = cm === null ? '' : String(cm)
    next.weight = kg === null ? '' : String(kg)
    next.heightFt = ''
    next.heightIn = ''
  } else {
    next.heightCm = ''
    next.heightFt = ''
    next.heightIn = ''
    if (cm !== null) {
      const totalInches = cm / CM_PER_INCH
      let feet = Math.floor(totalInches / 12)
      let inches = round1(totalInches - feet * 12)
      if (inches >= 12) {
        feet += 1
        inches = 0
      }
      next.heightFt = String(feet)
      next.heightIn = String(inches)
    }
    next.weight = kg === null ? '' : String(round1(kg * LB_PER_KG))
  }
  return next
}
