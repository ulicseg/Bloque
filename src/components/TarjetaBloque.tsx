import type { CSSProperties } from "react";
import { IconoActividad } from "./Iconos";
import { Presionable } from "./Presionable";
import { admiteMinimo } from "../logic/progreso";
import {
  MIN_DIA,
  formatearDuracion,
  horaCampo,
  horaDeFin,
} from "../logic/tiempo";
import type { Actividad, Bloque, EstadoBloque } from "../logic/types";

interface Props {
  bloque: Bloque;
  dia: number;
  actividad: Actividad | undefined;
  /** Tocar el estado que ya está puesto lo devuelve a "planificado". */
  alMarcar: (estado: EstadoBloque) => void;
  /** Para mirar el día de mañana: se ve el bloque, pero todavía no se marca. */
  soloLectura?: boolean;
}

type Marca = Exclude<EstadoBloque, "planificado">;

const OPCIONES: { estado: Marca; titulo: string }[] = [
  { estado: "hecho", titulo: "Hecho" },
  { estado: "minimo", titulo: "Mínimo" },
  { estado: "salteado", titulo: "Salteado" },
];

const ETIQUETA_ESTADO: Record<EstadoBloque, string> = {
  planificado: "Pendiente",
  hecho: "Hecho ✓",
  minimo: "Mínimo ✓",
  salteado: "Salteado",
};

// Cada bloque es una fila de la línea del día: la hora a la izquierda (lo primero que se busca)
// y a la derecha qué es, cuánto dura y en qué estado está.
export function TarjetaBloque({
  bloque,
  dia,
  actividad,
  alMarcar,
  soloLectura = false,
}: Props) {
  const estilo = actividad
    ? ({
        "--act": `var(--act-${actividad.color})`,
        "--act-fondo": `var(--act-${actividad.color}-fondo)`,
      } as CSSProperties)
    : undefined;
  const opciones = OPCIONES.filter(
    (o) => o.estado !== "minimo" || admiteMinimo(actividad),
  );
  const nombre = actividad?.nombre ?? bloque.actividad;
  return (
    <section
      className="bloque-hoy"
      style={estilo}
      data-estado={bloque.estado}
      aria-label={nombre}
    >
      <div className="bloque-hora">
        <strong>{horaCampo(bloque.inicio - dia * MIN_DIA)}</strong>
        <span>{horaDeFin(bloque.fin - dia * MIN_DIA)}</span>
      </div>
      <div className="bloque-cuerpo">
        <div className="bloque-titulo">
          <IconoActividad id={bloque.actividad} />
          <span className="bloque-nombre">{nombre}</span>
          {!soloLectura && (
            <span className="bloque-estado">
              {ETIQUETA_ESTADO[bloque.estado]}
            </span>
          )}
        </div>
        <p className="bloque-detalle" data-sola={soloLectura || undefined}>
          {formatearDuracion(bloque.fin - bloque.inicio)}
          {actividad?.minimoMin != null &&
            ` · mínimo ${formatearDuracion(actividad.minimoMin)}`}
        </p>
        {!soloLectura && (
          <div
            className="estados"
            style={{ gridTemplateColumns: `repeat(${opciones.length}, 1fr)` }}
          >
            {opciones.map((o) => (
              <Presionable
                key={o.estado}
                className="opcion opcion-estado"
                data-marca={o.estado}
                aria-pressed={bloque.estado === o.estado}
                onClick={() => alMarcar(o.estado)}
              >
                {o.titulo}
              </Presionable>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
