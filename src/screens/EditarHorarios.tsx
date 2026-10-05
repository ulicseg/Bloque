import { useState } from 'react'
import { Contador } from '../components/Contador'
import { HojaConfirmacion } from '../components/HojaConfirmacion'
import { Pantalla } from '../components/Pantalla'
import { Presionable } from '../components/Presionable'
import {
  COMIDAS_MAX,
  agregarComida,
  comidasOrdenadas,
  editarComida,
  fijarHora,
  pasoComida,
  pasoMinutos,
  puedeMinutos,
  quitarComida,
  type CampoHora,
  type CampoMinutos,
} from '../logic/ajustes'
import { AJUSTES_POR_DEFECTO } from '../logic/defaults'
import { formatearDuracion, horaCampo, leerHoraCampo } from '../logic/tiempo'
import type { Ajustes } from '../logic/types'
import { useDatos } from '../useDatos'

interface CampoHoraProps {
  etiqueta: string
  minutos: number
  alCambiar: (texto: string) => void
}

function CampoHoraFila({ etiqueta, minutos, alCambiar }: CampoHoraProps) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      <input type="time" value={horaCampo(minutos)} onChange={(e) => alCambiar(e.target.value)} />
    </label>
  )
}

export function EditarHorarios({ alVolver }: { alVolver: () => void }) {
  // Lee lo guardado al abrir: si se importó un respaldo un momento antes, se ve lo importado
  const { datos, cambiar, fallo } = useDatos()
  const [confirmaReset, setConfirmaReset] = useState(false)
  const a = datos.ajustes

  const modificar = (fn: (x: Ajustes) => Ajustes) => cambiar((d) => ({ ...d, ajustes: fn(d.ajustes) }))
  const hora = (campo: CampoHora, etiqueta: string) => (
    <CampoHoraFila etiqueta={etiqueta} minutos={a[campo]} alCambiar={(t) => modificar((x) => fijarHora(x, campo, t))} />
  )
  const minutos = (campo: CampoMinutos, etiqueta: string, nota?: string) => (
    <Contador
      etiqueta={etiqueta}
      valor={a[campo] === 0 ? 'Nada' : formatearDuracion(a[campo])}
      alBajar={() => modificar((x) => pasoMinutos(x, campo, -1))}
      alSubir={() => modificar((x) => pasoMinutos(x, campo, 1))}
      puedeBajar={puedeMinutos(a, campo, -1)}
      puedeSubir={puedeMinutos(a, campo, 1)}
      nota={nota}
    />
  )

  return (
    <Pantalla titulo="Horarios" atras={{ texto: 'Ajustes', alVolver }}>
      <p className="subtitulo">Con estas reglas se calculan las ventanas libres de cada semana.</p>

      {fallo && (
        <p className="aviso aviso-error" role="alert">
          No se pudo guardar el último cambio. Exportá un respaldo desde Ajustes.
        </p>
      )}

      <h2 className="seccion-titulo">Sueño</h2>
      <div className="grupo grupo-formulario">
        <div className="otro-campos otro-campos-suelto">
          {hora('suenoInicio', 'Dormís a las')}
          {hora('suenoFin', 'Despertás a las')}
        </div>
        <p className="contador-nota">Es el horario de una noche sin turnos cerca. Con turnos, se ajusta según las reglas de abajo.</p>
      </div>

      <h2 className="seccion-titulo">Alrededor de cada turno</h2>
      <div className="grupo">
        {minutos('trasladoMin', 'Traslado', 'Ida y vuelta al trabajo, de cada lado del turno.')}
        {minutos('despertarMin', 'Despertar', 'Lo que tardás en arrancar después de levantarte.')}
        {minutos('recuperacionMin', 'Recuperación', 'Descanso después de un turno de 8 h (no del nocturno).')}
      </div>

      <h2 className="seccion-titulo">Sueño según el turno</h2>
      <div className="grupo grupo-formulario">
        <div className="otro-campos otro-campos-suelto">
          {hora('turnoTardeDesde', 'Turno termina desde')}
          {hora('suenoTrasTardeInicio', 'Dormís desde')}
        </div>
        <div className="otro-campos otro-campos-suelto">
          {hora('turnoTempranoHasta', 'Turno empieza hasta')}
          {hora('suenoPreTempranoInicio', 'Noche anterior desde')}
        </div>
        <div className="otro-campos otro-campos-suelto">{hora('suenoTrasNocheHasta', 'Tras un nocturno, hasta')}</div>
      </div>

      <h2 className="seccion-titulo">Ventanas</h2>
      <div className="grupo">
        {minutos('focoMargenMin', 'Margen para concentrarse', 'Una ventana que termina tan cerca de dormir se marca "foco: no".')}
        {minutos('ventanaMinimaMin', 'Ventana mínima', 'Los huecos más cortos que esto se descartan.')}
      </div>

      <h2 className="seccion-titulo">Comidas</h2>
      <div className="grupo">
        {comidasOrdenadas(a).map(({ comida, indice }) => (
          <div key={indice} className="contador comida">
            <div className="otro-campos otro-campos-suelto">
              <label className="campo">
                <span>Nombre</span>
                <input type="text" value={comida.nombre} onChange={(e) => modificar((x) => editarComida(x, indice, { nombre: e.target.value }))} />
              </label>
              <CampoHoraFila
                etiqueta="Desde"
                minutos={comida.inicio}
                alCambiar={(t) => {
                  const m = leerHoraCampo(t)
                  if (m !== null) modificar((x) => editarComida(x, indice, { inicio: m }))
                }}
              />
            </div>
            <Contador
              etiqueta="Duración"
              valor={formatearDuracion(comida.duracionMin)}
              alBajar={() => modificar((x) => pasoComida(x, indice, -1))}
              alSubir={() => modificar((x) => pasoComida(x, indice, 1))}
              puedeBajar={comida.duracionMin > 5}
              puedeSubir={comida.duracionMin < 180}
            />
            <Presionable className="fila fila-boton fila-boton-destructivo" onClick={() => modificar((x) => quitarComida(x, indice))}>
              Quitar {comida.nombre || 'comida'}
            </Presionable>
          </div>
        ))}
        <Presionable className="fila fila-boton" onClick={() => modificar(agregarComida)} disabled={a.comidas.length >= COMIDAS_MAX}>
          Agregar comida
        </Presionable>
      </div>

      <div className="grupo">
        <Presionable className="fila fila-boton fila-boton-destructivo" onClick={() => setConfirmaReset(true)}>
          Restablecer valores por defecto
        </Presionable>
      </div>

      <HojaConfirmacion
        abierta={confirmaReset}
        titulo="¿Restablecer los horarios?"
        alCancelar={() => setConfirmaReset(false)}
        acciones={
          <>
            <Presionable className="boton-hoja" onClick={() => setConfirmaReset(false)}>
              Cancelar
            </Presionable>
            <Presionable
              className="boton-hoja boton-hoja-destructivo"
              onClick={() => {
                setConfirmaReset(false)
                modificar(() => AJUSTES_POR_DEFECTO)
              }}
            >
              Restablecer
            </Presionable>
          </>
        }
      >
        <p>Sueño, traslado, recuperación, foco y comidas vuelven a los valores con los que arrancó la app. Tus turnos y bloques no se tocan.</p>
      </HojaConfirmacion>
    </Pantalla>
  )
}
