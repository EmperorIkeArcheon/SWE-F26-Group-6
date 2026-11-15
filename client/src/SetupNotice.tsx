import { Brand } from './Brand.tsx'

/** Shown instead of the app when no Clerk publishable key is configured. */
export function SetupNotice() {
  return (
    <main className="status-screen" id="main">
      <Brand />
      <h1>Almost ready</h1>
      <p>
        NutriGator needs a Clerk publishable key to sign people in. Copy{' '}
        <code>client/.env.example</code> to <code>client/.env.local</code>, set{' '}
        <code>VITE_CLERK_PUBLISHABLE_KEY</code>, then restart the dev server.
      </p>
    </main>
  )
}
