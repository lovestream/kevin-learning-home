import { useState } from "react";
import type { Lesson } from "./source/types.ts";
import { placeValueColumns, changeTens } from "./place-value.ts";
export default function PlaceValueLab({ lesson }: { lesson: Lesson }) {
  const initial =
    typeof lesson.labConfig.a === "number" ? lesson.labConfig.a : 346;
  const [value, setValue] = useState(initial),
    columns = placeValueColumns(value),
    terms = columns.filter((c) => c.digit !== 0);
  return (
    <div className="lab-demo place-value-demo" data-place-value={value}>
      <div className="place-columns">
        {columns.map((c) => (
          <section key={c.power}>
            <b>{c.name}位</b>
            <span>{c.digit}</span>
            <div>
              {Array.from({ length: c.digit }, (_, i) => (
                <i className="one" key={i} />
              ))}
            </div>
            <small>每块代表<br /><strong>1{c.name}</strong></small>
          </section>
        ))}
      </div>
      <p>每一列使用自己的计数单位；同样一块不能都当作“一个一”。</p>
      <p className="live-equation compact" data-place-equation>
        {terms.length
          ? terms.map((c, i) => (
              <span key={c.power}>
                {i > 0 ? " ＋ " : ""}
                {c.digit * c.unit}
              </span>
            ))
          : "0"}{" "}
        ＝ <strong>{value}</strong>
      </p>
      <div className="lab-controls">
        <button
          className="tool-button"
          onClick={() => setValue((v) => changeTens(v, -1))}
        >
          十位 −1
        </button>
        <button
          className="tool-button"
          onClick={() => setValue((v) => changeTens(v, 1))}
        >
          十位 ＋1
        </button>
        <button
          className="tool-button"
          onClick={() => setValue((v) => Math.floor(v / 100) * 100 + (v % 10))}
        >
          十位放 0
        </button>
        <button className="tool-button" onClick={() => setValue(initial)}>
          重置
        </button>
      </div>
    </div>
  );
}
