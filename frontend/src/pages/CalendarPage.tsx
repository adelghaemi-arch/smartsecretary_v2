import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Link2, MapPin, Pencil, Plus, Users, Video, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "../store/AppStore";
import { useNav } from "../store/Nav";
import { Avatar, Badge, Button, Card, Empty, Field, Modal, Segmented, inputCls, priorityDot, priorityTone } from "../components/ui";
import {
  GREGORIAN_MONTHS_EN,
  JALALI_MONTHS,
  JALALI_MONTHS_EN,
  WEEKDAYS_EN_SHORT,
  WEEKDAYS_FA_SHORT,
  addDays,
  formatDate,
  isoKey,
  jalaliMonthLength,
  localeDigits,
  parseISO,
  persianDayIndex,
  startOfPersianWeek,
  toGregorian,
  toJalali,
} from "../lib/jalali";
import { cn } from "../utils/cn";
import type { Meeting, MeetingKind, Priority } from "../lib/types";

type View = "day" | "week" | "month";

const kindColor: Record<MeetingKind, string> = {
  meeting: "bg-brand-500",
  call: "bg-emerald-500",
  review: "bg-amber-500",
  personal: "bg-fuchsia-500",
  deadline: "bg-rose-500",
};

const kindLabel: Record<MeetingKind, { fa: string; en: string }> = {
  meeting: { fa: "جلسه", en: "Meeting" },
  call: { fa: "تماس", en: "Call" },
  review: { fa: "بازبینی", en: "Review" },
  personal: { fa: "شخصی", en: "Personal" },
  deadline: { fa: "مهلت", en: "Deadline" },
};

export default function CalendarPage() {
  const { t, lang, meetings, tasks, people, concepts, addMeeting, updateMeeting, removeMeeting, pushToast } = useApp();
  const { go, target } = useNav();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [detail, setDetail] = useState<Meeting | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Deep-link: jump to a day or open a meeting straight away
  useEffect(() => {
    if (target.page !== "calendar") return;
    if (target.date) {
      const d = parseISO(target.date);
      setSelected(d);
      setCursor(d);
      setView("day");
    }
    if (target.meetingId) {
      const m = meetings.find((x) => x.id === target.meetingId);
      if (m) {
        setSelected(parseISO(m.date));
        setCursor(parseISO(m.date));
        setDetail(m);
      }
    }
  }, [target, meetings]);
  const num = (n: number | string) => localeDigits(n, lang);
  const todayKey = isoKey(new Date());

  const [form, setForm] = useState({
    title: "",
    date: isoKey(new Date()),
    start: "10:00",
    end: "11:00",
    location: "",
    kind: "meeting" as MeetingKind,
    priority: "medium" as Priority,
    online: false,
    tags: [] as string[],
  });

  const byDay = useMemo(() => {
    const m = new Map<string, Meeting[]>();
    meetings.forEach((x) => {
      const arr = m.get(x.date) ?? [];
      arr.push(x);
      m.set(x.date, arr);
    });
    m.forEach((v) => v.sort((a, b) => a.start.localeCompare(b.start)));
    return m;
  }, [meetings]);

  const tasksByDay = useMemo(() => {
    const m = new Map<string, typeof tasks>();
    tasks.forEach((x) => {
      const arr = m.get(x.due) ?? [];
      arr.push(x);
      m.set(x.due, arr);
    });
    return m;
  }, [tasks]);

  /* ---- month grid (jalali aware) ---- */
  const monthGrid = useMemo(() => {
    if (lang === "fa") {
      const { jy, jm } = toJalali(cursor);
      const first = toGregorian(jy, jm, 1);
      const lead = persianDayIndex(first);
      const len = jalaliMonthLength(jy, jm);
      const cells: { date: Date; out: boolean }[] = [];
      for (let i = lead; i > 0; i--) cells.push({ date: addDays(first, -i), out: true });
      for (let d = 0; d < len; d++) cells.push({ date: addDays(first, d), out: false });
      while (cells.length % 7 !== 0) cells.push({ date: addDays(cells[cells.length - 1].date, 1), out: true });
      while (cells.length < 42) cells.push({ date: addDays(cells[cells.length - 1].date, 1), out: true });
      return cells;
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const lead = persianDayIndex(first);
    const len = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: { date: Date; out: boolean }[] = [];
    for (let i = lead; i > 0; i--) cells.push({ date: addDays(first, -i), out: true });
    for (let d = 0; d < len; d++) cells.push({ date: addDays(first, d), out: false });
    while (cells.length < 42) cells.push({ date: addDays(cells[cells.length - 1].date, 1), out: true });
    return cells;
  }, [cursor, lang]);

  const weekDays = useMemo(() => {
    const s = startOfPersianWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }, [cursor]);

  const shift = (dir: number) => {
    if (view === "day") setCursor((c) => addDays(c, dir));
    else if (view === "week") setCursor((c) => addDays(c, dir * 7));
    else {
      if (lang === "fa") {
        const { jy, jm } = toJalali(cursor);
        let y = jy;
        let m = jm + dir;
        if (m > 12) { m = 1; y++; }
        if (m < 1) { m = 12; y--; }
        setCursor(toGregorian(y, m, Math.min(toJalali(cursor).jd, jalaliMonthLength(y, m))));
      } else {
        setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
      }
    }
  };

  const headTitle = () => {
    if (lang === "fa") {
      const { jy, jm } = toJalali(cursor);
      if (view === "month") return `${JALALI_MONTHS[jm - 1]} ${num(jy)}`;
      if (view === "week") return `${formatDate(weekDays[0], lang, { short: true })} — ${formatDate(weekDays[6], lang, { short: true })}`;
      return formatDate(cursor, lang, { withWeekday: true });
    }
    if (view === "month") return `${GREGORIAN_MONTHS_EN[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === "week") return `${formatDate(weekDays[0], lang, { short: true })} — ${formatDate(weekDays[6], lang, { short: true })}`;
    return formatDate(cursor, lang, { withWeekday: true });
  };

  const Prev = lang === "fa" ? ChevronRight : ChevronLeft;
  const Next = lang === "fa" ? ChevronLeft : ChevronRight;
  const dayNames = lang === "fa" ? WEEKDAYS_FA_SHORT : WEEKDAYS_EN_SHORT;

  const dayEvents = byDay.get(isoKey(selected)) ?? [];
  const dayTasks = tasksByDay.get(isoKey(selected)) ?? [];

  const startEditMeeting = (m: Meeting) => {
    setEditingId(m.id);
    setForm({
      title: lang === "fa" ? m.title : m.titleEn ?? m.title,
      date: m.date,
      start: m.start,
      end: m.end,
      location: m.location,
      kind: m.kind,
      priority: m.priority,
      online: !!m.online,
      tags: [...(m.tags ?? [])],
    });
    setDetail(null);
    setOpen(true);
  };
  const submit = () => {
    if (!form.title.trim()) return;
    if (editingId) {
      updateMeeting(editingId, {
        title: form.title.trim(),
        titleEn: form.title.trim(),
        date: form.date,
        start: form.start,
        end: form.end,
        location: form.location || (lang === "fa" ? "نامشخص" : "TBD"),
        kind: form.kind,
        priority: form.priority,
        online: form.online,
        tags: form.tags,
      });
      pushToast(lang === "fa" ? "رویداد به‌روزرسانی شد" : "Event updated");
    } else {
      addMeeting({
        title: form.title.trim(),
        titleEn: form.title.trim(),
        date: form.date,
        start: form.start,
        end: form.end,
        location: form.location || (lang === "fa" ? "نامشخص" : "TBD"),
        kind: form.kind,
        priority: form.priority,
        attendees: [],
        agenda: "",
        online: form.online,
        tags: form.tags,
      });
      pushToast(lang === "fa" ? "رویداد جدید به تقویم اضافه شد" : "Event added to calendar");
    }
    setOpen(false);
    setEditingId(null);
    setForm({ ...form, title: "", location: "", tags: [] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("cal_title")}</h2>
          <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
            {lang === "fa" ? `امروز: ${formatDate(new Date(), "fa", { withWeekday: true })}` : `Today: ${formatDate(new Date(), "en", { withWeekday: true })}`}
          </p>
        </div>
        <Button variant="primary" onClick={() => { setForm({ ...form, date: isoKey(selected) }); setOpen(true); }}>
          <Plus size={16} /> {lang === "fa" ? "رویداد جدید" : "New event"}
        </Button>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Button size="icon" onClick={() => shift(-1)}><Prev size={16} /></Button>
            <Button size="icon" onClick={() => shift(1)}><Next size={16} /></Button>
            <Button size="sm" onClick={() => { setCursor(new Date()); setSelected(new Date()); }}>{t("today")}</Button>
            <span className="ms-2 text-[14px] font-extrabold text-slate-800 dark:text-white">{headTitle()}</span>
          </div>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "day", label: t("view_day") },
              { value: "week", label: t("view_week") },
              { value: "month", label: t("view_month") },
            ]}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_330px]">
        <Card className="overflow-hidden p-3">
          <AnimatePresence mode="wait">
            {view === "month" && (
              <motion.div key="month" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                <div className="mb-1.5 grid grid-cols-7 gap-1">
                  {dayNames.map((d, i) => (
                    <div key={d} className={cn("py-1.5 text-center text-[11px] font-bold", i === 6 ? "text-rose-400" : "text-slate-400")}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthGrid.map(({ date, out }, i) => {
                    const k = isoKey(date);
                    const evs = byDay.get(k) ?? [];
                    const tks = tasksByDay.get(k) ?? [];
                    const isToday = k === todayKey;
                    const isSel = k === isoKey(selected);
                    const jd = lang === "fa" ? toJalali(date).jd : date.getDate();
                    const fri = persianDayIndex(date) === 6;
                    return (
                      <button
                        key={k + i}
                        onClick={() => { setSelected(date); }}
                        className={cn(
                          "group relative flex min-h-[52px] flex-col gap-0.5 rounded-lg border p-1 text-start transition sm:min-h-[74px] sm:rounded-xl sm:p-1.5 md:min-h-[92px]",
                          out ? "border-transparent opacity-35" : "border-slate-200/70 dark:border-white/[0.06]",
                          !out && "hover:border-brand-300 hover:bg-brand-50/40 dark:hover:border-brand-400/40 dark:hover:bg-brand-500/[0.06]",
                          isSel && "border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/20 dark:border-brand-400 dark:bg-brand-500/10",
                        )}
                      >
                        <span className="flex items-center justify-between">
                          <span
                            className={cn(
                              "grid h-6 min-w-6 place-items-center rounded-lg px-1 text-[11.5px] font-bold",
                              isToday ? "bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow" : fri ? "text-rose-400" : "text-slate-600 dark:text-slate-300",
                            )}
                          >
                            {num(jd)}
                          </span>
                          {(evs.length + tks.length) > 0 && (
                            <span className="text-[9px] font-bold text-slate-400">{num(evs.length + tks.length)}</span>
                          )}
                        </span>
                        <span className="hidden flex-col gap-0.5 overflow-hidden sm:flex">
                          {evs.slice(0, 2).map((e) => (
                            <span key={e.id} className="flex items-center gap-1 truncate rounded-md bg-slate-100 px-1 py-0.5 text-[9.5px] font-semibold text-slate-600 dark:bg-white/[0.07] dark:text-slate-300">
                              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", kindColor[e.kind])} />
                              <span className="truncate">{lang === "fa" ? e.title : e.titleEn ?? e.title}</span>
                            </span>
                          ))}
                          {tks.slice(0, 1).map((tk) => (
                            <span key={tk.id} className="flex items-center gap-1 truncate rounded-md px-1 py-0.5 text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">
                              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", priorityDot[tk.priority])} />
                              <span className="truncate">{lang === "fa" ? tk.title : tk.titleEn ?? tk.title}</span>
                            </span>
                          ))}
                          {evs.length + tks.length > 3 && (
                            <span className="px-1 text-[9px] text-slate-400">+{num(evs.length + tks.length - 3)}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {view === "week" && (
              <motion.div key="week" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="grid grid-cols-7 gap-1.5">
                {weekDays.map((d) => {
                  const k = isoKey(d);
                  const evs = byDay.get(k) ?? [];
                  const isToday = k === todayKey;
                  return (
                    <div key={k} className={cn("flex min-h-[320px] flex-col rounded-xl border p-1.5", isToday ? "border-brand-400 bg-brand-50/40 dark:border-brand-400/50 dark:bg-brand-500/[0.07]" : "border-slate-200/70 dark:border-white/[0.06]")}>
                      <button onClick={() => setSelected(d)} className="mb-1.5 rounded-lg py-1 text-center transition hover:bg-slate-100 dark:hover:bg-white/[0.06]">
                        <div className="text-[10px] font-bold text-slate-400">{dayNames[persianDayIndex(d)]}</div>
                        <div className={cn("text-[15px] font-extrabold", isToday ? "text-brand-600 dark:text-brand-400" : "text-slate-700 dark:text-slate-200")}>
                          {num(lang === "fa" ? toJalali(d).jd : d.getDate())}
                        </div>
                      </button>
                      <div className="scroll-thin flex-1 space-y-1 overflow-y-auto">
                        {evs.map((e) => (
                          <button key={e.id} onClick={() => setDetail(e)} className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-start transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/[0.07] dark:bg-white/[0.04]">
                            <div className="flex items-center gap-1">
                              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", kindColor[e.kind])} />
                              <span className="text-[9.5px] font-bold text-slate-400">{num(e.start)}</span>
                            </div>
                            <div className="mt-0.5 line-clamp-2 text-[10.5px] font-semibold leading-4 text-slate-700 dark:text-slate-200">
                              {lang === "fa" ? e.title : e.titleEn ?? e.title}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {view === "day" && (
              <motion.div key="day" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="scroll-thin max-h-[560px] overflow-y-auto pe-1">
                {Array.from({ length: 13 }, (_, i) => i + 7).map((h) => {
                  const label = `${String(h).padStart(2, "0")}:00`;
                  const evs = (byDay.get(isoKey(cursor)) ?? []).filter((e) => Number(e.start.split(":")[0]) === h);
                  return (
                    <div key={h} className="flex gap-3 border-b border-dashed border-slate-100 py-2 last:border-0 dark:border-white/[0.05]">
                      <span className="w-12 shrink-0 pt-1 text-[10.5px] font-bold text-slate-400">{num(label)}</span>
                      <div className="flex-1 space-y-1.5">
                        {evs.length === 0 && <div className="h-6 rounded-lg" />}
                        {evs.map((e) => (
                          <button
                            key={e.id}
                            onClick={() => setDetail(e)}
                            className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 text-start transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/[0.07] dark:bg-white/[0.04]"
                          >
                            <span className={cn("absolute inset-y-0 start-0 w-1", kindColor[e.kind])} />
                            <div className="ps-2">
                              <div className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{lang === "fa" ? e.title : e.titleEn ?? e.title}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] text-slate-400">
                                <span className="inline-flex items-center gap-1"><Clock size={10} /> {num(`${e.start} - ${e.end}`)}</span>
                                <span className="inline-flex items-center gap-1"><MapPin size={10} /> {e.location}</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Side agenda */}
        <Card className="flex flex-col p-4">
          <div className="mb-3">
            <div className="text-[11px] font-bold text-slate-400">{t("events_of")}</div>
            <div className="text-[15px] font-extrabold text-slate-800 dark:text-white">{formatDate(selected, lang, { withWeekday: true })}</div>
            {lang === "fa" && (
              <div className="mt-0.5 text-[10.5px] text-slate-400">
                {selected.getDate()} {GREGORIAN_MONTHS_EN[selected.getMonth()]} {selected.getFullYear()}
              </div>
            )}
            {lang === "en" && (
              <div className="mt-0.5 text-[10.5px] text-slate-400">
                {toJalali(selected).jd} {JALALI_MONTHS_EN[toJalali(selected).jm - 1]} {toJalali(selected).jy}
              </div>
            )}
          </div>
          <div className="scroll-thin -mx-1 max-h-[520px] flex-1 space-y-2 overflow-y-auto px-1">
            {dayEvents.length === 0 && dayTasks.length === 0 && <Empty icon={<CalendarDays size={22} />} text={t("no_events")} />}
            {dayEvents.map((e) => (
              <button
                key={e.id}
                onClick={() => setDetail(e)}
                className="relative w-full overflow-hidden rounded-xl border border-slate-200/80 p-3 text-start transition hover:border-brand-300 hover:shadow-md dark:border-white/[0.07] dark:hover:border-brand-400/40"
              >
                <span className={cn("absolute inset-y-0 start-0 w-1", kindColor[e.kind])} />
                <div className="ps-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{lang === "fa" ? e.title : e.titleEn ?? e.title}</span>
                    {e.online && <Video size={13} className="mt-0.5 shrink-0 text-emerald-500" />}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone="slate"><Clock size={10} /> {num(`${e.start} - ${e.end}`)}</Badge>
                    <Badge tone={priorityTone[e.priority]}>{t(`p_${e.priority}`)}</Badge>
                    <Badge tone="brand">{kindLabel[e.kind][lang]}</Badge>
                  </div>
                </div>
              </button>
            ))}
            {dayTasks.map((tk) => (
              <button
                key={tk.id}
                onClick={() => go({ page: "tasks", taskId: tk.id, date: tk.due })}
                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-200 p-2.5 text-start transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-sm dark:border-white/[0.08] dark:hover:border-brand-400/40"
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", priorityDot[tk.priority])} />
                <span className="flex-1 truncate text-[12px] font-semibold text-slate-600 dark:text-slate-300">{lang === "fa" ? tk.title : tk.titleEn ?? tk.title}</span>
                <Badge tone={priorityTone[tk.priority]}>{t(`p_${tk.priority}`)}</Badge>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? (lang === "fa" ? detail.title : detail.titleEn ?? detail.title) : ""}>
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand">{kindLabel[detail.kind][lang]}</Badge>
              <Badge tone={priorityTone[detail.priority]}>{t(`p_${detail.priority}`)}</Badge>
              {detail.online && <Badge tone="emerald"><Video size={10} /> {t("online_meeting")}</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
                <div className="mb-1 text-[10px] font-bold text-slate-400">{lang === "fa" ? "زمان" : "Time"}</div>
                <div className="font-semibold text-slate-700 dark:text-slate-200">{num(`${detail.start} - ${detail.end}`)}</div>
                <div className="mt-0.5 text-[11px] text-slate-400">{formatDate(parseISO(detail.date), lang, { withWeekday: true })}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
                <div className="mb-1 text-[10px] font-bold text-slate-400">{lang === "fa" ? "مکان" : "Location"}</div>
                <div className="font-semibold text-slate-700 dark:text-slate-200">{detail.location}</div>
              </div>
            </div>
            {detail.agenda && (
              <div>
                <div className="mb-1.5 text-[11px] font-bold text-slate-400">{t("agenda")}</div>
                <p className="rounded-xl bg-slate-50 p-3 text-[12.5px] leading-6 text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">{detail.agenda}</p>
              </div>
            )}
            {(detail.tags?.length ?? 0) > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-400"><Link2 size={12} /> {lang === "fa" ? "مفاهیم مرتبط" : "Linked concepts"}</div>
                <div className="flex flex-wrap gap-1.5">
                  {detail.tags!.map((tg) => {
                    const c = concepts.find((x) => x.label === tg);
                    return (
                      <button
                        key={tg}
                        onClick={() => (c ? go({ page: "concepts", conceptId: c.id }) : go({ page: "tasks", concept: tg }))}
                        className={cn(
                          "rounded-lg px-2 py-1 text-[11px] font-semibold transition",
                          c
                            ? "bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/[0.07] dark:text-slate-400",
                        )}
                      >
                        {c ? `${c.emoji} ${tg}` : `#${tg}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {detail.attendees.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-400"><Users size={12} /> {t("attendees")}</div>
                <div className="flex flex-wrap gap-2">
                  {detail.attendees.map((a) => {
                    const p = people.find((x) => x.id === a);
                    if (!p) return null;
                    return (
                      <button
                        key={a}
                        onClick={() => go({ page: "people", personId: p.id })}
                        title={lang === "fa" ? "دیدن پروفایل" : "View profile"}
                        className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pe-3 ps-1 transition hover:bg-brand-100 dark:bg-white/[0.06] dark:hover:bg-brand-500/20"
                      >
                        <Avatar initials={p.initials} color={p.avatarColor} size={24} />
                        <span className="text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">{lang === "fa" ? p.name : p.nameEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button onClick={() => startEditMeeting(detail)}>
                <Pencil size={14} /> {lang === "fa" ? "ویرایش" : "Edit"}
              </Button>
              <Button variant="danger" onClick={() => { removeMeeting(detail.id); setDetail(null); pushToast(lang === "fa" ? "رویداد حذف شد" : "Event removed", "warn"); }}>
                <X size={14} /> {t("delete")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* New event modal */}
      <Modal open={open} onClose={() => { setOpen(false); setEditingId(null); }} title={editingId ? (lang === "fa" ? "ویرایش رویداد" : "Edit event") : (lang === "fa" ? "رویداد جدید" : "New event")}>
        <div className="space-y-3">
          <Field label={lang === "fa" ? "عنوان" : "Title"}>
            <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={lang === "fa" ? "تاریخ" : "Date"}>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
            </Field>
            <Field label={lang === "fa" ? "شروع" : "Start"}>
              <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={inputCls} />
            </Field>
            <Field label={lang === "fa" ? "پایان" : "End"}>
              <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={lang === "fa" ? "مکان" : "Location"}>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} />
            </Field>
            <Field label={lang === "fa" ? "نوع" : "Kind"}>
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as MeetingKind })} className={inputCls}>
                {(Object.keys(kindLabel) as MeetingKind[]).map((k) => (
                  <option key={k} value={k}>{kindLabel[k][lang]}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-white/[0.04]">
            <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">{t("online_meeting")}</span>
            <button
              onClick={() => setForm({ ...form, online: !form.online })}
              className={cn("relative h-6 w-11 rounded-full transition", form.online ? "bg-emerald-500" : "bg-slate-300 dark:bg-white/15")}
            >
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", form.online ? "start-[22px]" : "start-0.5")} />
            </button>
          </div>
          <Field label={lang === "fa" ? "مفاهیم مرتبط" : "Linked concepts"}>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-2 dark:border-white/10 dark:bg-white/[0.04]">
              {concepts.map((c) => {
                const on = form.tags.includes(c.label);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setForm({ ...form, tags: on ? form.tags.filter((x) => x !== c.label) : [...form.tags, c.label] })
                    }
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition",
                      on
                        ? "bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow"
                        : "bg-white text-slate-500 hover:bg-slate-100 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-white/[0.1]",
                    )}
                  >
                    {c.emoji} {lang === "fa" ? c.label : c.labelEn}
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button onClick={() => { setOpen(false); setEditingId(null); }}>{t("cancel")}</Button>
            <Button variant="primary" onClick={submit}>
              {editingId ? <Pencil size={15} /> : <Plus size={15} />} {editingId ? t("save") : t("add")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
