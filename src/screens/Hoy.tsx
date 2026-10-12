import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { IconoAdelante, IconoAtras, IconoMas } from '../components/Iconos'
import { Presionable } from '../components/Presionable'
import { AvanceSemana } from '../components/AvanceSemana'
import { Pantalla } from '../components/Pantalla'
import { TarjetaBloque } from '../components/TarjetaBloque'
import { bloquesDelDia, cambiarEstado } from '../logic/bloques'
import { avanceSemana } from '../logic/progreso'
import { DIAS, MIN_DIA, diaDeLaSemana, fechaEnArgentina, formatearDuracion, horaCampo, horaDeFin, lunesDe, sumarDias, textoFecha } from '../logic/tiempo'
import { conSemana, duracionTurno, semanaVacia, turnoDelDia } from '../logic/turnos'
import type { Bloque, EstadoBloque } from '../logic/types'
import { useDatos } from '../useDatos'
import { EditarBloque } from './EditarBloque'

export function Hoy() {
  const { datos, cambiar, fallo } = useDatos()
  const [ahora, setAhora] = useState(() => Date.now())

  // Si la app queda abierta de un día para el otro, al volver a mirarla se pasa al día nuevo
  useEffect(() => {
    const alVolver = () => document.visibilityState === 'visible' && setAhora(Date.now())
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [])

  // null = "el día de hoy, el que sea": así al pasar la medianoche sigue mostrando el día vigente
  const [elegida, setElegida] = useState<string | null>(null)
  const [anotando, setAnotando] = useState(false)
  const reducido = useReducedMotion() ?? false

  // Cualquier fecha puede caer en otra semana: por eso todo se calcula desde la fecha que se mira
  const hoy = fechaEnArgentina(ahora)
  const fecha = elegida ?? hoy
  const esHoy = fecha === hoy
  // Lo pasado y lo de hoy se marca; lo futuro todavía no ocurrió, así que solo se mira
  const editable = fecha <= hoy
  const irA = (f: string) => setElegida(f === hoy ? null : f)
  const nombreDelDia = esHoy ? 'Hoy' : fecha === sumarDias(hoy, -1) ? 'Ayer' : fecha === sumarDias(hoy, 1) ? 'Mañana' : DIAS[diaDeLaSemana(fecha)]
  const lunes = lunesDe(fecha)
  const dia = diaDeLaSemana(fecha)
  const semana = datos.semanas[lunes] ?? semanaVacia(lunes)
  const bloques = bloquesDelDia(semana, dia)
  const turno = turnoDelDia(semana, dia)

  // Parte de lo guardado en ese momento y no de la copia en pantalla; tocar el estado puesto lo desmarca
  const marcar = (b: Bloque, estado: EstadoBloque) =>
    cambiar((d) => {
      const actual = d.semanas[lunes] ?? semanaVacia(lunes)
      const nuevo = actual.bloques.find((x) => x.id === b.id)?.estado === estado ? 'planificado' : estado
      return conSemana(d, cambiarEstado(actual, b.id, nuevo))
    })

  const hechos = bloques.filter((b) => b.estado === 'hecho' || b.estado === 'minimo').length
  const resueltos = bloques.filter((b) => b.estado !== 'planificado').length

  // El turno entra en la misma línea que los bloques, en su lugar por hora, para ver el día de corrido
  const items = [
    ...bloques.map((b) => ({ clave: b.id, inicio: b.inicio, bloque: b })),
    ...(turno ? [{ clave: 'turno', inicio: turno.inicio, bloque: null }] : []),
  ].sort((x, y) => x.inicio - y.inicio)

  return (
    <>
    <Pantalla clase="pantalla-hoy" titulo={nombreDelDia} sobretitulo={textoFecha(fecha)}>
      <div className="selector-fecha">
        <Presionable className="selector-fecha-flecha" aria-label="Día anterior" onClick={() => irA(sumarDias(fecha, -1))}>
          <IconoAtras />
        </Presionable>
        <input
          type="date"
          aria-label="Elegir un día"
          value={fecha}
          onChange={(e) => e.target.value && irA(e.target.value)}
        />
        <Presionable className="selector-fecha-flecha" aria-label="Día siguiente" onClick={() => irA(sumarDias(fecha, 1))}>
          <IconoAdelante />
        </Presionable>
      </div>
      {!esHoy && (
        <Presionable className="selector-fecha-hoy" onClick={() => setElegida(null)}>
          Volver a hoy
        </Presionable>
      )}

      {fallo && (
        <p className="aviso aviso-error" role="alert">
          No se pudo guardar el último cambio. Exportá un respaldo desde Ajustes.
        </p>
      )}

      <div className="resumen-hoy">
        <p className="resumen-principal">
          {bloques.length === 0
            ? `Sin bloques ${esHoy ? 'hoy' : 'este día'}`
            : editable
              ? `${hechos} de ${bloques.length} hechos`
              : `${bloques.length} ${bloques.length === 1 ? 'bloque' : 'bloques'}`}
        </p>
        <p className="resumen-turno">{turno ? (editable ? 'Trabajaste' : 'Trabajás') : editable ? 'No trabajaste' : 'No trabajás'}</p>
        {editable && bloques.length > 0 && (
          <div className="resumen-barra" role="progressbar" aria-label="Bloques resueltos" aria-valuemin={0} aria-valuemax={bloques.length} aria-valuenow={resueltos}>
            <div className="resumen-relleno" style={{ width: `${(resueltos / bloques.length) * 100}%` }} />
          </div>
        )}
      </div>

      {items.map((it) =>
        it.bloque ? (
          <TarjetaBloque
            key={it.clave}
            bloque={it.bloque}
            dia={dia}
            actividad={datos.actividades.find((a) => a.id === it.bloque.actividad)}
            soloLectura={!editable}
            alMarcar={(estado) => marcar(it.bloque, estado)}
          />
        ) : (
          turno && (
            <div key="turno" className="turno-hoy">
              <div className="bloque-hora">
                <strong>{horaCampo(turno.inicio - dia * MIN_DIA)}</strong>
                <span>{horaDeFin(turno.fin - dia * MIN_DIA)}</span>
              </div>
              <div className="turno-hoy-cuerpo">
                <p className="turno-hoy-nombre">Turno de trabajo</p>
                <p className="bloque-detalle">{formatearDuracion(duracionTurno(turno))}</p>
              </div>
            </div>
          )
        ),
      )}

      {editable && (
        <Presionable className="fila fila-boton anotar-hecho" onClick={() => setAnotando(true)}>
          <IconoMas />
          Anotar lo que hice
        </Presionable>
      )}

      <h2 className="seccion-titulo">Avance de la semana</h2>
      <AvanceSemana avances={avanceSemana(semana, datos.actividades)} actividades={datos.actividades} />
    </Pantalla>
      <AnimatePresence>
        {anotando && (
          <motion.div
            key="anotar"
            className="pantalla-capa capa-detalle"
            initial={reducido ? { opacity: 0 } : { x: '100%' }}
            animate={reducido ? { opacity: 1 } : { x: 0 }}
            exit={reducido ? { opacity: 0, pointerEvents: 'none' } : { x: '100%', pointerEvents: 'none' }}
          >
            <EditarBloque
              semana={semana}
              bloque={null}
              inicial={{ dia, desde: '18:00', hasta: '19:00' }}
              actividades={datos.actividades}
              anotando
              atrasTexto={nombreDelDia}
              alGuardar={(s) => cambiar((d) => conSemana(d, s))}
              alVolver={() => setAnotando(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
