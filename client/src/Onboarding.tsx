import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, Leaf } from 'lucide-react'
import { apiRequest } from './clerk.ts'
import type { ClerkInstance } from './clerk.ts'
import {
  STEP_COUNT,
  emptyForm,
  switchUnits,
  toPayload,
  validateStep,
} from './profile.ts'
import type {
  FormErrors,
  Goal,
  Goals,
  OnboardingForm,
  Profile,
  Sex,
} from './profile.ts'

const STEP_TITLES = ['About you', 'Your measurements', 'Your goal']

const GOAL_OPTIONS: { value: Goal; label: string; hint: string }[] = [
  { value: 'lose', label: 'Lose weight', hint: 'A gentle calorie deficit' },
  {
    value: 'maintain',
    label: 'Maintain weight',
    hint: 'Stay right where you are',
  },
  { value: 'gain', label: 'Gain weight', hint: 'A small calorie surplus' },
]

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
]

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function describedBy(
  id: string,
  errors: FormErrors,
  key: keyof OnboardingForm,
  hint?: boolean,
) {
  if (errors[key]) return `${id}-error`
  return hint ? `${id}-hint` : undefined
}

export default function Onboarding({
  clerk,
  initialName,
  onComplete,
}: {
  clerk: ClerkInstance
  initialName: string
  onComplete: (goals: Goals | null) => void
}) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<OnboardingForm>({
    ...emptyForm,
    name: initialName,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    heading.current?.focus()
  }, [step])

  function update<K extends keyof OnboardingForm>(
    key: K,
    value: OnboardingForm[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: undefined }))
    setSaveError('')
  }

  function focusFirstError(found: FormErrors) {
    const first = Object.keys(found)[0]
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`#ob-${first}, [name="${first}"]`)
        ?.focus()
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const found = validateStep(step, form)
    if (Object.keys(found).length) {
      setErrors(found)
      focusFirstError(found)
      return
    }
    if (step < STEP_COUNT - 1) {
      setStep(step + 1)
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await apiRequest<Profile>(clerk, '/profile', {
        method: 'PUT',
        body: toPayload(form),
      })
      // The name lives with the Clerk account; a failure here should not block onboarding.
      try {
        const [first, ...rest] = form.name.trim().split(/\s+/)
        await clerk.user?.update({ firstName: first, lastName: rest.join(' ') })
      } catch {
        /* name is optional */
      }
      let goals: Goals | null = null
      try {
        goals = await apiRequest<Goals>(clerk, '/profile/goals')
      } catch {
        /* the dashboard will try again */
      }
      onComplete(goals)
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Something went wrong while saving. Please try again.',
      )
      setSaving(false)
    }
  }

  function back() {
    setErrors({})
    setSaveError('')
    setStep(step - 1)
  }

  const metric = form.units === 'metric'

  return (
    <main className="onboarding-page" id="main">
      <div className="onboarding-card">
        <span className="welcome-icon">
          <Leaf size={27} />
        </span>
        <p className="eyebrow">
          WELCOME TO NUTRIGATOR · STEP {step + 1} OF {STEP_COUNT}
        </p>
        <ol className="stepper" aria-label="Onboarding progress">
          {STEP_TITLES.map((title, index) => (
            <li
              key={title}
              className={
                index < step ? 'done' : index === step ? 'current' : ''
              }
              aria-current={index === step ? 'step' : undefined}
            >
              <span className="step-dot" aria-hidden="true">
                {index < step ? <Check size={13} /> : index + 1}
              </span>
              <span className="step-name">{title}</span>
            </li>
          ))}
        </ol>
        <h1 ref={heading} tabIndex={-1}>
          {step === 0 && 'Let’s get to know you.'}
          {step === 1 && 'Tell us about your body.'}
          {step === 2 && 'What would you like to do?'}
        </h1>
        <p className="form-intro">
          {step === 0 &&
            'This helps us personalise your daily nutrition targets.'}
          {step === 1 &&
            'We use these to estimate how much energy your body needs each day.'}
          {step === 2 && 'We’ll turn this into a daily calorie and macro plan.'}
        </p>
        <form onSubmit={submit} noValidate>
          {step === 0 && (
            <>
              <Field
                id="ob-name"
                label="What should we call you?"
                error={errors.name}
              >
                <div className={`input-wrap ${errors.name ? 'invalid' : ''}`}>
                  <input
                    id="ob-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    aria-invalid={!!errors.name}
                    aria-describedby={describedBy('ob-name', errors, 'name')}
                  />
                </div>
              </Field>
              <Field id="ob-age" label="Age" error={errors.age}>
                <div className={`input-wrap ${errors.age ? 'invalid' : ''}`}>
                  <input
                    id="ob-age"
                    name="age"
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 21"
                    value={form.age}
                    onChange={(e) => update('age', e.target.value)}
                    aria-invalid={!!errors.age}
                    aria-describedby={describedBy('ob-age', errors, 'age')}
                  />
                </div>
              </Field>
              <fieldset
                className="choice-group"
                aria-describedby={errors.sex ? 'ob-sex-error' : 'ob-sex-hint'}
              >
                <legend>Sex</legend>
                <div className="choice-row">
                  {SEX_OPTIONS.map(({ value, label }) => (
                    <label
                      key={value}
                      className={`choice ${form.sex === value ? 'selected' : ''}`}
                    >
                      <input
                        id={
                          value === SEX_OPTIONS[0].value ? 'ob-sex' : undefined
                        }
                        type="radio"
                        name="sex"
                        value={value}
                        checked={form.sex === value}
                        onChange={() => update('sex', value)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {errors.sex ? (
                  <p className="field-error" id="ob-sex-error" role="alert">
                    {errors.sex}
                  </p>
                ) : (
                  <p className="field-hint" id="ob-sex-hint">
                    Used only in the calorie equation we apply to you.
                  </p>
                )}
              </fieldset>
            </>
          )}
          {step === 1 && (
            <>
              <div className="segmented" role="group" aria-label="Units">
                {(['imperial', 'metric'] as const).map((units) => (
                  <button
                    key={units}
                    type="button"
                    className={form.units === units ? 'selected' : ''}
                    aria-pressed={form.units === units}
                    onClick={() => {
                      setForm((previous) => switchUnits(previous, units))
                      setErrors({})
                    }}
                  >
                    {units === 'imperial' ? 'ft / lb' : 'cm / kg'}
                  </button>
                ))}
              </div>
              {metric ? (
                <Field
                  id="ob-heightCm"
                  label="Height (cm)"
                  error={errors.heightCm}
                >
                  <div
                    className={`input-wrap ${errors.heightCm ? 'invalid' : ''}`}
                  >
                    <input
                      id="ob-heightCm"
                      name="heightCm"
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 172"
                      value={form.heightCm}
                      onChange={(e) => update('heightCm', e.target.value)}
                      aria-invalid={!!errors.heightCm}
                      aria-describedby={describedBy(
                        'ob-heightCm',
                        errors,
                        'heightCm',
                      )}
                    />
                  </div>
                </Field>
              ) : (
                <div className="field-row">
                  <Field
                    id="ob-heightFt"
                    label="Height (ft)"
                    error={errors.heightFt}
                  >
                    <div
                      className={`input-wrap ${errors.heightFt ? 'invalid' : ''}`}
                    >
                      <input
                        id="ob-heightFt"
                        name="heightFt"
                        type="text"
                        inputMode="numeric"
                        placeholder="5"
                        value={form.heightFt}
                        onChange={(e) => update('heightFt', e.target.value)}
                        aria-invalid={!!errors.heightFt}
                        aria-describedby={describedBy(
                          'ob-heightFt',
                          errors,
                          'heightFt',
                        )}
                      />
                    </div>
                  </Field>
                  <Field id="ob-heightIn" label="Height (in)">
                    <div className="input-wrap">
                      <input
                        id="ob-heightIn"
                        name="heightIn"
                        type="text"
                        inputMode="decimal"
                        placeholder="8"
                        value={form.heightIn}
                        onChange={(e) => update('heightIn', e.target.value)}
                      />
                    </div>
                  </Field>
                </div>
              )}
              <Field
                id="ob-weight"
                label={`Current weight (${metric ? 'kg' : 'lb'})`}
                error={errors.weight}
              >
                <div className={`input-wrap ${errors.weight ? 'invalid' : ''}`}>
                  <input
                    id="ob-weight"
                    name="weight"
                    type="text"
                    inputMode="decimal"
                    placeholder={metric ? 'e.g. 68' : 'e.g. 150'}
                    value={form.weight}
                    onChange={(e) => update('weight', e.target.value)}
                    aria-invalid={!!errors.weight}
                    aria-describedby={describedBy(
                      'ob-weight',
                      errors,
                      'weight',
                    )}
                  />
                </div>
              </Field>
            </>
          )}
          {step === 2 && (
            <fieldset
              className="choice-group"
              aria-describedby={errors.goal ? 'ob-goal-error' : undefined}
            >
              <legend className="visually-hidden">Your goal</legend>
              <div className="goal-choices">
                {GOAL_OPTIONS.map(({ value, label, hint }, index) => (
                  <label
                    key={value}
                    className={`choice goal-choice ${form.goal === value ? 'selected' : ''}`}
                  >
                    <input
                      id={index === 0 ? 'ob-goal' : undefined}
                      type="radio"
                      name="goal"
                      value={value}
                      checked={form.goal === value}
                      onChange={() => update('goal', value)}
                    />
                    <span>
                      <strong>{label}</strong>
                      <small>{hint}</small>
                    </span>
                  </label>
                ))}
              </div>
              {errors.goal && (
                <p className="field-error" id="ob-goal-error" role="alert">
                  {errors.goal}
                </p>
              )}
            </fieldset>
          )}
          {saveError && (
            <p className="credential-error" role="alert">
              {saveError}
            </p>
          )}
          <div className="onboarding-actions">
            {step > 0 && (
              <button
                className="button secondary"
                type="button"
                onClick={back}
                disabled={saving}
              >
                <ArrowLeft size={18} /> Back
              </button>
            )}
            <button className="button primary" type="submit" disabled={saving}>
              {step < STEP_COUNT - 1 ? (
                <>
                  Continue <ArrowRight size={18} />
                </>
              ) : saving ? (
                'Saving…'
              ) : (
                <>
                  Finish setup <Check size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
