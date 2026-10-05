import { Contador } from '../components/Contador'
import { Pantalla } from '../components/Pantalla'
import { Segmentado } from '../components/Segmentado'
import { FRANJAS, puede, resumen, siguiente, textoMeta, textoMinimo, type Cambio, type Campo } from '../logic/metas'
import { DIAS, formatearDuracion } from '../logic/tiempo'
import { Presionable } from '../components/Presionable'
import type { Actividad, Franja } from '../logic/types'

interface Props {
  actividad: Actividad
  /** Cantidad de actividades: la prioridad va de 1 a esta cifra. */
  total: number
  alCambiar: (cambio: Cambio) => void
  alMoverPrioridad: (nueva: number) => void
  alVolver: () => void
}

// Los cambios se guardan al instante, sin botón "Guardar": un contador que hay que confirmar es un contador lento.
export function EditarMeta({ actividad: a, total, alCambiar, alMoverPrioridad, alVolver }: Props) {
  const paso = (campo: Campo, dir: 1 | -1) => () => alCambiar(siguiente(a, campo, dir))
  const contador = (campo: Campo, etiqueta: string, valor: string, nota?: string) => (
    <Contador
      etiqueta={etiqueta}
      valor={valor}
      alBajar={paso(campo, -1)}
      alSubir={paso(campo, 1)}
      puedeBajar={puede(a, campo, -1)}
      puedeSubir={puede(a, campo, 1)}
      nota={nota}
    />
  )

  return (
    <Pantalla titulo={a.nombre} atras={{ texto: 'Metas', alVolver }}>
      <p className="subtitulo">{resumen(a)}</p>

      <div className="grupo">
        {contador('meta', 'Meta semanal', textoMeta(a), a.meta === 0 ? 'En cero, la sugerencia no ubica esta actividad.' : undefined)}
        {contador('duracionMin', 'Duración', formatearDuracion(a.duracionMin), 'Lo que dura cada bloque.')}
        {contador('minimoMin', 'Mínimo', textoMinimo(a), 'La versión corta que cuenta como "mínimo" cuando no llegás a hacer el bloque entero.')}
      </div>

      {a.fija ? (
        <p className="fila-nota fila-nota-suelta">
          Es un bloque fijo: lo ubicás a mano. La sugerencia respeta su horario, así que la franja y la prioridad no influyen.
        </p>
      ) : (
        <>
          <h2 className="seccion-titulo">Franja preferida</h2>
          <Segmentado<Franja>
            etiqueta="Franja preferida"
            valor={a.franja}
            alElegir={(franja) => alCambiar({ franja })}
            opciones={FRANJAS.map((f) => ({ valor: f.valor, titulo: f.titulo }))}
          />
          <p className="fila-nota fila-nota-suelta">
            Es una preferencia, no una regla: si no hay lugar en esa franja, se busca en otra.
          </p>

          <h2 className="seccion-titulo">Días que no se puede</h2>
          <div className="opciones opciones-dias" role="group" aria-label="Días que no se puede">
            {DIAS.map((nombre, i) => {
              const cerrado = a.diasNo?.includes(i) ?? false
              return (
                <Presionable
                  key={nombre}
                  className="opcion"
                  aria-label={nombre}
                  aria-pressed={cerrado}
                  onClick={() => alCambiar({ diasNo: cerrado ? (a.diasNo ?? []).filter((d) => d !== i) : [...(a.diasNo ?? []), i] })}
                >
                  {nombre.slice(0, 3)}
                </Presionable>
              )
            })}
          </div>
          <p className="fila-nota fila-nota-suelta">
            Marcá los días en que no vas (por ejemplo, el gimnasio cerrado). La sugerencia no ubica nada ahí.
          </p>

          <div className="grupo">
            <Contador
              etiqueta="Prioridad"
              valor={`${a.prioridad} de ${total}`}
              alBajar={() => alMoverPrioridad(a.prioridad - 1)}
              alSubir={() => alMoverPrioridad(a.prioridad + 1)}
              puedeBajar={a.prioridad > 1}
              puedeSubir={a.prioridad < total}
              nota="La 1 se ubica primero. Cuando falta lugar, las de número más alto son las que quedan afuera."
            />
          </div>
        </>
      )}
    </Pantalla>
  )
}
