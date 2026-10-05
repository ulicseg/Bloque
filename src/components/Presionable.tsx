import { useState, type ButtonHTMLAttributes } from 'react'

// El estado presionado aparece en pointerdown, no al soltar (apple-design §1 y §10).
// Si el dedo se va del botón, se cancela; el click solo se dispara al soltar dentro.
export function Presionable({ className = '', onPointerDown, ...resto }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const [presionado, setPresionado] = useState(false)
  const soltar = () => setPresionado(false)
  return (
    <button
      {...resto}
      className={`presionable ${className}`}
      data-presionado={presionado || undefined}
      onPointerDown={(e) => {
        setPresionado(true)
        onPointerDown?.(e)
      }}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onPointerLeave={soltar}
    />
  )
}
