import type { CSSProperties } from 'react'
import { IconoActividad } from './Iconos'
import { Presionable } from './Presionable'
import { bloquesDelDia } from '../logic/bloques'
import { DIAS, MIN_DIA, formatearDuracion, horaCampo, horaDeFin, numeroDelDia } from '../logic/tiempo'
import type { Actividad, Bloque, Semana } from '../logic/types'

interface Props {
  semana: Semana
  actividades: Actividad[]
  alElegir: (b: Bloque) => void
}

const ESTADOS = { planificado: '', hecho: 'Hecho', minimo: 'Mínimo', salteado: 'Salteado' } as const

/** Los bloques ya guardados de la semana, por día. Tocar uno lo abre para editarlo. */
export function BloquesSemana({ semana, actividades, alElegir }: Props) {
  if (semana.bloques.length === 0) {
    return <p className="fila-nota fila-nota-suelta">Todavía no hay bloques guardados en esta semana.</p>
  }
  return (
    <div className="grupo">
      {Array.from({ length: 7 }, (_, dia) => {
        const bloques = bloquesDelDia(semana, dia)
        if (bloques.length === 0) return null
        return (
          <section key={dia} className="sug-dia" aria-label={`${DIAS[dia]} ${numeroDelDia(semana.lunes, dia)}`}>
            <h3 className="sug-dia-titulo">
              {DIAS[dia]} <span className="dia-numero">{numeroDelDia(semana.lunes, dia)}</span>
            </h3>
            {bloques.map((b) => {
              const act = actividades.find((a) => a.id === b.actividad)
              const estilo = act ? ({ '--act': `var(--act-${act.color})`, '--act-fondo': `var(--act-${act.color}-fondo)` } as CSSProperties) : undefined
              const nota = [b.fijo ? 'fijo' : '', ESTADOS[b.estado].toLowerCase()].filter(Boolean).join(' · ')
              return (
                <Presionable key={b.id} className="fila sug-bloque" style={estilo} onClick={() => alElegir(b)}>
                  <span className="sug-hora">
                    {horaCampo(b.inicio - dia * MIN_DIA)}–{horaDeFin(b.fin - dia * MIN_DIA)}
                  </span>
                  <span className="sug-actividad">
                    <IconoActividad id={b.actividad} />
                    <span className="sug-texto">
                      {act?.nombre ?? b.actividad}
                      {nota && <span className="sug-nota">{nota}</span>}
                    </span>
                  </span>
                  <span className="sug-duracion">{formatearDuracion(b.fin - b.inicio)}</span>
                </Presionable>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
