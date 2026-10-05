import { useEffect, useState } from 'react'

// Medidas reales de la pantalla, para poder revisar desde el teléfono sin captura cuando algo no encaja
// (por ejemplo el hueco de abajo en iOS instalado). Se actualiza solo al girar o cambiar el tamaño.
function medir() {
  const sonda = document.createElement('div')
  sonda.style.cssText = 'position:fixed;visibility:hidden;padding-bottom:env(safe-area-inset-bottom,0px);padding-top:env(safe-area-inset-top,0px)'
  document.body.appendChild(sonda)
  const estilo = getComputedStyle(sonda)
  const zonaAbajo = Math.round(parseFloat(estilo.paddingBottom) || 0)
  const zonaArriba = Math.round(parseFloat(estilo.paddingTop) || 0)
  sonda.remove()
  const instalada = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  return `pantalla ${window.screen.height} · ventana ${window.innerHeight} · visible ${Math.round(window.visualViewport?.height ?? 0)} · zona segura ${zonaArriba}/${zonaAbajo} · instalada ${instalada ? 'sí' : 'no'}`
}

export function DiagnosticoPantalla() {
  const [texto, setTexto] = useState(medir)
  useEffect(() => {
    const actualizar = () => setTexto(medir())
    window.addEventListener('resize', actualizar)
    window.visualViewport?.addEventListener('resize', actualizar)
    return () => {
      window.removeEventListener('resize', actualizar)
      window.visualViewport?.removeEventListener('resize', actualizar)
    }
  }, [])
  return <p className="fila-nota fila-nota-suelta">{texto}</p>
}
