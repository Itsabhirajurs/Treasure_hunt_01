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
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [teamMsgInput, setTeamMsgInput] = useState("");
  const [teamMessages, setTeamMessages] = useState([]);

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

  const askBot = async () => {
    const prompt = chatInput.trim();
    if (!prompt) return;
    setChatMessages((prev) => [...prev, { role: "user", text: prompt }]);
    setChatInput("");

    const res = await fetch(`${apiBase}/api/chatbot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, team_name: state.team?.name || "Crew", round }),
    });
    const data = await res.json();
    setChatMessages((prev) => [...prev, { role: "bot", text: data.reply || "No response from oracle" }]);
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
    <main className="page-shell hunt-grid">
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
          <h3>Clock</h3>
          <Timer elapsed={elapsed} />
          <p>Hints used: {hintsUsed}</p>
        </div>
        <HintSystem hints={hints} onReveal={revealHint} loadingHint={loadingHint} />
        <div className="pirate-card mini-chat">
          <h3>Ask Oracle</h3>
          <div className="chat-log">
            {chatMessages.slice(-6).map((m, i) => (
              <p key={`${m.role}-${i}`} className={m.role === "bot" ? "bot-line" : "user-line"}>{m.text}</p>
            ))}
          </div>
          <input className="input-field" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask strategy, not final answer" />
          <button className="gold-button" onClick={askBot}>Ask Gemini</button>
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
              <rect x="10" y="10" width="580" height="240" rx="16" fill="#f4e4c1" stroke="#b8860b" strokeWidth="5" />
              <path d="M60 180 C140 70, 230 220, 320 120 C390 40, 490 190, 540 90" stroke="#8b0000" strokeWidth="4" fill="none" strokeDasharray="8 8" />
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
    </main>
  );
}
