import { useEffect } from "react";

// Native Ctrl/Cmd+P and the page button use the same lifecycle. Open authored
// teaching details for printing, then restore the child's exact screen state.
export function useTeachingPrint() {
  useEffect(() => {
    let opened: HTMLDetailsElement[] = [];
    const restore = () => {
      for (const node of opened) if (node.isConnected) node.open = false;
      opened = [];
    };
    const prepare = () => {
      if (opened.length) return;
      opened = [
        ...document.querySelectorAll<HTMLDetailsElement>(
          ".reading-article details:not([open])",
        ),
      ];
      for (const node of opened) node.open = true;
    };
    window.addEventListener("beforeprint", prepare);
    window.addEventListener("afterprint", restore);
    return () => {
      restore();
      window.removeEventListener("beforeprint", prepare);
      window.removeEventListener("afterprint", restore);
    };
  }, []);
}
