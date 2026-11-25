import { useState } from 'react'
import type { FormEvent } from 'react'
import { Search } from 'lucide-react'
import { apiRequest } from './clerk.ts'
import type { ClerkInstance } from './clerk.ts'
import './Admin.css'

// Admin tools. Shown only to admins (App.tsx), and enforced again by requireAdmin on the server.

interface Food {
  id: number
  fdc_id: number | null
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface FoodForm {
  name: string
  calories: string
  protein: string
  carbs: string
  fat: string
}

// Mirrors FOOD_LIMITS in server/routes/admin.js so mistakes show before the request is sent.
const NAME_MAX = 200
const MACRO_TOTAL_MAX = 101
const NUTRIENTS = [
  { key: 'calories', label: 'Calories (kcal)', max: 900 },
  { key: 'protein', label: 'Protein (g)', max: 100 },
  { key: 'carbs', label: 'Carbs (g)', max: 100 },
  { key: 'fat', label: 'Fat (g)', max: 100 },
] as const

const emptyFoodForm: FoodForm = {
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
}

function toForm(food: Food): FoodForm {
  return {
    name: food.name,
    calories: String(food.calories),
    protein: String(food.protein),
    carbs: String(food.carbs),
    fat: String(food.fat),
  }
}

// Returns the first problem as a message, or an empty string when the form is valid.
function validateFood(form: FoodForm) {
  if (!form.name.trim()) return 'Please enter a name.'
  if (form.name.trim().length > NAME_MAX)
    return `Name must be ${NAME_MAX} characters or fewer.`
  let macros = 0
  for (const { key, label, max } of NUTRIENTS) {
    const raw = form[key].trim()
    const value = raw ? Number(raw) : NaN
    if (!Number.isFinite(value) || value < 0 || value > max)
      return `${label} must be a number between 0 and ${max}.`
    if (key !== 'calories') macros += value
  }
  if (macros > MACRO_TOTAL_MAX)
    return 'Protein, carbs and fat can’t total more than about 100 g per 100 g of food.'
  return ''
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export default function Admin({ clerk }: { clerk: ClerkInstance }) {
  const [query, setQuery] = useState('')
  const [foods, setFoods] = useState<Food[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [form, setForm] = useState<FoodForm>(emptyFoodForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [saved, setSaved] = useState(false)

  async function search(event: FormEvent) {
    event.preventDefault()
    setSearching(true)
    setSearchError('')
    try {
      const path = `/foods/saved?q=${encodeURIComponent(query.trim())}`
      setFoods(await apiRequest<Food[]>(clerk, path))
    } catch (error) {
      setSearchError(errorMessage(error, 'Something went wrong while searching.'))
    } finally {
      setSearching(false)
    }
  }

  function choose(food: Food) {
    setSelected(food)
    setForm(toForm(food))
    setFormError('')
    setSaved(false)
  }

  function update(key: keyof FoodForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!selected) return
    const problem = validateFood(form)
    if (problem) {
      setFormError(problem)
      setSaved(false)
      return
    }
    setSaving(true)
    setFormError('')
    setSaved(false)
    try {
      const updated = await apiRequest<Food>(
        clerk,
        `/admin/foods/${selected.id}`,
        {
          method: 'PUT',
          body: {
            name: form.name.trim(),
            calories: Number(form.calories),
            protein: Number(form.protein),
            carbs: Number(form.carbs),
            fat: Number(form.fat),
          },
        },
      )
      setSelected(updated)
      setForm(toForm(updated))
      setFoods(
        (current) =>
          current?.map((food) => (food.id === updated.id ? updated : food)) ??
          current,
      )
      setSaved(true)
    } catch (error) {
      setFormError(errorMessage(error, 'Something went wrong while saving.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="detail-grid">
      <section className="panel" aria-labelledby="admin-find-heading">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">SAVED FOODS</span>
            <h3 id="admin-find-heading">Find a food</h3>
          </div>
        </div>
        <p className="panel-description">
          Search the foods saved in NutriGator. Leave the box empty to list the
          first few alphabetically (up to 25 results).
        </p>
        <form
          className="admin-search"
          role="search"
          onSubmit={(event) => void search(event)}
        >
          <div className="field-group">
            <label className="visually-hidden" htmlFor="admin-food-search">
              Search saved foods
            </label>
            <div className="input-wrap">
              <Search size={18} aria-hidden="true" />
              <input
                id="admin-food-search"
                type="search"
                placeholder="e.g. banana"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          <button className="button primary" type="submit" disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>
        {searchError && (
          <p className="field-error" role="alert">
            {searchError}
          </p>
        )}
        {foods && foods.length === 0 && (
          <p className="admin-empty">No saved foods match that search.</p>
        )}
        {foods && foods.length > 0 && (
          <ul className="admin-food-list">
            {foods.map((food) => (
              <li key={food.id}>
                <button
                  type="button"
                  className="admin-food-item"
                  aria-pressed={selected?.id === food.id}
                  onClick={() => choose(food)}
                >
                  <span>{food.name}</span>
                  <span className="admin-food-kcal">
                    {Math.round(food.calories)} kcal
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="admin-edit-heading">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">NUTRITION VALUES</span>
            <h3 id="admin-edit-heading">
              {selected ? 'Edit food' : 'Choose a food'}
            </h3>
          </div>
        </div>
        {!selected ? (
          <p className="panel-description">
            Pick a food from the list to edit its name and nutrition values.
          </p>
        ) : (
          <>
            <p className="panel-description">
              Values are per 100 g. Changes apply to every user, including
              meals they have already logged.
            </p>
            <form
              className="admin-form"
              noValidate
              onSubmit={(event) => void save(event)}
            >
              <div className="field-group">
                <label htmlFor="admin-food-name">Name</label>
                <div className="input-wrap">
                  <input
                    id="admin-food-name"
                    type="text"
                    value={form.name}
                    onChange={(event) => update('name', event.target.value)}
                  />
                </div>
              </div>
              {NUTRIENTS.map(({ key, label }) => (
                <div className="field-group" key={key}>
                  <label htmlFor={`admin-food-${key}`}>{label}</label>
                  <div className="input-wrap">
                    <input
                      id={`admin-food-${key}`}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      value={form[key]}
                      onChange={(event) => update(key, event.target.value)}
                    />
                  </div>
                </div>
              ))}
              {formError && (
                <p className="field-error" role="alert">
                  {formError}
                </p>
              )}
              {saved && (
                <p className="admin-saved" role="status">
                  Saved. Everyone now sees the updated values.
                </p>
              )}
              <button className="button primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}