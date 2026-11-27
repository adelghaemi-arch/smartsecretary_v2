import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type FollowStatus = "needs_input" | "waiting" | "scheduled" | "done";
export interface FollowEvent { at: string; text: string }
export interface FollowUp {
  id: string;
  title: string;
  personId?: string;
  personName?: string;
  status: FollowStatus;
  createdAt: string;
  lastPing?: string;
  due?: string;
  channel: "assistant" | "phone" | "message" | "email";
  history: FollowEvent[];
}
export interface Preference { id: string; text: string; pinned: boolean }
export interface Skill {
  id: string;
  title: string;
  kind: "playbook" | "prompt";
  steps: string[];
  enabled: boolean;
  uses: number;
}
export interface ToolConn {
  id: string;
  name: string;
  emoji: string;
  status: "active" | "needs_config" | "offline";
  detail: string;
  lastUsed?: string;
  log: string[];
}
export interface SecretaryLink {
  id: string;
  name: string;
  handle: string;
  org: string;
  status: "connected" | "pending";
  allowCalendar: boolean;
  allowTopics: boolean;
  confirmCommitments: boolean;
}
export interface QueuedCommand { id: string; text: string; at: string; kind: "text" | "voice"; seconds?: number }

interface Ctx {
  followUps: FollowUp[];
  preferences: Preference[];
  skills: Skill[];
  tools: ToolConn[];
  secretaries: SecretaryLink[];
  queue: QueuedCommand[];
  online: boolean;
  addFollowUp: (f: Omit<FollowUp, "id" | "createdAt" | "history">) => void;
  setFollowStatus: (id: string, status: FollowStatus) => void;
  pingFollowUp: (id: string) => void;
  cancelFollowUp: (id: string) => void;
  addPreference: (text: string) => void;
  updatePreference: (id: string, patch: Partial<Preference>) => void;
  removePreference: (id: string) => void;
  addSkill: (s: Omit<Skill, "id" | "uses">) => void;
  toggleSkill: (id: string) => void;
  removeSkill: (id: string) => void;
  addTool: (t: Omit<ToolConn, "id" | "log" | "lastUsed">) => void;
  fixTool: (id: string) => void;
  addSecretary: (s: Omit<SecretaryLink, "id">) => void;
  updateSecretary: (id: string, patch: Partial<SecretaryLink>) => void;
  enqueue: (c: Omit<QueuedCommand, "id" | "at">) => void;
  flushQueue: () => QueuedCommand[];
  clearQueue: () => void;
}

const KEY = "smart-secretary:assistant:v1";
const uid = () => Math.random().toString(36).slice(2, 9);
const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const D = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const seedFollowUps: FollowUp[] = [
  {
    id: "f1", title: "تأیید نهایی پیش‌نویس قرارداد آریانا", personId: "p8", personName: "رضا طاهرپور",
    status: "needs_input", createdAt: ago(58), channel: "assistant", due: D(0),
    history: [
      { at: ago(58), text: "منشی بندهای ۷ و ۱۲ را از قرارداد استخراج و ریسک‌ها را فهرست کرد." },
      { at: ago(22), text: "پیش‌نویس اصلاح‌شده آماده شد؛ منتظر تأیید شما برای ارسال." },
    ],
  },
  {
    id: "f2", title: "دریافت فایل گزارش هزینه‌های فصل", personId: "p2", personName: "علی رضوانی",
    status: "waiting", createdAt: ago(240), lastPing: ago(120), channel: "message",
    history: [
      { at: ago(240), text: "درخواست فایل برای علی رضوانی ارسال شد." },
      { at: ago(120), text: "پیگیری اول انجام شد؛ پاسخی دریافت نشد." },
    ],
  },
  {
    id: "f3", title: "پیگیری مصوبات با منشی دکتر صدر", personId: "p4", personName: "دکتر مهرداد صدر",
    status: "waiting", createdAt: ago(320), lastPing: ago(60), channel: "assistant",
    history: [
      { at: ago(320), text: "پیام به منشی دکتر صدر ارسال شد (صورت‌جلسه هیئت مدیره)." },
      { at: ago(60), text: "منشی ایشان اعلام کرد مصوبات تا فردا نهایی می‌شود." },
    ],
  },
  {
    id: "f4", title: "یادآوری ارسال گزارش هفتگی به تیم", status: "scheduled", createdAt: ago(90), due: D(1), channel: "assistant",
    history: [{ at: ago(90), text: "زمان‌بندی شد برای فردا ساعت ۰۹:۰۰." }],
  },
  {
    id: "f5", title: "خلاصه‌سازی صورت‌جلسه رتروسپکتیو", status: "done", createdAt: ago(1500), channel: "assistant",
    history: [
      { at: ago(1500), text: "فایل جلسه دریافت و متن پیاده‌سازی شد." },
      { at: ago(1420), text: "خلاصه سه‌خطی تولید و برای شما ارسال شد." },
    ],
  },
  {
    id: "f6", title: "هماهنگی زمان جلسه با آریانا", personId: "p9", personName: "آریانا رضایی",
    status: "done", createdAt: ago(2880), channel: "assistant",
    history: [{ at: ago(2880), text: "زمان‌های آزاد رد و بدل شد و جلسه نهایی شد." }],
  },
];

const seedPrefs: Preference[] = [
  { id: "pr1", text: "وقتی می‌گویم «خانم دکتر»، منظورم دکتر مریم فرهی است.", pinned: true },
  { id: "pr2", text: "گزارش‌های روزانه را کوتاه و در ۳ خط بفرست.", pinned: true },
  { id: "pr3", text: "مستندات فنی را با ساختار استاندارد پروژه‌ها بساز (عنوان، هدف، تصمیم‌ها، ریسک).", pinned: false },
  { id: "pr4", text: "هیچ قراری را بدون تأیید من نهایی نکن.", pinned: true },
];

const seedSkills: Skill[] = [
  { id: "s1", title: "تنظیم و هماهنگی جلسه", kind: "playbook", steps: ["پیدا کردن زمان آزاد افراد", "ارسال دعوت‌نامه", "ثبت در تقویم شمسی", "پیگیری تایید"], enabled: true, uses: 42 },
  { id: "s2", title: "خلاصه‌سازی فایل و صورت‌جلسه", kind: "playbook", steps: ["دریافت فایل", "استخراج مصوبات", "ساخت جدول مسئول/مهلت"], enabled: true, uses: 31 },
  { id: "s3", title: "تولید مستند فنی استاندارد", kind: "prompt", steps: ["عنوان و هدف", "تصمیم‌های معماری", "ریسک‌ها", "گام‌های بعدی"], enabled: true, uses: 12 },
  { id: "s4", title: "پیگیری تلفنی", kind: "playbook", steps: ["تماس با مخاطب", "خلاصه مکالمه", "ثبت نتیجه در پیگیری"], enabled: false, uses: 0 },
];

const seedTools: ToolConn[] = [
  { id: "t1", name: "تقویم جلالی", emoji: "🗓️", status: "active", detail: "همگام‌سازی کامل", lastUsed: ago(12), log: ["جلسه هیئت مدیره ثبت شد", "زمان آزاد فردا استعلام شد"] },
  { id: "t2", name: "ایمیل سازمانی", emoji: "✉️", status: "active", detail: "s.moradi@smartsec.ir", lastUsed: ago(180), log: ["خلاصه صورت‌جلسه ارسال شد"] },
  { id: "t3", name: "خط تلفن VoIP", emoji: "📞", status: "needs_config", detail: "شماره اختصاصی تنظیم نشده است", log: ["درخواست تماس ناموفق: ماژول تلفن پیکربندی نشده"] },
  { id: "t4", name: "موتور جست‌وجوی وب", emoji: "🔎", status: "active", detail: "سرچ فارسی + انگلیسی", lastUsed: ago(45), log: ["تحلیل رقبا به‌روزرسانی شد"] },
  { id: "t5", name: "فضای ذخیره‌سازی", emoji: "🗂️", status: "offline", detail: "اتصال قطع است — آخرین تلاش ۲ ساعت پیش", log: ["بایگانی فایل ناموفق"] },
];

const seedSecretaries: SecretaryLink[] = [
  { id: "sec1", name: "منشی دکتر مهرداد صدر", handle: "@sadr.assistant", org: "هیئت مدیره", status: "connected", allowCalendar: true, allowTopics: false, confirmCommitments: true },
  { id: "sec2", name: "منشی آریانا رضایی", handle: "@ariana.assistant", org: "شرکت آریانا", status: "connected", allowCalendar: true, allowTopics: true, confirmCommitments: true },
  { id: "sec3", name: "منشی علی رضوانی", handle: "@rezvani.assistant", org: "واحد فناوری", status: "pending", allowCalendar: false, allowTopics: false, confirmCommitments: true },
];

const defaultState = {
  followUps: seedFollowUps,
  preferences: seedPrefs,
  skills: seedSkills,
  tools: seedTools,
  secretaries: seedSecretaries,
  queue: [] as QueuedCommand[],
};

const CtxA = createContext<Ctx | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...defaultState, ...(JSON.parse(raw) as typeof defaultState) };
    } catch {
      /* ignore */
    }
    return defaultState;
  });
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const addFollowUp = useCallback((f: Omit<FollowUp, "id" | "createdAt" | "history">) => {
    setState((s) => ({
      ...s,
      followUps: [{ ...f, id: uid(), createdAt: new Date().toISOString(), history: [{ at: new Date().toISOString(), text: "پیگیری ایجاد شد." }] }, ...s.followUps],
    }));
  }, []);
  const setFollowStatus = useCallback((id: string, status: FollowStatus) => {
    setState((s) => ({
      ...s,
      followUps: s.followUps.map((f) =>
        f.id === id
          ? { ...f, status, history: [...f.history, { at: new Date().toISOString(), text: status === "done" ? "تکمیل شد." : "وضعیت تغییر کرد." }] }
          : f,
      ),
    }));
  }, []);
  const pingFollowUp = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      followUps: s.followUps.map((f) =>
        f.id === id ? { ...f, lastPing: new Date().toISOString(), history: [...f.history, { at: new Date().toISOString(), text: "پیگیری مجدد ارسال شد." }] } : f,
      ),
    }));
  }, []);
  const cancelFollowUp = useCallback((id: string) => {
    setState((s) => ({ ...s, followUps: s.followUps.filter((f) => f.id !== id) }));
  }, []);

  const addPreference = useCallback((text: string) => {
    setState((s) => ({ ...s, preferences: [{ id: uid(), text, pinned: false }, ...s.preferences] }));
  }, []);
  const updatePreference = useCallback((id: string, patch: Partial<Preference>) => {
    setState((s) => ({ ...s, preferences: s.preferences.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }, []);
  const removePreference = useCallback((id: string) => {
    setState((s) => ({ ...s, preferences: s.preferences.filter((p) => p.id !== id) }));
  }, []);

  const addSkill = useCallback((sk: Omit<Skill, "id" | "uses">) => {
    setState((s) => ({ ...s, skills: [{ ...sk, id: uid(), uses: 0 }, ...s.skills] }));
  }, []);
  const toggleSkill = useCallback((id: string) => {
    setState((s) => ({ ...s, skills: s.skills.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)) }));
  }, []);
  const removeSkill = useCallback((id: string) => {
    setState((s) => ({ ...s, skills: s.skills.filter((x) => x.id !== id) }));
  }, []);

  const addTool = useCallback((t: Omit<ToolConn, "id" | "log" | "lastUsed">) => {
    setState((s) => ({ ...s, tools: [...s.tools, { ...t, id: uid(), log: ["ابزار جدید افزوده شد و در انتظار پیکربندی است."] }] }));
  }, []);
  const fixTool = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      tools: s.tools.map((t) => (t.id === id ? { ...t, status: "active" as const, detail: "پیکربندی شد", lastUsed: new Date().toISOString(), log: ["اتصال با موفقیت تنظیم شد.", ...t.log] } : t)),
    }));
  }, []);

  const addSecretary = useCallback((sec: Omit<SecretaryLink, "id">) => {
    setState((s) => ({ ...s, secretaries: [{ ...sec, id: uid() }, ...s.secretaries] }));
  }, []);
  const updateSecretary = useCallback((id: string, patch: Partial<SecretaryLink>) => {
    setState((s) => ({ ...s, secretaries: s.secretaries.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  }, []);

  const enqueue = useCallback((c: Omit<QueuedCommand, "id" | "at">) => {
    setState((s) => ({ ...s, queue: [...s.queue, { ...c, id: uid(), at: new Date().toISOString() }] }));
  }, []);
  const flushQueue = useCallback(() => {
    const items = state.queue;
    setState((s) => ({ ...s, queue: [] }));
    return items;
  }, [state.queue]);
  const clearQueue = useCallback(() => setState((s) => ({ ...s, queue: [] })), []);

  const value = useMemo<Ctx>(
    () => ({ ...state, online, addFollowUp, setFollowStatus, pingFollowUp, cancelFollowUp, addPreference, updatePreference, removePreference, addSkill, toggleSkill, removeSkill, addTool, fixTool, addSecretary, updateSecretary, enqueue, flushQueue, clearQueue }),
    [state, online, addFollowUp, setFollowStatus, pingFollowUp, cancelFollowUp, addPreference, updatePreference, removePreference, addSkill, toggleSkill, removeSkill, addTool, fixTool, addSecretary, updateSecretary, enqueue, flushQueue, clearQueue],
  );
  return <CtxA.Provider value={value}>{children}</CtxA.Provider>;
}

export function useAssistant() {
  const c = useContext(CtxA);
  if (!c) throw new Error("useAssistant must be used within AssistantProvider");
  return c;
}

export const followMeta: Record<FollowStatus, { fa: string; en: string; tone: string; accent: string }> = {
  needs_input: { fa: "نیازمند توجه من", en: "Needs my input", tone: "amber", accent: "bg-amber-500" },
  waiting: { fa: "در حال پیگیری از دیگران", en: "Waiting on others", tone: "sky", accent: "bg-sky-500" },
  scheduled: { fa: "زمان‌بندی‌شده", en: "Scheduled", tone: "violet", accent: "bg-violet-500" },
  done: { fa: "انجام‌شده", en: "Completed", tone: "emerald", accent: "bg-emerald-500" },
};
