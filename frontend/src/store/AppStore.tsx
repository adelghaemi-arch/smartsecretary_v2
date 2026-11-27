import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { seedState } from "../lib/mock";
import { lookupAccountByPhones } from "../lib/accounts";
import { makeT, type DictKey } from "../lib/i18n";
import type {
  AgentMessage,
  AppMode,
  AppState,
  ChatMessage,
  Concept,
  Lang,
  Meeting,
  Notebook,
  Notification,
  Person,
  Task,
  Theme,
} from "../lib/types";

const KEY = "smart-secretary:v2";
const PREF_KEY = "smart-secretary:prefs:v2";

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      if (parsed && Array.isArray(parsed.tasks) && Array.isArray(parsed.people)) {
        const seed = seedState();
        const parsedPeople = parsed.people ?? [];
        // Keep newly introduced seed contacts while preserving local edits.
        const mergedPeople = [
          ...seed.people.map((sp) => ({ ...sp, ...(parsedPeople.find((p) => p.id === sp.id) ?? {}) })),
          ...parsedPeople.filter((p) => !seed.people.some((sp) => sp.id === p.id)),
        ].map((p) => {
          const phones = p.phones ?? (p.phone ? [p.phone] : []);
          const account = lookupAccountByPhones(phones);
          return {
            ...p,
            phones,
            accountId: p.accountId ?? account?.accountId,
            connectionStatus: p.connectionStatus ?? (account ? "none" as const : undefined),
          };
        });
        return {
          ...seed,
          ...parsed,
          people: mergedPeople,
          connectionRequests: parsed.connectionRequests?.length ? parsed.connectionRequests : seed.connectionRequests,
        } as AppState;
      }
    }
  } catch {
    /* ignore */
  }
  return seedState();
}

interface Prefs {
  lang: Lang;
  theme: Theme;
  sidebarCollapsed: boolean;
  mode: AppMode;
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      return {
        lang: p.lang === "en" ? "en" : "fa",
        theme: p.theme === "light" ? "light" : "dark",
        sidebarCollapsed: Boolean(p.sidebarCollapsed),
        mode: p.mode === "classic" ? "classic" : "chat",
      };
    }
  } catch {
    /* ignore */
  }
  return { lang: "fa", theme: "dark", sidebarCollapsed: false, mode: "chat" };
}

export interface Toast {
  id: string;
  text: string;
  tone?: "success" | "info" | "warn";
}

interface Ctx extends AppState {
  lang: Lang;
  theme: Theme;
  dir: "rtl" | "ltr";
  sidebarCollapsed: boolean;
  mode: AppMode;
  toasts: Toast[];
  t: (k: DictKey) => string;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  toggleTheme: () => void;
  setTheme: (v: Theme) => void;
  setMode: (m: AppMode) => void;
  setSidebarCollapsed: (v: boolean) => void;
  pushToast: (text: string, tone?: Toast["tone"]) => void;
  addAgentMessage: (m: AgentMessage) => void;
  updateAgentMessage: (id: string, patch: Partial<AgentMessage>) => void;
  clearAgentMessages: () => void;
  // mutations
  addTask: (t: Omit<Task, "id" | "createdAt"> & Partial<Pick<Task, "id" | "createdAt">>) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  cycleTaskStatus: (id: string) => void;
  addMeeting: (m: Omit<Meeting, "id"> & Partial<Pick<Meeting, "id">>) => string;
  updateMeeting: (id: string, patch: Partial<Meeting>) => void;
  removeMeeting: (id: string) => void;
  addPerson: (p: Omit<Person, "id">) => string;
  updatePerson: (id: string, patch: Partial<Person>) => void;
  toggleFavorite: (id: string) => void;
  removePerson: (id: string) => void;
  addConnectionRequest: (personId: string, action: "request" | "disconnect") => void;
  respondConnectionRequest: (requestId: string, accept: boolean) => void;
  addConcept: (c: Omit<Concept, "id" | "related"> & Partial<Pick<Concept, "related">>) => string;
  updateConcept: (id: string, patch: Partial<Concept>) => void;
  removeConcept: (id: string) => void;
  updatePage: (nbId: string, secId: string, pageId: string, patch: { title?: string; content?: string; emoji?: string; starred?: boolean; tags?: string[] }) => void;
  addPage: (nbId: string, secId: string) => string;
  setNotebooks: (nb: Notebook[]) => void;
  toggleConceptLink: (conceptId: string, otherId: string) => void;
  addMessage: (m: Omit<ChatMessage, "id" | "at"> & Partial<Pick<ChatMessage, "id" | "at">>) => void;
  clearMessages: () => void;
  readNotification: (id: string) => void;
  readAllNotifications: () => void;
  pushNotification: (n: Omit<Notification, "id" | "at" | "read">) => void;
  resetAll: () => void;
}

const AppCtx = createContext<Ctx | null>(null);

const uid = () => Math.random().toString(36).slice(2, 10);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    const root = document.documentElement;
    root.classList.toggle("dark", prefs.theme === "dark");
    root.setAttribute("dir", prefs.lang === "fa" ? "rtl" : "ltr");
    root.setAttribute("lang", prefs.lang);
  }, [prefs]);

  const pushToast = useCallback((text: string, tone: Toast["tone"] = "success") => {
    const id = uid();
    setToasts((p) => [...p, { id, text, tone }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 3200);
  }, []);

  const value = useMemo<Ctx>(() => {
    const t = makeT(prefs.lang);
    return {
      ...state,
      lang: prefs.lang,
      theme: prefs.theme,
      dir: prefs.lang === "fa" ? "rtl" : "ltr",
      sidebarCollapsed: prefs.sidebarCollapsed,
      mode: prefs.mode,
      toasts,
      t,
      pushToast,
      setLang: (lang) => setPrefs((p) => ({ ...p, lang })),
      toggleLang: () => setPrefs((p) => ({ ...p, lang: p.lang === "fa" ? "en" : "fa" })),
      toggleTheme: () => setPrefs((p) => ({ ...p, theme: p.theme === "dark" ? "light" : "dark" })),
      setTheme: (theme) => setPrefs((p) => ({ ...p, theme })),
      setMode: (mode) => setPrefs((p) => ({ ...p, mode })),
      setSidebarCollapsed: (v) => setPrefs((p) => ({ ...p, sidebarCollapsed: v })),

      addAgentMessage: (m) => setState((s) => ({ ...s, agentMessages: [...s.agentMessages, m] })),
      updateAgentMessage: (id, patch) =>
        setState((s) => ({ ...s, agentMessages: s.agentMessages.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      clearAgentMessages: () => setState((s) => ({ ...s, agentMessages: [] })),

      addTask: (task) => {
        const id = task.id ?? uid();
        setState((s) => ({
          ...s,
          tasks: [{ createdAt: new Date().toISOString().slice(0, 10), ...task, id } as Task, ...s.tasks],
        }));
        return id;
      },
      updateTask: (id, patch) =>
        setState((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeTask: (id) => setState((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== id) })),
      cycleTaskStatus: (id) =>
        setState((s) => ({
          ...s,
          tasks: s.tasks.map((x) => {
            if (x.id !== id) return x;
            const order: Task["status"][] = ["todo", "doing", "review", "done"];
            const next = order[(order.indexOf(x.status) + 1) % order.length];
            return { ...x, status: next };
          }),
        })),

      addMeeting: (m) => {
        const id = m.id ?? uid();
        setState((s) => {
          const connected = s.people.filter((p) => m.attendees?.includes(p.id) && p.connectionStatus === "connected");
          const delivery = connected.length
            ? [{
                id: uid(),
                type: "system" as const,
                read: false,
                at: new Date().toISOString(),
                title: "دعوت‌نامه ارسال شد",
                titleEn: "Invitations sent",
                body: `اعلان جلسه برای ${connected.map((p) => p.name).join("، ")} ارسال شد.`,
                bodyEn: `Meeting notification sent to ${connected.map((p) => p.nameEn).join(", ")}.`,
              }, ...s.notifications]
            : s.notifications;
          return { ...s, meetings: [...s.meetings, { ...m, id } as Meeting], notifications: delivery };
        });
        return id;
      },
      updateMeeting: (id, patch) =>
        setState((s) => ({ ...s, meetings: s.meetings.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeMeeting: (id) => setState((s) => ({ ...s, meetings: s.meetings.filter((x) => x.id !== id) })),

      addPerson: (p) => {
        const id = uid();
        setState((s) => {
          const hasAccount = Boolean(p.accountId);
          const at = new Date().toISOString();
          return {
            ...s,
            people: [{ ...p, id }, ...s.people],
            notifications: hasAccount
              ? [{
                  id: uid(), type: "ai" as const, read: false, at,
                  title: "اکانت مخاطب پیدا شد", titleEn: "Contact account found",
                  body: `${p.name} در سیستم اکانت دارد. می‌خواهید درخواست اتصال بفرستم؟`,
                  bodyEn: `${p.nameEn} has an account. Would you like to send a connection request?`,
                }, ...s.notifications]
              : s.notifications,
            agentMessages: hasAccount
              ? [...s.agentMessages, {
                  id: uid(), role: "assistant" as const, at,
                  text: prefs.lang === "fa"
                    ? `👤 ${p.name} را از روی شماره موبایل در سیستم پیدا کردم. می‌خواهی درخواست اتصال برایش بفرستم؟`
                    : `👤 I found ${p.nameEn}'s account from their mobile number. Should I send a connection request?`,
                  suggestions: prefs.lang === "fa"
                    ? [`درخواست اتصال به ${p.name} بفرست`, "نه فعلاً", "مخاطبان"]
                    : [`Send a connection request to ${p.nameEn}`, "Not now", "People"],
                }]
              : s.agentMessages,
          };
        });
        return id;
      },
      updatePerson: (id, patch) =>
        setState((s) => ({ ...s, people: s.people.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      toggleFavorite: (id) =>
        setState((s) => ({ ...s, people: s.people.map((x) => (x.id === id ? { ...x, favorite: !x.favorite } : x)) })),
      removePerson: (id) => setState((s) => ({ ...s, people: s.people.filter((x) => x.id !== id) })),

      addConnectionRequest: (personId: string, action: "request" | "disconnect") => {
        if (action === "disconnect") {
          setState((s) => {
            const person = s.people.find((p) => p.id === personId);
            const at = new Date().toISOString();
            return {
              ...s,
              people: s.people.map((p) => (p.id === personId ? { ...p, connectionStatus: "none" as const } : p)),
              connectionRequests: s.connectionRequests.filter((r) => r.personId !== personId),
              notifications: [
                {
                  id: uid(),
                  type: "system" as const,
                  read: false,
                  at,
                  title: "اتصال قطع شد",
                  titleEn: "Connection disconnected",
                  body: `اتصال شما با ${person?.name ?? "مخاطب"} قطع شد و به منشی او هم اطلاع داده شد.`,
                  bodyEn: `Your connection with ${person?.nameEn ?? "contact"} was disconnected and their secretary was notified.`,
                },
                ...s.notifications,
              ],
              agentMessages: person
                ? [
                    ...s.agentMessages,
                    {
                      id: uid(),
                      role: "assistant" as const,
                      at,
                      text:
                        prefs.lang === "fa"
                          ? `🔌 اتصال حساب شما با ${person.name} قطع شد؛ منشی او هم از قطع اتصال مطلع شد. هر وقت خواستید می‌توانید دوباره درخواست اتصال بفرستید.`
                          : `🔌 Your account connection with ${person.nameEn} was disconnected; their secretary has been notified as well. You can send a new request anytime.`,
                      suggestions:
                        prefs.lang === "fa"
                          ? [`درخواست اتصال به ${person.name} بفرست`, "مخاطبان"]
                          : [`Send a connection request to ${person.nameEn}`, "People"],
                    },
                  ]
                : s.agentMessages,
            };
          });
        } else {
          setState((s) => ({
            ...s,
            people: s.people.map((p) => p.id === personId ? { ...p, connectionStatus: "requested" as const } : p),
            connectionRequests: [...s.connectionRequests, {
              id: uid(),
              direction: "outbound" as const,
              personId,
              status: "requested" as const,
              createdAt: new Date().toISOString(),
            }],
            notifications: [{
              id: uid(), type: "system", read: false, at: new Date().toISOString(),
              title: "درخواست اتصال ارسال شد", titleEn: "Connection request sent",
              body: `درخواست برای ${s.people.find((p) => p.id === personId)?.name ?? "مخاطب"} ارسال شد.`,
              bodyEn: `Request sent to ${s.people.find((p) => p.id === personId)?.nameEn ?? "contact"}.`,
            }, ...s.notifications],
          }));
        }
      },
      respondConnectionRequest: (requestId, accept) =>
        setState((s) => {
          const req = s.connectionRequests.find((r) => r.id === requestId);
          if (!req) return s;
          const status = accept ? "connected" as const : "declined" as const;
          const person = s.people.find((p) => p.id === req.personId);
          return {
            ...s,
            people: s.people.map((p) => p.id === req.personId ? { ...p, connectionStatus: status } : p),
            connectionRequests: s.connectionRequests.map((r) => r.id === requestId ? { ...r, status } : r),
            notifications: [{
              id: uid(), type: "system", read: false, at: new Date().toISOString(),
              title: accept ? "اتصال برقرار شد" : "درخواست رد شد",
              titleEn: accept ? "Connection established" : "Request declined",
              body: accept ? `حالا با ${person?.name ?? "مخاطب"} متصل هستید.` : `درخواست ${person?.name ?? "مخاطب"} رد شد.`,
              bodyEn: accept ? `You are now connected to ${person?.nameEn ?? "contact"}.` : `${person?.nameEn ?? "Contact"}'s request was declined.`,
            }, ...s.notifications],
          };
        }),

      addConcept: (c) => {
        const id = uid();
        setState((s) => ({
          ...s,
          concepts: [{ ...c, related: c.related ?? [], id } as Concept, ...s.concepts],
        }));
        return id;
      },
      updateConcept: (id, patch) =>
        setState((s) => {
          const prev = s.concepts.find((c) => c.id === id);
          const nextLabel = patch.label;
          const rename = prev && nextLabel && nextLabel !== prev.label;
          const retag = (tags?: string[]) =>
            rename ? (tags ?? []).map((t) => (t === prev.label ? nextLabel : t)) : tags;
          return {
            ...s,
            concepts: s.concepts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
            tasks: rename
              ? s.tasks.map((t) => ({
                  ...t,
                  tags: retag(t.tags) ?? t.tags,
                  project: t.project === prev.label ? nextLabel : t.project,
                }))
              : s.tasks,
            meetings: rename ? s.meetings.map((m) => ({ ...m, tags: retag(m.tags) })) : s.meetings,
            people: rename ? s.people.map((p) => ({ ...p, tags: retag(p.tags) ?? p.tags })) : s.people,
            notebooks: rename
              ? s.notebooks.map((nb) => ({
                  ...nb,
                  sections: nb.sections.map((sec) => ({
                    ...sec,
                    pages: sec.pages.map((pg) => ({ ...pg, tags: retag(pg.tags) })),
                  })),
                }))
              : s.notebooks,
          };
        }),
      removeConcept: (id) =>
        setState((s) => ({
          ...s,
          concepts: s.concepts.filter((c) => c.id !== id).map((c) => ({ ...c, related: c.related.filter((r) => r !== id) })),
        })),

      updatePage: (nbId, secId, pageId, patch) =>
        setState((s) => ({
          ...s,
          notebooks: s.notebooks.map((nb) =>
            nb.id !== nbId
              ? nb
              : {
                  ...nb,
                  sections: nb.sections.map((sec) =>
                    sec.id !== secId
                      ? sec
                      : {
                          ...sec,
                          pages: sec.pages.map((pg) =>
                            pg.id !== pageId
                              ? pg
                              : { ...pg, ...patch, updatedAt: new Date().toISOString().slice(0, 10) },
                          ),
                        },
                  ),
                },
          ),
        })),
      addPage: (nbId, secId) => {
        const id = uid();
        setState((s) => ({
          ...s,
          notebooks: s.notebooks.map((nb) =>
            nb.id !== nbId
              ? nb
              : {
                  ...nb,
                  sections: nb.sections.map((sec) =>
                    sec.id !== secId
                      ? sec
                      : {
                          ...sec,
                          pages: [
                            ...sec.pages,
                            {
                              id,
                              title: prefs.lang === "fa" ? "صفحه بدون عنوان" : "Untitled page",
                              emoji: "📄",
                              content: prefs.lang === "fa" ? "# عنوان\n\nشروع به نوشتن کنید…" : "# Title\n\nStart writing…",
                              updatedAt: new Date().toISOString().slice(0, 10),
                            },
                          ],
                        },
                  ),
                },
          ),
        }));
        return id;
      },
      setNotebooks: (nb) => setState((s) => ({ ...s, notebooks: nb })),
      toggleConceptLink: (conceptId, otherId) =>
        setState((s) => ({
          ...s,
          concepts: s.concepts.map((c) => {
            if (c.id !== conceptId) return c;
            const has = c.related.includes(otherId);
            return { ...c, related: has ? c.related.filter((x) => x !== otherId) : [...c.related, otherId] };
          }),
        })),

      addMessage: (m) =>
        setState((s) => ({ ...s, messages: [...s.messages, { id: uid(), at: new Date().toISOString(), ...m } as ChatMessage] })),
      clearMessages: () => setState((s) => ({ ...s, messages: [] })),

      readNotification: (id) =>
        setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      readAllNotifications: () =>
        setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      pushNotification: (n) =>
        setState((s) => ({
          ...s,
          notifications: [{ id: uid(), at: new Date().toISOString(), read: false, ...n }, ...s.notifications],
        })),

      resetAll: () => setState(seedState()),
    };
  }, [state, prefs, toasts, pushToast]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
