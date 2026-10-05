import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Pantalla } from '../components/Pantalla'
import { Presionable } from '../components/Presionable'
import { Segmentado } from '../components/Segmentado'
import { VentanasProvisorias } from '../components/VentanasProvisorias'
import { conSemana, descripcionFin, etiquetaTurno, semanaVacia, textoTotal, turnoDelDia, vecinasDe } from '../logic/turnos'
import { lunesActual, nombreDia, numeroDelDia, rangoSemana, sumarDias } from '../logic/tiempo'
import { computeWindows } from '../logic/windows'
import { useDatos } from '../useDatos'
import { CargarTurnos } from './CargarTurnos'

type Cual = 'esta' | 'proxima'

export function Semana() {
  const { datos, cambiar, fallo } = useDatos()
  const [cual, setCual] = useState<Cual>('esta')
  const [cargando, setCargando] = useState(false)
  const reducido = useReducedMotion() ?? false

  // La semana actual se calcula una vez por visita a la pantalla, en hora de Argentina
  const [actual] = useState(() => lunesActual(Date.now()))
  const lunes = cual === 'esta' ? actual : sumarDias(actual, 7)
  const semana = datos.semanas[lunes] ?? semanaVacia(lunes)
  const vecinas = vecinasDe(datos, lunes)
  const dias = useMemo(() => computeWindows(semana, datos.ajustes, vecinas.anterior), [semana, datos.ajustes, vecinas.anterior])

  return (
    <>
      <Pantalla titulo="Semana">
        <Segmentado
          etiqueta="Semana"
          valor={cual}
          alElegir={setCual}
          opciones={[
            { valor: 'esta', titulo: 'Esta semana', detalle: rangoSemana(actual) },
            { valor: 'proxima', titulo: 'Próxima', detalle: rangoSemana(sumarDias(actual, 7)) },
          ]}
        />

        {fallo && (
          <p className="aviso aviso-error" role="alert">
            No se pudo guardar el último cambio. Exportá un respaldo desde Ajustes.
          </p>
        )}

        <h2 className="seccion-titulo">Turnos</h2>
        <div className="grupo">
          {Array.from({ length: 7 }, (_, dia) => {
            const t = turnoDelDia(semana, dia)
            return (
              <div key={dia} className="fila fila-dia">
                <span>
                  {nombreDia(dia)} <span className="dia-numero">{numeroDelDia(lunes, dia)}</span>
                </span>
                <span className="fila-valor">
                  {t ? etiquetaTurno(t) : 'Libre'}
                  {t && descripcionFin(t) && <span className="fila-valor-nota"> → día siguiente</span>}
                </span>
              </div>
            )
          })}
          <div className="fila fila-total">
            <span>Horas de turno</span>
            <strong>{textoTotal(semana)}</strong>
          </div>
        </div>

        <div className="grupo">
          <Presionable className="fila fila-boton" onClick={() => setCargando(true)}>
            {semana.turnos.length > 0 ? 'Editar turnos' : 'Cargar turnos'}
          </Presionable>
        </div>

        <h2 className="seccion-titulo">Ventanas libres (provisorio)</h2>
        <VentanasProvisorias lunes={lunes} dias={dias} />

        {import.meta.env.DEV && (
          <>
            <h2 className="seccion-titulo">Desarrollo</h2>
            <div className="grupo">
              <Presionable
                className="fila fila-boton"
                onClick={() => {
                  // Solo en desarrollo: el import dinámico queda fuera del build de producción
                  void import('../logic/ejemplo').then(({ SEMANA_EJEMPLO }) =>
                    cambiar((d) => conSemana(d, SEMANA_EJEMPLO)),
                  )
                }}
              >
                Cargar semana de ejemplo (5–11 oct 2026)
              </Presionable>
            </div>
          </>
        )}
      </Pantalla>

      {/* Navegación de segundo nivel: entra desde la derecha y sale por el mismo lado (§7). Con movimiento reducido, solo fundido */}
      <AnimatePresence initial={false}>
        {cargando && (
          <motion.div
            key="cargar"
            className="pantalla-capa capa-detalle"
            initial={reducido ? { opacity: 0 } : { x: '100%' }}
            animate={reducido ? { opacity: 1 } : { x: 0 }}
            exit={reducido ? { opacity: 0, pointerEvents: 'none' } : { x: '100%', pointerEvents: 'none' }}
          >
            <CargarTurnos
              semana={semana}
              vecinas={vecinas}
              alGuardar={(s) => cambiar((d) => conSemana(d, s))}
              alVolver={() => setCargando(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
