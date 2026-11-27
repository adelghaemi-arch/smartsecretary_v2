import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

/**
 * Deep-link targets. Every clickable surface in the app resolves to one of these,
 * so a click always lands on real data instead of doing nothing.
 */
export type Target =
  | { page: "dashboard" }
  | { page: "tasks"; taskId?: string; concept?: string; assignee?: string; date?: string; status?: string }
  | { page: "calendar"; date?: string; meetingId?: string }
  | { page: "ai" }
  | { page: "docs"; nbId?: string; secId?: string; pageId?: string; concept?: string }
  | { page: "concepts"; conceptId?: string }
  | { page: "people"; personId?: string; concept?: string }
  | { page: "followups" }
  | { page: "memory" }
  | { page: "skills" }
  | { page: "chat" }
  | { page: "settings" };

interface NavCtx {
  target: Target;
  /** nonce forces consumers to re-run even when navigating to the same page */
  stamp: number;
  go: (t: Target) => void;
}

const Ctx = createContext<NavCtx | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<Target>({ page: "dashboard" });
  const [stamp, setStamp] = useState(0);
  const go = useCallback((t: Target) => {
    setTarget(t);
    setStamp((s) => s + 1);
  }, []);
  return <Ctx.Provider value={{ target, stamp, go }}>{children}</Ctx.Provider>;
}

export function useNav() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNav must be used inside NavProvider");
  return ctx;
}
