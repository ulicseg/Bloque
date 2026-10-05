import type { CSSProperties } from 'react'
import { motion } from 'motion/react'
import { IconoActividad } from './Iconos'
import type { Avance } from '../logic/progreso'
import type { Actividad } from '../logic/types'

interface Props {
  avances: Avance[]
  actividades: Actividad[]
}

/** Una barra por meta. Crece con el resorte del MotionConfig (con movimiento reducido, un fundido corto). */
export function AvanceSemana({ avances, actividades }: Props) {
  return (
    <div className="grupo">
      {avances.map((a) => {
        const color = actividades.find((x) => x.id === a.actividad)?.color ?? a.actividad
        return (
          <div key={a.actividad} className="avance" style={{ '--act': `var(--act-${color})`, '--act-fondo': `var(--act-${color}-fondo)` } as CSSProperties}>
            <div className="avance-linea">
              <span className="avance-nombre">
                <IconoActividad id={a.actividad} />
                {a.nombre}
              </span>
              <span className="avance-texto">{a.cumplida ? `${a.texto} ✓` : a.texto}</span>
            </div>
            <div
              className="avance-barra"
              role="progressbar"
              aria-label={a.nombre}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(a.fraccion * 100)}
            >
              <motion.div className="avance-relleno" initial={false} animate={{ scaleX: a.fraccion }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
