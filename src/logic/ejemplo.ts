// Datos de ejemplo SOLO para desarrollo y tests. La app de producción nunca importa este archivo:
// Semana.tsx lo carga con import() dentro de un `if (import.meta.env.DEV)`, que el build elimina.

import { crearTurno } from './turnos'
import type { Semana, Turno } from './types'

const turno = (dia: number, desde: number, hasta: number): Turno => {
  const t = crearTurno(dia, desde * 60, hasta * 60)
  if (!t) throw new Error('turno de ejemplo inválido')
  return t
}

/** Lunes 5 al domingo 11 de octubre de 2026: lunes a miércoles 14–22, jueves a sábado libres, domingo 6–14. */
export const SEMANA_EJEMPLO: Semana = {
  lunes: '2026-10-05',
  turnos: [turno(0, 14, 22), turno(1, 14, 22), turno(2, 14, 22), turno(6, 6, 14)],
  bloques: [],
}
