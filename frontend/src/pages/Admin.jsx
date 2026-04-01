import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import { supabase } from "../supabaseClient";

export default function Admin() {
  const [pass, setPass] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [teams, setTeams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(new Date());

  const loadData = async () => {
    const [{ data: t }, { data: s }] = await Promise.all([
      supabase.from("teams").select("*").order("total_score", { ascending: false }),
      supabase.from("submissions").select("*").order("submitted_at", { ascending: false }).limit(30),
    ]);
    setTeams(t || []);
    setSubmissions(s || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadData();

    const timer = setInterval(() => setClock(new Date()), 1000);
    const refresh = setInterval(loadData, 30000);

    const channel = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, loadData)
      .subscribe();

    return () => {
      clearInterval(timer);
      clearInterval(refresh);
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const stats = useMemo(() => {
    const correct = submissions.filter((s) => s.is_correct).length;
    const avg = submissions.length
      ? Math.round(submissions.reduce((sum, s) => sum + (s.time_elapsed_seconds || 0), 0) / submissions.length)
      : 0;
    const anomalies = submissions.filter((s) => s.anomaly_flagged).length;
    return { correct, avg, anomalies };
  }, [submissions]);

  const resetTeam = async (teamId) => {
    await supabase.from("teams").update({ total_score: 0, current_round: 1, badges: [], completed: false }).eq("id", teamId);
    loadData();
  };

  const exportCSV = () => {
    const csv = teams.map((t) => `${t.name},${t.total_score},${t.current_round},${(t.badges || []).join(";")}`).join("\n");
    const blob = new Blob([`Name,Score,Round,Badges\n${csv}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ojas_results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <main className="page-shell center-screen">
        <div className="pirate-card" style={{ maxWidth: 420 }}>
          <h1>Captain Command Center</h1>
          <input className="input-field" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Admin password" />
          <button className="gold-button" onClick={() => setIsAuthenticated(pass === "ojas2026")}>Board the Ship</button>
        </div>
      </main>
    );
  }

  if (loading) return <LoadingSpinner label="Loading admin board" />;

  return (
    <main className="page-shell">
      <h1>CAPTAIN'S COMMAND CENTER</h1>
      <p>{clock.toLocaleTimeString()}</p>

      <section className="stats-grid">
        <article className="pirate-card"><h3>Total Crews</h3><p>{teams.length}</p></article>
        <article className="pirate-card"><h3>Rounds Completed</h3><p>{stats.correct}</p></article>
        <article className="pirate-card"><h3>Avg Answer Time</h3><p>{stats.avg}s</p></article>
        <article className="pirate-card"><h3>Anomalies Flagged</h3><p>{stats.anomalies}</p></article>
      </section>

      <section className="pirate-card">
        <h2>Live Submissions</h2>
        {submissions.slice(0, 10).map((s) => (
          <p key={s.id} className={s.anomaly_flagged ? "error-text" : ""}>
            Team {s.team_id} | Round {s.round_num} | {s.answer_submitted} | {s.is_correct ? "OK" : "NO"} | {s.time_elapsed_seconds}s | {s.score_awarded}
          </p>
        ))}
      </section>

      <section className="pirate-card">
        <h2>Leaderboard Control</h2>
        <button className="gold-button" onClick={exportCSV}>Export CSV</button>
        {teams.map((t) => (
          <div key={t.id} className="leaderboard-row">
            <span>{t.name}</span>
            <span>R{t.current_round}</span>
            <span>{t.total_score}</span>
            <button className="crimson-button" onClick={() => resetTeam(t.id)}>Reset Team</button>
          </div>
        ))}
      </section>
    </main>
  );
}
