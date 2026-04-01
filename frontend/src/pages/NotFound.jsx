import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="page-shell center-screen">
      <div className="pirate-card" style={{ maxWidth: 560 }}>
        <h1>These waters are uncharted, sailor</h1>
        <p>Course lost in the fog. Return to the harbor.</p>
        <Link to="/" className="gold-button">Back Home</Link>
      </div>
    </main>
  );
}
