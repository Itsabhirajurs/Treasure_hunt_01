export default function HintSystem({ hints, onReveal, loadingHint }) {
  return (
    <div className="pirate-card">
      <h3>Oracle Hints</h3>
      {[1, 2, 3].map((n) => (
        <div key={n} className="hint-slot">
          {hints[n] ? <p className="animate-fadeInUp">{hints[n]}</p> : <p>Locked hint slot #{n}</p>}
          <button
            disabled={!!hints[n] || loadingHint}
            onClick={() => onReveal(n)}
            className="crimson-button"
          >
            Reveal Hint {n}
          </button>
        </div>
      ))}
    </div>
  );
}
