export default function Timer({ elapsed }) {
  const remaining = Math.max(0, 60 - elapsed);
  const min = String(Math.floor(remaining / 60)).padStart(2, "0");
  const sec = String(remaining % 60).padStart(2, "0");
  const timerClass = remaining <= 10 ? "timer danger" : remaining <= 30 ? "timer warning" : "timer";

  return <div className={timerClass}>{min}:{sec}</div>;
}
