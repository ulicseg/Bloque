import { useEffect, useState } from 'react'
import { AvanceSemana } from '../components/AvanceSemana'
import { Pantalla } from '../components/Pantalla'
import { TarjetaBloque } from '../components/TarjetaBloque'
import { bloquesDelDia, cambiarEstado } from '../logic/bloques'
import { avanceSemana } from '../logic/progreso'
import { diaDeLaSemana, fechaEnArgentina, lunesDe, textoFecha } from '../logic/tiempo'
import { conSemana, etiquetaTurno, semanaVacia, turnoDelDia } from '../logic/turnos'
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

  const fecha = fechaEnArgentina(ahora)
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

  return (
    <Pantalla titulo="Hoy">
      <p className="subtitulo">
        {textoFecha(fecha)}
        {turno ? ` · turno ${etiquetaTurno(turno)}` : ' · sin turno'}
      </p>

      {fallo && (
        <p className="aviso aviso-error" role="alert">
          No se pudo guardar el último cambio. Exportá un respaldo desde Ajustes.
        </p>
      )}

      {bloques.length === 0 ? (
        <p className="aviso aviso-atencion" role="status">
          No hay bloques para hoy. Armalos desde la pestaña Semana.
        </p>
      ) : (
        bloques.map((b) => (
          <TarjetaBloque
            key={b.id}
            bloque={b}
            dia={dia}
            actividad={datos.actividades.find((a) => a.id === b.actividad)}
            alMarcar={(estado) => marcar(b, estado)}
          />
        ))
      )}

      <h2 className="seccion-titulo">Esta semana</h2>
      <AvanceSemana avances={avanceSemana(semana, datos.actividades)} actividades={datos.actividades} />
    </Pantalla>
  )
}
