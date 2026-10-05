import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Reorder, useDragControls, useReducedMotion } from 'motion/react'
import { IconoActividad, IconoAsa } from './Iconos'
import { Presionable } from './Presionable'
import { ordenadas, resumen } from '../logic/metas'
import type { Actividad, IdActividad } from '../logic/types'

interface Props {
  actividades: Actividad[]
  alAbrir: (id: IdActividad) => void
  /** Se llama al soltar (o al mover con el teclado) con los ids de la lista acomodada, de la primera a la última. */
  alReordenar: (ids: IdActividad[]) => void
}

const estiloDe = (a: Actividad) => ({ '--act': `var(--act-${a.color})`, '--act-fondo': `var(--act-${a.color}-fondo)` }) as CSSProperties

/**
 * La lista de prioridades se acomoda arrastrando el asa de cada fila: la de arriba se ubica primero.
 * Mientras se arrastra, el orden vive acá (la fila sigue al dedo 1:1); recién al soltar se guarda, así un
 * arrastre no escribe en el almacenamiento a cada paso. Las fijas no se sugieren, así que no tienen lugar en la lista.
 */
export function ListaPrioridad({ actividades, alAbrir, alReordenar }: Props) {
  const sugeribles = ordenadas(actividades).filter((a) => !a.fija)
  const fijas = ordenadas(actividades).filter((a) => a.fija)
  const idsGuardados = sugeribles.map((a) => a.id)

  const [orden, setOrden] = useState<IdActividad[]>(idsGuardados)
  const ultimo = useRef(orden)
  ultimo.current = orden

  // Si los datos cambian por otro lado (importar un respaldo), la lista se reacomoda; mientras se arrastra no se pisa
  const clave = idsGuardados.join()
  useEffect(() => setOrden(clave.split(',') as IdActividad[]), [clave])

  const porId = new Map(actividades.map((a) => [a.id, a]))
  const mover = (id: IdActividad, delta: number) => {
    const desde = ultimo.current.indexOf(id)
    const hasta = desde + delta
    if (desde < 0 || hasta < 0 || hasta >= ultimo.current.length) return
    const nuevo = [...ultimo.current]
    nuevo.splice(hasta, 0, nuevo.splice(desde, 1)[0])
    setOrden(nuevo)
    alReordenar(nuevo)
  }

  return (
    <>
      <Reorder.Group as="div" axis="y" values={orden} onReorder={setOrden} className="grupo lista-prioridad">
        {orden.map((id, i) => {
          const a = porId.get(id)
          return a ? <Fila key={id} a={a} numero={i + 1} alAbrir={alAbrir} alSoltar={() => alReordenar(ultimo.current)} alMover={(d) => mover(id, d)} /> : null
        })}
      </Reorder.Group>

      {fijas.length > 0 && (
        <>
          <h2 className="seccion-titulo">Fijas</h2>
          <div className="grupo">
            {fijas.map((a) => (
              <Presionable key={a.id} className="fila fila-meta" onClick={() => alAbrir(a.id)} style={estiloDe(a)}>
                <IconoActividad id={a.id} />
                <span className="meta-texto">
                  <span className="meta-nombre">{a.nombre}</span>
                  <span className="meta-resumen">{resumen(a)}</span>
                </span>
              </Presionable>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function Fila({ a, numero, alAbrir, alSoltar, alMover }: { a: Actividad; numero: number; alAbrir: Props['alAbrir']; alSoltar: () => void; alMover: (delta: number) => void }) {
  const controles = useDragControls()
  const [arrastrando, setArrastrando] = useState(false)
  const reducido = useReducedMotion() ?? false

  const alTeclado = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    alMover(e.key === 'ArrowUp' ? -1 : 1)
  }

  return (
    <Reorder.Item
      as="div"
      value={a.id}
      dragListener={false}
      dragControls={controles}
      onDragStart={() => setArrastrando(true)}
      onDragEnd={() => {
        setArrastrando(false)
        alSoltar()
      }}
      data-arrastrando={arrastrando || undefined}
      className="fila fila-ordenable"
      style={estiloDe(a)}
      // Levantada del resto mientras se arrastra: más cerca del dedo, con sombra y sin cambiar de tamaño si hay movimiento reducido
      whileDrag={{ scale: reducido ? 1 : 1.02, zIndex: 2, boxShadow: '0 0.75rem 2rem rgb(0 0 0 / 0.28)' }}
    >
      <span className="meta-numero" aria-hidden="true">
        {numero}
      </span>
      <Presionable className="fila-ordenable-abrir" onClick={() => alAbrir(a.id)}>
        <IconoActividad id={a.id} />
        <span className="meta-texto">
          <span className="meta-nombre">{a.nombre}</span>
          <span className="meta-resumen">{resumen(a)}</span>
        </span>
      </Presionable>
      <button
        type="button"
        className="asa-orden"
        aria-label={`Prioridad ${numero}: ${a.nombre}. Arrastrá para moverla, o usá las flechas arriba y abajo.`}
        // El agarre empieza al apoyar el dedo (no al soltar) y la fila queda pegada a él desde el primer píxel
        onPointerDown={(e) => {
          e.preventDefault()
          controles.start(e)
        }}
        onKeyDown={alTeclado}
      >
        <IconoAsa />
      </button>
    </Reorder.Item>
  )
}
