import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { aplicarTema, temaSalvo } from './tema'

// Aplica o tema antes de desenhar, para não piscar a tela clara.
aplicarTema(temaSalvo())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
