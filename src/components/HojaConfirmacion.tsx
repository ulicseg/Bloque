import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { RESORTE_DEFECTO, transicion } from '../design/resortes'

interface Props {
  abierta: boolean
  titulo: string
  children: ReactNode
  alCancelar: () => void
  /** Los botones van por fuera para que cada pantalla decida su acción principal. */
  acciones: ReactNode
}

// Tarea modal: el scrim atenúa el fondo y la hoja "se materializa" (escala + posición + opacidad),
// no es un simple fundido (§12). Tocar fuera o Escape cancela; nunca se bloquea la entrada.
export function HojaConfirmacion({ abierta, titulo, children, alCancelar, acciones }: Props) {
  const reducido = useReducedMotion() ?? false
  const t = transicion(RESORTE_DEFECTO, reducido)

  useEffect(() => {
    if (!abierta) return
    const alTecla = (e: KeyboardEvent) => e.key === 'Escape' && alCancelar()
    window.addEventListener('keydown', alTecla)
    return () => window.removeEventListener('keydown', alTecla)
  }, [abierta, alCancelar])

  return (
    <AnimatePresence>
      {abierta && (
        <motion.div
          className="hoja-capa"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={t}
          onPointerDown={(e) => e.target === e.currentTarget && alCancelar()}
        >
          <motion.div
            className="hoja"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hoja-titulo"
            initial={{ y: reducido ? 0 : '2.5rem', scale: reducido ? 1 : 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            // Sale por donde entró: hacia abajo
            exit={{ y: reducido ? 0 : '2.5rem', scale: reducido ? 1 : 0.97, opacity: 0 }}
            transition={t}
          >
            <h2 id="hoja-titulo" className="hoja-titulo">
              {titulo}
            </h2>
            <div className="hoja-cuerpo">{children}</div>
            <div className="hoja-acciones">{acciones}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
