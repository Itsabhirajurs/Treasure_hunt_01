export default function MapProgress({ currentRound = 1 }) {
  return (
    <div className="pirate-card">
      <h3>Map Progress</h3>
      <div className="map-track">
        {[1, 2, 3, 4, 5].map((r) => (
          <div key={r} className={`map-node ${r < currentRound ? "done" : ""} ${r === currentRound ? "active" : ""}`}>
            {r}
          </div>
        ))}
      </div>
    </div>
  );
}
