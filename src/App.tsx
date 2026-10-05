import { useEffect, useState, type JSX } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import { BarraPestanas, type Pestana } from './components/BarraPestanas'
import { IconoAjustes, IconoHoy, IconoMetas, IconoSemana } from './components/Iconos'
import { RESORTE_DEFECTO, transicion } from './design/resortes'
import { AvisoActualizacion } from './components/AvisoActualizacion'
import { almacen } from './almacenGlobal'
import { Ajustes } from './screens/Ajustes'
import { Hoy } from './screens/Hoy'
import { Metas } from './screens/Metas'
import { Semana } from './screens/Semana'

const PESTANAS: Pestana[] = [
  { id: 'hoy', titulo: 'Hoy', Icono: IconoHoy },
  { id: 'semana', titulo: 'Semana', Icono: IconoSemana },
  { id: 'metas', titulo: 'Metas', Icono: IconoMetas },
  { id: 'ajustes', titulo: 'Ajustes', Icono: IconoAjustes },
]

const PANTALLAS: Record<string, () => JSX.Element> = { hoy: Hoy, semana: Semana, metas: Metas, ajustes: Ajustes }

export function App() {
  const [activa, setActiva] = useState(() => {
    const guardada = almacen.leer().pestaña
    return guardada in PANTALLAS ? guardada : 'hoy'
  })
  const reducido = useReducedMotion() ?? false

  useEffect(() => {
    almacen.guardar({ ...almacen.leer(), pestaña: activa })
  }, [activa])

  const Actual = PANTALLAS[activa]
  // Con movimiento reducido solo hay fundido; sin él, un leve desplazamiento que nunca bloquea la entrada
  const desplazamiento = reducido ? 0 : 0.75

  return (
    <MotionConfig transition={transicion(RESORTE_DEFECTO, reducido)}>
      <div className="app">
        {/* Sin mode="wait": entrada y salida conviven, así tocar otra pestaña a mitad de camino nunca espera */}
        <AnimatePresence initial={false}>
          <motion.div
            key={activa}
            className="pantalla-capa"
            initial={{ opacity: 0, y: `${desplazamiento}rem` }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 0, pointerEvents: 'none' }}
          >
            <Actual />
          </motion.div>
        </AnimatePresence>
        <AvisoActualizacion />
        <BarraPestanas pestanas={PESTANAS} activa={activa} alElegir={setActiva} />
      </div>
    </MotionConfig>
  )
}
