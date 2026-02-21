export default function GlobalLoader({ visible }) {
  // Arka plan yok; sadece ortada spinner
  return (
    <div
      className="global-loader"
      style={{ display: visible ? "grid" : "none" }}
      aria-live="polite"
      aria-busy={visible ? "true" : "false"}
    >
      <div className="loader" role="status" aria-label="Loading" />
    </div>
  );
}
