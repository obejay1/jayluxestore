import { LoaderCircle } from 'lucide-react';

export default function Loading({
  fullScreen = false,
  label = 'Loading…',
}: {
  fullScreen?: boolean;
  label?: string;
}) {
  return (
    <div
      className={`jl-loading-state${fullScreen ? ' full-screen' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoaderCircle className="jl-spin" size={fullScreen ? 34 : 26} aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
