import { useState } from "react";
import {
  modelFor,
  modelFacts,
  fraction,
  modelControlValue,
  type LessonModel,
} from "./legacy-models.ts";
import PlaceValueLab from "./PlaceValueLab.tsx";
import type { LegacyEntry } from "./contract.ts";
const ink = "#173b47",
  teal = "#177465",
  mint = "#b4d8c7",
  orange = "#b85e2e",
  line = "#ccd6cd";
const text = (
  x: number,
  y: number,
  v: string | number,
  key: string | number = "",
  anchor = "middle",
) => (
  <text
    key={key}
    x={x}
    y={y}
    fill={ink}
    fontSize="23"
    textAnchor={anchor as "middle"}
  >
    {v}
  </text>
);
function Geometry({
  m,
  value,
  toggle,
  secondary,
  rotation,
}: {
  m: LessonModel;
  value: number;
  toggle: boolean;
  secondary: number;
  rotation: boolean;
}) {
  const f = modelFacts(m.id, value, toggle, secondary, rotation),
    k = m.kind;
  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    fill = teal,
    key: string | number = "",
  ) => (
    <rect
      key={key}
      x={x}
      y={y}
      width={w}
      height={h}
      rx="2"
      fill={fill}
      stroke="white"
      strokeWidth="2"
    />
  );
  const cells = (n: number, cols: number, active = n) =>
    Array.from({ length: n }, (_, i) =>
      rect(
        36 + (i % cols) * 32,
        32 + Math.floor(i / cols) * 32,
        31,
        31,
        i < active ? teal : "#edf0e8",
        i,
      ),
    );
  const dots = (n: number, cols = 12) =>
    Array.from({ length: n }, (_, i) => (
      <circle
        key={i}
        cx={30 + (i % cols) * 34}
        cy={40 + Math.floor(i / cols) * 34}
        r="11"
        fill={i % 2 ? mint : teal}
      />
    ));
  let view = <></>;
  if (k === "angle") {
    const t = (value * Math.PI) / 180;
    view = (
      <>
        <path
          d={`M240 230H425 M240 230L${240 + 170 * Math.cos(t)} ${230 - 170 * Math.sin(t)}`}
          fill="none"
          stroke={teal}
          strokeWidth="5"
        />
        <path
          d={`M305 230 A65 65 0 0 0 ${240 + 65 * Math.cos(t)} ${230 - 65 * Math.sin(t)}`}
          fill="none"
          stroke={orange}
          strokeWidth="4"
        />
        {text(230, 55, value + "°")}
        {value === 90 && (
          <path d="M240 205H265V230" fill="none" stroke={ink} strokeWidth="2" />
        )}
      </>
    );
  } else if (k === "round" || k === "signed" || k === "speed") {
    const low = k === "round" ? 300 : k === "signed" ? -6 : 0,
      high = k === "round" ? 500 : k === "signed" ? 6 : 24,
      v = k === "speed" ? f.result : value;
    view = (
      <>
        <path d="M28 170H452" stroke={ink} strokeWidth="3" />
        {Array.from({ length: k === "round" ? 11 : 13 }, (_, i) => {
          const n = low + (i * (high - low)) / (k === "round" ? 10 : 12),
            x = 30 + ((n - low) / (high - low)) * 420;
          return (
            <g key={i}>
              <path d={`M${x} 160v20`} stroke={line} strokeWidth="2" />
              {i % 2 === 0 && text(x, 212, n)}
            </g>
          );
        })}
        <circle
          cx={30 + ((v - low) / (high - low)) * 420}
          cy="170"
          r="11"
          fill={orange}
        />
        {text(
          240,
          80,
          k === "speed"
            ? `${value}小时 · ${v}千米`
            : v + (k === "signed" ? "℃" : ""),
        )}
      </>
    );
  } else if (k === "quad" || k === "shear") {
    const h = k === "quad" ? value : 4,
      H = h * 30,
      cut = k === "shear" && value === 1;
    view = (
      <>
        {toggle && k === "quad" ? (
          <polygon
            data-area-piece="trapezoid"
            points={`80,230 320,230 260,${230 - H} 140,${230 - H}`}
            fill={mint}
            stroke={teal}
            strokeWidth="3"
          />
        ) : (
          <>
            <polygon
              data-area-piece="main"
              points={`140,230 320,230 380,${230 - H} 140,${230 - H}`}
              fill={mint}
              stroke={teal}
              strokeWidth="3"
            />
            <polygon
              data-area-piece="triangle"
              points={`${cut ? 320 : 80},230 ${cut ? 380 : 140},${230 - H} ${cut ? 380 : 140},230`}
              fill="#e3ae76"
              stroke={teal}
              strokeWidth="3"
            />
          </>
        )}
        <path
          d={`M140 230V${230 - H}`}
          stroke={orange}
          strokeWidth="3"
          strokeDasharray="6 4"
        />
        {text(210, 270, "底8 cm")}
        {text(182, 205 - H / 2, "高" + h + " cm")}
        {toggle && k === "quad" && text(200, 205 - H, "上底4 cm")}
      </>
    );
  } else if (k === "circle") {
    view = (
      <>
        <circle
          cx="240"
          cy="145"
          r={value * 21}
          fill={mint}
          stroke={teal}
          strokeWidth="3"
        />
        <circle cx="240" cy="145" r="4" fill={ink} />
        <path d={`M240 145h${value * 21}`} stroke={orange} strokeWidth="3" />
        {text(240, 285, "半径 " + value + " cm")}
      </>
    );
  } else if (k === "sector") {
    const a = (value / 100) * 2 * Math.PI,
      x = 240 + 110 * Math.sin(a),
      y = 145 - 110 * Math.cos(a);
    view = (
      <>
        <circle cx="240" cy="145" r="110" fill={mint} />
        <path
          d={`M240 145L240 35 A110 110 0 ${value > 50 ? 1 : 0} 1 ${x} ${y} Z`}
          fill={teal}
          stroke="white"
          strokeWidth="3"
        />
        {text(240, 285, value + "% ↔ " + f.result + "°")}
      </>
    );
  } else if (k === "coordinate") {
    view = (
      <>
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i}>
            <path
              d={`M100 ${270 - i * 50}H350 M${100 + i * 50} 270V20`}
              stroke={line}
            />
            {text(100 + i * 50, 300, i)}
            {text(74, 277 - i * 50, i)}
          </g>
        ))}
        <path
          d={`M100 ${270 - secondary * 50}H${100 + value * 50}V270`}
          stroke={orange}
          strokeDasharray="6 4"
          fill="none"
        />
        <circle
          cx={100 + value * 50}
          cy={270 - secondary * 50}
          r="9"
          fill={teal}
        />
        {toggle && (
          <circle
            cx={100 + secondary * 50}
            cy={270 - value * 50}
            r="9"
            fill="none"
            stroke={orange}
            strokeWidth="3"
          />
        )}
        {text(410, 70, `(${value},${secondary})`)}
        {toggle && text(410, 120, `(${secondary},${value})`)}
      </>
    );
  } else if (k === "composite") {
    const H = value * 32;
    view = (
      <>
        <path
          data-area-remain
          d={`M100 40H356V${232 - H}H260V232H100Z`}
          fill={mint}
          stroke={teal}
          strokeWidth="3"
        />
        <rect
          data-area-cut
          x="260"
          y={232 - H}
          width="96"
          height={H}
          fill="#f8eee3"
          stroke={orange}
          strokeDasharray="5 4"
        />
        {text(230, 285, `8 cm × 6 cm，剪去3 cm × ${value} cm`)}
      </>
    );
  } else if (k === "extreme") {
    view = (
      <>
        {rect(
          240 - value * 29,
          150 - (6 - value) * 29,
          value * 58,
          (6 - value) * 58,
          mint,
        )}
        {text(240, 300, `${value} cm × ${6 - value} cm`)}
      </>
    );
  } else if (k === "chart" || k === "average") {
    const parts = f.parts,
      max = k === "chart" ? 12 : 15;
    view = (
      <>
        {[0, 2, 4, 6, 8, 10, 12].map((n) => (
          <g key={n}>
            <path d={`M55 ${240 - (n / max) * 180}H440`} stroke={line} />
            {text(25, 247 - (n / max) * 180, n)}
          </g>
        ))}
        {parts.map((n, i) => (
          <g key={i}>
            {rect(
              90 + i * 115,
              240 - (n / max) * 180,
              65,
              (n / max) * 180,
              i === 2 ? orange : teal,
            )}
            {text(
              122 + i * 115,
              282,
              k === "chart"
                ? ["一组", "二组", "三组"][i]
                : ["6", "8", String(value)][i],
            )}
          </g>
        ))}
        {k === "average" && (
          <path
            d={`M60 ${240 - (f.result / max) * 180}H445`}
            stroke={orange}
            strokeDasharray="6 4"
            strokeWidth="3"
          />
        )}
      </>
    );
  } else if (k === "sticks") {
    view = (
      <>
        {Array.from({ length: value }, (_, i) => (
          <g key={i}>
            <path
              d={`M${25 + i * 52} 110h52v52h-52v-52`}
              fill="none"
              stroke={teal}
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
        ))}
        {text(240, 250, value + " 个正方形 · " + f.result + " 根")}
      </>
    );
  } else if (k === "motion") {
    const points = "0,0 120,0 120,40 40,40 40,160 0,160";
    view = (
      <>
        <path d="M30 250H450 M30 250V30" stroke={line} />
        <polygon
          points={points}
          transform="translate(60 60)"
          fill="none"
          stroke={ink}
          strokeDasharray="6 4"
          strokeWidth="2"
        />
        <polygon
          points={points}
          transform={
            rotation
              ? "translate(260 60) rotate(90 80 80)"
              : toggle
                ? "translate(420 60) scale(-1 1)"
                : `translate(${60 + value * 40} 60)`
          }
          fill={mint}
          stroke={teal}
          strokeWidth="3"
        />
        {rotation && (
          <>
            <circle cx="340" cy="140" r="5" fill={orange} />
            {text(340, 35, "旋转中心")}
          </>
        )}
        {text(
          240,
          285,
          rotation
            ? "顺时针90° · 面积仍6平方格"
            : toggle
              ? "翻折 · 面积仍6平方格"
              : `向右平移${value}格 · 每格边长40绘图单位`,
        )}
      </>
    );
  } else if (k === "cylinder") {
    view = (
      <>
        <path
          d={`M140 ${245 - value * 25}V245 A100 24 0 0 0 340 245V${245 - value * 25}`}
          fill={mint}
          stroke={teal}
          strokeWidth="3"
        />
        {Array.from({ length: value + 1 }, (_, i) => (
          <ellipse
            key={i}
            cx="240"
            cy={245 - i * 25}
            rx="100"
            ry="24"
            fill={i === value ? "#ddede0" : "none"}
            stroke={teal}
            strokeDasharray={i === value ? "" : "4 4"}
          />
        ))}
        {text(240, 40, "底面积 20 cm²")}
        {text(240, 295, "高 " + value + " cm")}
      </>
    );
  } else if (k === "volume") {
    // Three closed, adjoining faces. Hidden cubes are not drawn as open
    // overlapping sheets; the top grid is 4×3 and the height grid is exact.
    const point = (x: number, y: number, z: number) => [
      240 + 30 * x - 30 * y,
      45 + 12 * x + 12 * y + 25 * (value - z),
    ];
    const face = (vertices: number[][], fill: string, key: string) => (
      <polygon
        key={key}
        points={vertices.map((p) => p.join(",")).join(" ")}
        fill={fill}
        stroke="white"
        strokeWidth="1.3"
      />
    );
    view = (
      <>
        {Array.from({ length: 4 * value }, (_, i) => {
          const x = i % 4,
            z = Math.floor(i / 4);
          return face(
            [
              point(x, 3, z),
              point(x + 1, 3, z),
              point(x + 1, 3, z + 1),
              point(x, 3, z + 1),
            ],
            mint,
            "front" + i,
          );
        })}
        {Array.from({ length: 3 * value }, (_, i) => {
          const y = i % 3,
            z = Math.floor(i / 3);
          return face(
            [
              point(4, y, z),
              point(4, y + 1, z),
              point(4, y + 1, z + 1),
              point(4, y, z + 1),
            ],
            teal,
            "side" + i,
          );
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const x = i % 4,
            y = Math.floor(i / 4);
          return face(
            [
              point(x, y, value),
              point(x + 1, y, value),
              point(x + 1, y + 1, value),
              point(x, y + 1, value),
            ],
            "#d5e5c4",
            "top" + i,
          );
        })}
        {text(240, 295, `每层4×3，${value}层`)}
      </>
    );
  } else if (k === "tree") {
    view = (
      <>
        {text(40, 150, "起点")}
        {[0, 1].map((i) => (
          <g key={i}>
            <path
              d={`M65 145L170 ${65 + i * 145}`}
              stroke={teal}
              strokeWidth="3"
            />
            {text(180, 72 + i * 145, String.fromCharCode(65 + i))}
            {Array.from({ length: value }, (_, j) => (
              <g key={j}>
                <path
                  d={`M195 ${65 + i * 145}L335 ${35 + i * 145 + j * 30}`}
                  stroke={line}
                  strokeWidth="2"
                />
                {text(
                  375,
                  42 + i * 145 + j * 30,
                  String.fromCharCode(65 + i) + (j + 1),
                )}
              </g>
            ))}
          </g>
        ))}
      </>
    );
  } else if (k === "dice") {
    view = (
      <>
        {Array.from({ length: 36 }, (_, i) => {
          const a = Math.floor(i / 6) + 1,
            b = (i % 6) + 1;
          return (
            <g key={i}>
              {rect(
                55 + (i % 6) * 62,
                15 + Math.floor(i / 6) * 44,
                60,
                42,
                a + b === value ? teal : "#e9eee5",
              )}
              <text
                x={85 + (i % 6) * 62}
                y={45 + Math.floor(i / 6) * 44}
                textAnchor="middle"
                fontSize="23"
                fill={a + b === value ? "white" : ink}
              >
                {a},{b}
              </text>
            </g>
          );
        })}
      </>
    );
  } else if (k === "animals") {
    view = (
      <>
        {Array.from({ length: 10 }, (_, i) => {
          const x = 30 + (i % 5) * 90,
            y = 55 + Math.floor(i / 5) * 125,
            rabbit = i >= f.a;
          return (
            <g key={i}>
              <ellipse
                cx={x + 25}
                cy={y + 25}
                rx="22"
                ry="18"
                fill={rabbit ? orange : teal}
              />
              {Array.from({ length: rabbit ? 4 : 2 }, (_, j) => (
                <path
                  key={j}
                  d={`M${x + 10 + j * (rabbit ? 10 : 25)} ${y + 37}v20`}
                  stroke={ink}
                  strokeWidth="3"
                />
              ))}
              {text(x + 25, y + 93, rabbit ? "兔" : "鸡")}
            </g>
          );
        })}
      </>
    );
  } else if (k === "drawers") {
    const cols = f.b > 5 ? 6 : f.b;
    view = (
      <>
        {f.parts.map((n, i) => (
          <g key={i}>
            {rect(
              20 + (i % cols) * (440 / cols),
              25 + Math.floor(i / cols) * 130,
              420 / cols,
              110,
              "#e5ece1",
            )}
            {text(
              20 + (i % cols) * (440 / cols) + 210 / cols,
              55 + Math.floor(i / cols) * 130,
              i + 1,
            )}
            {Array.from({ length: Math.min(n, 4) }, (_, j) => (
              <circle
                key={j}
                cx={35 + (i % cols) * (440 / cols) + j * 15}
                cy={95 + Math.floor(i / cols) * 130}
                r="7"
                fill={j ? orange : teal}
              />
            ))}
          </g>
        ))}
      </>
    );
  } else if (k === "combinations") {
    const pts = Array.from({ length: value }, (_, i) => [
      240 + 105 * Math.cos((i / value) * Math.PI * 2),
      150 + 105 * Math.sin((i / value) * Math.PI * 2),
    ]);
    view = (
      <>
        {pts.flatMap(([x, y], i) =>
          pts
            .slice(i + 1)
            .map(([X, Y], j) => (
              <path
                key={`${i}-${j}`}
                d={`M${x} ${y}L${X} ${Y}`}
                stroke={mint}
                strokeWidth="3"
              />
            )),
        )}
        {pts.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="20" fill={teal} />
            <text
              x={x}
              y={y + 8}
              textAnchor="middle"
              fill="white"
              fontSize="24"
            >
              {String.fromCharCode(65 + i)}
            </text>
          </g>
        ))}
      </>
    );
  } else if (k === "period") {
    const colors = ["#a74b20", "#d8ad24", "#3385a8", "#176e62"],
      start = Math.floor((value - 1) / 12) * 12;
    view = (
      <>
        {Array.from({ length: 12 }, (_, i) => (
          <g key={i}>
            <circle
              cx={45 + (i % 6) * 76}
              cy={85 + Math.floor(i / 6) * 105}
              r="22"
              fill={colors[(start + i) % 4]}
              stroke={start + i + 1 === value ? ink : "none"}
              strokeWidth="5"
            />
            {text(
              45 + (i % 6) * 76,
              134 + Math.floor(i / 6) * 105,
              start + i + 1,
            )}
          </g>
        ))}
        {text(240, 290, `第${value}天：${f.labels[f.result]}色`)}
      </>
    );
  } else if (k === "chance") {
    view = (
      <>
        {Array.from({ length: value + 3 }, (_, i) => (
          <circle
            key={i}
            cx={80 + (i % 5) * 75}
            cy={80 + Math.floor(i / 5) * 90}
            r="24"
            fill={i < value ? orange : "#39789b"}
          />
        ))}
        {text(240, 290, `红${value}，蓝3；每球等可能`)}
      </>
    );
  } else if (k === "percent" || k === "land") {
    view = (
      <>
        {Array.from({ length: 100 }, (_, i) =>
          rect(
            120 + (i % 10) * 24,
            10 + Math.floor(i / 10) * 24,
            23,
            23,
            k === "land" || i < value ? teal : "#e7eee3",
            i,
          ),
        )}
        {text(
          240,
          292,
          k === "land"
            ? value
              ? "1000 m × 1000 m"
              : "100 m × 100 m"
            : value + " / 100",
        )}
      </>
    );
  } else if (k === "fraction-product") {
    view = (
      <>
        {Array.from({ length: 12 }, (_, i) =>
          rect(
            70 + (i % 4) * 85,
            40 + Math.floor(i / 4) * 70,
            83,
            68,
            i % 4 < 3 ? (Math.floor(i / 4) < value ? teal : mint) : "#eff0e8",
            i,
          ),
        )}
        {text(240, 295, `3/4中的${value}/3：交叠${3 * value}/12`)}
      </>
    );
  } else if (
    k === "equivalent" ||
    k === "fraction-division" ||
    k === "ratio" ||
    k === "decimal-division"
  ) {
    const count =
        k === "equivalent"
          ? value * 2
          : k === "fraction-division"
            ? 8
            : k === "ratio"
              ? 5
              : value,
      filled =
        k === "equivalent"
          ? value
          : k === "fraction-division"
            ? value
            : k === "ratio"
              ? 2
              : value;
    view = (
      <>
        {Array.from({ length: count }, (_, i) =>
          rect(
            35 + (i * 410) / count,
            110,
            410 / count - 1,
            65,
            i < filled ? teal : mint,
            i,
          ),
        )}
        {text(
          240,
          k === "equivalent" ? 92 : 65,
          k === "ratio"
            ? `每格${value}颗`
            : k === "decimal-division"
              ? "每段0.6米"
              : "同一个整体",
        )}
        {text(240, 242, f.formula)}
        {k === "equivalent" && (
          <>
            {rect(35, 20, 205, 45, teal)}
            {rect(240, 20, 205, 45, mint)}
          </>
        )}
      </>
    );
  } else if (k === "product" || k === "decimal-product") {
    const cols = k === "product" ? f.a : value,
      rows = k === "product" ? 6 : 13,
      w = Math.min(410 / cols, 190 / rows),
      h = w;
    view = (
      <>
        {Array.from({ length: cols * rows }, (_, i) =>
          rect(
            (480 - cols * w) / 2 + (i % cols) * w,
            45 + Math.floor(i / cols) * h,
            w,
            h,
            k === "product" && i % cols >= 30 ? orange : teal,
            i,
          ),
        )}
        {text(
          240,
          285,
          k === "product" ? `每排${f.a}个 × 6排` : `${value} × 13个0.01 m²格`,
        )}
      </>
    );
  } else if (k === "division") {
    const groups = Array.from({ length: Math.floor(value / 21) }, () => 21);
    if (value % 21) groups.push(value % 21);
    view = (
      <>
        {groups.map((n, i) => (
          <g
            key={i}
            data-division-group={n}
            transform={`translate(${15 + (i % 3) * 154} ${15 + Math.floor(i / 3) * 145})`}
          >
            <rect
              width="142"
              height="126"
              rx="6"
              fill="none"
              stroke={n === 21 ? teal : orange}
              strokeWidth="2"
              strokeDasharray={n === 21 ? "" : "5 4"}
            />
            {Array.from({ length: n }, (_, j) => (
              <circle
                key={j}
                cx={20 + (j % 7) * 17}
                cy={28 + Math.floor(j / 7) * 22}
                r="5"
                fill={n === 21 ? teal : orange}
              />
            ))}
            {text(71, 110, n === 21 ? "一盒21张" : `余${n}张`)}
          </g>
        ))}
        {text(240, 350, `${Math.floor(value / 21)}盒，余${value % 21}张`)}
      </>
    );
  } else if (k === "parity") {
    const groups = Array.from({ length: Math.ceil(value / 2) }, (_, i) =>
      Math.min(2, value - i * 2),
    );
    view = (
      <>
        {groups.map((n, i) => (
          <g
            data-parity-group={n}
            key={i}
            transform={`translate(${20 + (i % 6) * 74} ${55 + Math.floor(i / 6) * 80})`}
          >
            <rect
              width="64"
              height="52"
              rx="8"
              fill="none"
              stroke={n === 2 ? teal : orange}
            />
            {Array.from({ length: n }, (_, j) => (
              <circle key={j} cx={19 + j * 26} cy="26" r="9" fill={teal} />
            ))}
          </g>
        ))}
        {text(240, 290, `每对2个，余${value % 2}个`)}
      </>
    );
  } else if (k === "factors") {
    view = (
      <>
        {value
          ? Array.from({ length: 23 }, (_, i) =>
              rect(20 + i * 19, 110, 18, 38, teal, i),
            )
          : cells(24, 6)}
        {text(290, 190, value ? "23只能排1×23" : "24可排4×6")}
        {text(
          290,
          240,
          value ? "一排23格，只有1与23两个因数" : "换行数也可以：2×12、3×8",
        )}
      </>
    );
  } else if (k === "proportion") {
    const x = 55 + value * 52;
    view = (
      <>
        <path d="M55 90H425 M55 200H425" stroke={ink} strokeWidth="3" />
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i}>
            <path
              d={`M${55 + i * 52} 85v10 M${55 + i * 52} 195v10`}
              stroke={line}
            />
            {i % 2 === 0 && (
              <>
                {text(55 + i * 52, 70, i)}
                {text(55 + i * 52, 240, i * 5)}
              </>
            )}
          </g>
        ))}
        <path d={`M${x} 90V200`} stroke={orange} strokeDasharray="5 4" />
        <circle cx={x} cy="90" r="8" fill={teal} />
        <circle cx={x} cy="200" r="8" fill={orange} />
        {text(240, 30, "图上：厘米")}
        {text(240, 290, "实地：千米（对应数轴）")}
      </>
    );
  } else if (k === "age" || k === "work") {
    const max = k === "age" ? 32 : k === "work" ? 50 : 35,
      values =
        k === "age"
          ? [f.a, f.b]
          : k === "work"
            ? [6 * value, 4 * value]
            : [value, 5 * value];
    view = (
      <>
        {values.map((n, i) => (
          <g key={i}>
            {rect(50, 70 + i * 90, (n / max) * 360, 45, i ? orange : teal)}
            {text(70 + (n / max) * 360, 103 + i * 90, n, "", "start")}
          </g>
        ))}
        {text(
          240,
          280,
          k === "age"
            ? "两人同时长大"
            : k === "work"
              ? "同样时间，分别完成"
              : "图上厘米 / 实地千米",
        )}
      </>
    );
  } else if (k === "equation") {
    view = (
      <>
        <path d="M60 190H420 M240 190V245H320" stroke={ink} strokeWidth="5" />
        {rect(80, 100, 95, 65, mint)}
        {text(127, 145, "x")}
        {text(240, 140, "＝")}
        {text(350, 140, value ? "12" : "19")}
        {!value && text(190, 140, "+7")}
        {text(240, 280, value ? "两边都减7" : "左右数量相等")}
      </>
    );
  } else if (k === "reverse") {
    view = (
      <>
        {[
          String(f.result),
          `＋${f.parts[0]}`,
          `×${f.parts[1]}`,
          String(value),
        ].map((s, i) => (
          <g key={i}>
            {rect(10 + i * 120, 100, 110, 65, i % 3 ? "#e2ece0" : mint)}
            {text(65 + i * 120, 143, s)}
          </g>
        ))}
        {text(240, 240, `逆着：÷${f.parts[1]}，再−${f.parts[0]}`)}
      </>
    );
  } else if (
    k === "pairs" ||
    k === "sequence" ||
    k === "laws" ||
    k === "digits" ||
    k === "units"
  ) {
    const labels =
      k === "pairs"
        ? ["1", "2", "3", "…", String(value)]
        : k === "sequence"
          ? f.labels
          : k === "laws"
            ? f.parts.map(String)
            : k === "digits"
              ? ["2", "4", String(value)]
              : [String(value), "×1000", String(value * 1000)];
    view = (
      <>
        {labels.map((s, i) => {
          const w = 430 / labels.length;
          return (
            <g key={i}>
              {rect(25 + i * w, 80, w - 5, 65, i % 2 ? mint : "#e6eee1")}
              {text(25 + i * w + (w - 5) / 2, 125, s)}
            </g>
          );
        })}
        {k === "laws" && (
          <path
            d={value ? "M25 165v12h280v-12" : "M170 165v12h280v-12"}
            stroke={orange}
            fill="none"
            strokeWidth="3"
          />
        )}
        {k === "pairs" &&
          ["" + value, "" + (value - 1), "" + (value - 2), "…", "1"].map(
            (s, i) => text(65 + i * 86, 215, s, i),
          )}
        {text(
          240,
          285,
          k === "digits"
            ? "先核对两条整除条件"
            : k === "pairs"
              ? "每列之和都是n+1"
              : k === "units"
                ? "同一质量：左边按千克，右边按克计数"
                : k === "laws"
                  ? "括号只改变组合，三个数没有增减"
                  : "数列每次按同一条规则向前",
        )}
      </>
    );
  } else throw Error("SEMANTIC_SVG_REQUIRED " + k);
  return (
    <svg
      className="semantic-svg"
      viewBox={`0 0 480 ${k === "division" ? 380 : 320}`}
      role="img"
      aria-label={m.problem}
      data-model-drawing={k}
    >
      {view}
    </svg>
  );
}
export default function LegacyLab({ entry }: { entry: LegacyEntry }) {
  const m = modelFor(entry.id),
    [value, setValue] = useState(m.initial),
    [toggle, setToggle] = useState(false),
    [secondary, setSecondary] = useState(2),
    [rotation, setRotation] = useState(false),
    [draws, setDraws] = useState({ red: 0, blue: 0 }),
    f = modelFacts(entry.id, value, toggle, secondary, rotation);
  if (m.kind === "place")
    return (
      <section data-semantic-model={entry.id}>
        <p className="model-question">{m.problem}</p>
        <PlaceValueLab lesson={entry} />
        <p>{m.connection}</p>
      </section>
    );
  return (
    <section
      className="semantic-lab"
      data-semantic-model={entry.id}
      data-model-value={value}
    >
      <p className="model-question">{m.problem}</p>
      <Geometry
        m={m}
        value={value}
        toggle={toggle}
        secondary={secondary}
        rotation={rotation}
      />
      <div className="model-controls">
        <label>
          {m.action}
          <input
            aria-label={m.action}
            type="range"
            min={m.min}
            max={m.max}
            step={m.step}
            value={value}
            onChange={(e) => {
              setValue(Number(e.target.value));
              setDraws({ red: 0, blue: 0 });
            }}
          />
          <output>{modelControlValue(m.id, value)}</output>
        </label>
        {m.kind === "coordinate" && (
          <>
            <label>
              改变纵坐标
              <input
                type="range"
                aria-label="改变纵坐标"
                min="1"
                max="5"
                value={secondary}
                onChange={(e) => setSecondary(Number(e.target.value))}
              />
              <output>{secondary}格</output>
            </label>
            <button aria-pressed={toggle} onClick={() => setToggle(!toggle)}>
              比较交换坐标
            </button>
          </>
        )}
        {m.kind === "motion" && (
          <button
            aria-pressed={rotation}
            onClick={() => {
              setRotation(!rotation);
              setToggle(false);
            }}
          >
            比较旋转90°
          </button>
        )}
        {m.kind === "chance" && (
          <>
            <button
              disabled={draws.red + draws.blue >= 1000}
              onClick={() => {
                const total = value + 3,
                  limit = Math.floor(4294967296 / total) * total;
                let n;
                do {
                  n = crypto.getRandomValues(new Uint32Array(1))[0];
                } while (n >= limit);
                setDraws((d) => ({
                  ...d,
                  [n % total < value ? "red" : "blue"]:
                    d[n % total < value ? "red" : "blue"] + 1,
                }));
              }}
            >
              摸一次，放回袋中
            </button>
            <output aria-live="polite">
              本页摸球 {draws.red + draws.blue} 次：红 {draws.red}，蓝{" "}
              {draws.blue}。实验频率不一定等于理论可能性。
            </output>
          </>
        )}
        {["quad", "motion", "laws"].includes(m.kind) && (
          <button
            className="tool-button"
            aria-pressed={toggle}
            onClick={() => {
              setToggle(!toggle);
              setRotation(false);
            }}
          >
            {m.kind === "quad"
              ? "比较梯形"
              : m.kind === "motion"
                ? "比较翻折"
                : "交换两组"}
          </button>
        )}
        <button
          className="tool-button"
          onClick={() => {
            setValue(m.initial);
            setToggle(false);
            setRotation(false);
            setSecondary(2);
            setDraws({ red: 0, blue: 0 });
          }}
        >
          重置模型
        </button>
      </div>
      <p className="model-equation" data-model-equation>
        {f.formula}
      </p>
      <p className="model-check" data-model-check>
        {f.check}
      </p>
      <details>
        <summary>这幅图和问题怎样对应？</summary>
        <p>{m.connection}</p>
        <p>先指出每个数表示的量，再改变一个条件，最后用反向计算核对。</p>
      </details>
    </section>
  );
}
