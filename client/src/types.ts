// Shapes returned by / sent to the Express server (server/routes/profile.js).
// Kept free of browser-only code so tests and the build can both import it.

export type Sex = 'male' | 'female'
export type Goal = 'lose' | 'maintain' | 'gain'

/** What the client sends to PUT /profile. Units are always cm and kg. */
export interface ProfilePayload {
  name: string
  age: number
  sex: Sex
  height_cm: number
  weight_kg: number
  goal: Goal
}

/** GET /profile. Every field is null until onboarding is finished. */
export interface Profile {
  name: string | null
  age: number | null
  sex: string | null
  height_cm: number | null
  weight_kg: number | null
  goal: string | null
  role: string
}

export interface CompleteProfile extends ProfilePayload {
  role: string
}

/** GET /profile/goals */
export interface Goals {
  calories: number
  protein: number
  carbs: number
  fat: number
}

const SEXES: string[] = ['male', 'female']
const GOALS: string[] = ['lose', 'maintain', 'gain']

/** A profile counts as onboarded once every field the goal formula needs is set. */
export function isProfileComplete(
  profile: Profile,
): profile is CompleteProfile {
  return (
    typeof profile.name === 'string' &&
    profile.name.trim() !== '' &&
    typeof profile.age === 'number' &&
    typeof profile.height_cm === 'number' &&
    typeof profile.weight_kg === 'number' &&
    typeof profile.sex === 'string' &&
    SEXES.includes(profile.sex) &&
    typeof profile.goal === 'string' &&
    GOALS.includes(profile.goal)
  )
}
