import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import './styles/componentes.css'
import './styles/accesibilidad.css'
import { App } from './App'
import { pedirPersistencia } from './plataforma'

// Cuanto antes se pida, antes puede el navegador marcar los datos como protegidos del borrado automático
void pedirPersistencia()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
