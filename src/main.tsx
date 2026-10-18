import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ScreenLayout } from './components/screen-layout'
import { AppErrorBoundary } from './components/app-error-boundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode><ScreenLayout><AppErrorBoundary><App /></AppErrorBoundary></ScreenLayout></StrictMode>,
)
