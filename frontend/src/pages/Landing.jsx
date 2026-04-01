import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Landing() {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const stars = Array.from({ length: 40 }, (_, i) => i);

  useEffect(() => {
    let alive = true;
    async function loadCount() {
      const { count: teamCount } = await supabase.from("teams").select("id", { count: "exact", head: true });
      if (alive) setCount(teamCount || 0);
    }
    loadCount();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="landing-hero">
      <div className="landing-corners">☠</div>
      <div className="live-pill animate-goldPulse">LIVE HUNT</div>
      <div className="starfield" aria-hidden>
        {stars.map((i) => (
          <span
            key={i}
            className="star-dot"
            style={{ left: `${(i * 13) % 100}%`, top: `${(i * 17) % 100}%`, animationDelay: `${(i % 8) * 0.2}s` }}
          />
        ))}
      </div>
      <h1 className="title animate-shimmer">TREASURE HUNT</h1>
      <p className="subtitle">OJAS Cultural Fest 2026</p>
      <p className="team-count">⚓ {count} Teams Currently Sailing</p>
      <div className="hero-buttons">
        <button className="gold-button" onClick={() => navigate("/register")}>JOIN THE HUNT</button>
        <button className="gold-button" onClick={() => navigate("/leaderboard")}>VIEW LEADERBOARD</button>
      </div>
      <div className="chest" aria-hidden>
        <div className="lid" />
        <div className="base" />
      </div>
      <div className="wave" />
    </main>
  );
}
