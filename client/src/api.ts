import type { Goals, Profile, ProfilePayload } from './types.ts'

// Base URL of the Express server (server/index.js listens on :3000).
const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/** Returns a Clerk session token (from `useAuth().getToken`). */
export type GetToken = () => Promise<string | null>

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

async function request<T>(
  path: string,
  getToken: GetToken,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken()
  if (!token)
    throw new ApiError('Your session has expired. Please sign in again.', 401)

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
  } catch {
    throw new ApiError(
      'We couldn’t reach the NutriGator server. Check that it is running and try again.',
      0,
    )
  }

  // The server returns { error: "message" } for failures.
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${response.status}).`
    throw new ApiError(message, response.status)
  }
  return body as T
}

export function getProfile(getToken: GetToken) {
  return request<Profile>('/profile', getToken)
}

export function saveProfile(getToken: GetToken, payload: ProfilePayload) {
  return request<Profile>('/profile', getToken, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/** Rejects with a 404 ApiError until the profile is complete. */
export function getGoals(getToken: GetToken) {
  return request<Goals>('/profile/goals', getToken)
}
