import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Leaf,
  LogOut,
  Target,
} from 'lucide-react'
import { errorMessage } from './api.ts'
import {
  buildPayload,
  emptyDraft,
  STEP_FIELDS,
  switchUnits,
  validateStep,
} from './profileForm.ts'
import type {
  Draft,
  DraftErrors,
  Field,
  Step,
  UnitSystem,
} from './profileForm.ts'
import type { Goal, ProfilePayload, Sex } from './types.ts'
import { Brand } from './Brand.tsx'

const STEP_TITLES = ['About you', 'Your body', 'Your goal'] as const

const STEP_COPY: Record<Step, { heading: string; intro: string }> = {
  0: {
    heading: 'Nice to meet you.',
    intro: 'Tell us a little about yourself so we can personalize NutriGator.',
  },
  1: {
    heading: 'Your measurements.',
    intro:
      'We use these to estimate how much energy your body needs each day. They stay private to your account.',
  },
  2: {
    heading: 'What’s your goal?',
    intro:
      'This sets your daily calorie and nutrient targets. You can change it later.',
  },
}

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
]

const GOAL_OPTIONS: { value: Goal; label: string; hint: string }[] = [
  { value: 'lose', label: 'Lose weight', hint: 'A gentle calorie deficit' },
  {
    value: 'maintain',
    label: 'Maintain weight',
    hint: 'Stay right where you are',
  },
  { value: 'gain', label: 'Gain weight', hint: 'A modest calorie surplus' },
]

// Element to focus for each field when it has an error.
function fieldElementId(field: Field, units: UnitSystem) {
  switch (field) {
    case 'name':
      return 'ob-name'
    case 'age':
      return 'ob-age'
    case 'sex':
      return 'ob-sex-female'
    case 'height':
      return units === 'metric' ? 'ob-height-cm' : 'ob-height-ft'
    case 'weight':
      return 'ob-weight'
    case 'goal':
      return 'ob-goal-lose'
  }
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p className="field-error" id={id} role="alert">
      {message}
    </p>
  )
}

function ChoiceGroup<T extends string>({
  legend,
  name,
  idPrefix,
  options,
  value,
  onChange,
  error,
  errorId,
  columns,
}: {
  legend: string
  name: string
  idPrefix: string
  options: { value: T; label: string; hint?: string }[]
  value: T | ''
  onChange: (value: T) => void
  error?: string
  errorId: string
  columns?: boolean
}) {
  return (
    <fieldset
      className="field-group choice-group"
      aria-describedby={error ? errorId : undefined}
    >
      <legend>{legend}</legend>
      <div className={`choice-list ${columns ? 'choice-columns' : ''}`}>
        {options.map((option) => (
          <label className="choice" key={option.value}>
            <input
              type="radio"
              id={`${idPrefix}-${option.value}`}
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              aria-invalid={!!error}
            />
            <span className="choice-body">
              <strong>{option.label}</strong>
              {option.hint && <small>{option.hint}</small>}
            </span>
            <Check className="choice-check" size={16} aria-hidden="true" />
          </label>
        ))}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  )
}

function TextField({
  id,
  label,
  error,
  suffix,
  children,
}: {
  id: string
  label: string
  error?: string
  suffix?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <div className={`input-wrap ${error ? 'invalid' : ''}`}>
        {children}
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}

export function Onboarding({
  initialName,
  onComplete,
  onSignOut,
}: {
  initialName: string
  onComplete: (payload: ProfilePayload) => Promise<void>
  onSignOut: () => void
}) {
  const [step, setStep] = useState<Step>(0)
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(initialName))
  const [errors, setErrors] = useState<DraftErrors>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  // Move focus to the step heading when the step changes (not on first load).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    heading.current?.focus()
  }, [step])

  function update(changes: Partial<Draft>, clear: Field[] = []) {
    setDraft((previous) => ({ ...previous, ...changes }))
    if (clear.length) {
      setErrors((previous) => {
        const next = { ...previous }
        for (const field of clear) delete next[field]
        return next
      })
    }
    setSubmitError('')
  }

  function focusFirstError(found: DraftErrors) {
    const first = STEP_FIELDS[step].find((field) => found[field])
    if (!first) return
    requestAnimationFrame(() =>
      document.getElementById(fieldElementId(first, draft.units))?.focus(),
    )
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validateStep(step, draft)
    setErrors(found)
    if (Object.keys(found).length) {
      focusFirstError(found)
      return
    }
    if (step < 2) {
      setStep((step + 1) as Step)
      return
    }

    const payload = buildPayload(draft)
    if (!payload) {
      setSubmitError(
        'Some answers need another look. Please go back and check them.',
      )
      return
    }
    setSaving(true)
    setSubmitError('')
    try {
      await onComplete(payload)
    } catch (error) {
      setSubmitError(errorMessage(error))
      setSaving(false)
    }
  }

  function back() {
    setErrors({})
    setSubmitError('')
    setStep((step - 1) as Step)
  }

  const metric = draft.units === 'metric'
  const copy = STEP_COPY[step]

  return (
    <main className="login-page" id="main">
      <section
        className="login-story onboarding-story"
        aria-labelledby="ob-story-title"
      >
        <Brand />
        <div className="story-content">
          <span className="eyebrow">
            <span className="tiny-line" /> WELCOME TO NUTRIGATOR
          </span>
          <h1 id="ob-story-title">
            Let’s build
            <br />
            <span>your plan.</span>
          </h1>
          <p>
            A few quick questions and your daily calorie and nutrient targets
            will be ready.
          </p>
        </div>
        <span className="story-footer">It only takes about a minute.</span>
      </section>

      <section className="login-form-panel" aria-labelledby="ob-heading">
        <div className="mobile-brand">
          <Brand />
        </div>
        <div className="login-form-content onboarding-content">
          <ol className="stepper" aria-label="Setup progress">
            {STEP_TITLES.map((title, index) => (
              <li
                key={title}
                className={
                  index < step ? 'done' : index === step ? 'current' : undefined
                }
                aria-current={index === step ? 'step' : undefined}
              >
                <span className="stepper-dot">
                  {index < step ? (
                    <Check size={13} aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="stepper-label">{title}</span>
              </li>
            ))}
          </ol>

          <p className="eyebrow">
            STEP {step + 1} OF {STEP_TITLES.length}
          </p>
          <h2 id="ob-heading" ref={heading} tabIndex={-1}>
            {copy.heading}
          </h2>
          <p className="form-intro">{copy.intro}</p>

          <form onSubmit={submit} noValidate>
            {step === 0 && (
              <>
                <TextField
                  id="ob-name"
                  label="What should we call you?"
                  error={errors.name}
                >
                  <input
                    id="ob-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    value={draft.name}
                    onChange={(e) => update({ name: e.target.value }, ['name'])}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'ob-name-error' : undefined}
                  />
                </TextField>
                <TextField
                  id="ob-age"
                  label="Age"
                  error={errors.age}
                  suffix="years"
                >
                  <input
                    id="ob-age"
                    name="age"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="e.g. 24"
                    value={draft.age}
                    onChange={(e) => update({ age: e.target.value }, ['age'])}
                    aria-invalid={!!errors.age}
                    aria-describedby={errors.age ? 'ob-age-error' : undefined}
                  />
                </TextField>
                <ChoiceGroup<Sex>
                  legend="Sex"
                  name="sex"
                  idPrefix="ob-sex"
                  options={SEX_OPTIONS}
                  value={draft.sex}
                  onChange={(sex) => update({ sex }, ['sex'])}
                  error={errors.sex}
                  errorId="ob-sex-error"
                  columns
                />
                <p className="field-hint">
                  Used only in the formula that estimates your daily calorie
                  needs.
                </p>
              </>
            )}

            {step === 1 && (
              <>
                <fieldset className="field-group choice-group">
                  <legend>Units</legend>
                  <div className="choice-list choice-columns">
                    {(
                      [
                        ['imperial', 'ft / in · lb'],
                        ['metric', 'cm · kg'],
                      ] as const
                    ).map(([value, label]) => (
                      <label className="choice" key={value}>
                        <input
                          type="radio"
                          name="units"
                          value={value}
                          checked={draft.units === value}
                          onChange={() => {
                            setDraft((previous) => switchUnits(previous, value))
                            setErrors({})
                          }}
                        />
                        <span className="choice-body">
                          <strong>{label}</strong>
                        </span>
                        <Check
                          className="choice-check"
                          size={16}
                          aria-hidden="true"
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>

                {metric ? (
                  <TextField
                    id="ob-height-cm"
                    label="Height"
                    error={errors.height}
                    suffix="cm"
                  >
                    <input
                      id="ob-height-cm"
                      name="height"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="e.g. 172"
                      value={draft.heightCm}
                      onChange={(e) =>
                        update({ heightCm: e.target.value }, ['height'])
                      }
                      aria-invalid={!!errors.height}
                      aria-describedby={
                        errors.height ? 'ob-height-cm-error' : undefined
                      }
                    />
                  </TextField>
                ) : (
                  <div className="field-group">
                    <label htmlFor="ob-height-ft">Height</label>
                    <div className="height-row">
                      <div
                        className={`input-wrap ${errors.height ? 'invalid' : ''}`}
                      >
                        <input
                          id="ob-height-ft"
                          name="height-feet"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="5"
                          value={draft.heightFt}
                          onChange={(e) =>
                            update({ heightFt: e.target.value }, ['height'])
                          }
                          aria-invalid={!!errors.height}
                          aria-describedby={
                            errors.height ? 'ob-height-ft-error' : undefined
                          }
                        />
                        <span className="input-suffix">ft</span>
                      </div>
                      <div
                        className={`input-wrap ${errors.height ? 'invalid' : ''}`}
                      >
                        <input
                          id="ob-height-in"
                          name="height-inches"
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder="8"
                          aria-label="Height, inches"
                          value={draft.heightIn}
                          onChange={(e) =>
                            update({ heightIn: e.target.value }, ['height'])
                          }
                          aria-invalid={!!errors.height}
                          aria-describedby={
                            errors.height ? 'ob-height-ft-error' : undefined
                          }
                        />
                        <span className="input-suffix">in</span>
                      </div>
                    </div>
                    <FieldError
                      id="ob-height-ft-error"
                      message={errors.height}
                    />
                  </div>
                )}

                <TextField
                  id="ob-weight"
                  label="Current weight"
                  error={errors.weight}
                  suffix={metric ? 'kg' : 'lb'}
                >
                  <input
                    id="ob-weight"
                    name="weight"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={metric ? 'e.g. 68' : 'e.g. 150'}
                    value={draft.weight}
                    onChange={(e) =>
                      update({ weight: e.target.value }, ['weight'])
                    }
                    aria-invalid={!!errors.weight}
                    aria-describedby={
                      errors.weight ? 'ob-weight-error' : undefined
                    }
                  />
                </TextField>
              </>
            )}

            {step === 2 && (
              <ChoiceGroup<Goal>
                legend="I want to"
                name="goal"
                idPrefix="ob-goal"
                options={GOAL_OPTIONS}
                value={draft.goal}
                onChange={(goal) => update({ goal }, ['goal'])}
                error={errors.goal}
                errorId="ob-goal-error"
              />
            )}

            {submitError && (
              <p className="credential-error" role="alert">
                {submitError}
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
              <button
                className="button primary"
                type="submit"
                disabled={saving}
              >
                {step < 2 ? (
                  <>
                    Continue <ArrowRight size={18} />
                  </>
                ) : saving ? (
                  'Saving…'
                ) : (
                  <>
                    Finish setup <Target size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          <button
            className="text-button onboarding-signout"
            type="button"
            onClick={onSignOut}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
        <p className="login-footer">
          <Leaf size={14} /> Good habits start with a little care.
        </p>
      </section>
    </main>
  )
}
