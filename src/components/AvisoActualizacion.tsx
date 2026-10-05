import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RESORTE_DEFECTO, transicion } from '../design/resortes'
import { Presionable } from './Presionable'

const CADA_HORA = 60 * 60 * 1000

// Aviso discreto de versión nueva. El service worker nuevo ya se descargó solo; recargar es decisión
// de la persona, porque una recarga automática podría cortar lo que está editando (agency, §16).
export function AvisoActualizacion() {
  const reducido = useReducedMotion() ?? false
  const {
    needRefresh: [hayNueva, setHayNueva],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      if (!registro) return
      // Una app instalada casi nunca se "abre de cero": hay que preguntar por versiones nuevas
      // cada hora y cada vez que vuelve al primer plano.
      setInterval(() => void registro.update().catch(() => {}), CADA_HORA)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registro.update().catch(() => {})
      })
    },
  })

  // Si la versión nueva llega en los primeros segundos de abrir la app, se aplica sola: todavía no hay nada
  // que cortar, y evita quedarse con una versión vieja guardada sin darse cuenta. Pasado eso, decide la persona.
  useEffect(() => {
    if (hayNueva && performance.now() < 15_000) void updateServiceWorker(true)
  }, [hayNueva, updateServiceWorker])

  return (
    <AnimatePresence>
      {hayNueva && (
        <motion.div
          className="aviso-actualizacion"
          role="status"
          // Entra desde arriba y sale hacia arriba: mismo camino de ida y vuelta (§7). Con movimiento reducido, solo fundido.
          initial={{ opacity: 0, y: reducido ? 0 : '-1rem', scale: reducido ? 1 : 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: reducido ? 0 : '-1rem', scale: reducido ? 1 : 0.97 }}
          transition={transicion(RESORTE_DEFECTO, reducido)}
        >
          <span className="aviso-actualizacion-texto">Hay una versión nueva</span>
          <Presionable className="boton-chico" onClick={() => setHayNueva(false)}>
            Después
          </Presionable>
          <Presionable className="boton-chico boton-chico-tinte" onClick={() => void updateServiceWorker(true)}>
            Recargar
          </Presionable>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
