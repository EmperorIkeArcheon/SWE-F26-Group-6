// Clerk integration without an extra npm dependency: Clerk's browser SDK is loaded
// from the Frontend API host that is encoded in the publishable key.
// When VITE_CLERK_PUBLISHABLE_KEY is not set, the app falls back to the public demo.

export const CLERK_PUBLISHABLE_KEY: string = (
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? ''
).trim()
export const clerkEnabled = CLERK_PUBLISHABLE_KEY.length > 0

// Same-origin `/api` is proxied to the Express server by Vite (see vite.config.ts).
const API_BASE: string = (import.meta.env.VITE_API_URL ?? '/api').replace(
  /\/$/,
  '',
)

export interface ClerkUser {
  firstName: string | null
  lastName: string | null
  fullName: string | null
  primaryEmailAddress: { emailAddress: string } | null
  update(params: { firstName?: string; lastName?: string }): Promise<unknown>
}

export interface ClerkInstance {
  user: ClerkUser | null | undefined
  session: { getToken(): Promise<string | null> } | null | undefined
  load(options?: Record<string, unknown>): Promise<void>
  addListener(
    listener: (resources: { user?: ClerkUser | null }) => void,
  ): () => void
  signOut(options?: { redirectUrl?: string }): Promise<void>
  mountSignIn(node: HTMLDivElement, props?: Record<string, unknown>): void
  unmountSignIn(node: HTMLDivElement): void
  mountSignUp(node: HTMLDivElement, props?: Record<string, unknown>): void
  unmountSignUp(node: HTMLDivElement): void
}

declare global {
  interface Window {
    Clerk?: ClerkInstance
    __internal_ClerkUICtor?: unknown
  }
}

function frontendApiHost(publishableKey: string) {
  const parts = publishableKey.split('_')
  try {
    const host = atob(parts[2] ?? '')
    if (parts.length === 3 && host.endsWith('$')) return host.slice(0, -1)
  } catch {
    /* handled below */
  }
  throw new Error(
    'VITE_CLERK_PUBLISHABLE_KEY is not a valid Clerk publishable key (it should look like pk_test_...).',
  )
}

function loadScript(src: string, attributes: Record<string, string> = {}) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.crossOrigin = 'anonymous'
    for (const [name, value] of Object.entries(attributes))
      script.setAttribute(name, value)
    script.onload = () => resolve()
    script.onerror = () =>
      reject(
        new Error(
          'Could not load Clerk. Check your internet connection and publishable key.',
        ),
      )
    document.head.appendChild(script)
  })
}

let clerkPromise: Promise<ClerkInstance> | undefined

export function loadClerk() {
  clerkPromise ??= (async () => {
    const host = frontendApiHost(CLERK_PUBLISHABLE_KEY)
    await loadScript(`https://${host}/npm/@clerk/ui@1/dist/ui.browser.js`)
    await loadScript(
      `https://${host}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,
      {
        'data-clerk-publishable-key': CLERK_PUBLISHABLE_KEY,
      },
    )
    const clerk = window.Clerk
    if (!clerk) throw new Error('Clerk loaded but was not initialised.')
    await clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } })
    return clerk
  })()
  // Allow a retry after a failed load.
  clerkPromise.catch(() => {
    clerkPromise = undefined
  })
  return clerkPromise
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Calls the Express backend with the signed-in user's Clerk session token.
export async function apiRequest<T>(
  clerk: ClerkInstance,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = await clerk.session?.getToken()
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        ...(init.body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
  } catch {
    throw new ApiError(
      0,
      'We couldn’t reach the NutriGator server. Make sure it is running on port 3000.',
    )
  }
  if (!response.ok) {
    let message = `The server returned an error (${response.status}).`
    try {
      const body = await response.json()
      if (typeof body?.error === 'string') message = body.error
    } catch {
      /* keep the default message */
    }
    throw new ApiError(response.status, message)
  }
  return response.json() as Promise<T>
}

export function accountFrom(user: ClerkUser | null | undefined) {
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const first = user?.firstName?.trim() || ''
  const name = first || user?.fullName?.trim() || email.split('@')[0] || 'there'
  const full = user?.fullName?.trim() || first || email || 'Your account'
  const initials =
    full
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || 'U'
  return { name, fullName: full, email, initials }
}
