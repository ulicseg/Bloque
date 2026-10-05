import { useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { IconoAdelante } from '../components/Iconos'
import { Pantalla } from '../components/Pantalla'
import { Presionable } from '../components/Presionable'
import { conActividades, editarActividad, moverPrioridad, ordenadas, resumen } from '../logic/metas'
import type { IdActividad } from '../logic/types'
import { useDatos } from '../useDatos'
import { EditarMeta } from './EditarMeta'

export function Metas() {
  const { datos, cambiar, fallo } = useDatos()
  const [abierta, setAbierta] = useState<IdActividad | null>(null)
  const reducido = useReducedMotion() ?? false

  const lista = ordenadas(datos.actividades)
  const editando = datos.actividades.find((a) => a.id === abierta)

  return (
    <>
      <Pantalla titulo="Metas">
        <p className="subtitulo">Lo que querés lograr cada semana. La sugerencia de la semana parte de acá.</p>

        {fallo && (
          <p className="aviso aviso-error" role="alert">
            No se pudo guardar el último cambio. Exportá un respaldo desde Ajustes.
          </p>
        )}

        <h2 className="seccion-titulo">Por orden de prioridad</h2>
        <div className="grupo">
          {lista.map((a) => (
            <Presionable key={a.id} className="fila fila-meta" onClick={() => setAbierta(a.id)} style={{ '--act': `var(--act-${a.color})`, '--act-fondo': `var(--act-${a.color}-fondo)` } as CSSProperties}>
              <span className="meta-marca" aria-hidden>
                {a.fija ? '·' : a.prioridad}
              </span>
              <span className="meta-texto">
                <span className="meta-nombre">{a.nombre}</span>
                <span className="meta-resumen">{resumen(a)}</span>
              </span>
              <span className="meta-flecha" aria-hidden>
                <IconoAdelante />
              </span>
            </Presionable>
          ))}
        </div>
        <p className="fila-nota fila-nota-suelta">
          El número es la prioridad de cada actividad: la 1 se ubica primero. Las fijas (como el psicólogo) no se sugieren.
        </p>
      </Pantalla>

      {/* Segundo nivel: entra desde la derecha y sale por el mismo lado (§7). Con movimiento reducido, solo fundido */}
      <AnimatePresence initial={false}>
        {editando && (
          <motion.div
            key="editar-meta"
            className="pantalla-capa capa-detalle"
            initial={reducido ? { opacity: 0 } : { x: '100%' }}
            animate={reducido ? { opacity: 1 } : { x: 0 }}
            exit={reducido ? { opacity: 0, pointerEvents: 'none' } : { x: '100%', pointerEvents: 'none' }}
          >
            <EditarMeta
              actividad={editando}
              total={datos.actividades.length}
              alCambiar={(c) => cambiar((d) => conActividades(d, editarActividad(d.actividades, editando.id, c)))}
              alMoverPrioridad={(n) => cambiar((d) => conActividades(d, moverPrioridad(d.actividades, editando.id, n)))}
              alVolver={() => setAbierta(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
