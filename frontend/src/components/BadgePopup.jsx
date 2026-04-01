export default function BadgePopup({ badge, onClose }) {
  if (!badge) return null;
  return (
    <div className="badge-overlay" onClick={onClose}>
      <div className="badge-modal animate-fadeInUp" onClick={(e) => e.stopPropagation()}>
        <div className="badge big-badge">★</div>
        <h2>Badge Earned</h2>
        <p>{badge}</p>
        <button className="gold-button" onClick={onClose}>Claim Your Badge</button>
      </div>
    </div>
  );
}
