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

  const round = state.team?.current_round || state.round || 1;
  const hintsUsed = useMemo(() => Object.keys(hints).length, [hints]);

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
      setMessage("Wrong waters, try again");
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
    setLoadingHint(true);
    const res = await fetch(
      `${apiBase}/api/hint?round=${round}&hint_num=${n}&team_id=${state.team.id}`
    );
    const data = await res.json();
    setHints((prev) => ({ ...prev, [n]: data.hint }));
    setLoadingHint(false);
  };

  if (loading) return <LoadingSpinner label="Loading clue" />;

  return (
    <main className="page-shell hunt-grid">
      <aside>
        <div className="pirate-card">
          <h2>{state.team?.name}</h2>
          <p>Total Score: {state.score}</p>
        </div>
        <MapProgress currentRound={round} />
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
          <h3>Timer</h3>
          <Timer elapsed={elapsed} />
          <p>Hints used: {hintsUsed}</p>
        </div>
        <HintSystem hints={hints} onReveal={revealHint} loadingHint={loadingHint} />
      </aside>

      <BadgePopup badge={badge} onClose={() => setBadge(null)} />
      <ParticleEffect show={burst} />
    </main>
  );
}
