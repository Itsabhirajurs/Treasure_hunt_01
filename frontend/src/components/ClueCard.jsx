export default function ClueCard({ clue }) {
  if (!clue) return null;

  return (
    <section className="pirate-card animate-fadeInUp clue-card">
      <div className="clue-meta">
        <span className="parchment-panel">{clue.category}</span>
        <span>{"★".repeat(clue.difficulty)}{"☆".repeat(5 - clue.difficulty)}</span>
      </div>
      <p className="clue-text">{clue.clue}</p>
    </section>
  );
}
