import type { ComponentType } from 'react'
import { Presionable } from './Presionable'

export interface Pestana {
  id: string
  titulo: string
  Icono: ComponentType
}

interface Props {
  pestanas: Pestana[]
  activa: string
  alElegir: (id: string) => void
}

export function BarraPestanas({ pestanas, activa, alElegir }: Props) {
  return (
    <nav className="barra-pestanas" aria-label="Secciones">
      {pestanas.map(({ id, titulo, Icono }) => (
        <Presionable
          key={id}
          className="pestana"
          aria-current={id === activa ? 'page' : undefined}
          // Se cambia al apoyar el dedo: la respuesta no espera a que se suelte
          onPointerDown={() => alElegir(id)}
        >
          <Icono />
          <span>{titulo}</span>
        </Presionable>
      ))}
    </nav>
  )
}
