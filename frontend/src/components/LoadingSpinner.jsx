export default function LoadingSpinner({ inline = false, label = "Loading..." }) {
  return (
    <div className={inline ? "spinner-inline" : "spinner-page"} aria-label={label}>
      <div className="anchor-spin">⚓</div>
      <span>{label}</span>
    </div>
  );
}
