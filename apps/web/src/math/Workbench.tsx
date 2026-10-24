// ADAPT SpatialWorkbench observe + Projection only; no useHandsOn, persistence or grading.
import { useState } from "react";
import { faces, boxFaces } from "./geometry.mjs";
import SolidView from "./SolidView.tsx";
import { useMotionAngle, useMotionValue } from "./motion.ts";
export const views = [
  { id: "front", label: "正前方", azimuth: 0, elevation: 0 },
  { id: "right", label: "右侧", azimuth: 90, elevation: 0 },
  { id: "top", label: "上方", azimuth: 0, elevation: 90 },
] as const;
export interface Exploration {
  azimuth: number;
  elevation: number;
  photos: number[];
}
export const freshExploration = (): Exploration => ({
  azimuth: 35,
  elevation: 25,
  photos: [],
});
function Projection({
  view,
  dimensions,
}: {
  view: (typeof views)[number];
  dimensions: number[];
}) {
  const [w, h, d] = dimensions,
    width = view.id === "right" ? d : w,
    height = view.id === "top" ? d : h,
    face = faces.find(
      (f) => f.id === (view.id === "front" ? 3 : view.id === "right" ? 4 : 1),
    )!;
  return (
    <figure
      className="projection-card"
      data-evidence="projection"
      data-view={view.id}
    >
      <figcaption>{view.label}拍到的照片</figcaption>
      <svg
        viewBox="0 0 150 115"
        role="img"
        aria-label={`${view.label}投影：${face.name}`}
      >
        <rect
          x={75 - width * 20}
          y={56 - height * 20}
          width={width * 40}
          height={height * 40}
          rx="2"
          fill={
            ["#f8edca", "#e7ddef", "#f5ded7", "#dee8f2", "#d6ebe2", "#ebdecc"][
              face.id - 1
            ]
          }
        />
        <text x="75" y="64" textAnchor="middle" fill={face.color} fontSize="24">
          {face.mark}
        </text>
      </svg>
    </figure>
  );
}
export function Workbench({
  value,
  change,
  dimensions,
}: {
  value: Exploration;
  change: (s: Exploration) => void;
  dimensions: [number, number, number];
}) {
  const [duration, setDuration] = useState(0),
    a = useMotionAngle(value.azimuth, duration),
    e = useMotionValue(value.elevation, duration);
  const current = views.find(
    (v) =>
      Math.abs(v.azimuth - value.azimuth) < 1 &&
      Math.abs(v.elevation - value.elevation) < 1,
  );
  const rotate = (azimuth: number, elevation: number) => {
    setDuration(0);
    change({ ...value, azimuth, elevation });
  };
  return (
    <section
      className="hands-on-workbench spatial-workbench"
      data-model="observe"
    >
      <header className="hands-heading">
        <h3>盒子不动，让相机去旅行</h3>
        <p>
          红面朝前、蓝面朝右、星星在上面。拖动相机视角，再正对三个方向拍照。
        </p>
      </header>
      <div className="spatial-layout">
        <div className="hands-stage">
          <SolidView
            solid={boxFaces(...dimensions)}
            azimuth={a}
            elevation={e}
            control={{ azimuth: value.azimuth, elevation: value.elevation }}
            title="固定的红蓝黄三面盒子"
            marked
            onRotate={rotate}
          />
          <div className="observer-strip" data-evidence="observer">
            <b>观察者：相机</b>
            <span data-evidence="direction">
              {current
                ? `正对${current.label}`
                : `绕盒子${Math.round(value.azimuth)}°，抬高${Math.round(value.elevation)}°`}
            </span>
            <small>物体固定在桌上</small>
          </div>
          <div className="view-controls">
            <button
              aria-pressed={!current}
              onClick={() => {
                setDuration(650);
                change({ ...value, azimuth: 35, elevation: 25 });
              }}
            >
              立体观察
            </button>
            {views.map((v) => (
              <button
                key={v.id}
                aria-pressed={current?.id === v.id}
                onClick={() => {
                  setDuration(650);
                  change({
                    ...value,
                    azimuth: v.azimuth,
                    elevation: v.elevation,
                  });
                }}
              >
                从{v.label}看
              </button>
            ))}
          </div>
        </div>
        <aside className="hands-tools">
          <h4>留一张照片</h4>
          <p>先选正前方、右侧或上方，再按拍照。比较的是同一个盒子。</p>
          <button
            disabled={!current || value.photos.length >= 6}
            onClick={() =>
              change({
                ...value,
                photos: [
                  ...value.photos,
                  views.findIndex((v) => v.id === current!.id),
                ],
              })
            }
          >
            拍下当前方向
          </button>
          {value.photos.length > 0 && (
            <div className="photo-shelf" aria-label="本页临时照片">
              {value.photos.map((v, i) => (
                <Projection key={i} view={views[v]} dimensions={dimensions} />
              ))}
            </div>
          )}
          <button
            className="math-reset"
            onClick={() => {
              setDuration(0);
              change(freshExploration());
            }}
          >
            重新开始观察
          </button>
          <p className="math-memory-note">本页探索，刷新后重置。</p>
        </aside>
      </div>
      <p className="hands-notice">
        主画面表示立体物体；下面三张照片是正对各面的投影。看见的部分和物体全部，是两回事。
      </p>
      <div className="projection-row">
        {views.map((v) => (
          <Projection key={v.id} view={v} dimensions={dimensions} />
        ))}
      </div>
    </section>
  );
}
