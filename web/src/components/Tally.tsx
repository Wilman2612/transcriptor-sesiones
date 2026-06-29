interface Props {
  doubtsLeft: number;
  totalDoubts: number;
}

/** Tablero de progreso: cuántas dudas quedan + barra proporcional + leyenda. */
export function Tally({ doubtsLeft, totalDoubts }: Props) {
  const done = totalDoubts - doubtsLeft;
  const pct = totalDoubts > 0 ? Math.round((done / totalDoubts) * 100) : 0;

  return (
    <div className="tally">
      <div className={`tally__count${doubtsLeft === 0 ? " is-clear" : ""}`}>{doubtsLeft}</div>
      <div className="tally__label">
        {totalDoubts === 0
          ? "sin dudas que revisar"
          : doubtsLeft === 0
            ? "todas las dudas resueltas"
            : "dudas por revisar"}
      </div>
      {totalDoubts > 0 && (
        <>
          <div
            className="meter"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={totalDoubts}
            aria-valuenow={done}
            aria-label="Dudas resueltas"
          >
            <div className="meter__track">
              <div className="meter__fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="meter__caption">
              {done} de {totalDoubts} resueltas
            </div>
          </div>
          <div className="legend" aria-hidden="true">
            <span className="legend__item">
              <span className="legend__chip legend__chip--mid" />
              dudosa
            </span>
            <span className="legend__item">
              <span className="legend__chip legend__chip--high" />
              muy dudosa
            </span>
          </div>
        </>
      )}
    </div>
  );
}
