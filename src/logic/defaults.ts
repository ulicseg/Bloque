import type { Actividad, Ajustes } from './types'

// Valores de arranque; todos se pueden editar después.
// Los horarios de comidas y la franja de cada actividad son supuestos razonables, no datos del usuario.

export const AJUSTES_POR_DEFECTO: Ajustes = {
  trasladoMin: 30,
  suenoMin: 480,
  comidas: [
    { nombre: 'Desayuno', inicio: 8 * 60, duracionMin: 30 },
    { nombre: 'Almuerzo', inicio: 13 * 60, duracionMin: 60 },
    { nombre: 'Cena', inicio: 21 * 60, duracionMin: 60 },
  ],
}

export const ACTIVIDADES_POR_DEFECTO: Actividad[] = [
  { id: 'psicologo', nombre: 'Psicólogo', color: 'psicologo', tipoMeta: 'sesiones', meta: 1, duracionMin: 60, minimoMin: null, franja: 'cualquiera', prioridad: 1, fija: true },
  { id: 'gimnasio', nombre: 'Gimnasio', color: 'gimnasio', tipoMeta: 'sesiones', meta: 4, duracionMin: 75, minimoMin: 30, franja: 'tarde', prioridad: 2, fija: false },
  { id: 'ingles', nombre: 'Inglés', color: 'ingles', tipoMeta: 'horas', meta: 10, duracionMin: 90, minimoMin: 20, franja: 'cualquiera', prioridad: 3, fija: false },
  { id: 'programacion', nombre: 'Programación', color: 'programacion', tipoMeta: 'horas', meta: 6, duracionMin: 120, minimoMin: 30, franja: 'cualquiera', prioridad: 4, fija: false },
  { id: 'revision', nombre: 'Revisión semanal', color: 'revision', tipoMeta: 'sesiones', meta: 1, duracionMin: 20, minimoMin: null, franja: 'noche', prioridad: 5, fija: false },
  { id: 'caminata', nombre: 'Caminata', color: 'caminata', tipoMeta: 'sesiones', meta: 7, duracionMin: 30, minimoMin: 10, franja: 'cualquiera', prioridad: 6, fija: false },
  { id: 'libre', nombre: 'Libre / amigos', color: 'libre', tipoMeta: 'sesiones', meta: 2, duracionMin: 180, minimoMin: null, franja: 'noche', prioridad: 7, fija: false },
]
