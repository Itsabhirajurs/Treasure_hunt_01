export default function ParticleEffect({ show }) {
  if (!show) return null;
  const bits = Array.from({ length: 40 }, (_, i) => i);
  const glyphs = ["*", "$", "+", "o"];
  return (
    <div className="particle-wrap">
      {bits.map((i) => (
        <span
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 0.3}s`,
          }}
        >
          {glyphs[i % glyphs.length]}
        </span>
      ))}
    </div>
  );
}
