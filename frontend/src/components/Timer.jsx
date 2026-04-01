export default function Timer({ elapsed }) {
  const min = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const sec = String(elapsed % 60).padStart(2, "0");
  const dangerClass = elapsed >= 30 ? "timer danger" : elapsed >= 60 ? "timer warning" : "timer";

  return <div className={dangerClass}>{min}:{sec}</div>;
}
