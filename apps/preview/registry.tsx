import TeachingWidget from "./adapters/source/src/studio/TeachingDiagrams.tsx";
import type { WidgetState } from "./adapters/source/src/studio/types.ts";
import type { FullLesson } from "./contract.ts";
import { adapterFor } from "./registry-meta.ts";
export { adapterFor } from "./registry-meta.ts";
export function Exploration({
  lesson,
  value,
  change,
}: {
  lesson: FullLesson;
  value: WidgetState;
  change: (s: WidgetState) => void;
}) {
  const adapter = adapterFor(lesson);
  return (
    <div data-adapter={adapter.key} data-interactive={adapter.interactive}>
      <TeachingWidget
        kind={lesson.widget}
        value={value}
        onChange={change}
        scenes={lesson.mathScenes}
        lengthScenes={lesson.lengthScenes}
        conceptScenes={lesson.conceptScenes}
      />
    </div>
  );
}
