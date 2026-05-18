import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import GeneratorPage from './pages/Generator'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GeneratorPage />
  </StrictMode>,
)
