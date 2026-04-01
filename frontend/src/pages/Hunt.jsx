import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BadgePopup from "../components/BadgePopup";
import ClueCard from "../components/ClueCard";
import HintSystem from "../components/HintSystem";
import LoadingSpinner from "../components/LoadingSpinner";
import MapProgress from "../components/MapProgress";
import ParticleEffect from "../components/ParticleEffect";
import Timer from "../components/Timer";
import { useGame } from "../context/GameContext";
import { supabase } from "../supabaseClient";

const apiBase = import.meta.env.VITE_BACKEND_URL || "";

export default function Hunt() {
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const [clue, setClue] = useState(null);
  const [answer, setAnswer] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [hints, setHints] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingHint, setLoadingHint] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("neutral");
  const [badge, setBadge] = useState(null);
  const [burst, setBurst] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [supportInput, setSupportInput] = useState("");
  const [supportMessages, setSupportMessages] = useState([]);
  const [teamMsgInput, setTeamMsgInput] = useState("");
  const [teamMessages, setTeamMessages] = useState([]);
  const [morale, setMorale] = useState(72);
  const [compassState, setCompassState] = useState("NORTH-EAST");

  const round = state.team?.current_round || state.round || 1;
  const hintsUsed = useMemo(() => Object.keys(hints).length, [hints]);
  const progressPercent = Math.min(100, Math.round(((round - 1) / 5) * 100));

  const loadClue = (targetRound) => {
    setLoading(true);
    fetch(`${apiBase}/api/clue?round=${targetRound}`)
      .then((r) => r.json())
      .then((data) => {
        setClue(data);
        setElapsed(0);
        setAnswer("");
        setHints({});
        setMessage("");
        setMessageType("neutral");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (round > 5) {
      navigate("/victory");
      return;
    }
    loadClue(round);
  }, [round, navigate]);

  useEffect(() => {
    const id = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [round]);

  useEffect(() => {
    if (!state.team?.id) return;
    const channel = supabase
      .channel(`team-chat-${state.team.id}`)
      .on("broadcast", { event: "team-message" }, ({ payload }) => {
        setTeamMessages((prev) => [...prev.slice(-29), payload]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.team?.id]);

  useEffect(() => {
    if (!state.team?.id) return;
    const channel = supabase
      .channel("support-live")
      .on("broadcast", { event: "support-message" }, ({ payload }) => {
        if (payload.team_id !== state.team.id) return;
        setSupportMessages((prev) => [...prev.slice(-49), payload]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.team?.id]);

  const submitAnswer = async () => {
    const res = await fetch(`${apiBase}/api/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        team_id: state.team.id,
        round_num: round,
        answer,
        time_elapsed_seconds: elapsed,
        hints_used: hintsUsed,
      }),
    });
    const data = await res.json();

    if (!data.correct) {
      setMessage(data.motivation || "Wrong waters, try again");
      setMessageType("wrong");
      return;
    }

    setMessage(`Plunder secured +${data.score}`);
    setMessageType("correct");
    const updatedTeam = data.team || {
      ...state.team,
      total_score: state.score + data.score,
      current_round: round + 1,
    };
    dispatch({ type: "SET_TEAM", payload: updatedTeam });
    dispatch({ type: "UPDATE_SCORE", payload: updatedTeam.total_score });
    dispatch({ type: "UPDATE_ROUND", payload: updatedTeam.current_round });

    if (data.badge_earned) {
      dispatch({ type: "ADD_BADGE", payload: data.badge_earned });
      setBadge(data.badge_earned);
      setTimeout(() => setBadge(null), 4000);
    }

    setBurst(true);
    setTimeout(() => setBurst(false), 1200);
    setTimeout(() => {
      if ((updatedTeam.current_round || 1) > 5) navigate("/victory");
      else loadClue(updatedTeam.current_round || round + 1);
    }, 2000);
  };

  const revealHint = async (n) => {
    try {
      setLoadingHint(true);
      const res = await fetch(
        `${apiBase}/api/hint?round=${round}&hint_num=${n}&team_id=${state.team.id}`
      );
      const data = await res.json();
      if (!res.ok || !data.hint) {
        throw new Error(data.error || "Hint unavailable right now");
      }
      setHints((prev) => ({ ...prev, [n]: data.hint }));
      setMessageType("neutral");
    } catch (err) {
      setMessage(err.message || "Hint failed. Try again.");
      setMessageType("wrong");
    } finally {
      setLoadingHint(false);
    }
  };

  const sendSupportMessage = async () => {
    const text = supportInput.trim();
    if (!text || !state.team?.id) return;

    const payload = {
      team_id: state.team.id,
      team_name: state.team.name || "Crew",
      sender: "team",
      message: text,
      at: new Date().toLocaleTimeString(),
    };

    const channel = supabase.channel("support-live");
    await channel.subscribe();
    await channel.send({ type: "broadcast", event: "support-message", payload });
    setSupportInput("");
    setSupportMessages((prev) => [...prev.slice(-49), payload]);
  };

  const sendTeamMessage = async () => {
    const text = teamMsgInput.trim();
    if (!text || !state.team?.id) return;
    const payload = { user: state.team.name || "Crew", text, at: new Date().toLocaleTimeString() };
    const channel = supabase.channel(`team-chat-${state.team.id}`);
    await channel.subscribe();
    await channel.send({ type: "broadcast", event: "team-message", payload });
    setTeamMsgInput("");
  };

  if (loading) return <LoadingSpinner label="Loading clue" />;

  return (
    <main className="page-shell hunt-grid rich-canvas full-hunt-layout">
      <div className="ambient-coin coin-a" aria-hidden>✦</div>
      <div className="ambient-coin coin-b" aria-hidden>✧</div>
      <div className="ambient-coin coin-c" aria-hidden>✦</div>
      <aside>
        <div className="pirate-card">
          <h2>{state.team?.name}</h2>
          <p>Total Score: {state.score}</p>
          <div className="progress-meter">
            <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>
          <p>Journey Progress: {progressPercent}%</p>
        </div>
        <MapProgress currentRound={round} />
        <button className="gold-button map-btn" onClick={() => setShowMap(true)}>Open Map Blueprint</button>
        <section className="hunt-rules-panel pirate-card">
          <h3>Hunt Rules</h3>
          <ul>
            <li>One answer at a time. Read clues carefully.</li>
            <li>Hints are limited and reduce round score.</li>
            <li>Speed matters. Faster correct answers score higher.</li>
            <li>No external help during active round time.</li>
            <li>Respect fair play. Suspicious times are flagged.</li>
            <li>Complete all 5 rounds to unlock victory board.</li>
          </ul>
        </section>
      </aside>

      <section>
        <h2>ROUND {round} OF 5</h2>
        <ClueCard clue={clue} />
        <input
          className="input-field"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter your answer, sailor"
        />
        <button className="gold-button" onClick={submitAnswer}>SUBMIT ANSWER</button>
        <p className={`result-pill ${messageType}`}>{message}</p>
      </section>

      <aside>
        <div className="pirate-card">
          <h3>Countdown Clock</h3>
          <Timer elapsed={elapsed} />
          <p>Hints used: {hintsUsed}</p>
        </div>
        <HintSystem hints={hints} onReveal={revealHint} loadingHint={loadingHint} />
        <div className="pirate-card mini-chat">
          <h3>Support Chat (Admin)</h3>
          <div className="chat-log">
            {supportMessages.slice(-8).map((m, i) => (
              <p key={`${m.sender}-${m.at}-${i}`} className={m.sender === "admin" ? "bot-line" : "user-line"}>
                <strong>{m.sender === "admin" ? "Admin" : "You"}</strong>: {m.message}
              </p>
            ))}
          </div>
          <input className="input-field" value={supportInput} onChange={(e) => setSupportInput(e.target.value)} placeholder="Ask for help from organizer" />
          <button className="gold-button" onClick={sendSupportMessage}>Send to Admin</button>
        </div>
        <div className="pirate-card mini-chat">
          <h3>Team Chat</h3>
          <div className="chat-log">
            {teamMessages.slice(-8).map((m, i) => (
              <p key={`${m.user}-${m.at}-${i}`}><strong>{m.user}</strong>: {m.text} <span className="time-tag">{m.at}</span></p>
            ))}
          </div>
          <input className="input-field" value={teamMsgInput} onChange={(e) => setTeamMsgInput(e.target.value)} placeholder="Message your crew" />
          <button className="crimson-button" onClick={sendTeamMessage}>Send Team Message</button>
        </div>
      </aside>

      {showMap && (
        <div className="badge-overlay" onClick={() => setShowMap(false)}>
          <div className="badge-modal pirate-card" onClick={(e) => e.stopPropagation()}>
            <h2>Treasure Blueprint</h2>
            <svg viewBox="0 0 600 260" className="map-svg">
              <defs>
                <linearGradient id="sea" x1="0" x2="1">
                  <stop offset="0%" stopColor="#7ab4d6" />
                  <stop offset="100%" stopColor="#35627f" />
                </linearGradient>
                <linearGradient id="island" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#e8d9ae" />
                  <stop offset="100%" stopColor="#b89b63" />
                </linearGradient>
              </defs>
              <rect x="10" y="10" width="580" height="240" rx="16" fill="url(#sea)" stroke="#b8860b" strokeWidth="5" />
              <ellipse cx="140" cy="84" rx="65" ry="36" fill="url(#island)" />
              <ellipse cx="300" cy="178" rx="72" ry="42" fill="url(#island)" />
              <ellipse cx="468" cy="86" rx="60" ry="32" fill="url(#island)" />
              <path d="M60 195 C130 88, 216 226, 305 122 C386 32, 488 206, 546 98" stroke="#7a3b00" strokeWidth="4" fill="none" strokeDasharray="8 7" />
              <g transform="translate(525,212)">
                <circle r="24" fill="rgba(255,255,255,0.18)" stroke="#f4e4c1" />
                <path d="M0 -20 L5 -5 L0 0 L-5 -5 Z" fill="#ffd700" />
                <path d="M0 20 L5 5 L0 0 L-5 5 Z" fill="#8b0000" />
                <text x="-4" y="-26" fill="#fff">N</text>
              </g>
              {[1, 2, 3, 4, 5].map((r) => (
                <g key={r} transform={`translate(${60 + r * 95},${170 - (r % 2) * 60})`}>
                  <circle r="14" fill={r < round ? "#ffd700" : r === round ? "#00ced1" : "#c8a96e"} />
                  <text y="5" x="-4" fill="#111">{r}</text>
                </g>
              ))}
            </svg>
            <button className="gold-button" onClick={() => setShowMap(false)}>Close Map</button>
          </div>
        </div>
      )}

      <BadgePopup badge={badge} onClose={() => setBadge(null)} />
      <ParticleEffect show={burst} />

      <section className="pirate-card deck-widgets">
        <p className="widget-intro">Interactive deck widgets for engagement and team coordination. They do not change score logic.</p>
        <article className="widget">
          <h3>Compass Console (visual)</h3>
          <p>Heading: <strong>{compassState}</strong></p>
          <div className="widget-actions">
            <button className="gold-button" onClick={() => setCompassState("NORTH")}>N</button>
            <button className="gold-button" onClick={() => setCompassState("EAST")}>E</button>
            <button className="gold-button" onClick={() => setCompassState("SOUTH")}>S</button>
            <button className="gold-button" onClick={() => setCompassState("WEST")}>W</button>
          </div>
        </article>

        <article className="widget">
          <h3>Route Heat (progress intensity)</h3>
          <p>Intensity rises by round progression.</p>
          <div className="heat-grid">
            {Array.from({ length: 20 }, (_, i) => (
              <span
                key={i}
                className={`heat-dot ${i < Math.min(20, round * 4) ? "active" : ""}`}
              />
            ))}
          </div>
        </article>

        <article className="widget">
          <h3>Crew Morale (practice slider)</h3>
          <p>{morale}% motivated</p>
          <input
            type="range"
            min="0"
            max="100"
            value={morale}
            onChange={(e) => setMorale(Number(e.target.value))}
            className="morale-slider"
          />
          <p className="small-note">Drag to rehearse pressure scenarios.</p>
        </article>
      </section>
    </main>
  );
}
