import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Pantalla } from '../components/Pantalla'
import { Presionable } from '../components/Presionable'
import { Segmentado } from '../components/Segmentado'
import { BloquesSemana } from '../components/BloquesSemana'
import { ListaSugerencia } from '../components/ListaSugerencia'
import { PlanDelDia } from '../components/PlanDelDia'
import { aceptarSugerencia, bloquesQueCuentan } from '../logic/bloques'
import type { Bloque } from '../logic/types'
import { conSemana, descripcionFin, etiquetaTurno, semanaVacia, textoTotal, turnoDelDia, vecinasDe } from '../logic/turnos'
import { diaDeLaSemana, fechaEnArgentina, formatearDuracion, lunesActual, mesDe, nombreDia, numeroDelDia, rangoSemana, sumarDias } from '../logic/tiempo'
import { suggest } from '../logic/suggest'
import { computeWindows } from '../logic/windows'
import { useDatos } from '../useDatos'
import { CargarTurnos } from './CargarTurnos'
import { EditarBloque } from './EditarBloque'
import { HorasMes } from './HorasMes'
import { horasDelMes, textoDiferencia } from '../logic/horasMes'

type Cual = 'esta' | 'proxima'

export function Semana() {
  const { datos, cambiar, fallo } = useDatos()
  const [cual, setCual] = useState<Cual>('esta')
  const [cargando, setCargando] = useState(false)
  const [verHoras, setVerHoras] = useState(false)
  // undefined = cerrado; null = bloque nuevo; un bloque = editarlo
  const [editando, setEditando] = useState<Bloque | null | undefined>(undefined)
  // Si el bloque nuevo nace de un hueco libre del plan del día: en qué día y a qué hora
  const [desdeHueco, setDesdeHueco] = useState<{ dia: number; desde: string; hasta: string } | undefined>(undefined)
  // Semana para la que se pidió la sugerencia: al cambiar de semana no se muestra una ajena
  const [pedida, setPedida] = useState<string | null>(null)
  const reducido = useReducedMotion() ?? false

  // La semana actual se calcula una vez por visita a la pantalla, en hora de Argentina
  const [actual] = useState(() => lunesActual(Date.now()))
  const lunes = cual === 'esta' ? actual : sumarDias(actual, 7)
  const semana = datos.semanas[lunes] ?? semanaVacia(lunes)
  const vecinas = vecinasDe(datos, lunes)
  const dias = useMemo(
    () => computeWindows(semana, datos.ajustes, vecinas.anterior, vecinas.siguiente),
    [semana, datos.ajustes, vecinas.anterior, vecinas.siguiente],
  )

  const resumenMes = useMemo(() => horasDelMes(datos, mesDe(fechaEnArgentina(Date.now()))), [datos])

  // Una vez pedida, se recalcula sola si cambian los turnos o las metas: nunca queda una sugerencia vieja en pantalla
  const sugerencia = useMemo(
    () => (pedida === lunes ? suggest(dias, datos.actividades, bloquesQueCuentan(semana), datos.ajustes) : null),
    [pedida, lunes, dias, datos.actividades, datos.ajustes, semana.bloques],
  )

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
          <Presionable className="fila" onClick={() => setVerHoras(true)}>
            <span>Horas del mes</span>
            <span className="fila-valor">
              {resumenMes.totalMin > 0 ? `${formatearDuracion(resumenMes.totalMin)} (${textoDiferencia(resumenMes.diferenciaMin)})` : 'Ver'}
            </span>
          </Presionable>
        </div>

        <h2 className="seccion-titulo">Tiempo libre</h2>
        <PlanDelDia
          key={lunes}
          semana={semana}
          actividades={datos.actividades}
          dias={dias}
          ventanaMinimaMin={datos.ajustes.ventanaMinimaMin}
          hoy={cual === 'esta' ? diaDeLaSemana(fechaEnArgentina(Date.now())) : null}
          alAgregar={(dia, desde, hasta) => {
            setDesdeHueco({ dia, desde, hasta })
            setEditando(null)
          }}
          alEditar={(b) => setEditando(b)}
        />

        <h2 className="seccion-titulo">Sugerencia</h2>
        <div className="grupo">
          <Presionable className="fila fila-boton" onClick={() => setPedida(lunes)} disabled={semana.turnos.length === 0}>
            Sugerir semana
          </Presionable>
          <p className="fila-nota">
            {semana.turnos.length === 0
              ? 'Cargá los turnos para poder sugerir.'
              : 'Propone dónde ubicar cada bloque según tus metas. Por ahora solo se muestra: no se guarda.'}
          </p>
        </div>
        {sugerencia && (
          <>
            <ListaSugerencia lunes={lunes} sugerencia={sugerencia} actividades={datos.actividades} />
            {sugerencia.bloques.length > 0 && (
              <div className="grupo">
                <Presionable
                  className="fila fila-boton"
                  onClick={() => {
                    cambiar((d) => conSemana(d, aceptarSugerencia(semana, sugerencia.bloques)))
                    setPedida(null)
                  }}
                >
                  Usar esta sugerencia
                </Presionable>
                <p className="fila-nota">Reemplaza los bloques que solo estaban planificados. Los fijos y los ya hechos no se tocan.</p>
              </div>
            )}
          </>
        )}

        <h2 className="seccion-titulo">Bloques de la semana</h2>
        <BloquesSemana semana={semana} actividades={datos.actividades} alElegir={(b) => setEditando(b)} />
        <div className="grupo">
          <Presionable
            className="fila fila-boton"
            onClick={() => {
              setDesdeHueco(undefined)
              setEditando(null)
            }}
          >
            Agregar bloque
          </Presionable>
        </div>

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
        {verHoras && (
          <motion.div
            key="horas-mes"
            className="pantalla-capa capa-detalle"
            initial={reducido ? { opacity: 0 } : { x: '100%' }}
            animate={reducido ? { opacity: 1 } : { x: 0 }}
            exit={reducido ? { opacity: 0, pointerEvents: 'none' } : { x: '100%', pointerEvents: 'none' }}
          >
            <HorasMes datos={datos} hoy={fechaEnArgentina(Date.now())} alVolver={() => setVerHoras(false)} />
          </motion.div>
        )}
        {editando !== undefined && (
          <motion.div
            key="editar-bloque"
            className="pantalla-capa capa-detalle"
            initial={reducido ? { opacity: 0 } : { x: '100%' }}
            animate={reducido ? { opacity: 1 } : { x: 0 }}
            exit={reducido ? { opacity: 0, pointerEvents: 'none' } : { x: '100%', pointerEvents: 'none' }}
          >
            <EditarBloque
              semana={semana}
              bloque={editando}
              inicial={desdeHueco}
              actividades={datos.actividades}
              dias={dias}
              alGuardar={(s) => cambiar((d) => conSemana(d, s))}
              alVolver={() => setEditando(undefined)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
