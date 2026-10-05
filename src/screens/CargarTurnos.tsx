import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { HojaConfirmacion } from '../components/HojaConfirmacion'
import { Pantalla } from '../components/Pantalla'
import { Presionable } from '../components/Presionable'
import {
  MIN_HORA,
  formatearDuracion,
  horaCampo,
  horaCorta,
  nombreDia,
  numeroDelDia,
  rangoSemana,
} from '../logic/tiempo'
import {
  TURNOS_CORTOS,
  TURNOS_FIJOS,
  continuaciones,
  copiarTurnos,
  crearTurno,
  descripcionFin,
  duracionTurno,
  etiquetaTurno,
  fijarTurnoDelDia,
  largoDeTurno,
  textoConflicto,
  textoTotal,
  tipoDeTurno,
  turnoDelDia,
  turnoDesdeCampos,
  type Vecinas,
} from '../logic/turnos'
import type { Semana as DatosSemana } from '../logic/types'

interface Props {
  semana: DatosSemana
  vecinas: Vecinas
  alGuardar: (s: DatosSemana) => void
  alVolver: () => void
}

interface Edicion {
  dia: number
  desde: string
  hasta: string
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export function CargarTurnos({ semana, vecinas, alGuardar, alVolver }: Props) {
  const [error, setError] = useState<{ dia: number; texto: string } | null>(null)
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const [confirmaCopia, setConfirmaCopia] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<Record<number, '4' | '8' | undefined>>({})

  const origenCopia = vecinas.anterior
  const hayOrigen = (origenCopia?.turnos.length ?? 0) > 0
  const sigueDelDomingo = continuaciones(vecinas.anterior)[0]

  const elegir = (dia: number, turno: ReturnType<typeof crearTurno>) => {
    const r = fijarTurnoDelDia(semana, dia, turno, vecinas)
    setAviso(null)
    if (r.ok) {
      setError(null)
      alGuardar(r.semana)
      return true
    }
    setError({ dia, texto: r.motivo === 'superpuesto' ? textoConflicto(r.conflicto) : 'Ese turno no es válido.' })
    return false
  }

  const abrirOtro = (dia: number) => {
    const actual = turnoDelDia(semana, dia)
    // Con turno propio se parte de él; si no, un turno corto de mañana como punto de partida
    setEdicion({
      dia,
      desde: horaCampo(actual ? actual.inicio : 8 * MIN_HORA),
      hasta: horaCampo(actual ? actual.fin : 12 * MIN_HORA),
    })
    setError(null)
  }

  const guardarOtro = () => {
    if (!edicion) return
    const turno = turnoDesdeCampos(edicion.dia, edicion.desde, edicion.hasta)
    if (!turno) {
      setError({ dia: edicion.dia, texto: 'Elegí una hora de inicio y una de fin distintas.' })
      return
    }
    if (elegir(edicion.dia, turno)) setEdicion(null)
  }

  const copiar = () => {
    if (!origenCopia) return
    const { semana: nueva, omitidos } = copiarTurnos(origenCopia, semana, vecinas)
    setConfirmaCopia(false)
    setError(null)
    setEdicion(null)
    alGuardar(nueva)
    setAviso(
      omitidos.length === 0
        ? 'Copiaste los turnos de la semana anterior.'
        : `Copiaste los turnos, pero ${plural(omitidos.length, 'no entró', 'no entraron')} porque se superponía con el turno que sigue del domingo.`,
    )
  }

  const pedirCopia = () => (semana.turnos.length > 0 ? setConfirmaCopia(true) : copiar())

  const edicionDuracion = (() => {
    if (!edicion) return null
    const t = turnoDesdeCampos(edicion.dia, edicion.desde, edicion.hasta)
    return t ? formatearDuracion(duracionTurno(t)) : null
  })()

  return (
    <Pantalla titulo="Cargar turnos" atras={{ texto: 'Semana', alVolver }}>
      <p className="subtitulo">Semana del {rangoSemana(semana.lunes)}</p>

      {/* Flota arriba con material de barra: los días pasan por debajo y el total siempre se ve */}
      <div className="total-flotante" aria-live="polite">
        <span>Horas de turno</span>
        <strong>{textoTotal(semana)}</strong>
      </div>

      <div className="grupo">
        <Presionable className="fila fila-boton" onClick={pedirCopia} disabled={!hayOrigen}>
          Copiar semana anterior
        </Presionable>
        <p className="fila-nota">
          {hayOrigen
            ? `Trae los turnos de la semana del ${rangoSemana(origenCopia!.lunes)}.`
            : 'La semana anterior no tiene turnos cargados.'}
        </p>
      </div>

      {aviso && (
        <p className="aviso aviso-ok" role="status">
          {aviso}
        </p>
      )}

      {Array.from({ length: 7 }, (_, dia) => {
        const turno = turnoDelDia(semana, dia)
        const tipo = turno ? tipoDeTurno(turno) : null
        const fin = turno ? descripcionFin(turno) : null
        const abierto = edicion?.dia === dia
        // Lo que se está eligiendo (aún sin guardar) manda sobre lo guardado
        const largo: 'libre' | '4' | '8' | 'otro' = abierto
          ? 'otro'
          : (pendiente[dia] ?? (turno ? largoDeTurno(turno) : 'libre'))
        return (
          <section key={dia} className="dia" aria-label={`${nombreDia(dia)} ${numeroDelDia(semana.lunes, dia)}`}>
            <h2 className="dia-titulo">
              {nombreDia(dia)} <span className="dia-numero">{numeroDelDia(semana.lunes, dia)}</span>
            </h2>
            {dia === 0 && sigueDelDomingo && (
              <p className="dia-nota">Sigue el turno del domingo hasta las {horaCorta(sigueDelDomingo.fin)}.</p>
            )}
            <div className="opciones opciones-largo" role="group" aria-label="Largo del turno">
              <Presionable
                className="opcion"
                aria-pressed={largo === 'libre'}
                onClick={() => {
                  setEdicion(null)
                  setPendiente((p) => ({ ...p, [dia]: undefined }))
                  elegir(dia, null)
                }}
              >
                Libre
              </Presionable>
              {(['4', '8'] as const).map((l) => (
                <Presionable
                  key={l}
                  className="opcion"
                  aria-pressed={largo === l}
                  onClick={() => {
                    setEdicion(null)
                    setError(null)
                    setPendiente((p) => ({ ...p, [dia]: l }))
                  }}
                >
                  {l} h
                </Presionable>
              ))}
              <Presionable
                className="opcion"
                aria-pressed={largo === 'otro'}
                onClick={() => {
                  setPendiente((p) => ({ ...p, [dia]: undefined }))
                  abrirOtro(dia)
                }}
              >
                Otro
              </Presionable>
            </div>

            {(largo === '4' || largo === '8') && (
              <div className="opciones opciones-hora" role="group" aria-label={`Horario del turno de ${largo} horas`}>
                <p className="opciones-ayuda">¿A qué hora arranca?</p>
                {(largo === '4' ? TURNOS_CORTOS : TURNOS_FIJOS).map((f) => (
                  <Presionable
                    key={f.id}
                    className="opcion"
                    aria-pressed={tipo === f.id}
                    onClick={() => {
                      setEdicion(null)
                      if (elegir(dia, crearTurno(dia, f.desde, f.hasta))) setPendiente((p) => ({ ...p, [dia]: undefined }))
                    }}
                  >
                    {f.etiqueta}
                  </Presionable>
                ))}
              </div>
            )}

            {largo === 'otro' && turno && !abierto && <p className="dia-nota">Horario propio: {etiquetaTurno(turno)}</p>}

            <AnimatePresence initial={false}>
              {abierto && edicion && (
                <motion.div
                  key="otro"
                  className="otro"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <div className="otro-campos">
                    <label className="campo">
                      <span>Desde</span>
                      <input
                        type="time"
                        value={edicion.desde}
                        onChange={(e) => setEdicion({ ...edicion, desde: e.target.value })}
                      />
                    </label>
                    <label className="campo">
                      <span>Hasta</span>
                      <input
                        type="time"
                        value={edicion.hasta}
                        onChange={(e) => setEdicion({ ...edicion, hasta: e.target.value })}
                      />
                    </label>
                  </div>
                  <p className="otro-duracion">{edicionDuracion ? `Dura ${edicionDuracion}.` : 'Elegí dos horas distintas.'}</p>
                  <div className="otro-acciones">
                    <Presionable className="boton-hoja" onClick={() => setEdicion(null)}>
                      Cancelar
                    </Presionable>
                    <Presionable className="boton-hoja boton-hoja-tinte" onClick={guardarOtro}>
                      Listo
                    </Presionable>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {fin && !abierto && <p className="dia-nota">{fin}</p>}
            {error?.dia === dia && (
              <p className="aviso aviso-error dia-error" role="alert">
                {error.texto}
              </p>
            )}
          </section>
        )
      })}

      <HojaConfirmacion
        abierta={confirmaCopia}
        titulo="¿Reemplazar los turnos?"
        alCancelar={() => setConfirmaCopia(false)}
        acciones={
          <>
            <Presionable className="boton-hoja" onClick={() => setConfirmaCopia(false)}>
              Cancelar
            </Presionable>
            <Presionable className="boton-hoja boton-hoja-destructivo" onClick={copiar}>
              Reemplazar
            </Presionable>
          </>
        }
      >
        <p>
          Esta semana ya tiene {plural(semana.turnos.length, 'turno', 'turnos')} cargados ({textoTotal(semana)}). Se
          reemplazan por los de la semana anterior.
        </p>
        <p className="hoja-nota">Los bloques que ya armaste no se tocan.</p>
      </HojaConfirmacion>
    </Pantalla>
  )
}
