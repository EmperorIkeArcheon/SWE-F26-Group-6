import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.tsx'
import { SetupNotice } from './SetupNotice.tsx'

// Use the same Clerk application as the server (server/.env CLERK_PUBLISHABLE_KEY).
const publishableKey: string | undefined =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || undefined

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {publishableKey ? (
      <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    ) : (
      <SetupNotice />
    )}
  </StrictMode>,
)
