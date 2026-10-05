import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AvanceSemana } from '../components/AvanceSemana'
import { ListaPrioridad } from '../components/ListaPrioridad'
import { avanceSemana } from '../logic/progreso'
import { lunesActual } from '../logic/tiempo'
import { semanaVacia } from '../logic/turnos'
import { Pantalla } from '../components/Pantalla'
import { conActividades, editarActividad, reordenar } from '../logic/metas'
import type { IdActividad } from '../logic/types'
import { useDatos } from '../useDatos'
import { EditarMeta } from './EditarMeta'

export function Metas() {
  const { datos, cambiar, fallo } = useDatos()
  const [abierta, setAbierta] = useState<IdActividad | null>(null)
  const reducido = useReducedMotion() ?? false

  const [lunes] = useState(() => lunesActual(Date.now()))
  const semanaActual = datos.semanas[lunes] ?? semanaVacia(lunes)
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

        <h2 className="seccion-titulo">Esta semana</h2>
        <AvanceSemana avances={avanceSemana(semanaActual, datos.actividades)} actividades={datos.actividades} />

        <h2 className="seccion-titulo">Prioridad</h2>
        <ListaPrioridad
          actividades={datos.actividades}
          alAbrir={setAbierta}
          alReordenar={(ids) => cambiar((d) => conActividades(d, reordenar(d.actividades, ids)))}
        />
        <p className="fila-nota fila-nota-suelta">
          Arrastrá el asa ≡ para acomodar la lista: la de arriba se ubica primero, y cuando falta lugar quedan afuera las de abajo. Tocá una para editarla.
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
              alCambiar={(c) => cambiar((d) => conActividades(d, editarActividad(d.actividades, editando.id, c)))}
              alVolver={() => setAbierta(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
