# Bloques

PWA personal para organizar la semana en bloques alrededor de turnos laborales rotativos.
Un solo usuario, usada en iPhone e instalada en la pantalla de inicio desde Safari.
Toda la interfaz va en **español rioplatense**.

## Qué hace

Turnos de 4 u 8 h (6–14, 14–22, 22–6), que se conocen el fin de semana anterior.

1. Cargar los turnos de la semana.
2. Calcular las ventanas libres reales, descontando sueño, traslados, recuperación y comidas.
3. Sugerir dónde ubicar bloques para cumplir las metas semanales: inglés, gimnasio, programación,
   psicólogo, caminata, tiempo libre y amigos, y revisión semanal.
4. Editar esa sugerencia.
5. Marcar cada bloque como **hecho**, **mínimo** o **salteado**, con contadores contra las metas.

## Stack y versiones

Verificado el **2026-10-04** en el registro de npm y la documentación oficial
(vite.dev, vitest.dev, motion.dev, vite-pwa-org.netlify.app, devblogs.microsoft.com/typescript)
y en la plantilla oficial `create-vite@9.2.1` (`react-ts`).

| Paquete | Versión | Notas |
|---|---|---|
| Node.js | **24 LTS** (mínimo 22.12) | Vite 8 pide `^20.19 \|\| >=22.12`; Vitest 5 pide `^22.12 \|\| ^24 \|\| >=26`. |
| vite | 8.3.x | |
| @vitejs/plugin-react | 6.1.x | Peer: `vite ^8`. |
| react / react-dom | 19.x (actual 19.3.0) | La plantilla trae `^19.2.8`. |
| typescript | **~6.0.3** | Ver la decisión abajo. |
| motion | 14.0.x | Peer: React 18 o 19. Se importa desde `motion/react`. |
| vite-plugin-pwa | 2.0.x | Peer: `vite ^3…^8`. Usa Workbox 7.4. |
| vitest | 5.0.x | Pide Vite `>=6.4` y Node `>=22.12`. |

Todas son compatibles entre sí con Vite 8 y Node 24.

**Por qué TypeScript 6 y no 7:** la plantilla oficial `react-ts` instala `typescript ~6.0.2`.
TS 7.0 (el compilador nativo en Go, estable desde agosto de 2026) declara más del 98 % de
compatibilidad, pero tiene 74 diferencias conocidas con 6.0. Además, ni la plantilla de Vite
ni la documentación de Vitest confirman todavía que se use con ellos. Como la prioridad es la
estabilidad, se usa la última 6.x. Se puede reevaluar cuando la plantilla oficial pase a la 7.

**Node en Vercel:** cuando exista `package.json` (paso 1), agregar `"engines": { "node": "24.x" }`
para que Vercel compile con Node 24 y no con una versión vieja.

## Diseño: obligatorio antes de cualquier trabajo de interfaz

Leer completo y aplicar `.claude/skills/apple-design/SKILL.md`.
No invocarla con `/apple-design` sola, porque así solo responde con un saludo. Leer el archivo directamente.

Puntos que no se negocian (entre paréntesis, la sección de la skill):

- **Respuesta al apoyar el dedo, no al soltarlo** (§1, §10): el estado presionado aparece en `pointerdown`.
- **Resortes en vez de animaciones de duración fija** (§4). Por defecto, críticamente amortiguados
  (`bounce: 0`). Rebote leve solo si el gesto traía impulso.
- **Animaciones interrumpibles** (§3): siempre parten del valor que está en pantalla y nunca bloquean la entrada.
- **Al soltar un gesto, seguir con la velocidad del dedo** (§5) y proyectar el impulso para elegir el destino (§6).
- **Resistencia progresiva en los bordes** (§9).
- **Materiales translúcidos que marcan jerarquía** (§12): `backdrop-filter`. Nunca apilar dos superficies claras translúcidas.
- **Tipografía del sistema** (`system-ui` / `-apple-system`) con espaciado entre letras según el tamaño (§15):
  negativo en títulos y cerca de 0 en el cuerpo.
- **Accesibilidad** (§14): versiones para `prefers-reduced-motion` (fundidos en vez de desplazamientos o resortes),
  `prefers-reduced-transparency` (superficies sólidas) y `prefers-contrast: more` (fondos sólidos y bordes definidos).
- **Sin hápticos:** iOS Safari no soporta la Vibration API. La parte de hápticos de §13 no aplica,
  así que la respuesta es solo visual.

## iPhone primero

- Respetar las zonas seguras (notch y barra inferior): `viewport-fit=cover` + `env(safe-area-inset-*)`.
- Zonas táctiles de al menos **44 px** (2.75rem).
- Texto de los campos en **16 px o más** (1rem), para que iOS no haga zoom al enfocarlos.
- Medidas en **rem**.
- Modo claro y oscuro automático con `prefers-color-scheme` y variables CSS.
- CSS propio con variables, sin Tailwind.

## Arquitectura

- Toda la lógica (turnos, ventanas libres, sugerencias, contadores) va en **funciones puras dentro de `src/logic`**,
  con tests de Vitest.
- Los componentes **no calculan**: reciben datos y los muestran.
- Sin backend. Los datos se guardan en `localStorage`.

## Datos: nunca se pierden

- El formato guardado lleva **número de versión** (`schemaVersion`).
- Cada cambio de formato agrega una **migración** encadenada (v1→v2→v3…), con su test.
- Nunca se descarta un dato que no se pueda leer: se migra o se conserva.
- Respaldo **exportable e importable en JSON**.

## Reglas de trabajo

- No agregar dependencias sin explicar por qué antes.
- Comentarios en español que expliquen **el porqué**, no el qué.
- Al cerrar cada paso:
  1. `npm run test` y `npm run build` sin errores;
  2. agregar una línea en **Progreso**;
  3. hacer un commit descriptivo y push a `main`.

## Progreso

- **Paso 0 (2026-10-04):** CLAUDE.md con reglas y versiones verificadas, `.gitignore`, repo privado `bloques` en GitHub.
- **Paso 1 (2026-10-04):** proyecto Vite + React + TS, sistema de diseño (tokens, resortes, materiales, variantes de accesibilidad), barra de pestañas y pantallas vacías, capa de almacenamiento versionada con tests.
- **Paso 2 (2026-10-04):** PWA instalable y sin conexión (vite-plugin-pwa 2.0, `registerType: 'prompt'`, aviso de versión nueva), ajustes de iOS, íconos con `@vite-pwa/assets-generator`, `vercel.json` sin caché agresiva para `sw.js` y manifest, persistencia (`storage.persist()` + aviso de instalar), esquema v2 (`semanas`) con migración v1→v2, respaldo exportable/importable con vista previa y aviso a los 7 días. Sin push: todavía no hay remoto.
- **Paso 3 (2026-10-04):** tipos del dominio (`src/logic/types.ts`, tiempos en minutos desde el lunes 00:00), metas y ajustes por defecto, esquema v3 con migración v2→v3 (lunes en cada semana, `ajustes`, `actividades`), lógica pura de turnos (superposición, 22–6 que cruza al domingo→lunes, copiar semana) con tests, pantalla Semana → "Cargar turnos" y semana de ejemplo solo en desarrollo. Sin push: todavía no hay remoto.
- **Paso 4 (2026-10-04):** `computeWindows(semana, ajustes, semanaAnterior?)` en `src/logic/windows.ts` (sueño, despertar, traslado, turno, recuperación, comidas y ventanas libres con "foco: no") con tests de la semana real (57,5 h) y de los casos límite; `Ajustes` con todas las reglas configurables y esquema v4 con migración v3→v4; tabla provisoria en Semana. Limitación conocida: el domingo no ve la semana siguiente, así que la noche del domingo usa el sueño por defecto. Sin push: todavía no hay remoto.
- **Paso 5 (2026-10-04):** pestaña Metas (meta semanal, duración, mínimo, franja y prioridad por actividad, con contadores que repiten al mantener apretado; `src/logic/metas.ts` valida y evita prioridades repetidas) y `suggest(dias, metas, fijos, ajustes)` en `src/logic/suggest.ts`: bloques propuestos más informe de faltantes con motivo (topes 85 %/70 %, máximo por día, foco, ventana corta, 2 h antes de dormir, noche libre, sin espacio, fija). Tests con la semana de ejemplo, una semana muy cargada y 400 semanas al azar con semilla. Botón "Sugerir semana" en Semana (solo lista, no se guarda). Esquema v5: las prioridades por defecto pasan a inglés, gimnasio, programación, caminata, libre, revisión (migración v4→v5, solo si seguían sin tocar). Sin push: todavía no hay remoto.
- **Paso 6 (2026-10-04):** la sugerencia se guarda ("Usar esta sugerencia" reemplaza lo solo planificado y respeta fijos y ya hechos) y los bloques se editan a mano: agregar, mover, cambiar de actividad, marcar fijo y quitar (`src/logic/bloques.ts` con tests: nunca superpuestos, un bloque vive en un solo día, aviso si cae fuera de las ventanas).
- **Paso 7 (2026-10-04):** pestaña Hoy con los bloques del día en tarjetas y botones Hecho / Mínimo / Salteado (tocar el estado puesto lo desmarca; el mínimo solo se ofrece si la actividad lo tiene), pasa sola al día nuevo al volver a abrir la app. Botones y no gestos de deslizar: más simples y accesibles.
- **Paso 8 (2026-10-04):** contadores contra las metas (`src/logic/progreso.ts`, con tests): hecho cuenta entero, mínimo cuenta reducido y como sesión, salteado y planificado no suman. Barras en Hoy y en Metas.
- **Paso 9 (2026-10-04):** Ajustes → Horarios editable (sueño, traslado, despertar, recuperación, reglas de sueño según el turno, foco, ventana mínima y comidas, con restablecer; `src/logic/ajustes.ts` corrige valores imposibles, con tests). `computeWindows` recibe también la semana siguiente: el domingo ya ve si el lunes arranca temprano (se resolvió la limitación del Paso 4).
