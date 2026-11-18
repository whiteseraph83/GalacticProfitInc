import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Richiesta utente: niente menu contestuale del browser (tasto destro) in
// nessun punto dell'app, inclusa la mappa PixiJS.
document.addEventListener('contextmenu', (e) => e.preventDefault())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
