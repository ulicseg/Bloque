import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import './styles/componentes.css'
import './styles/hoy.css'
import './styles/vidrio.css'
import './styles/accesibilidad.css'
import { App } from './App'
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

// En iOS instalado la ventana a veces es más corta que la pantalla (iPhone 16: 795 de 852) y todo lo anclado abajo
// queda flotando con un hueco negro. Se mide la diferencia y el CSS corre la barra y el contenedor para cubrirla;
// si iOS corrige la ventana (resize), la diferencia vuelve a 0 sola.
const medirDesfase = () => {
  const instalada = (navigator as { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches
  const falta = instalada ? Math.max(0, Math.round(window.screen.height - window.innerHeight)) : 0
  // Solo en vertical y con tope: una diferencia enorme no es este problema (teclado, horizontal)
  document.documentElement.style.setProperty('--desfase', `${window.innerHeight > window.innerWidth && falta < 120 ? falta : 0}px`)
}
medirDesfase()
window.addEventListener('resize', medirDesfase)
window.addEventListener('orientationchange', medirDesfase)
window.addEventListener('pageshow', medirDesfase)

// Cuanto antes se pida, antes puede el navegador marcar los datos como protegidos del borrado automático
void pedirPersistencia()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
