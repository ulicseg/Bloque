import { useId } from 'react'
import { motion } from 'motion/react'
import { Presionable } from './Presionable'

export interface Opcion<T extends string> {
  valor: T
  titulo: string
  detalle?: string
}

interface Props<T extends string> {
  opciones: Opcion<T>[]
  valor: T
  alElegir: (v: T) => void
  etiqueta: string
}

// El indicador viaja de una opción a otra con el resorte del MotionConfig (layoutId): si se toca la otra
// opción a mitad de camino, parte de donde está en pantalla y no espera.
export function Segmentado<T extends string>({ opciones, valor, alElegir, etiqueta }: Props<T>) {
  const id = useId()
  return (
    <div className="segmentado" role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <Presionable
          key={o.valor}
          className="segmento"
          aria-pressed={o.valor === valor}
          // El resalte aparece al apoyar el dedo (Presionable); el cambio se confirma al soltar (§10)
          onClick={() => alElegir(o.valor)}
        >
          {o.valor === valor && <motion.span layoutId={`segmento-${id}`} className="segmento-fondo" />}
          <span className="segmento-titulo">{o.titulo}</span>
          {o.detalle && <span className="segmento-detalle">{o.detalle}</span>}
        </Presionable>
      ))}
    </div>
  )
}
