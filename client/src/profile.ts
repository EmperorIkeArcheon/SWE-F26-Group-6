// Profile shape, limits, and form validation for onboarding.
// Limits mirror server/profileValidation.js so errors show before a request is sent.

export type Sex = 'male' | 'female'
export type Goal = 'lose' | 'maintain' | 'gain'
export type Units = 'imperial' | 'metric'

export interface Profile {
  height_cm: number | null
  weight_kg: number | null
  age: number | null
  sex: Sex | null
  goal: Goal | null
  role?: string
}

export interface ProfilePayload {
  height_cm: number
  weight_kg: number
  age: number
  sex: Sex
  goal: Goal
}

export interface Goals {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export const LIMITS = {
  height_cm: { min: 90, max: 250 },
  weight_kg: { min: 25, max: 350 },
  age: { min: 13, max: 120 },
}

const CM_PER_INCH = 2.54
const KG_PER_LB = 0.45359237

export function isProfileComplete(profile: Profile | null | undefined) {
  return (
    !!profile &&
    profile.height_cm != null &&
    profile.weight_kg != null &&
    profile.age != null &&
    profile.sex != null &&
    profile.goal != null
  )
}

export function cmToFtIn(cm: number) {
  const totalInches = Math.round(cm / CM_PER_INCH)
  return { ft: Math.floor(totalInches / 12), inches: totalInches % 12 }
}

export function ftInToCm(ft: number, inches: number) {
  return Math.round((ft * 12 + inches) * CM_PER_INCH * 10) / 10
}

export function kgToLb(kg: number) {
  return Math.round(kg / KG_PER_LB)
}

export function lbToKg(lb: number) {
  return Math.round(lb * KG_PER_LB * 10) / 10
}

export interface OnboardingForm {
  name: string
  age: string
  sex: Sex | ''
  units: Units
  heightCm: string
  heightFt: string
  heightIn: string
  weight: string
  goal: Goal | ''
}

export type FormErrors = Partial<Record<keyof OnboardingForm, string>>

export const emptyForm: OnboardingForm = {
  name: '',
  age: '',
  sex: '',
  units: 'imperial',
  heightCm: '',
  heightFt: '',
  heightIn: '',
  weight: '',
  goal: '',
}

function parseNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return NaN
  return Number(trimmed)
}

export function heightInCm(form: OnboardingForm) {
  if (form.units === 'metric') return parseNumber(form.heightCm)
  const ft = parseNumber(form.heightFt)
  const inches = form.heightIn.trim() ? parseNumber(form.heightIn) : 0
  if (!Number.isFinite(ft) || !Number.isFinite(inches)) return NaN
  return ftInToCm(ft, inches)
}

export function weightInKg(form: OnboardingForm) {
  const weight = parseNumber(form.weight)
  if (!Number.isFinite(weight)) return NaN
  return form.units === 'metric' ? weight : lbToKg(weight)
}

// Switching units converts what has already been typed instead of discarding it.
export function switchUnits(
  form: OnboardingForm,
  units: Units,
): OnboardingForm {
  if (units === form.units) return form
  const cm = heightInCm(form)
  const kg = weightInKg(form)
  const next: OnboardingForm = { ...form, units }
  if (Number.isFinite(cm) && cm > 0) {
    if (units === 'metric') next.heightCm = String(Math.round(cm * 10) / 10)
    else {
      const { ft, inches } = cmToFtIn(cm)
      next.heightFt = String(ft)
      next.heightIn = String(inches)
    }
  }
  if (Number.isFinite(kg) && kg > 0)
    next.weight = String(units === 'metric' ? kg : kgToLb(kg))
  return next
}

export const STEP_COUNT = 3

// Step 0: about you. Step 1: body measurements. Step 2: goal.
export function validateStep(step: number, form: OnboardingForm): FormErrors {
  const errors: FormErrors = {}
  if (step === 0) {
    if (!form.name.trim()) errors.name = 'Please tell us what to call you.'
    const age = parseNumber(form.age)
    if (!form.age.trim()) errors.age = 'Please enter your age.'
    else if (!Number.isInteger(age))
      errors.age = 'Please enter your age as a whole number.'
    else if (age < LIMITS.age.min || age > LIMITS.age.max)
      errors.age = `Age must be between ${LIMITS.age.min} and ${LIMITS.age.max}.`
    if (!form.sex) errors.sex = 'Please choose an option.'
  }
  if (step === 1) {
    const cm = heightInCm(form)
    const heightField = form.units === 'metric' ? 'heightCm' : 'heightFt'
    const emptyHeight =
      form.units === 'metric' ? !form.heightCm.trim() : !form.heightFt.trim()
    if (emptyHeight) errors[heightField] = 'Please enter your height.'
    else if (
      !Number.isFinite(cm) ||
      cm < LIMITS.height_cm.min ||
      cm > LIMITS.height_cm.max
    )
      errors[heightField] =
        form.units === 'metric'
          ? `Height must be between ${LIMITS.height_cm.min} and ${LIMITS.height_cm.max} cm.`
          : 'Height must be between 3 ft and 8 ft 2 in.'
    const kg = weightInKg(form)
    if (!form.weight.trim()) errors.weight = 'Please enter your weight.'
    else if (
      !Number.isFinite(kg) ||
      kg < LIMITS.weight_kg.min ||
      kg > LIMITS.weight_kg.max
    )
      errors.weight =
        form.units === 'metric'
          ? `Weight must be between ${LIMITS.weight_kg.min} and ${LIMITS.weight_kg.max} kg.`
          : 'Weight must be between 56 and 771 lb.'
  }
  if (step === 2 && !form.goal) errors.goal = 'Please choose a goal.'
  return errors
}

export function toPayload(form: OnboardingForm): ProfilePayload {
  return {
    height_cm: heightInCm(form),
    weight_kg: weightInKg(form),
    age: Number(form.age),
    sex: form.sex as Sex,
    goal: form.goal as Goal,
  }
}
