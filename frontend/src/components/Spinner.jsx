// Centered loading state
export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="center-state">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}
