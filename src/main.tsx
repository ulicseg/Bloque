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

// En la app instalada en iOS el viewport puede medir menos que la pantalla (queda un hueco abajo hasta que se
// hace scroll). El alto físico de la pantalla no miente, así que se usa como mínimo para el contenedor.
const alturaPantalla = () => {
  const instalada = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  const alto = instalada ? Math.max(window.screen.height, window.screen.width) : 0
  document.documentElement.style.setProperty('--alto-pantalla', `${alto}px`)
}
alturaPantalla()
window.addEventListener('orientationchange', alturaPantalla)

// Cuanto antes se pida, antes puede el navegador marcar los datos como protegidos del borrado automático
void pedirPersistencia()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
