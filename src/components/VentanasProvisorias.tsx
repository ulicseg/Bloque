import { DIAS, formatearDuracion, horaCampo, horaDeFin, numeroDelDia } from '../logic/tiempo'
import { minutosLibres, type DiaCalculado } from '../logic/windows'
import type { FechaISO } from '../logic/types'

/** Tabla provisoria para revisar el cálculo de ventanas a mano. Se reemplaza cuando exista la sugerencia. */
export function VentanasProvisorias({ lunes, dias }: { lunes: FechaISO; dias: DiaCalculado[] }) {
  return (
    <div className="grupo">
      {dias.map((d) => (
        <div key={d.dia} className="fila fila-dia">
          <span>
            {DIAS[d.dia]} <span className="dia-numero">{numeroDelDia(lunes, d.dia)}</span>
          </span>
          <span className="fila-valor">
            {d.ventanas.length === 0 && 'Sin ventanas'}
            {d.ventanas.map((v) => (
              <span key={v.inicio} className="ventana-linea">
                {horaCampo(v.inicio)}–{horaDeFin(v.fin)}
                {!v.foco && <span className="fila-valor-nota"> · foco: no</span>}
              </span>
            ))}
          </span>
        </div>
      ))}
      <div className="fila fila-total">
        <span>Tiempo libre</span>
        <strong>{formatearDuracion(minutosLibres(dias))}</strong>
      </div>
    </div>
  )
}
