import type { CSSProperties } from 'react'
import { IconoActividad } from './Iconos'
import { Presionable } from './Presionable'
import { admiteMinimo } from '../logic/progreso'
import { MIN_DIA, formatearDuracion, horaCampo, horaDeFin } from '../logic/tiempo'
import type { Actividad, Bloque, EstadoBloque } from '../logic/types'

interface Props {
  bloque: Bloque
  dia: number
  actividad: Actividad | undefined
  /** Tocar el estado que ya está puesto lo devuelve a "planificado". */
  alMarcar: (estado: EstadoBloque) => void
}

const OPCIONES: { estado: Exclude<EstadoBloque, 'planificado'>; titulo: string }[] = [
  { estado: 'hecho', titulo: 'Hecho' },
  { estado: 'minimo', titulo: 'Mínimo' },
  { estado: 'salteado', titulo: 'Salteado' },
]

export function TarjetaBloque({ bloque, dia, actividad, alMarcar }: Props) {
  const estilo = actividad ? ({ '--act': `var(--act-${actividad.color})`, '--act-fondo': `var(--act-${actividad.color}-fondo)` } as CSSProperties) : undefined
  const opciones = OPCIONES.filter((o) => o.estado !== 'minimo' || admiteMinimo(actividad))
  return (
    <section className="tarjeta" style={estilo} data-estado={bloque.estado} aria-label={actividad?.nombre ?? bloque.actividad}>
      <div className="tarjeta-cabecera">
        <span className="sug-actividad">
          <IconoActividad id={bloque.actividad} />
          <span className="sug-texto">{actividad?.nombre ?? bloque.actividad}</span>
        </span>
        <span className="sug-duracion">{formatearDuracion(bloque.fin - bloque.inicio)}</span>
      </div>
      <p className="tarjeta-hora">
        {horaCampo(bloque.inicio - dia * MIN_DIA)}–{horaDeFin(bloque.fin - dia * MIN_DIA)}
        {actividad?.minimoMin != null && <span className="fila-valor-nota"> · mínimo: {formatearDuracion(actividad.minimoMin)}</span>}
      </p>
      <div className="estados" style={{ gridTemplateColumns: `repeat(${opciones.length}, 1fr)` }}>
        {opciones.map((o) => (
          <Presionable key={o.estado} className="opcion" aria-pressed={bloque.estado === o.estado} onClick={() => alMarcar(o.estado)}>
            {o.titulo}
          </Presionable>
        ))}
      </div>
    </section>
  )
}
