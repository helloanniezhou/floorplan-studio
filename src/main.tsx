import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SupabaseAuthProvider>
      <App />
    </SupabaseAuthProvider>
  </StrictMode>,
)
