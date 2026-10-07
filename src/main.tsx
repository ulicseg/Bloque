import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import './styles/componentes.css'
import './styles/hoy.css'
import './styles/vidrio.css'
import './styles/accesibilidad.css'
import { App } from './App'
import { almacen } from './almacenGlobal'
import { iniciarSyncAutomatica } from './sync/sincronizar'
import { pedirPersistencia } from './plataforma'

// iOS instalado a veces arranca con la ventana más corta que la pantalla (hueco abajo) y la corrige recién con el
// primer gesto de scroll. Un empujoncito programático de 1 px, y de vuelta, hace lo mismo sin que se note.
const empujar = () => {
  window.scrollTo(0, 1)
  setTimeout(() => window.scrollTo(0, 0), 50)
}
window.addEventListener('load', () => [0, 300, 1000].forEach((ms) => setTimeout(empujar, ms)))
window.addEventListener('pageshow', empujar)
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && empujar())

// Cuanto antes se pida, antes puede el navegador marcar los datos como protegidos del borrado automático
void pedirPersistencia()

// Copia en GitHub (si la persona la conectó en Ajustes): al abrir, al volver a la app y tras cada cambio
iniciarSyncAutomatica(almacen)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
