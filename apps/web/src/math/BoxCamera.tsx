// ADAPT selected Canvas/Camera/BoxCamera helpers, frozen math-learning; origins.json.
import type { ReactNode } from "react";
import { boxFaces } from "./geometry.mjs";
import SolidView from "./SolidView.tsx";
import type { MathPayload } from "../../../../packages/contracts/math-readonly.ts";
const ink = "#294b53",
  blue = "#527eab",
  red = "#df6c4f",
  gold = "#e9b44d";
const text = (
  x: number,
  y: number,
  label: ReactNode,
  size = 17,
  color = ink,
) => (
  <text x={x} y={y} textAnchor="middle" fontSize={size} fill={color}>
    {label}
  </text>
);
function Canvas({
  label,
  children,
  height = 300,
  viewBox,
}: {
  label: string;
  children: ReactNode;
  height?: number;
  viewBox?: string;
}) {
  return (
    <svg
      viewBox={viewBox ?? `0 0 640 ${height}`}
      role="img"
      aria-label={label}
      className="intro-canvas"
    >
      <title>{label}</title>
      {children}
    </svg>
  );
}
function Camera({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-23" y="-15" width="46" height="30" rx="6" fill={blue} />
      <path d="M-14-15v-7h16v7" fill={blue} />
      <circle r="9" fill="#e4f1f1" stroke={ink} strokeWidth="3" />
      {text(0, 41, label, 16)}
    </g>
  );
}
function BoxCamera({
  prediction,
  dimensions,
}: {
  prediction: boolean;
  dimensions: [number, number, number];
}) {
  const solid = boxFaces(...dimensions);
  return (
    <>
      <div className="intro-object-layout">
        <div className="intro-object-card">
          <SolidView
            solid={solid}
            azimuth={35}
            elevation={25}
            marked
            title="斜着看的固定盒子：前面红圆点、右面蓝菱形、上面黄星星"
          />
          <p>物体示意 · 斜着看见三个面</p>
        </div>
        <Canvas
          viewBox="190 35 390 260"
          label="从上往下看拍照位置：相机原来在正前方，准备移到右侧"
        >
          <rect
            x="225"
            y="57"
            width="166"
            height="98"
            rx="9"
            fill="#fff2c9"
            stroke={ink}
            strokeWidth="3"
          />
          {text(307, 105, "固定的盒子")}
          {text(307, 130, "俯视位置图", 14)}
          <line
            x1="225"
            x2="391"
            y1="155"
            y2="155"
            stroke={red}
            strokeWidth="6"
          />
          <line
            x1="391"
            x2="391"
            y1="57"
            y2="155"
            stroke={blue}
            strokeWidth="6"
          />
          {text(307, 178, "前面", 14, red)}
          {text(423, 106, "右面", 14, blue)}
          <Camera x={307} y={235} label="原来：正前方" />
          <Camera x={520} y={106} label="准备去：右侧" />
          <path
            d="M354 229Q500 237 518 162"
            fill="none"
            stroke={gold}
            strokeWidth="5"
            strokeDasharray="9 7"
          />
          <path
            d="M504 175L519 157L528 179"
            fill="none"
            stroke={gold}
            strokeWidth="5"
          />
        </Canvas>
      </div>
      {prediction ? (
        <div className="intro-photo-pair">
          <div>
            <span>原来的正面照片</span>
            <svg
              viewBox="0 0 240 150"
              role="img"
              aria-label="原来的照片只有盒子前面，中央有红圆点"
            >
              <rect
                x="36"
                y="24"
                width="168"
                height="105"
                rx="3"
                fill="#f5ded7"
                stroke={ink}
                strokeWidth="2"
              />
              <circle cx="120" cy="76" r="24" fill={red} />
            </svg>
          </div>
          <b aria-hidden="true">→</b>
          <div className="intro-unknown" data-prediction-unknown>
            <span>从右侧拍的新照片</span>
            <strong>？</strong>
            <small>先猜，再去拍照验证</small>
          </div>
        </div>
      ) : (
        <div className="intro-marker-key">
          <span className="mark-front">● 前面：红圆点</span>
          <span className="mark-right">◆ 右面：蓝菱形</span>
          <span className="mark-top">★ 上面：黄星星</span>
        </div>
      )}
    </>
  );
}
export function IntroPicture({
  spec,
  prediction = false,
  dimensions,
}: {
  spec: MathPayload["lesson"]["intro"];
  prediction?: boolean;
  dimensions: [number, number, number];
}) {
  return (
    <figure className="intro-visual">
      <header>
        <h3>{spec.title}</h3>
      </header>
      <BoxCamera prediction={prediction} dimensions={dimensions} />
      <figcaption>{spec.caption}</figcaption>
    </figure>
  );
}
