import { DIAS, formatearDuracion, horaCampo, horaDeFin, numeroDelDia } from '../logic/tiempo'
import { minutosLibres, type DiaCalculado } from '../logic/windows'
import type { FechaISO } from '../logic/types'

const MIN_DIA = 24 * 60

const minutosDelDia = (d: DiaCalculado) => d.ventanas.reduce((s, v) => s + (v.fin - v.inicio), 0)

/**
 * El tiempo libre de cada día, dibujado sobre una línea de 0 a 24 h: lo coloreado es libre y lo gris es sueño,
 * turno, traslados o comidas. Así se ve de un vistazo dónde hay lugar, sin leer horarios.
 */
export function VentanasLibres({ lunes, dias }: { lunes: FechaISO; dias: DiaCalculado[] }) {
  return (
    <div className="grupo">
      <div className="libre-escala" aria-hidden="true">
        <span>0 h</span>
        <span>6</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
      {dias.map((d) => {
        const total = minutosDelDia(d)
        return (
          <div key={d.dia} className="libre-dia">
            <div className="libre-cabecera">
              <span>
                {DIAS[d.dia]} <span className="dia-numero">{numeroDelDia(lunes, d.dia)}</span>
              </span>
              <strong className={total === 0 ? 'libre-nada' : undefined}>{total === 0 ? 'Sin tiempo libre' : formatearDuracion(total)}</strong>
            </div>
            <div className="libre-linea" role="img" aria-label={`Tiempo libre del ${DIAS[d.dia]}: ${d.ventanas.map((v) => `${horaCampo(v.inicio)} a ${horaDeFin(v.fin)}`).join(', ') || 'ninguno'}`}>
              {d.ventanas.map((v) => (
                <span
                  key={v.inicio}
                  className={v.foco ? 'libre-tramo' : 'libre-tramo libre-tramo-liviano'}
                  style={{ left: `${(v.inicio / MIN_DIA) * 100}%`, width: `${((v.fin - v.inicio) / MIN_DIA) * 100}%` }}
                />
              ))}
            </div>
            {d.ventanas.length > 0 && (
              <ul className="libre-horarios">
                {d.ventanas.map((v) => (
                  <li key={v.inicio}>
                    <span className="libre-hora">
                      {horaCampo(v.inicio)} a {horaDeFin(v.fin)}
                    </span>
                    <span className="libre-duracion">{formatearDuracion(v.fin - v.inicio)}</span>
                    {!v.foco && <span className="libre-etiqueta">Cerca de dormir</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
      <p className="fila-nota">
        Lo coloreado es libre; lo gris es sueño, turno, traslados y comidas. Lo más claro queda cerca de la hora de dormir, mejor para tareas livianas.
      </p>
      <div className="fila fila-total">
        <span>Tiempo libre de la semana</span>
        <strong>{formatearDuracion(minutosLibres(dias))}</strong>
      </div>
    </div>
  )
}
