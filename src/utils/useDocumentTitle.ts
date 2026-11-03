import { useEffect } from "react";

/** Sets the tab's title the way Lightning's root layout does: "<title> · OpenFn Lightning". Puts the old one back on leaving. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const before = document.title;
    document.title = `${title} · OpenFn Lightning`;
    return () => {
      document.title = before;
    };
  }, [title]);
}
