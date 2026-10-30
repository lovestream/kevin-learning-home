import { useState } from "react";
export default function HomeSketch() {
  const [side, setSide] = useState(0);
  const names = ["前面", "右面", "上面"];
  return (
    <div className="home-sketch">
      <div className="sketch-caption">
        <span>换个方向看一看</span>
      </div>
      <svg
        viewBox="0 0 380 275"
        role="img"
        aria-label="同一个方块的前面、右面与上面"
      >
        <path
          d="M32 245H348 M58 32V250"
          fill="none"
          stroke="#d7e0d2"
          strokeDasharray="3 7"
        />
        <polygon
          points="95,90 235,90 235,230 95,230"
          fill={side === 0 ? "#36a58b" : "#d5eee5"}
          stroke="#173b47"
          strokeWidth="2.5"
        />
        <polygon
          points="235,90 310,42 310,181 235,230"
          fill={side === 1 ? "#f6c848" : "#ffe6a5"}
          stroke="#173b47"
          strokeWidth="2.5"
        />
        <polygon
          points="95,90 170,42 310,42 235,90"
          fill={side === 2 ? "#6ba9dc" : "#d4e8f6"}
          stroke="#173b47"
          strokeWidth="2.5"
        />
        <circle cx="165" cy="160" r="7" fill="#173b47" />
        <path d="m260 128 15-9 0 20-15 9Z" fill="#173b47" />
        <path d="m194 61 28 0-14 11Z" fill="#173b47" />
        <path d="M77 247h158 M329 182V45" stroke="#97aaa0" strokeWidth="1" />
        <text x="154" y="270" fill="#52666c" fontSize="18">
          同一个方块
        </text>
      </svg>
      <p>点一点，找找方块的三个面。</p>
      <div className="sketch-views" aria-label="观察方块的面">
        {names.map((n, i) => (
          <button key={n} aria-pressed={side === i} onClick={() => setSide(i)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
