export default function MapProgress({ currentRound = 1 }) {
  return (
    <div className="pirate-card">
      <h3>Map Progress</h3>
      <svg viewBox="0 0 420 150" className="progress-map-svg" aria-label="Round route map">
        <defs>
          <linearGradient id="routeTint" x1="0" x2="1">
            <stop offset="0%" stopColor="#f4e4c1" />
            <stop offset="100%" stopColor="#ffd700" />
          </linearGradient>
        </defs>
        <path d="M20 120 C90 30, 155 140, 220 60 C285 20, 350 120, 400 40" className="route-line" />
        {[1, 2, 3, 4, 5].map((r) => {
          const x = 20 + r * 75;
          const y = r % 2 === 0 ? 55 : 100;
          return (
            <g key={r} transform={`translate(${x},${y})`}>
              <circle
                r="13"
                className={`map-node-svg ${r < currentRound ? "done" : ""} ${r === currentRound ? "active" : ""}`}
              />
              <text y="5" x="-4" className="map-node-text">{r}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
