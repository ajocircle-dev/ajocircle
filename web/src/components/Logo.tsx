export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="12" fill="none" stroke="var(--accent)" strokeWidth="3" strokeDasharray="6 3.4" />
      <circle cx="16" cy="16" r="5" fill="var(--btc)" />
      <circle cx="16" cy="4" r="2.6" fill="var(--accent)" />
    </svg>
  );
}
