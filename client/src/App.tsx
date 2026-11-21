import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Beef,
  BookOpen,
  Check,
  ChevronRight,
  CircleCheck,
  Droplets,
  Eye,
  EyeOff,
  Flame,
  Heart,
  House,
  Leaf,
  LogOut,
  Mail,
  Menu,
  Plus,
  Salad,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Onboarding from './Onboarding.tsx'
import { accountFrom, apiRequest, clerkEnabled, loadClerk } from './clerk.ts'
import type { ClerkInstance, ClerkUser } from './clerk.ts'
import { isProfileComplete } from './profile.ts'
import type { Goals, Profile } from './profile.ts'
import './App.css'

// This is an explicitly public demo, not an authentication service.
const DEMO_EMAIL = 'demo@nutrigator.app'
const DEMO_PASSWORD = 'Track2026!'
const SESSION_KEY = 'nutrigator.demo-session'
type View = 'overview' | 'diary' | 'goals'

function hasDemoSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'active'
  } catch {
    return false
  }
}

function Brand() {
  return (
    <a className="brand" href="#main">
      <span className="brand-mark">
        <Leaf size={23} strokeWidth={2.2} />
      </span>
      <span>
        Nutri<span className="brand-light">Gator</span>
        <small>A LITTLE BETTER, EVERY DAY</small>
      </span>
    </a>
  )
}

function LoginStory() {
  return (
    <section className="login-story" aria-labelledby="story-title">
      <Brand />
      <div className="story-content">
        <span className="eyebrow">
          <span className="tiny-line" /> YOUR WELLNESS, IN BALANCE
        </span>
        <h1 id="story-title">
          Small steps.
          <br />
          <span>Healthier you.</span>
        </h1>
        <p>
          Make room for better habits. A simpler way to
          <br className="desktop-break" /> nourish your body and celebrate your
          progress.
        </p>
        <div className="story-visual" aria-hidden="true">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <span className="floating-leaf leaf-one">
            <Leaf size={29} />
          </span>
          <span className="floating-leaf leaf-two">
            <Heart size={22} />
          </span>
          <div className="balance-preview">
            <div className="preview-heading">
              <span className="preview-icon">
                <Flame size={20} />
              </span>
              <span>
                Today’s balance<small>Every choice adds up.</small>
              </span>
              <span className="preview-dots">•••</span>
            </div>
            <div className="preview-ring">
              <svg viewBox="0 0 180 180">
                <circle className="preview-ring-track" cx="90" cy="90" r="75" />
                <circle className="preview-ring-fill" cx="90" cy="90" r="75" />
              </svg>
              <div>
                <Flame size={22} />
                <strong>1,640</strong>
                <small>of 2,200 kcal</small>
              </div>
            </div>
            <div className="preview-macros">
              <span>
                <i className="dot teal" />
                Protein<strong>98 g</strong>
              </span>
              <span>
                <i className="dot coral" />
                Carbs<strong>192 g</strong>
              </span>
              <span>
                <i className="dot gold" />
                Fats<strong>53 g</strong>
              </span>
            </div>
          </div>
          <div className="streak-note">
            <span>
              <TrendingUp size={21} />
            </span>
            <div>
              Progress feels good.<small>One healthy habit at a time.</small>
            </div>
            <Sparkles size={18} />
          </div>
        </div>
        <div className="story-features">
          <span>
            <Salad size={18} /> Eat mindfully
          </span>
          <span>
            <TrendingUp size={18} /> Track progress
          </span>
          <span>
            <Heart size={18} /> Feel your best
          </span>
        </div>
      </div>
      <span className="story-footer">
        A fresh perspective on everyday nutrition.
      </span>
    </section>
  )
}

function Login({ onSignIn }: { onSignIn: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    credentials?: string
  }>({})
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: typeof errors = {}
    if (!email.trim()) next.email = 'Please enter your email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = 'Please enter a valid email address.'
    if (!password) next.password = 'Please enter your password.'
    if (Object.keys(next).length) {
      setErrors(next)
      if (next.email) emailRef.current?.focus()
      else passwordRef.current?.focus()
      return
    }
    if (
      email.trim().toLowerCase() !== DEMO_EMAIL ||
      password !== DEMO_PASSWORD
    ) {
      setErrors({
        credentials:
          'We couldn’t sign you in. Use the demo email and password shown below.',
      })
      return
    }
    onSignIn()
  }

  return (
    <main className="login-page" id="main">
      <LoginStory />
      <section className="login-form-panel" aria-labelledby="login-title">
        <div className="mobile-brand">
          <Brand />
        </div>
        <div className="login-form-content">
          <span className="welcome-icon">
            <Leaf size={27} />
          </span>
          <p className="eyebrow">LET’S KEEP GROWING</p>
          <h2 id="login-title" tabIndex={-1}>
            Welcome back.
          </h2>
          <p className="form-intro">Your next healthy habit starts here.</p>
          <form onSubmit={submit} noValidate>
            <div className="field-group">
              <label htmlFor="email">Email address</label>
              <div className={`input-wrap ${errors.email ? 'invalid' : ''}`}>
                <Mail size={18} />
                <input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setErrors((previous) => ({
                      ...previous,
                      email: undefined,
                      credentials: undefined,
                    }))
                  }}
                  required
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && (
                <p className="field-error" id="email-error" role="alert">
                  {errors.email}
                </p>
              )}
            </div>
            <div className="field-group">
              <label htmlFor="password">Password</label>
              <div className={`input-wrap ${errors.password ? 'invalid' : ''}`}>
                <ShieldCheck size={18} />
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setErrors((previous) => ({
                      ...previous,
                      password: undefined,
                      credentials: undefined,
                    }))
                  }}
                  required
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? 'password-error' : undefined
                  }
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setVisible(!visible)}
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  aria-pressed={visible}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="field-error" id="password-error" role="alert">
                  {errors.password}
                </p>
              )}
            </div>
            {errors.credentials && (
              <p className="credential-error" role="alert">
                {errors.credentials}
              </p>
            )}
            <button className="button primary sign-in" type="submit">
              Sign in <ArrowRight size={18} />
            </button>
          </form>
          <div className="divider">
            <span>NEW TO NUTRIGATOR?</span>
          </div>
          <button className="button secondary demo-button" onClick={onSignIn}>
            <span>Take a look around</span>
            <ArrowUpRight size={18} />
          </button>
          <div className="demo-disclosure">
            <span className="demo-label">
              <span className="status-dot" /> FRONTEND PREVIEW
            </span>
            <p>
              Explore a demo account with sample data. Account registration and
              live sign-in aren’t connected yet.
            </p>
            <details open={!!errors.credentials}>
              <summary>View demo sign-in details</summary>
              <dl>
                <dt>Email</dt>
                <dd>{DEMO_EMAIL}</dd>
                <dt>Password</dt>
                <dd>{DEMO_PASSWORD}</dd>
              </dl>
            </details>
          </div>
        </div>
        <p className="login-footer">
          <Leaf size={14} /> Good habits start with a little care.
        </p>
      </section>
    </main>
  )
}

const meals = [
  {
    name: 'Greek yogurt & berries',
    category: 'Breakfast',
    time: '8:30 AM',
    calories: 380,
    protein: 24,
    carbs: 46,
    fat: 11,
    icon: '🫐',
    color: 'berry',
  },
  {
    name: 'Grilled chicken bowl',
    category: 'Lunch',
    time: '12:45 PM',
    calories: 620,
    protein: 46,
    carbs: 68,
    fat: 18,
    icon: '🥗',
    color: 'salad',
  },
  {
    name: 'Salmon & roasted veggies',
    category: 'Dinner',
    time: '6:30 PM',
    calories: 640,
    protein: 28,
    carbs: 78,
    fat: 24,
    icon: '🥑',
    color: 'avocado',
  },
]

const navigation: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: House },
  { id: 'diary', label: 'Food diary', icon: BookOpen },
  { id: 'goals', label: 'My goals', icon: Target },
]

function ProgressRing({
  value,
  children,
}: {
  value: number
  children: ReactNode
}) {
  return (
    <div className="progress-ring">
      <svg viewBox="0 0 90 90" aria-hidden="true">
        <circle className="ring-track" cx="45" cy="45" r="37" />
        <circle
          className="ring-value"
          cx="45"
          cy="45"
          r="37"
          strokeDasharray={`${Math.min(value, 100) * 2.325} 232.5`}
        />
      </svg>
      <span>{children}</span>
    </div>
  )
}

function WeeklyChart() {
  const values = [1820, 2040, 1760, 2180, 1960, 2080, 1640]
  const points = values.map((value, index) => [
    54 + index * 89,
    180 - ((value - 1000) / 1500) * 152,
  ])
  const line = points.reduce((path, [x, y], index) => {
    if (!index) return `M ${x} ${y}`
    const [previousX, previousY] = points[index - 1]
    const middle = (previousX + x) / 2
    return `${path} C ${middle} ${previousY}, ${middle} ${y}, ${x} ${y}`
  }, '')
  return (
    <section className="panel weekly-chart" aria-labelledby="chart-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">THE BIGGER PICTURE</span>
          <h3 id="chart-title">Your weekly rhythm</h3>
        </div>
        <span className="soft-label">Sample week</span>
      </div>
      <div className="chart-legend">
        <span>
          <i className="dot teal" /> Calories eaten
        </span>
        <span>
          <i className="legend-dash" /> Daily goal
        </span>
      </div>
      <svg
        className="chart"
        viewBox="0 0 625 217"
        role="img"
        aria-label="Sample week: calorie intake ranges from 1,640 to 2,180 calories per day, against a daily goal of 2,200 calories."
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#24bed0" stopOpacity=".25" />
            <stop offset="100%" stopColor="#24bed0" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[1000, 1500, 2000, 2500].map((value) => {
          const y = 180 - ((value - 1000) / 1500) * 152
          return (
            <g key={value}>
              <text x="0" y={y + 4} className="chart-axis">
                {(value / 1000).toFixed(1)}k
              </text>
              <line x1="48" x2="600" y1={y} y2={y} className="chart-grid" />
            </g>
          )
        })}
        <line x1="48" x2="600" y1="58.4" y2="58.4" className="chart-goal" />
        <path d={`${line} L 588 185 L 54 185 Z`} fill="url(#chart-fill)" />
        <path d={line} className="chart-line" />
        {points.map(([x, y], index) => (
          <g key={index}>
            <circle
              cx={x}
              cy={y}
              r={index === 6 ? 6 : 3.5}
              className="chart-point"
            />
            <text x={x} y="210" textAnchor="middle" className="chart-axis">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
            </text>
          </g>
        ))}
      </svg>
    </section>
  )
}

function MacroBreakdown() {
  return (
    <section className="panel macro-panel" aria-labelledby="macro-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">A LITTLE OF EVERYTHING</span>
          <h3 id="macro-title">Find your balance</h3>
        </div>
        <Salad size={23} />
      </div>
      <p className="panel-description">A snapshot of today’s nutrients.</p>
      {[
        { label: 'Protein', value: 98, goal: 130, color: 'teal' },
        { label: 'Carbs', value: 192, goal: 275, color: 'coral' },
        { label: 'Fats', value: 53, goal: 73, color: 'gold' },
      ].map((macro) => (
        <div className="macro-row" key={macro.label}>
          <div>
            <span>
              <i className={`dot ${macro.color}`} /> {macro.label}
            </span>
            <span>
              <strong>{macro.value}</strong> / {macro.goal} g
            </span>
          </div>
          <div
            className="macro-track"
            role="progressbar"
            aria-label={macro.label}
            aria-valuemin={0}
            aria-valuemax={macro.goal}
            aria-valuenow={macro.value}
          >
            <span
              className={macro.color}
              style={{ width: `${(macro.value / macro.goal) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </section>
  )
}

function MealList({
  full = false,
  onViewDiary,
}: {
  full?: boolean
  onViewDiary?: () => void
}) {
  return (
    <section
      className={`panel meal-panel ${full ? 'full-diary' : ''}`}
      aria-labelledby="meals-title"
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">FUEL FOR YOUR DAY</span>
          <h3 id="meals-title">
            {full ? 'Your food diary' : 'On the menu today'}
          </h3>
        </div>
        {!full && (
          <button className="text-button" onClick={onViewDiary}>
            View diary <ArrowUpRight size={16} />
          </button>
        )}
      </div>
      {full && (
        <p className="panel-description">
          Sample meals for a balanced day. Food logging will be connected in a
          future update.
        </p>
      )}
      <ul className="meal-list">
        {meals.map((meal) => (
          <li key={meal.name}>
            <span className={`meal-icon ${meal.color}`} aria-hidden="true">
              {meal.icon}
            </span>
            <div className="meal-description">
              <strong>{meal.name}</strong>
              <span>
                {meal.category} <span aria-hidden="true">·</span> {meal.time}
              </span>
              {full && (
                <span className="meal-macros">
                  {meal.protein} g protein · {meal.carbs} g carbs · {meal.fat} g
                  fat
                </span>
              )}
            </div>
            <span className="meal-calories">
              <strong>{meal.calories}</strong> kcal
            </span>
          </li>
        ))}
      </ul>
      {full && (
        <div className="diary-total">
          <span>Daily total</span>
          <strong>1,640 kcal</strong>
        </div>
      )}
    </section>
  )
}

interface Account {
  name: string
  fullName: string
  email: string
  initials: string
}

// With no `account` the dashboard is the public frontend demo; with one it is a real signed-in user.
function Dashboard({
  onSignOut,
  account,
  goals,
}: {
  onSignOut: () => void
  account?: Account
  goals?: Goals
}) {
  const [view, setView] = useState<View>('overview')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [water, setWater] = useState(1500)
  const pageHeading = useRef<HTMLHeadingElement>(null)
  const [now] = useState(() => new Date())
  const date = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now)
  const isoDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  function navigate(next: View) {
    setView(next)
    setMobileMenu(false)
    requestAnimationFrame(() => pageHeading.current?.focus())
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="mobile-header">
        <Brand />
        <button
          className="icon-button"
          aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileMenu}
          aria-controls="sidebar"
          onClick={() => setMobileMenu(!mobileMenu)}
        >
          {mobileMenu ? <X /> : <Menu />}
        </button>
      </header>
      {mobileMenu && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation overlay"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside className={`sidebar ${mobileMenu ? 'is-open' : ''}`} id="sidebar">
        <Brand />
        <div className="sidebar-group-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? 'active' : ''}`}
              aria-current={view === id ? 'page' : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
              {view === id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-leaf">
              <Leaf size={26} />
            </span>
            <strong>Better, together.</strong>
            <p>Small, consistent choices make a big difference.</p>
            <span className="note-decoration" aria-hidden="true">
              ✳
            </span>
          </div>
          <div className="profile">
            <span className="avatar">{account ? account.initials : 'AJ'}</span>
            <div>
              <strong>{account ? account.fullName : 'Alex Johnson'}</strong>
              <span>{account ? account.email : 'Demo account'}</span>
            </div>
          </div>
          <button className="sign-out" onClick={onSignOut}>
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            My workspace <ChevronRight size={14} />
            <span>{navigation.find((item) => item.id === view)?.label}</span>
          </div>
          <div className="topbar-right">
            <span className="demo-badge">
              <span className="status-dot" />{' '}
              {account ? 'Signed in' : 'Demo workspace'}
            </span>
            <span
              className="topbar-avatar"
              aria-label={account ? account.fullName : 'Alex Johnson'}
            >
              {account ? account.initials : 'AJ'}
            </span>
          </div>
        </header>
        <main id="main" className="dashboard-main">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {view === 'overview'
                  ? 'MAKE TODAY A GOOD DAY'
                  : 'YOUR NUTRITION, AT A GLANCE'}
              </p>
              <h1 ref={pageHeading} tabIndex={-1}>
                {view === 'overview'
                  ? `Welcome back, ${account ? account.name : 'Alex'}`
                  : view === 'diary'
                    ? 'Good food. Good energy.'
                    : 'A little direction goes a long way.'}
                {view === 'overview' && (
                  <span className="greeting-sparkle" aria-hidden="true">
                    ✳
                  </span>
                )}
              </h1>
              <p>
                {view === 'overview'
                  ? 'Here’s how your healthy habits are adding up.'
                  : view === 'diary'
                    ? 'A mindful moment for every meal.'
                    : 'Keep your daily targets in sight.'}
              </p>
            </div>
            <div className="today">
              <span>TODAY</span>
              <time dateTime={isoDate}>{date}</time>
            </div>
          </div>
          {view === 'overview' && (
            <>
              <div className="stat-grid">
                <section
                  className="stat-card calories-card"
                  aria-labelledby="calories-title"
                >
                  <div className="stat-content">
                    <span className="stat-label">
                      <Flame size={19} />
                      <span id="calories-title">Daily calories</span>
                    </span>
                    <div className="stat-number">
                      1,640 <span>/ 2,200 kcal</span>
                    </div>
                    <p>
                      <ArrowDown size={14} /> 560 kcal left for today
                    </p>
                  </div>
                  <ProgressRing value={(1640 / 2200) * 100}>
                    75<span>%</span>
                  </ProgressRing>
                </section>
                <section
                  className="stat-card protein-card"
                  aria-labelledby="protein-title"
                >
                  <div className="stat-content">
                    <span className="stat-label">
                      <Beef size={19} />
                      <span id="protein-title">Protein</span>
                    </span>
                    <div className="stat-number">
                      98 <span>/ 130 g</span>
                    </div>
                    <p>
                      <TrendingUp size={14} /> A strong start to your goal
                    </p>
                  </div>
                  <ProgressRing value={(98 / 130) * 100}>
                    75<span>%</span>
                  </ProgressRing>
                </section>
                <section
                  className="stat-card water-card"
                  aria-labelledby="water-title"
                >
                  <div className="stat-content">
                    <span className="stat-label">
                      <Droplets size={19} />
                      <span id="water-title">Stay hydrated</span>
                    </span>
                    <div className="stat-number" aria-live="polite">
                      {(water / 1000).toFixed(2).replace(/0$/, '')}{' '}
                      <span>/ 2.5 L</span>
                    </div>
                    <button
                      className="water-button"
                      disabled={water >= 2500}
                      onClick={() =>
                        setWater((value) => Math.min(value + 250, 2500))
                      }
                    >
                      {water >= 2500 ? <Check size={14} /> : <Plus size={14} />}
                      {water >= 2500
                        ? 'Daily goal reached'
                        : 'Add a glass · 250 ml'}
                    </button>
                  </div>
                  <span className="water-art" aria-hidden="true">
                    <Droplets size={57} strokeWidth={1.2} />
                  </span>
                </section>
              </div>
              <div className="dashboard-grid">
                <WeeklyChart />
                <MacroBreakdown />
                <MealList onViewDiary={() => navigate('diary')} />
                <section
                  className="mindful-card"
                  aria-labelledby="mindful-title"
                >
                  <span className="mindful-icon">
                    <Heart size={23} />
                  </span>
                  <span className="eyebrow">A GENTLE REMINDER</span>
                  <h3 id="mindful-title">
                    Progress over
                    <br />
                    perfection.
                  </h3>
                  <p>
                    A balanced day looks different for everyone. Find the little
                    things that make you feel good.
                  </p>
                  <span className="mindful-footer">
                    <Leaf size={15} /> You’re growing at your own pace.
                  </span>
                </section>
              </div>
            </>
          )}
          {view === 'diary' && (
            <div className="detail-grid">
              <MealList full />
              <MacroBreakdown />
            </div>
          )}
          {view === 'goals' && (
            <div className="detail-grid">
              <section className="panel goals-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">YOUR DAILY NORTH STAR</span>
                    <h3>Make space for balance</h3>
                  </div>
                  <Target size={26} />
                </div>
                <p className="panel-description">
                  {goals
                    ? 'Your daily targets are calculated from the details you shared when you set up your account.'
                    : 'These sample targets show what your personal goals will look like. Personalization and goal calculations aren’t connected yet.'}
                </p>
                <div className="goal-hero">
                  <span>
                    <Flame size={25} /> Daily energy target
                  </span>
                  <strong>
                    {goals ? goals.calories.toLocaleString('en-US') : '2,200'}{' '}
                    <small>kcal</small>
                  </strong>
                </div>
                <div className="goal-targets">
                  <span>
                    <Beef size={20} />
                    Protein<strong>{goals ? goals.protein : 130} g</strong>
                  </span>
                  <span>
                    <Salad size={20} />
                    Carbs<strong>{goals ? goals.carbs : 275} g</strong>
                  </span>
                  <span>
                    <Heart size={20} />
                    Fats<strong>{goals ? goals.fat : 73} g</strong>
                  </span>
                  <span>
                    <Droplets size={20} />
                    Water<strong>2.5 L</strong>
                  </span>
                </div>
                <p className="goal-note">
                  <CircleCheck size={18} />{' '}
                  {goals
                    ? 'Estimates only, based on typical activity. They are not medical advice.'
                    : 'Demo targets only; these are not personalized recommendations.'}
                </p>
              </section>
              <MacroBreakdown />
            </div>
          )}
          <footer className="dashboard-footer">
            <span>
              <Leaf size={14} /> A little better, every day.
            </span>
            <span>
              {account ? 'Food log' : 'Frontend preview'}{' '}
              <span aria-hidden="true">·</span> Sample data
            </span>
          </footer>
        </main>
      </div>
    </div>
  )
}

function DemoApp() {
  const [signedIn, setSignedIn] = useState(hasDemoSession)
  function setSession(active: boolean) {
    try {
      if (active) sessionStorage.setItem(SESSION_KEY, 'active')
      else sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* The preview still works if browser storage is unavailable. */
    }
    setSignedIn(active)
    window.scrollTo(0, 0)
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>('.page-heading h1, #login-title')
        ?.focus(),
    )
  }
  return signedIn ? (
    <Dashboard onSignOut={() => setSession(false)} />
  ) : (
    <Login onSignIn={() => setSession(true)} />
  )
}

function StatusPage({
  children,
  error = false,
}: {
  children: ReactNode
  error?: boolean
}) {
  return (
    <main className="status-page" id="main">
      <div className="status-card" role={error ? 'alert' : 'status'}>
        <Brand />
        {children}
      </div>
    </main>
  )
}

// Clerk's prebuilt sign-in / sign-up forms, shown in the same layout as the demo login.
function AuthScreen({ clerk }: { clerk: ClerkInstance }) {
  const signUp =
    new URLSearchParams(window.location.search).get('auth') === 'sign-up'
  const mount = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = mount.current
    if (!node) return
    const props = {
      fallbackRedirectUrl: '/',
      appearance: {
        variables: {
          colorPrimary: '#087f8b',
          fontFamily: 'DM Sans, sans-serif',
        },
        elements: {
          rootBox: { width: '100%' },
          cardBox: { width: '100%', boxShadow: 'none', border: 'none' },
          card: { boxShadow: 'none', border: 'none', padding: 0 },
          footerAction: { display: 'none' },
        },
      },
    }
    if (signUp)
      clerk.mountSignUp(node, { ...props, signInUrl: '/?auth=sign-in' })
    else clerk.mountSignIn(node, { ...props, signUpUrl: '/?auth=sign-up' })
    return () => {
      if (signUp) clerk.unmountSignUp(node)
      else clerk.unmountSignIn(node)
    }
  }, [clerk, signUp])

  return (
    <main className="login-page" id="main">
      <LoginStory />
      <section className="login-form-panel" aria-labelledby="auth-title">
        <div className="mobile-brand">
          <Brand />
        </div>
        <div className="login-form-content auth-content">
          <span className="welcome-icon">
            <Leaf size={27} />
          </span>
          <p className="eyebrow">
            {signUp ? 'JOIN NUTRIGATOR' : 'LET’S KEEP GROWING'}
          </p>
          <h2 id="auth-title" tabIndex={-1}>
            {signUp ? 'Create your account.' : 'Welcome back.'}
          </h2>
          <p className="form-intro">
            {signUp
              ? 'It only takes a minute. Next, we’ll ask a few questions to personalise your goals.'
              : 'Your next healthy habit starts here.'}
          </p>
          <div ref={mount} className="clerk-mount" />
          <p className="auth-switch">
            {signUp ? (
              <>
                Already have an account? <a href="/?auth=sign-in">Sign in</a>
              </>
            ) : (
              <>
                New to NutriGator?{' '}
                <a href="/?auth=sign-up">Create an account</a>
              </>
            )}
          </p>
        </div>
        <p className="login-footer">
          <Leaf size={14} /> Good habits start with a little care.
        </p>
      </section>
    </main>
  )
}

type Gate =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'onboarding' }
  | { status: 'ready'; goals: Goals }

// Signed-in users: load the profile from the Express API. Anyone who has not completed
// their profile (every new account) is sent through onboarding first.
function SignedIn({ clerk, user }: { clerk: ClerkInstance; user: ClerkUser }) {
  const [gate, setGate] = useState<Gate>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const profile = await apiRequest<Profile>(clerk, '/profile')
        if (!isProfileComplete(profile)) {
          if (active) setGate({ status: 'onboarding' })
          return
        }
        const goals = await apiRequest<Goals>(clerk, '/profile/goals')
        if (active) setGate({ status: 'ready', goals })
      } catch (error) {
        if (!active) return
        const status = (error as { status?: number }).status
        setGate({
          status: 'error',
          message:
            status === 401
              ? 'The server didn’t accept your sign-in. Make sure client/.env and server/.env use keys from the same Clerk application.'
              : error instanceof Error
                ? error.message
                : 'Something went wrong while loading your account.',
        })
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [clerk, attempt])

  if (gate.status === 'loading')
    return <StatusPage>Loading your account…</StatusPage>
  if (gate.status === 'error')
    return (
      <StatusPage error>
        <p>{gate.message}</p>
        <div className="status-actions">
          <button
            className="button primary"
            onClick={() => {
              setGate({ status: 'loading' })
              setAttempt((count) => count + 1)
            }}
          >
            Try again
          </button>
          <button
            className="button secondary"
            onClick={() => void clerk.signOut()}
          >
            Sign out
          </button>
        </div>
      </StatusPage>
    )
  if (gate.status === 'onboarding')
    return (
      <Onboarding
        clerk={clerk}
        initialName={user.firstName ?? ''}
        onComplete={(goals) => {
          if (goals) setGate({ status: 'ready', goals })
          else {
            setGate({ status: 'loading' })
            setAttempt((count) => count + 1)
          }
        }}
      />
    )
  return (
    <Dashboard
      account={accountFrom(user)}
      goals={gate.goals}
      onSignOut={() => void clerk.signOut()}
    />
  )
}

function ClerkApp() {
  const [clerk, setClerk] = useState<ClerkInstance | null>(null)
  const [user, setUser] = useState<ClerkUser | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    let unsubscribe = () => {}
    loadClerk().then(
      (instance) => {
        if (!active) return
        setClerk(instance)
        setUser(instance.user ?? null)
        unsubscribe = instance.addListener(({ user: next }) =>
          setUser(next ?? null),
        )
      },
      (reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : 'Could not load Clerk.',
          )
      },
    )
    return () => {
      active = false
      unsubscribe()
    }
  }, [attempt])

  if (error)
    return (
      <StatusPage error>
        <p>{error}</p>
        <div className="status-actions">
          <button
            className="button primary"
            onClick={() => {
              setError('')
              setAttempt((count) => count + 1)
            }}
          >
            Try again
          </button>
        </div>
      </StatusPage>
    )
  if (!clerk) return <StatusPage>Loading…</StatusPage>
  return user ? (
    <SignedIn clerk={clerk} user={user} />
  ) : (
    <AuthScreen clerk={clerk} />
  )
}

// Real Clerk sign-in when VITE_CLERK_PUBLISHABLE_KEY is set; otherwise the public demo.
export default function App() {
  return clerkEnabled ? <ClerkApp /> : <DemoApp />
}
