import type { CSSProperties } from 'react'
import { bloquesPorDia, type Sugerencia } from '../logic/suggest'
import { DIAS, MIN_DIA, formatearDuracion, horaCampo, horaDeFin, numeroDelDia } from '../logic/tiempo'
import type { Actividad, FechaISO } from '../logic/types'

interface Props {
  lunes: FechaISO
  sugerencia: Sugerencia
  actividades: Actividad[]
}

/** Resultado de "Sugerir semana" en lista: por ahora solo se mira, no se guarda ni se edita. */
export function ListaSugerencia({ lunes, sugerencia, actividades }: Props) {
  const nombre = (id: string) => actividades.find((a) => a.id === id)
  const dias = bloquesPorDia(sugerencia.bloques)

  return (
    <>
      {sugerencia.faltantes.length === 0 ? (
        <p className="aviso aviso-ok" role="status">
          Entraron todas las metas de la semana.
        </p>
      ) : (
        <div className="aviso aviso-atencion" role="status">
          <strong className="faltantes-titulo">Lo que no entró</strong>
          <ul className="faltantes">
            {sugerencia.faltantes.map((f) => (
              <li key={f.actividad}>{f.detalle}</li>
            ))}
          </ul>
        </div>
      )}

      {sugerencia.bloques.length === 0 ? (
        <p className="fila-nota fila-nota-suelta">No hay bloques para proponer con las ventanas de esta semana.</p>
      ) : (
        <div className="grupo">
          {dias.map((bloques, dia) =>
            bloques.length === 0 ? null : (
              <section key={dia} className="sug-dia" aria-label={`${DIAS[dia]} ${numeroDelDia(lunes, dia)}`}>
                <h3 className="sug-dia-titulo">
                  {DIAS[dia]} <span className="dia-numero">{numeroDelDia(lunes, dia)}</span>
                </h3>
                {bloques.map((b) => {
                  const act = nombre(b.actividad)
                  const estilo = act
                    ? ({ '--act': `var(--act-${act.color})`, '--act-fondo': `var(--act-${act.color}-fondo)` } as CSSProperties)
                    : undefined
                  return (
                    <div key={b.id} className="fila sug-bloque" style={estilo}>
                      <span className="sug-hora">
                        {horaCampo(b.inicio - dia * MIN_DIA)}–{horaDeFin(b.fin - dia * MIN_DIA)}
                      </span>
                      <span className="sug-actividad">{act?.nombre ?? b.actividad}</span>
                      <span className="sug-duracion">{formatearDuracion(b.fin - b.inicio)}</span>
                    </div>
                  )
                })}
              </section>
            ),
          )}
        </div>
      )}

      <p className="fila-nota fila-nota-suelta">
        Usa {formatearDuracion(sugerencia.usoSemana.asignadoMin)} de las {formatearDuracion(sugerencia.usoSemana.ventanasMin)} libres
        (tope: {formatearDuracion(sugerencia.usoSemana.topeMin)}).
      </p>
    </>
  )
}
