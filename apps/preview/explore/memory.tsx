import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  appendEvent,
  createProject,
  type ExploreEvent,
  type ExploreProject,
  type SubjectRef,
} from "../../../packages/explore/domain.ts";
import { examples } from "../../../packages/explore/examples.ts";

type Store = {
  projects: ExploreProject[];
  create: (question: string, refs: SubjectRef[]) => string;
  append: (id: string, detail: ExploreEvent["detail"]) => void;
  discard: () => void;
};
const Context = createContext<Store | null>(null);
export function ExploreProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState(examples),
    next = useRef(1);
  const create = (question: string, refs: SubjectRef[]) => {
    const id = "draft-" + next.current++;
    const value = createProject(
      {
        projectId: id,
        learnerId: "demo-learner",
        questionId: "question-" + id,
        question,
        origin: refs.length ? "lesson" : "child",
        subjectRefs: refs,
      },
      new Date().toISOString(),
    );
    setProjects((rows) => [...rows, value]);
    return id;
  };
  const append = (id: string, detail: ExploreEvent["detail"]) => {
    // Validation happens synchronously so the caller can display errors. This
    // adapter has no transport, browser storage, media access or persistence.
    const current = projects.find((p) => p.projectId === id);
    if (!current) throw Error("PROJECT_NOT_FOUND");
    const result = appendEvent(current, {
      recordVersion: 1,
      activityModule: "explore",
      eventId: id + "-event-" + current.revision,
      projectId: id,
      learnerId: current.learnerId,
      expectedRevision: current.revision,
      actor: "child",
      recordedAt: new Date().toISOString(),
      detail,
    });
    setProjects((rows) => rows.map((p) => (p.projectId === id ? result : p)));
  };
  return (
    <Context.Provider
      value={{
        projects,
        create,
        append,
        discard: () => setProjects(examples()),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useExplore() {
  const value = useContext(Context);
  if (!value) throw Error("EXPLORE_PROVIDER_REQUIRED");
  return value;
}
