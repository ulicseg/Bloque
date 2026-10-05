import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { IconoActividad } from '../components/Iconos'
import { Pantalla } from '../components/Pantalla'
import { Presionable } from '../components/Presionable'
import { Segmentado } from '../components/Segmentado'
import { bloquesDelDia } from '../logic/bloques'
import { lineaDelDia, type Segmento } from '../logic/lineaDelDia'
import { DIAS, MIN_DIA, diaDeLaSemana, fechaEnArgentina, formatearDuracion, horaCampo, horaDeFin, lunesActual, minutosDelDiaEnArgentina, numeroDelDia, rangoSemana, sumarDias } from '../logic/tiempo'
import { semanaVacia, vecinasDe } from '../logic/turnos'
import { computeWindows, type TipoTramo } from '../logic/windows'
import { useDatos } from '../useDatos'

type Cual = 'esta' | 'proxima'

const INICIAL = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const HORAS = Array.from({ length: 24 }, (_, h) => h)
const QUE: Record<TipoTramo, string> = {
  sueno: 'Dormir',
  despertar: 'Despertar',
  traslado: 'Traslado',
  turno: 'Turno',
  recuperacion: 'Recuperación',
  comida: 'Comida',
}

const claseDe = (s: Segmento) => (s.tipo === 'ocupado' ? `cal-seg cal-${s.que === 'sueno' || s.que === 'turno' ? s.que : 'otro'}` : s.tipo === 'bloque' ? 'cal-seg cal-bloque' : 'cal-seg cal-libre')

/** Qué se muestra en el detalle al tocar un tramo. */
function textoDe(s: Segmento, nombreActividad: (id: string) => string): { titulo: string; sub: string } {
  const rango = `${horaCampo(s.inicio)} a ${horaDeFin(s.fin)} · ${formatearDuracion(s.fin - s.inicio)}`
  if (s.tipo === 'ocupado') return { titulo: QUE[s.que], sub: rango }
  if (s.tipo === 'bloque') return { titulo: nombreActividad(s.bloque.actividad), sub: rango }
  return { titulo: 'Libre', sub: `${rango}${s.foco ? '' : ' · cerca de dormir, mejor algo liviano'}` }
}

/**
 * La semana entera de un vistazo, como un calendario: siete columnas y las 24 horas. Lo gris es sueño, turno y
 * traslados; lo coloreado son tus bloques; lo punteado es tiempo libre. Es solo para mirar: tocar un tramo muestra su detalle.
 */
export function Calendario() {
  const { datos } = useDatos()
  const [cual, setCual] = useState<Cual>('esta')
  const [elegido, setElegido] = useState<{ dia: number; seg: Segmento } | null>(null)

  const [actual] = useState(() => lunesActual(Date.now()))
  const lunes = cual === 'esta' ? actual : sumarDias(actual, 7)
  const semana = datos.semanas[lunes] ?? semanaVacia(lunes)
  const vecinas = vecinasDe(datos, lunes)
  const dias = useMemo(
    () => computeWindows(semana, datos.ajustes, vecinas.anterior, vecinas.siguiente),
    [semana, datos.ajustes, vecinas.anterior, vecinas.siguiente],
  )
  const lineas = useMemo(
    () => dias.map((d) => lineaDelDia(d, bloquesDelDia(semana, d.dia), datos.ajustes.ventanaMinimaMin)),
    [dias, semana, datos.ajustes.ventanaMinimaMin],
  )
  const nombreActividad = (id: string) => datos.actividades.find((a) => a.id === id)?.nombre ?? id

  const hoy = cual === 'esta' ? diaDeLaSemana(fechaEnArgentina(Date.now())) : null
  const ahoraMin = hoy === null ? null : minutosDelDiaEnArgentina(Date.now())

  // Al abrir, el calendario ya está a la altura de "ahora" (o de media mañana si es otra semana), no a las 00:00
  const ancla = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ancla.current?.scrollIntoView({ block: 'center' })
  }, [cual])

  const detalle = elegido ? textoDe(elegido.seg, nombreActividad) : null
  const anclaMin = ahoraMin ?? 9 * 60

  return (
    <Pantalla titulo="Calendario" clase="pantalla-calendario">
      <Segmentado<Cual>
        etiqueta="Semana"
        valor={cual}
        alElegir={(v) => {
          setCual(v)
          setElegido(null)
        }}
        opciones={[
          { valor: 'esta', titulo: 'Esta semana', detalle: rangoSemana(actual) },
          { valor: 'proxima', titulo: 'Próxima', detalle: rangoSemana(sumarDias(actual, 7)) },
        ]}
      />

      <div className="cal-detalle" role="status" aria-live="polite">
        {detalle && elegido ? (
          <>
            <strong>
              {DIAS[elegido.dia]} {numeroDelDia(lunes, elegido.dia)} · {detalle.titulo}
            </strong>
            <span>{detalle.sub}</span>
          </>
        ) : (
          <span>Tocá un tramo para ver el detalle.</span>
        )}
      </div>

      <div className="cal-leyenda" aria-hidden="true">
        <span><i className="cal-punto cal-sueno" /> Dormir</span>
        <span><i className="cal-punto cal-turno" /> Turno</span>
        <span><i className="cal-punto cal-otro" /> Traslados y comidas</span>
        <span><i className="cal-punto cal-libre" /> Libre</span>
      </div>

      <div className="cal">
        <div className="cal-cabecera">
          <span />
          {dias.map((d) => (
            <span key={d.dia} className="cal-dia" data-hoy={d.dia === hoy ? '' : undefined}>
              <span className="cal-dia-letra">{INICIAL[d.dia]}</span>
              <span className="cal-dia-numero">{numeroDelDia(lunes, d.dia)}</span>
            </span>
          ))}
        </div>

        <div className="cal-cuerpo">
          <div className="cal-horas" aria-hidden="true">
            {HORAS.map((h) => (
              <span key={h} className="cal-hora" style={{ top: `${(h / 24) * 100}%` }}>
                {h}
              </span>
            ))}
          </div>

          {dias.map((d) => (
            <div key={d.dia} className="cal-columna" data-hoy={d.dia === hoy ? '' : undefined}>
              {HORAS.map((h) => (
                <span key={h} className="cal-linea" style={{ top: `${(h / 24) * 100}%` }} aria-hidden="true" />
              ))}
              {lineas[d.dia].segmentos.map((s) => {
                const act = s.tipo === 'bloque' ? datos.actividades.find((a) => a.id === s.bloque.actividad) : undefined
                const estilo = {
                  top: `${(s.inicio / MIN_DIA) * 100}%`,
                  height: `${((s.fin - s.inicio) / MIN_DIA) * 100}%`,
                  ...(act ? { '--act': `var(--act-${act.color})`, '--act-fondo': `var(--act-${act.color}-fondo)` } : {}),
                } as CSSProperties
                const largo = s.fin - s.inicio >= 60
                const seleccionado = elegido?.dia === d.dia && elegido.seg === s
                return (
                  <Presionable
                    key={`${s.tipo}-${s.inicio}-${s.fin}`}
                    className={claseDe(s)}
                    style={estilo}
                    aria-pressed={seleccionado}
                    aria-label={`${DIAS[d.dia]}: ${textoDe(s, nombreActividad).titulo}, ${horaCampo(s.inicio)} a ${horaDeFin(s.fin)}`}
                    onClick={() => setElegido(seleccionado ? null : { dia: d.dia, seg: s })}
                  >
                    {s.tipo === 'bloque' && <IconoActividad id={s.bloque.actividad} />}
                    {s.tipo === 'ocupado' && largo && (s.que === 'sueno' || s.que === 'turno') && <span className="cal-texto">{QUE[s.que]}</span>}
                  </Presionable>
                )
              })}
              {d.dia === hoy && ahoraMin !== null && <span className="cal-ahora" style={{ top: `${(ahoraMin / MIN_DIA) * 100}%` }} aria-hidden="true" />}
            </div>
          ))}

          {/* Punto al que se desplaza la pantalla al abrir */}
          <div ref={ancla} className="cal-ancla" style={{ top: `${(anclaMin / MIN_DIA) * 100}%` }} aria-hidden="true" />
        </div>
      </div>
    </Pantalla>
  )
}
