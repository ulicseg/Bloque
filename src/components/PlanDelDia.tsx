import { useState, type CSSProperties } from 'react'
import { IconoActividad } from './Iconos'
import { Presionable } from './Presionable'
import { bloquesDelDia } from '../logic/bloques'
import { lineaDelDia, type Segmento } from '../logic/lineaDelDia'
import { DIAS, formatearDuracion, horaCampo, horaDeFin, numeroDelDia } from '../logic/tiempo'
import type { Actividad, Bloque, Semana } from '../logic/types'
import type { DiaCalculado, TipoTramo } from '../logic/windows'

const INICIAL = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const QUE: Record<TipoTramo, string> = {
  sueno: 'Dormir',
  despertar: 'Despertar',
  traslado: 'Traslado',
  turno: 'Turno',
  recuperacion: 'Recuperación',
  comida: 'Comida',
}

/** Un bloque nuevo en un hueco arranca de una hora (o del hueco entero si es más corto): después se ajusta. */
const propuesta = (inicio: number, fin: number): [number, number] => [inicio, Math.min(fin, inicio + 60)]

const horasLibres = (min: number) => `${Math.round((min / 60) * 2) / 2} h`.replace('.', ',')

interface Props {
  semana: Semana
  actividades: Actividad[]
  dias: DiaCalculado[]
  ventanaMinimaMin: number
  /** Día de hoy (0 = lunes) si la semana mostrada es la actual; null si no. */
  hoy: number | null
  alAgregar: (dia: number, desde: string, hasta: string) => void
  alEditar: (b: Bloque) => void
}

/**
 * El día elegido de punta a punta: lo ocupado en gris, los bloques ya puestos con su color y los huecos libres
 * marcados con "+": tocar uno abre un bloque nuevo ya ubicado ahí. Arriba, la semana con lo que queda libre de cada día.
 */
export function PlanDelDia({ semana, actividades, dias, ventanaMinimaMin, hoy, alAgregar, alEditar }: Props) {
  const [elegido, setElegido] = useState(hoy ?? 0)
  const lineas = dias.map((d) => lineaDelDia(d, bloquesDelDia(semana, d.dia), ventanaMinimaMin))
  const { segmentos, libreMin } = lineas[elegido]

  return (
    <div className="plan">
      <div className="plan-dias" role="group" aria-label="Día de la semana">
        {dias.map((d) => {
          const libre = lineas[d.dia].libreMin
          return (
            <Presionable
              key={d.dia}
              className="plan-dia"
              aria-pressed={d.dia === elegido}
              aria-label={`${DIAS[d.dia]} ${numeroDelDia(semana.lunes, d.dia)}, ${libre === 0 ? 'sin tiempo libre' : `${formatearDuracion(libre)} libres`}`}
              data-hoy={d.dia === hoy ? '' : undefined}
              onClick={() => setElegido(d.dia)}
            >
              <span className="plan-dia-letra">{INICIAL[d.dia]}</span>
              <span className="plan-dia-numero">{numeroDelDia(semana.lunes, d.dia)}</span>
              <span className="plan-dia-libre">{libre === 0 ? '–' : horasLibres(libre)}</span>
            </Presionable>
          )
        })}
      </div>

      <p className="plan-resumen">
        <strong>{DIAS[elegido]}</strong>
        {' · '}
        {libreMin === 0 ? 'sin tiempo libre' : `${formatearDuracion(libreMin)} libres para agregar bloques`}
      </p>

      <div className="plan-lista">
        {segmentos.map((s) => (
          <Fila key={`${s.tipo}-${s.inicio}-${s.fin}`} s={s} actividades={actividades} dia={elegido} alAgregar={alAgregar} alEditar={alEditar} />
        ))}
      </div>

      <p className="fila-nota plan-leyenda">
        Los huecos con ＋ son tiempo libre real, ya descontados sueño, traslados y comidas. Tocá uno para agregar un bloque ahí.
      </p>
    </div>
  )
}

function Fila({ s, actividades, dia, alAgregar, alEditar }: { s: Segmento; actividades: Actividad[]; dia: number; alAgregar: Props['alAgregar']; alEditar: Props['alEditar'] }) {
  const hora = (
    <span className="plan-hora">
      <span>{horaCampo(s.inicio)}</span>
      <span className="plan-hora-fin">{horaDeFin(s.fin)}</span>
    </span>
  )

  if (s.tipo === 'ocupado') {
    return (
      <div className="plan-fila plan-ocupado">
        {hora}
        <span className="plan-cuerpo">
          <span className="plan-titulo">{QUE[s.que]}</span>
          <span className="plan-sub">{formatearDuracion(s.fin - s.inicio)}</span>
        </span>
      </div>
    )
  }

  if (s.tipo === 'bloque') {
    const act = actividades.find((a) => a.id === s.bloque.actividad)
    const estilo = act ? ({ '--act': `var(--act-${act.color})`, '--act-fondo': `var(--act-${act.color}-fondo)` } as CSSProperties) : undefined
    const estado = { planificado: '', hecho: 'hecho', minimo: 'mínimo', salteado: 'salteado' }[s.bloque.estado]
    return (
      <Presionable className="plan-fila plan-bloque" style={estilo} onClick={() => alEditar(s.bloque)}>
        {hora}
        <span className="plan-cuerpo">
          <span className="plan-titulo plan-titulo-bloque">
            <IconoActividad id={s.bloque.actividad} />
            {act?.nombre ?? s.bloque.actividad}
          </span>
          <span className="plan-sub">{[formatearDuracion(s.fin - s.inicio), estado].filter(Boolean).join(' · ')}</span>
        </span>
      </Presionable>
    )
  }

  const [desde, hasta] = propuesta(s.inicio, s.fin)
  return (
    <Presionable className="plan-fila plan-libre" onClick={() => alAgregar(dia, horaCampo(desde), horaDeFin(hasta))}>
      {hora}
      <span className="plan-cuerpo">
        <span className="plan-titulo">Libre · {formatearDuracion(s.fin - s.inicio)}</span>
        <span className="plan-sub">{s.foco ? 'Tocá para agregar un bloque' : 'Cerca de dormir: mejor algo liviano'}</span>
      </span>
      <span className="plan-mas" aria-hidden="true">＋</span>
    </Presionable>
  )
}
