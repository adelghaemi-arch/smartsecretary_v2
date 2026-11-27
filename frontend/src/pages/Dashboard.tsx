import { motion } from "framer-motion";
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  FolderOpen,
  Mic,
  NotebookPen,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { useApp } from "../store/AppStore";
import { useNav } from "../store/Nav";
import { Avatar, Badge, Card, Empty, ProgressRing, SectionTitle, priorityDot, priorityTone } from "../components/ui";
import { addDays, formatDate, isoKey, localeDigits, parseISO, persianDayIndex, relativeDay, WEEKDAYS_FA_SHORT, WEEKDAYS_EN_SHORT } from "../lib/jalali";
import { cn } from "../utils/cn";
import type { PageId } from "../components/Sidebar";
import type { Priority } from "../lib/types";

export default function Dashboard({ setPage }: { setPage: (p: PageId) => void }) {
  const { t, lang, tasks, meetings, notebooks, people, concepts, cycleTaskStatus } = useApp();
  const { go } = useNav();
  const today = isoKey(new Date());
  const num = (n: number | string) => localeDigits(n, lang);

  const done = tasks.filter((x) => x.status === "done").length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const todayMeetings = meetings.filter((m) => m.date === today).sort((a, b) => a.start.localeCompare(b.start));
  const pageCount = notebooks.reduce((a, nb) => a + nb.sections.reduce((b, s) => b + s.pages.length, 0), 0);
  const sectionCount = notebooks.reduce((a, nb) => a + nb.sections.length, 0);
  const overdue = tasks.filter((x) => x.status !== "done" && x.due < today);

  const focus = tasks
    .filter((x) => x.status !== "done" && x.due <= today)
    .sort((a, b) => {
      const rank: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return rank[a.priority] - rank[b.priority] || a.due.localeCompare(b.due);
    })
    .slice(0, 5);

  const upcoming = [...meetings]
    .filter((m) => m.date >= today)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    .slice(0, 4);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("greeting_morning") : hour < 18 ? t("greeting_afternoon") : t("greeting_evening");

  // weekly activity: last 7 days completed vs created
  const week = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 6));
  const shortDays = lang === "fa" ? WEEKDAYS_FA_SHORT : WEEKDAYS_EN_SHORT;
  const weekData = week.map((d) => {
    const k = isoKey(d);
    const c = tasks.filter((x) => x.due === k).length;
    const dn = tasks.filter((x) => x.due === k && x.status === "done").length;
    const mt = meetings.filter((m) => m.date === k).length;
    return { k, label: shortDays[persianDayIndex(d)], total: c + mt, done: dn };
  });
  const maxBar = Math.max(1, ...weekData.map((x) => x.total));

  const teamLoad = people
    .map((p) => ({ p, n: tasks.filter((x) => x.assignee === p.id && x.status !== "done").length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
  const maxLoad = Math.max(1, ...teamLoad.map((x) => x.n));

  const Arrow = lang === "fa" ? ArrowLeft : ArrowRight;

  const kpis: { label: string; value: string; sub: string; icon: typeof TrendingUp; grad: string; ring?: number; to: Parameters<typeof go>[0] }[] = [
    {
      label: t("kpi_progress"),
      value: `${num(progress)}٪`.replace("٪", lang === "fa" ? "٪" : "%"),
      sub: `${num(done)}/${num(tasks.length)} ${t("done_count")}`,
      icon: TrendingUp,
      grad: "from-brand-500 to-violet-600",
      ring: progress,
      to: { page: "tasks" },
    },
    {
      label: t("kpi_today_meetings"),
      value: num(todayMeetings.length),
      sub: todayMeetings[0] ? `${t("upcoming")}: ${todayMeetings[0].start}` : t("no_events"),
      icon: CalendarDays,
      grad: "from-sky-500 to-cyan-500",
      to: { page: "calendar", date: today },
    },
    {
      label: t("kpi_folders"),
      value: num(notebooks.length),
      sub: `${num(sectionCount)} ${t("sections")} · ${num(pageCount)} ${t("pages")}`,
      icon: FolderOpen,
      grad: "from-amber-500 to-orange-500",
      to: { page: "docs" },
    },
    {
      label: t("kpi_notes"),
      value: num(pageCount),
      sub: `${num(overdue.length)} ${t("overdue")}`,
      icon: NotebookPen,
      grad: "from-emerald-500 to-teal-500",
      to: overdue.length ? { page: "tasks", date: overdue[0].due } : { page: "tasks" },
    },
  ];

  const aiTools = [
    { label: lang === "fa" ? "استخراج تسک از متن" : "Extract tasks from text", icon: Sparkles, page: "ai" as PageId, grad: "from-violet-500 to-fuchsia-500" },
    { label: lang === "fa" ? "خلاصه‌سازی صورت‌جلسه" : "Summarize meeting notes", icon: FileText, page: "ai" as PageId, grad: "from-brand-500 to-blue-500" },
    { label: lang === "fa" ? "دستور صوتی به منشی" : "Voice command", icon: Mic, page: "chat" as PageId, grad: "from-rose-500 to-pink-500" },
    { label: lang === "fa" ? "چت با منشی هوشمند" : "Chat with secretary", icon: Zap, page: "chat" as PageId, grad: "from-emerald-500 to-teal-500" },
  ];

  return (
    <div className="space-y-5">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 p-4 text-white shadow-xl shadow-brand-900/20 sm:rounded-3xl sm:p-8 dark:border-white/10"
      >
        <div className="grid-bg absolute inset-0 opacity-25" />
        <div className="absolute -top-24 -end-16 h-64 w-64 animate-[float_7s_ease-in-out_infinite] rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-28 start-10 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <Badge className="mb-3 border border-white/25 bg-white/15 text-white backdrop-blur">
              <Sparkles size={11} /> {formatDate(new Date(), lang, { withWeekday: true })}
            </Badge>
            <h1 className="text-balance text-xl font-extrabold tracking-tight sm:text-3xl">
              {greeting}، {lang === "fa" ? "شیدا 👋" : "Sheida 👋"}
            </h1>
            <p className="mt-2 max-w-lg text-[13px] leading-6 text-white/80">{t("dash_sub")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setPage("ai")}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-brand-700 shadow-lg transition hover:shadow-xl active:scale-95"
              >
                <Sparkles size={15} /> {t("ai_analyze")}
              </button>
              <button
                onClick={() => setPage("calendar")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-[13px] font-bold backdrop-blur transition hover:bg-white/20 active:scale-95"
              >
                <CalendarDays size={15} /> {t("nav_calendar")}
              </button>
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start sm:gap-5">
            <div className="text-center">
              <div className="text-3xl font-extrabold">{num(todayMeetings.length)}</div>
              <div className="text-[11px] text-white/70">{t("kpi_today_meetings")}</div>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-center">
              <div className="text-3xl font-extrabold">{num(focus.length)}</div>
              <div className="text-[11px] text-white/70">{t("today_focus")}</div>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-center">
              <div className="text-3xl font-extrabold text-rose-200">{num(overdue.length)}</div>
              <div className="text-[11px] text-white/70">{t("overdue")}</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.button
            key={k.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => go(k.to)}
            className="block w-full text-start"
          >
            <Card hover className="flex items-center gap-4 p-4">
              <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", k.grad)}>
                <k.icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">{k.label}</div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white">{k.value}</div>
                <div className="truncate text-[10.5px] text-slate-400">{k.sub}</div>
              </div>
              {k.ring !== undefined && <ProgressRing value={k.ring} size={54} stroke={6} label={`${num(k.ring)}`} />}
            </Card>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Focus list */}
        <Card className="xl:col-span-2">
          <div className="p-4">
            <SectionTitle
              icon={<AlarmClock size={16} />}
              title={t("today_focus")}
              action={
                <button onClick={() => setPage("tasks")} className="inline-flex items-center gap-1 text-[11.5px] font-bold text-brand-600 hover:underline dark:text-brand-400">
                  {t("view_all")} <Arrow size={12} />
                </button>
              }
            />
            <div className="mt-3 space-y-2">
              {focus.length === 0 && <Empty icon={<CheckCircle2 size={22} />} text={t("empty_today")} />}
              {focus.map((task, i) => {
                const person = people.find((p) => p.id === task.assignee);
                const late = task.due < today;
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: lang === "fa" ? 12 : -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group flex items-center gap-3 rounded-xl border border-transparent p-2.5 transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-white/[0.08] dark:hover:bg-white/[0.035]"
                  >
                    <button onClick={() => cycleTaskStatus(task.id)} className="shrink-0 text-slate-300 transition hover:text-brand-500 dark:text-slate-600">
                      {task.status === "done" ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Circle size={20} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", priorityDot[task.priority])} />
                        <span className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                          {lang === "fa" ? task.title : task.titleEn ?? task.title}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 ps-3.5 text-[10.5px] text-slate-400">
                        <span className={cn("inline-flex items-center gap-1", late && "font-bold text-rose-500")}>
                          <Clock3 size={11} /> {relativeDay(parseISO(task.due), lang)}
                          {task.time ? ` · ${num(task.time)}` : ""}
                        </span>
                        {task.project && (() => {
                          const c = concepts.find((x) => x.label === task.project);
                          return (
                            <button
                              onClick={(e) => { e.stopPropagation(); c ? go({ page: "concepts", conceptId: c.id }) : go({ page: "tasks", concept: task.project! }); }}
                              className="transition hover:text-brand-600 dark:hover:text-brand-400"
                            >
                              · {c ? `${c.emoji} ` : ""}{task.project}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                    <Badge tone={priorityTone[task.priority]}>{t(`p_${task.priority}`)}</Badge>
                    {person && (
                      <button
                        onClick={() => go({ page: "people", personId: person.id })}
                        title={lang === "fa" ? person.name : person.nameEn}
                        className="block rounded-full transition hover:scale-110"
                      >
                        <Avatar initials={person.initials} color={person.avatarColor} size={28} />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Up next */}
        <Card>
          <div className="p-4">
            <SectionTitle
              icon={<CalendarDays size={16} />}
              title={t("upcoming")}
              action={
                <button onClick={() => setPage("calendar")} className="inline-flex items-center gap-1 text-[11.5px] font-bold text-brand-600 hover:underline dark:text-brand-400">
                  {t("view_all")} <Arrow size={12} />
                </button>
              }
            />
            <div className="mt-3 space-y-2.5">
              {upcoming.length === 0 && <Empty icon={<CalendarDays size={22} />} text={t("no_events")} />}
              {upcoming.map((m) => (
                <button
                  key={m.id}
                  onClick={() => go({ page: "calendar", meetingId: m.id, date: m.date })}
                  className="group relative block w-full overflow-hidden rounded-xl border border-slate-200/80 p-3 text-start transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-white/[0.07] dark:hover:border-brand-400/40"
                >
                  <span className={cn("absolute inset-y-0 start-0 w-1", priorityDot[m.priority])} />
                  <div className="ps-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">
                        {lang === "fa" ? m.title : m.titleEn ?? m.title}
                      </span>
                      {m.online ? (
                        <Video size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                      ) : (
                        <Arrow size={13} className="mt-0.5 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" />
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-slate-400">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">{relativeDay(parseISO(m.date), lang)}</span>
                      <span>{num(`${m.start} - ${m.end}`)}</span>
                      <span className="truncate">{m.location}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex -space-x-2 rtl:space-x-reverse">
                        {m.attendees.slice(0, 4).map((a) => {
                          const p = people.find((x) => x.id === a);
                          return p ? <Avatar key={a} initials={p.initials} color={p.avatarColor} size={22} ring /> : null;
                        })}
                      </div>
                      {m.tags && m.tags.length > 0 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            const c = concepts.find((x) => x.label === m.tags![0]);
                            c ? go({ page: "concepts", conceptId: c.id }) : go({ page: "tasks", concept: m.tags![0] });
                          }}
                          onKeyDown={(e) => e.key === "Enter" && e.stopPropagation()}
                          className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 transition hover:bg-brand-100 hover:text-brand-700 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-brand-500/20"
                        >
                          {concepts.find((x) => x.label === m.tags![0])?.emoji ?? "#"} {m.tags[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* AI quick tools */}
        <Card className="xl:col-span-1">
          <div className="p-4">
            <SectionTitle icon={<Sparkles size={16} />} title={t("quick_ai")} />
            <div className="mt-3 grid grid-cols-1 gap-2">
              {aiTools.map((tool) => (
                <button
                  key={tool.label}
                  onClick={() => setPage(tool.page)}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200/80 p-3 text-start transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-white/[0.07] dark:hover:border-brand-400/40"
                >
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow", tool.grad)}>
                    <tool.icon size={16} />
                  </span>
                  <span className="flex-1 text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{tool.label}</span>
                  <Arrow size={14} className="text-slate-300 transition group-hover:text-brand-500" />
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Weekly activity */}
        <Card className="xl:col-span-1">
          <div className="p-4">
            <SectionTitle icon={<TrendingUp size={16} />} title={t("weekly_activity")} />
            <div className="mt-6 flex h-40 items-end justify-between gap-2">
              {weekData.map((d, i) => (
                <button
                  key={d.k}
                  onClick={() => go({ page: "calendar", date: d.k })}
                  title={`${formatDate(parseISO(d.k), lang, { withWeekday: true })}`}
                  className="group flex flex-1 flex-col items-center gap-2 rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                >
                  <div className="relative flex h-32 w-full items-end justify-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(6, (d.total / maxBar) * 100)}%` }}
                      transition={{ delay: i * 0.06, type: "spring", stiffness: 120, damping: 16 }}
                      className={cn(
                        "relative w-full max-w-[26px] overflow-hidden rounded-lg bg-gradient-to-t",
                        d.k === today ? "from-brand-600 to-violet-400" : "from-slate-200 to-slate-100 dark:from-white/[0.14] dark:to-white/[0.06]",
                      )}
                    >
                      {d.done > 0 && (
                        <span
                          className="absolute inset-x-0 bottom-0 rounded-lg bg-emerald-500/70"
                          style={{ height: `${(d.done / Math.max(1, d.total)) * 100}%` }}
                        />
                      )}
                    </motion.div>
                  </div>
                  <span className={cn("text-[10px] font-bold transition group-hover:text-brand-600", d.k === today ? "text-brand-600 dark:text-brand-400" : "text-slate-400")}>
                    {d.label}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex justify-center gap-4 text-[10.5px] text-slate-400">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-500" /> {t("open_count")}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {t("done_count")}</span>
            </div>
          </div>
        </Card>

        {/* Team load */}
        <Card className="xl:col-span-1">
          <div className="p-4">
            <SectionTitle
              icon={<Users size={16} />}
              title={t("team_load")}
              action={
                <button onClick={() => setPage("people")} className="inline-flex items-center gap-1 text-[11.5px] font-bold text-brand-600 hover:underline dark:text-brand-400">
                  {t("view_all")} <Arrow size={12} />
                </button>
              }
            />
            <div className="mt-4 space-y-3.5">
              {teamLoad.map(({ p, n }, i) => (
                <button
                  key={p.id}
                  onClick={() => go({ page: "tasks", assignee: p.id })}
                  className="group flex w-full items-center gap-3 rounded-xl py-0.5 text-start transition hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                >
                  <Avatar initials={p.initials} color={p.avatarColor} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[12px] font-semibold text-slate-700 transition group-hover:text-brand-600 dark:text-slate-200 dark:group-hover:text-brand-300">
                        {lang === "fa" ? p.name : p.nameEn}
                      </span>
                      <span className="shrink-0 text-[10.5px] font-bold text-slate-400">{num(n)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.07]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(n / maxLoad) * 100}%` }}
                        transition={{ delay: 0.1 + i * 0.07, duration: 0.7 }}
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500"
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
