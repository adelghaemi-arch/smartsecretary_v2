import { motion } from "framer-motion";
import {
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  FileText,
  Gauge,
  ListChecks,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Video,
  X,
} from "lucide-react";
import { createContext, useContext, useMemo, useState } from "react";
import { useApp } from "../store/AppStore";
import { useNav } from "../store/Nav";
import { Avatar, Badge, ProgressRing, priorityDot, priorityTone } from "./ui";
import { buildGraph, findConceptNode, neighbors as gNeighbors, topConcepts, type GNode } from "../lib/graph";
import { Constellation, layoutFocus } from "./Constellation";
import { DisambiguationCard, CapabilityCard, DeliverableCard, FollowUpCard } from "./assistantCards";
import {
  GREGORIAN_MONTHS_EN,
  JALALI_MONTHS,
  WEEKDAYS_EN_SHORT,
  WEEKDAYS_FA_SHORT,
  addDays,
  formatDate,
  isoKey,
  jalaliMonthLength,
  localeDigits,
  parseISO,
  persianDayIndex,
  relativeDay,
  toGregorian,
  toJalali,
} from "../lib/jalali";
import { cn } from "../utils/cn";
import type { ExtractedMeeting, ExtractedTask, Widget } from "../lib/types";

export const ChatActionsCtx = createContext<{ ask: (t: string) => void }>({ ask: () => {} });
export const useAsk = () => useContext(ChatActionsCtx).ask;

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-ink-900/60",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

function Head({ icon, title, extra }: { icon: React.ReactNode; title: string; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 px-3.5 py-2.5 dark:border-white/[0.06]">
      <span className="text-brand-500 dark:text-brand-400">{icon}</span>
      <span className="flex-1 truncate text-[12px] font-extrabold text-slate-800 dark:text-slate-100">{title}</span>
      {extra}
    </div>
  );
}

/* ============================ TASKS ============================ */
function TasksWidget({ ids, title }: { ids: string[]; title: string }) {
  const { tasks, people, updateTask, lang, t } = useApp();
  const { go } = useNav();
  const [expanded, setExpanded] = useState(false);
  const num = (v: number | string) => localeDigits(v, lang);
  const list = ids.map((id) => tasks.find((x) => x.id === id)).filter(Boolean) as typeof tasks;
  const shown = expanded ? list : list.slice(0, 5);
  const today = isoKey(new Date());
  if (!list.length) return null;

  return (
    <Frame>
      <Head icon={<ListChecks size={14} />} title={title} extra={<Badge tone="slate">{num(list.length)}</Badge>} />
      <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
        {shown.map((task) => {
          const p = people.find((x) => x.id === task.assignee);
          const late = task.status !== "done" && task.due < today;
          return (
            <div key={task.id} className="group flex items-center gap-2.5 px-3.5 py-2.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
              <button
                onClick={() => updateTask(task.id, { status: task.status === "done" ? "todo" : "done" })}
                className="shrink-0 text-slate-300 transition hover:scale-110 hover:text-emerald-500 dark:text-slate-600"
              >
                {task.status === "done" ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} />}
              </button>
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => go({ page: "tasks", taskId: task.id })}
                  className={cn(
                    "block w-full truncate text-start text-[12.5px] font-semibold text-slate-800 transition hover:text-brand-600 dark:text-slate-100 dark:hover:text-brand-300",
                    task.status === "done" && "text-slate-400 line-through dark:text-slate-500",
                  )}
                >
                  {lang === "fa" ? task.title : task.titleEn ?? task.title}
                </button>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400">
                  <button onClick={() => go({ page: "calendar", date: task.due })} className={cn("inline-flex items-center gap-1 transition hover:text-brand-600", late && "font-bold text-rose-500")}>
                    <Clock size={9} /> {relativeDay(parseISO(task.due), lang)}
                  </button>
                  <span className="inline-flex items-center gap-1">
                    <span className={cn("h-1.5 w-1.5 rounded-full", priorityDot[task.priority])} />
                    {t(`p_${task.priority}`)}
                  </span>
                  {task.project && (
                    <button onClick={() => go({ page: "tasks", concept: task.project })} className="truncate transition hover:text-brand-600">
                      · {task.project}
                    </button>
                  )}
                </div>
              </div>
              {p && (
                <button
                  onClick={() => go({ page: "people", personId: p.id })}
                  title={lang === "fa" ? p.name : p.nameEn}
                  className="block rounded-full transition hover:scale-110"
                >
                  <Avatar initials={p.initials} color={p.avatarColor} size={24} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {list.length > 5 && (
        <button onClick={() => setExpanded((v) => !v)} className="w-full border-t border-slate-100 py-2 text-[11px] font-bold text-brand-600 transition hover:bg-brand-50/50 dark:border-white/[0.06] dark:text-brand-400 dark:hover:bg-brand-500/[0.07]">
          {expanded ? (lang === "fa" ? "بستن" : "Show less") : lang === "fa" ? `نمایش ${num(list.length - 5)} مورد دیگر` : `Show ${list.length - 5} more`}
        </button>
      )}
    </Frame>
  );
}

/* ============================ MEETINGS ============================ */
function MeetingsWidget({ ids, title }: { ids: string[]; title: string }) {
  const { meetings, people, lang } = useApp();
  const { go } = useNav();
  const num = (v: number | string) => localeDigits(v, lang);
  const list = ids.map((id) => meetings.find((m) => m.id === id)).filter(Boolean) as typeof meetings;
  if (!list.length) return null;
  return (
    <Frame>
      <Head icon={<CalendarDays size={14} />} title={title} extra={<Badge tone="slate">{num(list.length)}</Badge>} />
      <div className="space-y-1.5 p-2.5">
        {list.map((m) => (
          <button
            key={m.id}
            onClick={() => go({ page: "calendar", meetingId: m.id, date: m.date })}
            className="relative block w-full overflow-hidden rounded-xl border border-slate-200/80 p-2.5 text-start transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-white/[0.07] dark:hover:border-brand-400/40"
          >
            <span className={cn("absolute inset-y-0 start-0 w-1", priorityDot[m.priority])} />
            <div className="ps-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{lang === "fa" ? m.title : m.titleEn ?? m.title}</span>
                {m.online && <Video size={12} className="mt-0.5 shrink-0 text-emerald-500" />}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-400">
                <span className="font-bold text-slate-500 dark:text-slate-400">{relativeDay(parseISO(m.date), lang)}</span>
                <span className="inline-flex items-center gap-1"><Clock size={9} /> {num(`${m.start} - ${m.end}`)}</span>
                <span className="inline-flex items-center gap-1"><MapPin size={9} /> {m.location}</span>
              </div>
              {m.attendees.length > 0 && (
                <div className="mt-1.5 flex -space-x-2 rtl:space-x-reverse">
                  {m.attendees.map((a) => {
                    const p = people.find((x) => x.id === a);
                    return p ? <Avatar key={a} initials={p.initials} color={p.avatarColor} size={20} ring /> : null;
                  })}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </Frame>
  );
}

/* ============================ AGENDA (day timeline) ============================ */
function AgendaWidget({ date }: { date: string }) {
  const { meetings, tasks, people, lang, updateTask, t } = useApp();
  const { go } = useNav();
  const ask = useAsk();
  const num = (v: number | string) => localeDigits(v, lang);
  const d = parseISO(date);
  const evs = meetings.filter((m) => m.date === date).sort((a, b) => a.start.localeCompare(b.start));
  const tks = tasks.filter((x) => x.due === date && x.status !== "done");

  return (
    <Frame>
      <Head
        icon={<CalendarDays size={14} />}
        title={formatDate(d, lang, { withWeekday: true })}
        extra={
          <button onClick={() => ask(lang === "fa" ? "تقویم این ماه" : "Show calendar")} className="text-[10.5px] font-bold text-brand-600 hover:underline dark:text-brand-400">
            {lang === "fa" ? "تقویم" : "Calendar"}
          </button>
        }
      />
      <div className="p-2.5">
        {evs.length === 0 && tks.length === 0 && (
          <div className="py-6 text-center text-[12px] text-slate-400">{lang === "fa" ? "برنامه‌ای برای این روز نیست 🎉" : "Nothing scheduled 🎉"}</div>
        )}
        <div className="relative space-y-2">
          {evs.length > 0 && <span className="absolute inset-y-1 start-[38px] w-px bg-slate-200 dark:bg-white/10" />}
          {evs.map((m) => (
            <div key={m.id} className="relative flex gap-3">
              <span className="w-[34px] shrink-0 pt-1.5 text-end text-[10.5px] font-extrabold text-slate-500 dark:text-slate-400">{num(m.start)}</span>
              <span className={cn("relative z-10 mt-2.5 h-2 w-2 shrink-0 rounded-full ring-4 ring-white dark:ring-ink-900", priorityDot[m.priority])} />
              <button
                onClick={() => go({ page: "calendar", meetingId: m.id, date: m.date })}
                className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2 text-start transition hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-sm dark:bg-white/[0.04] dark:hover:bg-brand-500/10"
              >
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[12px] font-bold text-slate-800 dark:text-slate-100">{lang === "fa" ? m.title : m.titleEn ?? m.title}</span>
                  {m.online && <Video size={11} className="shrink-0 text-emerald-500" />}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                  <span>{num(`${m.start} - ${m.end}`)}</span>
                  <span className="inline-flex items-center gap-1"><MapPin size={9} /> {m.location}</span>
                  {m.attendees.length > 0 && <span className="inline-flex items-center gap-1"><Users size={9} /> {num(m.attendees.length)}</span>}
                </div>
              </button>
            </div>
          ))}
        </div>
        {tks.length > 0 && (
          <div className="mt-3 space-y-1 border-t border-dashed border-slate-200 pt-2.5 dark:border-white/[0.08]">
            <div className="mb-1 text-[10px] font-bold text-slate-400">{lang === "fa" ? "کارهای این روز" : "Tasks due"}</div>
            {tks.map((x) => {
              const p = people.find((y) => y.id === x.assignee);
              return (
                <div key={x.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                  <button onClick={() => updateTask(x.id, { status: "done" })} className="shrink-0 text-slate-300 transition hover:text-emerald-500 dark:text-slate-600">
                    <Circle size={15} />
                  </button>
                  <span className="flex-1 truncate text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">{lang === "fa" ? x.title : x.titleEn ?? x.title}</span>
                  <Badge tone={priorityTone[x.priority]}>{t(`p_${x.priority}`)}</Badge>
                  {p && <Avatar initials={p.initials} color={p.avatarColor} size={20} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Frame>
  );
}

/* ============================ CALENDAR ============================ */
function CalendarWidget({ anchor }: { anchor: string }) {
  const { meetings, tasks, lang } = useApp();
  const ask = useAsk();
  const [cursor, setCursor] = useState(parseISO(anchor));
  const num = (v: number | string) => localeDigits(v, lang);
  const todayKey = isoKey(new Date());
  const dayNames = lang === "fa" ? WEEKDAYS_FA_SHORT : WEEKDAYS_EN_SHORT;

  const cells = useMemo(() => {
    if (lang === "fa") {
      const { jy, jm } = toJalali(cursor);
      const first = toGregorian(jy, jm, 1);
      const lead = persianDayIndex(first);
      const len = jalaliMonthLength(jy, jm);
      const out: { date: Date; out: boolean }[] = [];
      for (let i = lead; i > 0; i--) out.push({ date: addDays(first, -i), out: true });
      for (let d = 0; d < len; d++) out.push({ date: addDays(first, d), out: false });
      while (out.length % 7 !== 0) out.push({ date: addDays(out[out.length - 1].date, 1), out: true });
      return out;
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const lead = persianDayIndex(first);
    const len = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const out: { date: Date; out: boolean }[] = [];
    for (let i = lead; i > 0; i--) out.push({ date: addDays(first, -i), out: true });
    for (let d = 0; d < len; d++) out.push({ date: addDays(first, d), out: false });
    while (out.length % 7 !== 0) out.push({ date: addDays(out[out.length - 1].date, 1), out: true });
    return out;
  }, [cursor, lang]);

  const title = lang === "fa" ? `${JALALI_MONTHS[toJalali(cursor).jm - 1]} ${num(toJalali(cursor).jy)}` : `${GREGORIAN_MONTHS_EN[cursor.getMonth()]} ${cursor.getFullYear()}`;
  const Prev = lang === "fa" ? ChevronRight : ChevronLeft;
  const Next = lang === "fa" ? ChevronLeft : ChevronRight;

  const shift = (dir: number) => {
    if (lang === "fa") {
      const { jy, jm } = toJalali(cursor);
      let y = jy;
      let m = jm + dir;
      if (m > 12) { m = 1; y++; }
      if (m < 1) { m = 12; y--; }
      setCursor(toGregorian(y, m, 1));
    } else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
  };

  return (
    <Frame>
      <div className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2 dark:border-white/[0.06]">
        <button onClick={() => shift(-1)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.07]"><Prev size={14} /></button>
        <span className="flex-1 text-center text-[12px] font-extrabold text-slate-800 dark:text-slate-100">{title}</span>
        <button onClick={() => shift(1)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.07]"><Next size={14} /></button>
      </div>
      <div className="p-2.5">
        <div className="mb-1 grid grid-cols-7">
          {dayNames.map((d, i) => (
            <div key={d} className={cn("py-1 text-center text-[9.5px] font-bold", i === 6 ? "text-rose-400" : "text-slate-400")}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map(({ date, out }, i) => {
            const k = isoKey(date);
            const cnt = meetings.filter((m) => m.date === k).length + tasks.filter((x) => x.due === k && x.status !== "done").length;
            const isToday = k === todayKey;
            const jd = lang === "fa" ? toJalali(date).jd : date.getDate();
            return (
              <button
                key={k + i}
                onClick={() => ask(lang === "fa" ? `برنامه ${formatDate(date, "fa")}` : `Plan for ${formatDate(date, "en")}`)}
                className={cn(
                  "relative grid aspect-square place-items-center rounded-lg text-[11px] font-bold transition",
                  out ? "text-slate-300 dark:text-slate-700" : "text-slate-600 hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-brand-500/10",
                  isToday && "bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow",
                )}
              >
                {num(jd)}
                {cnt > 0 && !out && (
                  <span className={cn("absolute bottom-1 h-1 w-1 rounded-full", isToday ? "bg-white" : "bg-brand-500")} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Frame>
  );
}

/* ============================ KPI ============================ */
function KpiWidget() {
  const { tasks, meetings, notebooks, people, lang, t } = useApp();
  const { go } = useNav();
  const num = (v: number | string) => localeDigits(v, lang);
  const done = tasks.filter((x) => x.status === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const today = isoKey(new Date());
  const pages = notebooks.reduce((a, nb) => a + nb.sections.reduce((b, s) => b + s.pages.length, 0), 0);
  const load = people
    .map((p) => ({ p, n: tasks.filter((x) => x.assignee === p.id && x.status !== "done").length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 4);
  const max = Math.max(1, ...load.map((x) => x.n));

  return (
    <Frame>
      <Head icon={<TrendingUp size={14} />} title={lang === "fa" ? "نمای کلی فضای کاری" : "Workspace overview"} />
      <div className="flex items-center gap-4 p-3.5">
        <ProgressRing value={pct} size={66} stroke={7} label={num(pct)} />
        <div className="grid flex-1 grid-cols-3 gap-2">
          {[
            { l: t("kpi_today_meetings"), v: meetings.filter((m) => m.date === today).length, to: { page: "calendar", date: today } as const },
            { l: t("overdue"), v: tasks.filter((x) => x.status !== "done" && x.due < today).length, to: { page: "tasks" } as const },
            { l: t("kpi_notes"), v: pages, to: { page: "docs" } as const },
          ].map((x) => (
            <button key={x.l} onClick={() => go(x.to)} className="rounded-xl bg-slate-50 p-2 text-center transition hover:-translate-y-0.5 hover:bg-brand-50 dark:bg-white/[0.04] dark:hover:bg-brand-500/10">
              <div className="text-[15px] font-extrabold text-slate-800 dark:text-white">{num(x.v)}</div>
              <div className="truncate text-[9.5px] text-slate-400">{x.l}</div>
            </button>
          ))}
        </div>
      </div>
      {load.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 p-3.5 dark:border-white/[0.06]">
          <div className="text-[10px] font-bold text-slate-400">{t("team_load")}</div>
          {load.map(({ p, n }) => (
            <button key={p.id} onClick={() => go({ page: "tasks", assignee: p.id })} className="flex w-full items-center gap-2 rounded-lg py-0.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.04]">
              <Avatar initials={p.initials} color={p.avatarColor} size={22} />
              <span className="w-24 truncate text-start text-[11px] font-semibold text-slate-600 dark:text-slate-300">{lang === "fa" ? p.name : p.nameEn}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.07]">
                <motion.span initial={{ width: 0 }} animate={{ width: `${(n / max) * 100}%` }} transition={{ duration: 0.6 }} className="block h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500" />
              </span>
              <span className="w-4 text-end text-[10px] font-bold text-slate-400">{num(n)}</span>
            </button>
          ))}
        </div>
      )}
    </Frame>
  );
}

/* ============================ PEOPLE ============================ */
function PeopleWidget({ ids }: { ids: string[] }) {
  const { people, tasks, lang } = useApp();
  const { go } = useNav();
  const ask = useAsk();
  const num = (v: number | string) => localeDigits(v, lang);
  const [all, setAll] = useState(false);
  const list = ids.map((id) => people.find((p) => p.id === id)).filter(Boolean) as typeof people;
  const shown = all ? list : list.slice(0, 4);
  if (!list.length) return null;
  return (
    <Frame>
      <Head icon={<Users size={14} />} title={lang === "fa" ? "مخاطبان" : "Contacts"} extra={<Badge tone="slate">{num(list.length)}</Badge>} />
      <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
        {shown.map((p) => {
          const open = tasks.filter((x) => x.assignee === p.id && x.status !== "done").length;
          return (
            <div key={p.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <button onClick={() => go({ page: "people", personId: p.id })} className="block shrink-0 rounded-full transition hover:scale-105">
                <Avatar initials={p.initials} color={p.avatarColor} size={36} />
              </button>
              <div className="min-w-0 flex-1">
                <button onClick={() => go({ page: "people", personId: p.id })} className="block max-w-full truncate text-start text-[12.5px] font-bold text-slate-800 hover:text-brand-600 dark:text-slate-100">
                  {lang === "fa" ? p.name : p.nameEn}
                </button>
                <div className="truncate text-[10.5px] font-semibold text-brand-600 dark:text-brand-400">{lang === "fa" ? p.role : p.roleEn}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-400">
                  <span className="inline-flex items-center gap-1"><Building2 size={9} /> {p.org}</span>
                  <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 transition hover:text-brand-600"><Mail size={9} /> {p.email}</a>
                  {(p.phones?.[0] ?? p.phone) && (
                    <a href={`tel:${((p.phones?.[0] ?? p.phone) as string).replace(/\s/g, "")}`} dir="ltr" className="inline-flex items-center gap-1 transition hover:text-brand-600">
                      <Phone size={9} /> {p.phones?.[0] ?? p.phone}
                    </a>
                  )}
                </div>
              </div>
              {open > 0 && (
                <button onClick={() => ask(lang === "fa" ? `تسک‌های ${p.name}` : `${p.nameEn}'s tasks`)} className="shrink-0">
                  <Badge tone="brand"><ListChecks size={9} /> {num(open)}</Badge>
                </button>
              )}
            </div>
          );
        })}
      </div>
      {list.length > 4 && (
        <button onClick={() => setAll((v) => !v)} className="w-full border-t border-slate-100 py-2 text-[11px] font-bold text-brand-600 dark:border-white/[0.06] dark:text-brand-400">
          {all ? (lang === "fa" ? "بستن" : "Show less") : lang === "fa" ? `${num(list.length - 4)} نفر دیگر` : `${list.length - 4} more`}
        </button>
      )}
    </Frame>
  );
}

/* ============================ DOC ============================ */
function DocWidget({ nbId, secId, pageId }: { nbId: string; secId: string; pageId: string }) {
  const { notebooks, updatePage, lang, pushToast, t } = useApp();
  const nb = notebooks.find((x) => x.id === nbId);
  const sec = nb?.sections.find((x) => x.id === secId);
  const page = sec?.pages.find((x) => x.id === pageId);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(page?.content ?? "");
  if (!nb || !sec || !page) return null;

  return (
    <Frame>
      <Head
        icon={<FileText size={14} />}
        title={`${page.emoji} ${page.title}`}
        extra={
          <div className="flex items-center gap-1">
            <button onClick={() => updatePage(nb.id, sec.id, page.id, { starred: !page.starred })} className="grid h-6 w-6 place-items-center rounded-md text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.07]">
              <Star size={12} className={cn(page.starred && "fill-amber-400 text-amber-400")} />
            </button>
            {edit ? (
              <button
                onClick={() => { updatePage(nb.id, sec.id, page.id, { content: draft }); setEdit(false); pushToast(t("saved")); }}
                className="rounded-md bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white"
              >
                {t("save")}
              </button>
            ) : (
              <button onClick={() => { setDraft(page.content); setEdit(true); }} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-white/[0.07] dark:text-slate-300">
                {lang === "fa" ? "ویرایش" : "Edit"}
              </button>
            )}
          </div>
        }
      />
      <div className="max-h-72 overflow-y-auto p-3.5 scroll-thin" dir="auto">
        {edit ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-56 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[12px] leading-6 outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
          />
        ) : (
          <div className="space-y-0.5">
            {page.content.split("\n").slice(0, 24).map((line, i) => {
              if (/^#\s/.test(line)) return <div key={i} className="mb-1 text-[14px] font-extrabold text-slate-900 dark:text-white">{line.replace(/^#\s/, "")}</div>;
              if (/^##\s/.test(line)) return <div key={i} className="mt-2 text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{line.replace(/^##\s/, "")}</div>;
              if (/^-\s\[x\]/i.test(line)) return <div key={i} className="flex items-center gap-2 text-[11.5px] text-slate-400 line-through"><span className="grid h-3.5 w-3.5 place-items-center rounded bg-emerald-500 text-white"><Check size={9} /></span>{line.replace(/^-\s\[x\]\s?/i, "")}</div>;
              if (/^-\s\[\s?\]/.test(line)) return <div key={i} className="flex items-center gap-2 text-[11.5px] text-slate-600 dark:text-slate-300"><span className="h-3.5 w-3.5 rounded border-2 border-slate-300 dark:border-white/20" />{line.replace(/^-\s\[\s?\]\s?/, "")}</div>;
              if (/^[-•]\s/.test(line)) return <div key={i} className="flex gap-2 text-[11.5px] leading-6 text-slate-600 dark:text-slate-300"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-500" />{line.replace(/^[-•]\s/, "")}</div>;
              if (!line.trim()) return <div key={i} className="h-1.5" />;
              return <div key={i} className="text-[11.5px] leading-6 text-slate-600 dark:text-slate-300">{line}</div>;
            })}
          </div>
        )}
      </div>
      <div className="border-t border-slate-100 px-3.5 py-2 text-[10px] text-slate-400 dark:border-white/[0.06]">
        {nb.emoji} {nb.title} · {sec.emoji} {sec.title}
      </div>
    </Frame>
  );
}

/* ============================ DOCS TREE ============================ */
function DocsWidget() {
  const { notebooks, lang } = useApp();
  const { go } = useNav();
  const num = (v: number | string) => localeDigits(v, lang);
  return (
    <Frame>
      <Head icon={<BookOpen size={14} />} title={lang === "fa" ? "مرکز اسناد" : "Document center"} />
      <div className="space-y-2 p-2.5">
        {notebooks.map((nb) => (
          <div key={nb.id} className="rounded-xl border border-slate-200/80 p-2.5 dark:border-white/[0.07]">
            <div className="flex items-center gap-2">
              <span className="text-base">{nb.emoji}</span>
              <span className="flex-1 text-[12px] font-bold text-slate-800 dark:text-slate-100">{nb.title}</span>
              <Badge tone="slate">{num(nb.sections.reduce((a, s) => a + s.pages.length, 0))}</Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {nb.sections.flatMap((s) =>
                s.pages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => go({ page: "docs", nbId: nb.id, secId: s.id, pageId: p.id })}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10.5px] font-semibold text-slate-600 transition hover:bg-brand-100 hover:text-brand-700 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-brand-500/20"
                  >
                    <span>{p.emoji}</span> {p.title}
                  </button>
                )),
              )}
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ============================ EXTRACT ============================ */
function ExtractWidget({ w, msgId }: { w: Extract<Widget, { kind: "extract" }>; msgId: string }) {
  const { lang, people, addTask, addMeeting, updateAgentMessage, pushToast, t } = useApp();
  const num = (v: number | string) => localeDigits(v, lang);

  const patch = (tasks: ExtractedTask[], meetings: ExtractedMeeting[]) =>
    updateAgentMessage(msgId, { widget: { ...w, tasks, meetings } });

  const acceptTask = (x: ExtractedTask) => {
    addTask({ title: x.title, titleEn: x.title, status: "todo", priority: x.priority, due: x.due, assignee: x.assignee, tags: [lang === "fa" ? "استخراج AI" : "AI"], source: "ai" });
    patch(w.tasks.map((y) => (y.id === x.id ? { ...y, accepted: true } : y)), w.meetings);
    pushToast(t("ai_saved"));
  };
  const acceptMeeting = (x: ExtractedMeeting) => {
    addMeeting({ title: x.title, titleEn: x.title, date: x.date, start: x.start, end: x.end, location: x.location, kind: "meeting", priority: "medium", attendees: x.attendees, agenda: lang === "fa" ? "استخراج‌شده توسط منشی هوشمند" : "Extracted by SmartSecretary" });
    patch(w.tasks, w.meetings.map((y) => (y.id === x.id ? { ...y, accepted: true } : y)));
    pushToast(t("ai_saved"));
  };
  const acceptAll = () => {
    w.tasks.filter((x) => x.accepted === null).forEach((x) =>
      addTask({ title: x.title, titleEn: x.title, status: "todo", priority: x.priority, due: x.due, assignee: x.assignee, tags: ["AI"], source: "ai" }),
    );
    w.meetings.filter((x) => x.accepted === null).forEach((x) =>
      addMeeting({ title: x.title, titleEn: x.title, date: x.date, start: x.start, end: x.end, location: x.location, kind: "meeting", priority: "medium", attendees: x.attendees }),
    );
    patch(w.tasks.map((x) => ({ ...x, accepted: x.accepted ?? true })), w.meetings.map((x) => ({ ...x, accepted: x.accepted ?? true })));
    pushToast(t("ai_saved"));
  };

  const pending = w.tasks.filter((x) => x.accepted === null).length + w.meetings.filter((x) => x.accepted === null).length;

  return (
    <Frame>
      <div className="border-b border-slate-100 bg-gradient-to-br from-violet-500/10 to-brand-500/10 px-3.5 py-2.5 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-500" />
          <span className="flex-1 text-[12px] font-extrabold text-slate-800 dark:text-slate-100">{t("ai_summary")}</span>
          {pending > 0 && (
            <button onClick={acceptAll} className="rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 px-2.5 py-1 text-[10px] font-bold text-white shadow">
              {t("ai_accept_all")} ({num(pending)})
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[11.5px] leading-6 text-slate-600 dark:text-slate-300">{lang === "fa" ? w.summary : w.summaryEn}</p>
      </div>
      <div className="space-y-1.5 p-2.5">
        {w.tasks.map((x) => (
          <ExtractRow key={x.id} accepted={x.accepted} confidence={x.confidence} num={num}
            onAccept={() => acceptTask(x)}
            onReject={() => patch(w.tasks.map((y) => (y.id === x.id ? { ...y, accepted: false } : y)), w.meetings)}>
            <div className="flex items-center gap-1.5">
              <ListChecks size={12} className="shrink-0 text-amber-500" />
              <span className="truncate text-[12px] font-bold text-slate-800 dark:text-slate-100">{x.title}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge tone={priorityTone[x.priority]}>{t(`p_${x.priority}`)}</Badge>
              <Badge tone="slate"><Clock size={9} /> {relativeDay(parseISO(x.due), lang)}</Badge>
              {x.assignee && (() => {
                const p = people.find((y) => y.id === x.assignee);
                return p ? <Badge tone="brand">{lang === "fa" ? p.name : p.nameEn}</Badge> : null;
              })()}
            </div>
          </ExtractRow>
        ))}
        {w.meetings.map((x) => (
          <ExtractRow key={x.id} accepted={x.accepted} confidence={x.confidence} num={num}
            onAccept={() => acceptMeeting(x)}
            onReject={() => patch(w.tasks, w.meetings.map((y) => (y.id === x.id ? { ...y, accepted: false } : y)))}>
            <div className="flex items-center gap-1.5">
              <CalendarDays size={12} className="shrink-0 text-sky-500" />
              <span className="truncate text-[12px] font-bold text-slate-800 dark:text-slate-100">{x.title}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge tone="brand"><Clock size={9} /> {num(`${x.start} - ${x.end}`)}</Badge>
              <Badge tone="slate">{formatDate(parseISO(x.date), lang, { short: true })}</Badge>
              <Badge tone="emerald"><MapPin size={9} /> {x.location}</Badge>
            </div>
          </ExtractRow>
        ))}
      </div>
    </Frame>
  );
}

function ExtractRow({
  children, accepted, confidence, onAccept, onReject, num,
}: {
  children: React.ReactNode; accepted: boolean | null; confidence: number;
  onAccept: () => void; onReject: () => void; num: (v: number | string) => string;
}) {
  const pct = Math.round(confidence * 100);
  return (
    <div className={cn(
      "flex items-start gap-2 rounded-xl border border-slate-200/80 p-2.5 transition dark:border-white/[0.07]",
      accepted === true && "border-emerald-400/60 bg-emerald-50/40 dark:border-emerald-400/30 dark:bg-emerald-500/[0.06]",
      accepted === false && "opacity-40 grayscale",
    )}>
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className={cn("inline-flex items-center gap-0.5 text-[9.5px] font-bold", pct >= 85 ? "text-emerald-500" : pct >= 70 ? "text-amber-500" : "text-slate-400")}>
          <Gauge size={9} /> {num(pct)}٪
        </span>
        {accepted === null ? (
          <div className="flex gap-1">
            <button onClick={onAccept} className="grid h-6 w-6 place-items-center rounded-md bg-emerald-500 text-white transition hover:brightness-110 active:scale-95"><Check size={12} /></button>
            <button onClick={onReject} className="grid h-6 w-6 place-items-center rounded-md bg-slate-100 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:bg-white/[0.07]"><X size={12} /></button>
          </div>
        ) : accepted ? (
          <Check size={13} className="text-emerald-500" />
        ) : (
          <X size={13} className="text-slate-300" />
        )}
      </div>
    </div>
  );
}

/* ============================ SEARCH ============================ */
function SearchWidget({ q }: { q: string }) {
  const { tasks, meetings, people, notebooks, lang } = useApp();
  const { go } = useNav();
  const s = q.toLowerCase();
  const mt = (v?: string) => (v ?? "").toLowerCase().includes(s);
  const rt = tasks.filter((x) => mt(x.title) || mt(x.titleEn)).slice(0, 4);
  const rm = meetings.filter((x) => mt(x.title) || mt(x.titleEn) || mt(x.location)).slice(0, 3);
  const rp = people.filter((x) => mt(x.name) || mt(x.nameEn) || mt(x.role)).slice(0, 3);
  const rd = notebooks.flatMap((nb) => nb.sections.flatMap((sec) => sec.pages.filter((p) => mt(p.title) || mt(p.content)).map((p) => ({ nb, sec, p })))).slice(0, 3);
  const empty = !rt.length && !rm.length && !rp.length && !rd.length;

  return (
    <Frame>
      <Head icon={<Sparkles size={14} />} title={lang === "fa" ? `نتایج «${q}»` : `Results for "${q}"`} />
      <div className="space-y-1 p-2.5">
        {empty && <div className="py-6 text-center text-[12px] text-slate-400">{lang === "fa" ? "چیزی پیدا نشد" : "No results"}</div>}
        {rt.map((x) => (
          <button key={x.id} onClick={() => go({ page: "tasks", taskId: x.id })} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
            <ListChecks size={12} className="shrink-0 text-amber-500" />
            <span className="flex-1 truncate text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">{lang === "fa" ? x.title : x.titleEn ?? x.title}</span>
            <span className="text-[10px] text-slate-400">{relativeDay(parseISO(x.due), lang)}</span>
          </button>
        ))}
        {rm.map((x) => (
          <button key={x.id} onClick={() => go({ page: "calendar", meetingId: x.id, date: x.date })} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
            <CalendarDays size={12} className="shrink-0 text-sky-500" />
            <span className="flex-1 truncate text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">{lang === "fa" ? x.title : x.titleEn ?? x.title}</span>
            <span className="text-[10px] text-slate-400">{relativeDay(parseISO(x.date), lang)}</span>
          </button>
        ))}
        {rp.map((x) => (
          <button key={x.id} onClick={() => go({ page: "people", personId: x.id })} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
            <Avatar initials={x.initials} color={x.avatarColor} size={20} />
            <span className="flex-1 truncate text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">{lang === "fa" ? x.name : x.nameEn}</span>
            <span className="truncate text-[10px] text-slate-400">{lang === "fa" ? x.role : x.roleEn}</span>
          </button>
        ))}
        {rd.map(({ nb, sec, p }) => (
          <button key={p.id} onClick={() => go({ page: "docs", nbId: nb.id, secId: sec.id, pageId: p.id })} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
            <span className="text-[13px]">{p.emoji}</span>
            <span className="flex-1 truncate text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">{p.title}</span>
            <span className="truncate text-[10px] text-slate-400">{nb.title}</span>
          </button>
        ))}
      </div>
    </Frame>
  );
}

/* ============================ HELP ============================ */
function HelpWidget() {
  const { lang } = useApp();
  const ask = useAsk();
  const items = lang === "fa"
    ? [
        { i: <ListChecks size={14} />, t: "ساخت و بستن تسک", s: "یادم بنداز گزارش فصلی را فردا بفرستم", c: "from-amber-500 to-orange-500" },
        { i: <CalendarDays size={14} />, t: "تنظیم جلسه", s: "دوشنبه ساعت ۱۰ جلسه با علی رضوانی بذار", c: "from-sky-500 to-cyan-500" },
        { i: <Sparkles size={14} />, t: "تحلیل صورت‌جلسه", s: "این متن را تحلیل کن: ...", c: "from-violet-500 to-fuchsia-500" },
        { i: <TrendingUp size={14} />, t: "گزارش و آمار", s: "آمار پیشرفت کارها", c: "from-brand-500 to-indigo-500" },
        { i: <FileText size={14} />, t: "اسناد و یادداشت", s: "یادداشت جدید بساز", c: "from-emerald-500 to-teal-500" },
        { i: <Users size={14} />, t: "مخاطبان و تیم", s: "شماره سارا محمدی", c: "from-rose-500 to-pink-500" },
      ]
    : [
        { i: <ListChecks size={14} />, t: "Create & close tasks", s: "Remind me to send the report tomorrow", c: "from-amber-500 to-orange-500" },
        { i: <CalendarDays size={14} />, t: "Schedule meetings", s: "Schedule a meeting Monday at 10 with Ali", c: "from-sky-500 to-cyan-500" },
        { i: <Sparkles size={14} />, t: "Analyze notes", s: "Analyze this: ...", c: "from-violet-500 to-fuchsia-500" },
        { i: <TrendingUp size={14} />, t: "Reports & stats", s: "Show my progress stats", c: "from-brand-500 to-indigo-500" },
        { i: <FileText size={14} />, t: "Docs & notes", s: "Create a new note", c: "from-emerald-500 to-teal-500" },
        { i: <Users size={14} />, t: "People & team", s: "Sara Mohammadi's contact", c: "from-rose-500 to-pink-500" },
      ];
  return (
    <Frame>
      <div className="grid grid-cols-1 gap-1.5 p-2.5 sm:grid-cols-2">
        {items.map((x) => (
          <button
            key={x.t}
            onClick={() => ask(x.s)}
            className="group flex items-start gap-2.5 rounded-xl border border-slate-200/80 p-2.5 text-start transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-white/[0.07] dark:hover:border-brand-400/40"
          >
            <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white shadow", x.c)}>{x.i}</span>
            <span className="min-w-0">
              <span className="block truncate text-[11.5px] font-bold text-slate-800 dark:text-slate-100">{x.t}</span>
              <span className="block truncate text-[10px] text-slate-400">« {x.s} »</span>
            </span>
          </button>
        ))}
      </div>
    </Frame>
  );
}

/* ============================ RADIAL GRAPH (chat compact) ============================ */
export function RadialGraph({ centerId, onSelect }: { centerId: string; size?: number; onSelect?: (node: GNode) => void }) {
  const app = useApp();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const { nodes, center, edges } = useMemo(() => {
    const g = buildGraph({
      tasks: app.tasks,
      meetings: app.meetings,
      people: app.people,
      notebooks: app.notebooks,
      concepts: app.concepts,
      messages: [],
      agentMessages: [],
      notifications: [],
    } as never);
    return gNeighbors(g, centerId);
  }, [app.tasks, app.meetings, app.notebooks, app.people, app.concepts, centerId]);

  const laid = useMemo(() => (center ? layoutFocus(center, nodes.slice(0, 10), edges) : []), [center, nodes, edges]);
  if (!center) return null;

  return (
    <div className="relative h-[280px] overflow-hidden rounded-xl bg-[#070b18]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(99,102,241,0.28),transparent_60%)]" />
      <Constellation
        laid={laid}
        edges={edges}
        lang={app.lang}
        hoverId={hoverId}
        setHoverId={setHoverId}
        selectedId={centerId}
        onSelect={(n) => onSelect?.(n)}
        compact
      />
    </div>
  );
}

/* ============================ GRAPH WIDGET (chat) ============================ */
function GraphWidget({ center }: { center: string }) {
  const { state, lang } = useAppLocal();
  const ask = useAsk();
  const id = useMemo(() => findConceptNode({ ...state, userTokens: { apiKey: undefined, balance: 0 } } as never, center), [state, center]);
  const { nodes } = useMemo(() => (id ? gNeighbors(buildGraph({ ...state, userTokens: { apiKey: undefined, balance: 0 } } as never), id) : { center: null, nodes: [], edges: [] }), [state, id]);
  if (!id) return null;
  const byKind = (k: GNode["kind"]) => nodes.filter((n) => n.kind === k);

  return (
    <Frame>
      <Head icon={<Sparkles size={14} />} title={lang === "fa" ? "نقشه ارتباطات مفاهیم" : "Concept map"} />
      <div className="grid place-items-center bg-slate-50/50 p-2 dark:bg-white/[0.02]">
        <RadialGraph centerId={id} size={300} onSelect={(n) => ask(lang === "fa" ? `ارتباطات ${n.label}` : `Connections of ${n.labelEn}`)} />
      </div>
      <div className="grid grid-cols-2 gap-2 p-2.5">
        {(["concept", "person", "page", "date"] as const).map((k) => {
          const list = byKind(k);
          if (!list.length) return null;
          const label = lang === "fa" ? { concept: "مفاهیم", person: "افراد", page: "اسناد", date: "زمان‌ها" }[k] : { concept: "Concepts", person: "People", page: "Docs", date: "Dates" }[k];
          return (
            <div key={k} className="rounded-xl bg-slate-50 p-2 dark:bg-white/[0.04]">
              <div className="mb-1 text-[10px] font-bold text-slate-400">{label} · {list.length}</div>
              <div className="flex flex-wrap gap-1">
                {list.slice(0, 4).map((n) => (
                  <button key={n.id} onClick={() => ask(lang === "fa" ? `ارتباطات ${n.label}` : `Connections of ${n.labelEn}`)} className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 shadow-sm transition hover:text-brand-600 dark:bg-white/[0.07] dark:text-slate-300">
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

/* local helper to read full state for graph building */
function useAppLocal() {
  const app = useApp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return { state: { tasks: app.tasks, meetings: app.meetings, people: app.people, notebooks: app.notebooks, concepts: app.concepts, messages: [], agentMessages: [], notifications: [] }, lang: app.lang };
}

/* ============================ CONCEPTS WIDGET ============================ */
function ConceptsWidget() {
  const app = useApp();
  const ask = useAsk();
  const top = useMemo(() => topConcepts({ tasks: app.tasks, meetings: app.meetings, people: app.people, notebooks: app.notebooks, concepts: app.concepts, messages: [], agentMessages: [], notifications: [] } as never).slice(0, 8), [app.tasks, app.meetings, app.notebooks, app.concepts]);
  const groupColor: Record<string, string> = { project: "from-brand-500 to-violet-600", topic: "from-fuchsia-500 to-purple-600", team: "from-sky-500 to-cyan-600", client: "from-amber-500 to-orange-600", event: "from-rose-500 to-pink-600" };
  return (
    <Frame>
      <Head icon={<Sparkles size={14} />} title={app.lang === "fa" ? "مفاهیم و پروژه‌ها" : "Concepts & projects"} />
      <div className="grid grid-cols-1 gap-1.5 p-2.5 sm:grid-cols-2">
        {top.map(({ node, degree }) => (
          <button
            key={node.id}
            onClick={() => ask(app.lang === "fa" ? `ارتباطات ${node.label}` : `Connections of ${node.labelEn}`)}
            className="group flex items-center gap-2.5 rounded-xl border border-slate-200/80 p-2.5 text-start transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-white/[0.07] dark:hover:border-brand-400/40"
          >
            <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-[15px] shadow", groupColor["project"])}>{node.glyph}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-bold text-slate-800 dark:text-slate-100">{app.lang === "fa" ? node.label : node.labelEn}</span>
              <span className="block text-[10px] text-slate-400">{app.lang === "fa" ? `${degree} ارتباط` : `${degree} links`}</span>
            </span>
            <Sparkles size={13} className="shrink-0 text-slate-300 transition group-hover:text-brand-500" />
          </button>
        ))}
      </div>
    </Frame>
  );
}

/* ============================ CREATED ============================ */
function CreatedWidget({ entity, id, nbId, secId }: { entity: string; id?: string; nbId?: string; secId?: string }) {
  const { lang } = useApp();
  const { go } = useNav();
  const open = () => {
    if (entity === "task") go({ page: "tasks", taskId: id });
    else if (entity === "meeting") go({ page: "calendar" });
    else if (entity === "person") go({ page: "people", personId: id });
    else if (entity === "page" && nbId && secId && id) go({ page: "docs", nbId, secId, pageId: id });
  };
  return (
    <Frame className="border-emerald-300/60 bg-emerald-50/50 dark:border-emerald-400/25 dark:bg-emerald-500/[0.07]">
      <button onClick={open} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-start transition hover:bg-emerald-100/60 dark:hover:bg-emerald-500/10">
        <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
        <span className="flex-1 text-[12px] font-bold text-emerald-700 dark:text-emerald-300">
          {lang === "fa" ? `${entity} با موفقیت ثبت شد` : `${entity} saved successfully`}
        </span>
        <span className="text-[10.5px] font-bold text-emerald-600/70 dark:text-emerald-300/70">{lang === "fa" ? "باز کردن" : "Open"}</span>
      </button>
    </Frame>
  );
}

/* ============================ ROUTER ============================ */
export function WidgetView({ widget, msgId }: { widget: Widget; msgId: string }) {
  const { lang } = useApp();
  const ask = useAsk();
  const reply = (text: string) => ask(lang === "fa" ? `ثبت شد: ${text}` : `Done: ${text}`);
  switch (widget.kind) {
    case "disambiguation":
      return <DisambiguationCard w={widget} onDone={reply} />;
    case "capability":
      return <CapabilityCard w={widget} onDone={reply} />;
    case "deliverable":
      return <DeliverableCard w={widget} onDone={reply} />;
    case "followup":
      return <FollowUpCard w={widget} onDone={reply} />;
    case "tasks":
      return <TasksWidget ids={widget.ids} title={lang === "fa" ? widget.title : widget.titleEn} />;
    case "meetings":
      return <MeetingsWidget ids={widget.ids} title={lang === "fa" ? widget.title : widget.titleEn} />;
    case "agenda":
      return <AgendaWidget date={widget.date} />;
    case "calendar":
      return <CalendarWidget anchor={widget.anchor} />;
    case "kpi":
      return <KpiWidget />;
    case "people":
      return <PeopleWidget ids={widget.ids} />;
    case "doc":
      return <DocWidget nbId={widget.nbId} secId={widget.secId} pageId={widget.pageId} />;
    case "docs":
      return <DocsWidget />;
    case "extract":
      return <ExtractWidget w={widget} msgId={msgId} />;
    case "search":
      return <SearchWidget q={widget.q} />;
    case "graph":
      return <GraphWidget center={widget.center} />;
    case "concepts":
      return <ConceptsWidget />;
    case "help":
      return <HelpWidget />;
    case "created":
      return <CreatedWidget entity={widget.entity} id={widget.id} nbId={widget.nbId} secId={widget.secId} />;
    default:
      return null;
  }
}


