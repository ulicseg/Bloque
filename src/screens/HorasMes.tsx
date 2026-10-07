import { useState } from 'react'
import { IconoAdelante, IconoAtras } from '../components/Iconos'
import { Pantalla } from '../components/Pantalla'
import { Presionable } from '../components/Presionable'
import { MIN_BASE_SEMANA, horasDelMes, textoDiferencia } from '../logic/horasMes'
import { formatearDuracion, mesDe, nombreMes, sumarMeses } from '../logic/tiempo'
import type { Datos } from '../logic/types'

interface Props {
  datos: Datos
  /** Fecha de hoy (AAAA-MM-DD): el contador arranca en este mes. */
  hoy: string
  alVolver: () => void
}

const texto = (min: number) => (min === 0 ? '0 h' : formatearDuracion(min))

export function HorasMes({ datos, hoy, alVolver }: Props) {
  const [mes, setMes] = useState(() => mesDe(hoy))
  const r = horasDelMes(datos, mes)
  const hayCargadas = r.semanas.some((s) => s.cargada)

  return (
    <Pantalla titulo="Horas del mes" atras={{ texto: 'Semana', alVolver }}>
      <div className="grupo selector-mes">
        <Presionable className="selector-mes-boton" aria-label="Mes anterior" onClick={() => setMes(sumarMeses(mes, -1))}>
          <IconoAtras />
        </Presionable>
        <strong className="selector-mes-nombre">{nombreMes(mes)}</strong>
        <Presionable className="selector-mes-boton" aria-label="Mes siguiente" onClick={() => setMes(sumarMeses(mes, 1))}>
          <IconoAdelante />
        </Presionable>
      </div>

      <div className="grupo">
        <div className="fila fila-total">
          <span>Trabajadas</span>
          <strong>{texto(r.totalMin)}</strong>
        </div>
        <div className="fila">
          <span>Base de las semanas cargadas</span>
          <span className="fila-valor">{texto(r.esperadoMin)}</span>
        </div>
        <div className="fila">
          <span>Diferencia</span>
          <strong className="horas-diferencia" data-signo={Math.sign(r.diferenciaMin)}>
            {hayCargadas ? textoDiferencia(r.diferenciaMin) : '—'}
          </strong>
        </div>
      </div>

      <h2 className="seccion-titulo">Semana a semana</h2>
      <div className="grupo">
        {r.semanas.map((s) => {
          const dif = s.minutos - s.esperadoMin
          return (
            <div key={s.lunes} className="fila fila-dia">
              <span>
                {s.rango}
                {s.diasEnMes < 7 && <span className="fila-valor-nota"> · {s.diasEnMes} días de este mes</span>}
              </span>
              <span className="fila-valor">
                {s.cargada ? (
                  <>
                    {texto(s.minutos)} <span className="horas-diferencia" data-signo={Math.sign(dif)}>({textoDiferencia(dif)})</span>
                  </>
                ) : (
                  'Sin cargar'
                )}
              </span>
            </div>
          )
        })}
      </div>
      <p className="fila-nota fila-nota-suelta">
        Se calcula con los turnos cargados. Cada semana se compara con {formatearDuracion(MIN_BASE_SEMANA)} (4 h × 6 días), y en las semanas que
        cruzan de mes se proporciona por los días de cada uno. Un turno que cruza la medianoche cuenta entero en el día en que empieza.
      </p>
    </Pantalla>
  )
}
