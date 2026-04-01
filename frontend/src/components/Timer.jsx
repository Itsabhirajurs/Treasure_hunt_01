export default function Timer({ elapsed }) {
  const min = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const sec = String(elapsed % 60).padStart(2, "0");
  const timerClass = elapsed >= 60 ? "timer danger" : elapsed >= 30 ? "timer warning" : "timer";

  return <div className={timerClass}>{min}:{sec}</div>;
}
