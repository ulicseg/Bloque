import { useEffect, useState } from 'react'
import { AvanceSemana } from '../components/AvanceSemana'
import { Pantalla } from '../components/Pantalla'
import { Segmentado } from '../components/Segmentado'
import { TarjetaBloque } from '../components/TarjetaBloque'
import { bloquesDelDia, cambiarEstado } from '../logic/bloques'
import { avanceSemana } from '../logic/progreso'
import { MIN_DIA, diaDeLaSemana, fechaEnArgentina, formatearDuracion, horaCampo, horaDeFin, lunesDe, sumarDias, textoFecha } from '../logic/tiempo'
import { conSemana, duracionTurno, semanaVacia, turnoDelDia } from '../logic/turnos'
import type { Bloque, EstadoBloque } from '../logic/types'
import { useDatos } from '../useDatos'

export function Hoy() {
  const { datos, cambiar, fallo } = useDatos()
  const [ahora, setAhora] = useState(() => Date.now())

  // Si la app queda abierta de un día para el otro, al volver a mirarla se pasa al día nuevo
  useEffect(() => {
    const alVolver = () => document.visibilityState === 'visible' && setAhora(Date.now())
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [])

  const [vista, setVista] = useState<'hoy' | 'manana'>('hoy')

  // Mañana puede caer en la semana siguiente (los domingos): por eso todo se calcula desde la fecha que se mira
  const hoy = fechaEnArgentina(ahora)
  const fecha = vista === 'hoy' ? hoy : sumarDias(hoy, 1)
  const esHoy = vista === 'hoy'
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
    <Pantalla clase="pantalla-hoy" titulo={esHoy ? 'Hoy' : 'Mañana'} sobretitulo={textoFecha(fecha)}>
      <Segmentado<'hoy' | 'manana'>
        etiqueta="Día a mirar"
        valor={vista}
        alElegir={setVista}
        opciones={[
          { valor: 'hoy', titulo: 'Hoy' },
          { valor: 'manana', titulo: 'Mañana' },
        ]}
      />

      {fallo && (
        <p className="aviso aviso-error" role="alert">
          No se pudo guardar el último cambio. Exportá un respaldo desde Ajustes.
        </p>
      )}

      <div className="resumen-hoy">
        <p className="resumen-principal">
          {bloques.length === 0
            ? `Sin bloques ${esHoy ? 'hoy' : 'mañana'}`
            : esHoy
              ? `${hechos} de ${bloques.length} hechos`
              : `${bloques.length} ${bloques.length === 1 ? 'bloque' : 'bloques'}`}
        </p>
        <p className="resumen-turno">{turno ? (esHoy ? 'Hoy trabajás' : 'Mañana trabajás') : esHoy ? 'Hoy no trabajás' : 'Mañana no trabajás'}</p>
        {esHoy && bloques.length > 0 && (
          <div className="resumen-barra" role="progressbar" aria-label="Bloques resueltos hoy" aria-valuemin={0} aria-valuemax={bloques.length} aria-valuenow={resueltos}>
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
            soloLectura={!esHoy}
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

      <h2 className="seccion-titulo">Avance de la semana</h2>
      <AvanceSemana avances={avanceSemana(semana, datos.actividades)} actividades={datos.actividades} />
    </Pantalla>
  )
}
