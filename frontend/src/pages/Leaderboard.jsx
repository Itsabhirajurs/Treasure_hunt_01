import { useEffect, useMemo, useRef, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import { useGame } from "../context/GameContext";
import { supabase } from "../supabaseClient";

export default function Leaderboard() {
  const { state } = useGame();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flashingTeam, setFlashingTeam] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const previousRanks = useRef({});

  const loadTeams = async () => {
    const { data } = await supabase.from("teams").select("*").order("total_score", { ascending: false });
    const next = data || [];
    setTeams(next);
    setUpdatedAt(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadTeams();
    const channel = supabase
      .channel("leaderboard")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "teams" }, () => {
        loadTeams();
        setTimeout(() => setFlashingTeam(null), 1000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const rankMovement = useMemo(() => {
    const movement = {};
    teams.forEach((team, idx) => {
      const now = idx + 1;
      const before = previousRanks.current[team.id] || now;
      movement[team.id] = now < before ? "up" : now > before ? "down" : "same";
      previousRanks.current[team.id] = now;
    });
    return movement;
  }, [teams]);

  if (loading) return <LoadingSpinner label="Loading leaderboard" />;

  const avgScore = teams.length ? Math.round(teams.reduce((s, t) => s + (t.total_score || 0), 0) / teams.length) : 0;

  return (
    <main className="page-shell">
      <h1>THE CAPTAIN'S LOG</h1>
      <p>Live standings in real time</p>
      <button className="gold-button" onClick={loadTeams}>Manual Refresh</button>
      <p>Last updated: {updatedAt.toLocaleTimeString()}</p>

      <section>
        {teams.map((team, idx) => (
          <article
            key={team.id}
            className={`leaderboard-row ${team.id === state.team?.id ? "mine" : ""} ${team.id === flashingTeam ? "flash" : ""}`}
          >
            <span>#{idx + 1}</span>
            <strong>{team.name}</strong>
            <span>Round {team.current_round}</span>
            <span>{team.total_score}</span>
            <span>{(team.badges || []).length} badges</span>
            <span>{team.completed ? "Treasure Found" : "Sailing"}</span>
            <span>{rankMovement[team.id] === "up" ? "UP" : rankMovement[team.id] === "down" ? "DOWN" : "-"}</span>
          </article>
        ))}
      </section>

      <section className="pirate-card">
        <h3>Stats</h3>
        <p>Total teams: {teams.length}</p>
        <p>Average score: {avgScore}</p>
      </section>
    </main>
  );
}
