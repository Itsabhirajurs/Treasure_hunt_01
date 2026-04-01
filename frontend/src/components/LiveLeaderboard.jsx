export default function LiveLeaderboard({ teams = [] }) {
  return (
    <div>
      {teams.map((team, idx) => (
        <div className="leaderboard-row" key={team.id || team.name}>
          <span>#{idx + 1}</span>
          <span>{team.name}</span>
          <span>R{team.current_round}</span>
          <strong>{team.total_score}</strong>
        </div>
      ))}
    </div>
  );
}
