import type { Actividad, Ajustes, Comida } from './types'

// Valores de arranque; todos se pueden editar después.
// La franja de cada actividad es un supuesto razonable, no un dato del usuario.

/** Las comidas que traía la versión 3 (supuestos que ninguna pantalla podía editar): la migración v3→v4 las
 *  reconoce para cambiarlas por las nuevas sin tocar nada que el usuario haya escrito. */
export const COMIDAS_V3: Comida[] = [
  { nombre: 'Desayuno', inicio: 8 * 60, duracionMin: 30 },
  { nombre: 'Almuerzo', inicio: 13 * 60, duracionMin: 60 },
  { nombre: 'Cena', inicio: 21 * 60, duracionMin: 60 },
]

const h = (hora: number, min = 0) => hora * 60 + min

export const AJUSTES_POR_DEFECTO: Ajustes = {
  trasladoMin: 30,
  despertarMin: 30,
  recuperacionMin: 60,
  suenoInicio: h(0),
  suenoFin: h(8),
  turnoTardeDesde: h(21),
  suenoTrasTardeInicio: h(23, 30),
  turnoTempranoHasta: h(7),
  suenoPreTempranoInicio: h(21, 30),
  suenoTrasNocheHasta: h(14),
  focoMargenMin: 60,
  ventanaMinimaMin: 20,
  comidas: [
    { nombre: 'Almuerzo', inicio: h(12, 30), duracionMin: 60 },
    { nombre: 'Cena', inicio: h(20, 30), duracionMin: 60 },
  ],
}

/** Las prioridades que traía la v4 (psicólogo primero, inglés tercero): ninguna pantalla las podía editar. La
 *  migración v4→v5 las reconoce para pasar al orden de asignación nuevo sin tocar nada que el usuario haya escrito. */
export const PRIORIDADES_V4: Record<string, number> = {
  psicologo: 1,
  gimnasio: 2,
  ingles: 3,
  programacion: 4,
  revision: 5,
  caminata: 6,
  libre: 7,
}

// Orden de asignación: inglés, gimnasio, programación, caminata, libre/amigos; la revisión (20 min) al final.
// El psicólogo es fijo: no se sugiere, así que su prioridad no cuenta y va último.
export const ACTIVIDADES_POR_DEFECTO: Actividad[] = [
  { id: 'ingles', nombre: 'Inglés', color: 'ingles', tipoMeta: 'horas', meta: 10, duracionMin: 90, minimoMin: 20, franja: 'cualquiera', prioridad: 1, fija: false },
  { id: 'gimnasio', nombre: 'Gimnasio', color: 'gimnasio', tipoMeta: 'sesiones', meta: 4, duracionMin: 75, minimoMin: 30, franja: 'tarde', prioridad: 2, fija: false },
  { id: 'programacion', nombre: 'Programación', color: 'programacion', tipoMeta: 'horas', meta: 6, duracionMin: 120, minimoMin: 30, franja: 'cualquiera', prioridad: 3, fija: false },
  { id: 'caminata', nombre: 'Caminata', color: 'caminata', tipoMeta: 'sesiones', meta: 7, duracionMin: 30, minimoMin: 10, franja: 'cualquiera', prioridad: 4, fija: false },
  { id: 'libre', nombre: 'Libre / amigos', color: 'libre', tipoMeta: 'sesiones', meta: 2, duracionMin: 180, minimoMin: null, franja: 'noche', prioridad: 5, fija: false },
  { id: 'revision', nombre: 'Revisión semanal', color: 'revision', tipoMeta: 'sesiones', meta: 1, duracionMin: 20, minimoMin: null, franja: 'noche', prioridad: 6, fija: false },
  { id: 'psicologo', nombre: 'Psicólogo', color: 'psicologo', tipoMeta: 'sesiones', meta: 1, duracionMin: 60, minimoMin: null, franja: 'cualquiera', prioridad: 7, fija: true },
]
