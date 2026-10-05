import { Contador } from '../components/Contador'
import { Pantalla } from '../components/Pantalla'
import { FRANJAS, alternarFranja, esCualquierFranja, puede, resumen, siguiente, textoFranjas, textoMeta, textoMinimo, type Cambio, type Campo } from '../logic/metas'
import { DIAS, formatearDuracion } from '../logic/tiempo'
import { Presionable } from '../components/Presionable'
import type { Actividad } from '../logic/types'

interface Props {
  actividad: Actividad
  alCambiar: (cambio: Cambio) => void
  alVolver: () => void
}

// Los cambios se guardan al instante, sin botón "Guardar": un contador que hay que confirmar es un contador lento.
export function EditarMeta({ actividad: a, alCambiar, alVolver }: Props) {
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
          <h2 className="seccion-titulo">Franjas preferidas</h2>
          <div className="opciones opciones-franjas" role="group" aria-label="Franjas preferidas">
            {FRANJAS.map((f) => (
              <Presionable
                key={f.valor}
                className="opcion"
                aria-pressed={a.franjas.includes(f.valor)}
                onClick={() => alCambiar({ franjas: alternarFranja(a.franjas, f.valor) })}
              >
                {f.titulo}
              </Presionable>
            ))}
          </div>
          <p className="fila-nota fila-nota-suelta">
            {esCualquierFranja(a.franjas)
              ? 'Sin preferencia: se ubica en cualquier momento del día. Desmarcá las franjas en las que no querés hacerla.'
              : `Se busca primero a la ${textoFranjas(a.franjas)}. Es una preferencia, no una regla: si no hay lugar, se prueba en otra franja.`}
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

          <p className="fila-nota fila-nota-suelta">
            La prioridad se cambia arrastrando en la lista de Metas: la de arriba se ubica primero.
          </p>
        </>
      )}
    </Pantalla>
  )
}
