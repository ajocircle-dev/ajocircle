/** Decorative: members around a shared pot, with the payout arrow rotating. Pure SVG + CSS. */
export function HeroArt() {
  const names = ["Ada", "Bayo", "Chidi", "Dami", "Efe"];
  const R = 112;
  return (
    <div className="hero-art" aria-hidden>
      <svg viewBox="0 0 320 320" width="100%" height="100%">
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--btc)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--btc)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="160" cy="160" r="150" fill="var(--accent-soft)" />
        <circle cx="160" cy="160" r={R} fill="none" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="4 8" />
        <g className="spin">
          <path d={`M160 ${160 - R} A ${R} ${R} 0 0 1 ${160 + R * Math.sin((2 * Math.PI) / 5)} ${160 - R * Math.cos((2 * Math.PI) / 5)}`} fill="none" stroke="var(--btc)" strokeWidth="5" strokeLinecap="round" />
        </g>
        <circle cx="160" cy="160" r="70" fill="url(#glow)" />
        <circle cx="160" cy="160" r="46" fill="var(--card)" stroke="var(--btc)" strokeWidth="3" />
        <text x="160" y="155" textAnchor="middle" className="art-big">50</text>
        <text x="160" y="175" textAnchor="middle" className="art-small">MUSD pot</text>
        {names.map((n, i) => {
          const a = (i * 2 * Math.PI) / 5;
          const x = 160 + R * Math.sin(a), y = 160 - R * Math.cos(a);
          return (
            <g key={n}>
              <circle cx={x} cy={y} r="24" fill={i === 0 ? "var(--accent)" : "var(--card)"} stroke="var(--accent)" strokeWidth="2.5" />
              <text x={x} y={y + 5} textAnchor="middle" className={i === 0 ? "art-node on" : "art-node"}>{n[0]}</text>
              <text x={x} y={y + (y > 160 ? 42 : -32)} textAnchor="middle" className="art-label">{n}{i === 0 ? " · paid out" : ""}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
