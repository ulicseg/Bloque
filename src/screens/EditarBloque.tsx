import { useState } from 'react'
import { HojaConfirmacion } from '../components/HojaConfirmacion'
import { Pantalla } from '../components/Pantalla'
import { Presionable } from '../components/Presionable'
import { Segmentado } from '../components/Segmentado'
import { bloqueDesdeCampos, diaDeBloque, diaNoPermitido, fueraDeVentanas, guardarBloque, idNuevo, quitarBloque } from '../logic/bloques'
import { DIAS, MIN_DIA, horaCampo, numeroDelDia } from '../logic/tiempo'
import type { Actividad, Bloque, IdActividad, Semana } from '../logic/types'
import type { DiaCalculado } from '../logic/windows'

interface Props {
  semana: Semana
  /** null = bloque nuevo. */
  bloque: Bloque | null
  /** Para un bloque nuevo que nace de un hueco libre: día y horas ya puestos. */
  inicial?: { dia: number; desde: string; hasta: string }
  actividades: Actividad[]
  dias: DiaCalculado[]
  alGuardar: (s: Semana) => void
  alVolver: () => void
}

type Movilidad = 'movil' | 'fijo'

export function EditarBloque({ semana, bloque, inicial, actividades, dias, alGuardar, alVolver }: Props) {
  const dia0 = bloque ? diaDeBloque(bloque) : (inicial?.dia ?? 0)
  const [actividad, setActividad] = useState<IdActividad>(bloque?.actividad ?? actividades[0].id)
  const [dia, setDia] = useState(dia0)
  const [desde, setDesde] = useState(bloque ? horaCampo(bloque.inicio - dia0 * MIN_DIA) : (inicial?.desde ?? '09:00'))
  const [hasta, setHasta] = useState(bloque ? horaCampo(bloque.fin - dia0 * MIN_DIA) : (inicial?.hasta ?? '10:00'))
  const [fijo, setFijo] = useState(bloque?.fijo ?? false)
  const [error, setError] = useState<string | null>(null)
  const [confirmaBorrar, setConfirmaBorrar] = useState(false)

  const armar = (id: string) =>
    bloqueDesdeCampos({ id, actividad, estado: bloque?.estado ?? 'planificado', fijo }, dia, desde, hasta)
  const candidato = armar(bloque?.id ?? 'nuevo')
  const afuera = candidato !== null && fueraDeVentanas(candidato, dias)
  const cerrado = diaNoPermitido(actividades.find((a) => a.id === actividad), dia)

  const guardar = () => {
    const previo = armar(bloque?.id ?? 'nuevo')
    if (!previo) {
      setError('Elegí una hora de inicio y una de fin, y que el fin sea después del inicio.')
      return
    }
    const listo = bloque ? previo : { ...previo, id: idNuevo(semana, actividad, previo.inicio) }
    const r = guardarBloque(semana, listo)
    if (r.ok) {
      alGuardar(r.semana)
      alVolver()
      return
    }
    setError(
      r.motivo === 'superpuesto'
        ? `Se superpone con otro bloque (${actividades.find((a) => a.id === r.con.actividad)?.nombre ?? r.con.actividad}). Elegí otro horario.`
        : 'Ese horario no es válido.',
    )
  }

  const borrar = () => {
    if (!bloque) return
    setConfirmaBorrar(false)
    alGuardar(quitarBloque(semana, bloque.id))
    alVolver()
  }

  return (
    <Pantalla titulo={bloque ? 'Editar bloque' : 'Nuevo bloque'} atras={{ texto: 'Semana', alVolver }}>
      <div className="grupo grupo-formulario">
        <label className="campo">
          <span>Actividad</span>
          <select value={actividad} onChange={(e) => setActividad(e.target.value as IdActividad)}>
            {actividades.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Día</span>
          <select value={dia} onChange={(e) => setDia(Number(e.target.value))}>
            {DIAS.map((nombre, i) => (
              <option key={nombre} value={i}>
                {nombre} {numeroDelDia(semana.lunes, i)}
              </option>
            ))}
          </select>
        </label>
        <div className="otro-campos otro-campos-suelto">
          <label className="campo">
            <span>Desde</span>
            <input type="time" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label className="campo">
            <span>Hasta</span>
            <input type="time" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>
        </div>
      </div>

      <Segmentado<Movilidad>
        etiqueta="Movilidad"
        valor={fijo ? 'fijo' : 'movil'}
        alElegir={(v) => setFijo(v === 'fijo')}
        opciones={[
          { valor: 'movil', titulo: 'Se puede mover', detalle: 'la sugerencia lo reemplaza' },
          { valor: 'fijo', titulo: 'Fijo', detalle: 'la sugerencia lo respeta' },
        ]}
      />

      {cerrado && (
        <p className="aviso aviso-atencion" role="status">
          Marcaste que {actividades.find((a) => a.id === actividad)?.nombre} no se puede los {DIAS[dia].toLowerCase()}. Se puede guardar igual.
        </p>
      )}
      {afuera && (
        <p className="aviso aviso-atencion" role="status">
          Este horario no cae dentro de una ventana libre (turno, sueño, traslado o comida). Se puede guardar igual.
        </p>
      )}
      {error && (
        <p className="aviso aviso-error" role="alert">
          {error}
        </p>
      )}

      <div className="grupo">
        <Presionable className="fila fila-boton" onClick={guardar}>
          {bloque ? 'Guardar cambios' : 'Agregar bloque'}
        </Presionable>
        {bloque && (
          <Presionable className="fila fila-boton fila-boton-destructivo" onClick={() => setConfirmaBorrar(true)}>
            Quitar bloque
          </Presionable>
        )}
      </div>

      <HojaConfirmacion
        abierta={confirmaBorrar}
        titulo="¿Quitar el bloque?"
        alCancelar={() => setConfirmaBorrar(false)}
        acciones={
          <>
            <Presionable className="boton-hoja" onClick={() => setConfirmaBorrar(false)}>
              Cancelar
            </Presionable>
            <Presionable className="boton-hoja boton-hoja-destructivo" onClick={borrar}>
              Quitar
            </Presionable>
          </>
        }
      >
        <p>Se saca de la semana. Si lo sugerís de nuevo, puede volver a aparecer.</p>
      </HojaConfirmacion>
    </Pantalla>
  )
}
