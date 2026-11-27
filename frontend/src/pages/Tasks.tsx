import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, CheckCircle2, Circle, Filter, ListChecks, Pencil, Plus, Search, Sparkles, Trash2, User2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "../store/AppStore";
import { useNav } from "../store/Nav";
import { Avatar, Badge, Button, Card, Empty, Field, Modal, inputCls, priorityDot, priorityTone } from "../components/ui";
import { addDays, formatDate, isoKey, localeDigits, parseISO, relativeDay } from "../lib/jalali";
import { cn } from "../utils/cn";
import type { Priority, TaskStatus } from "../lib/types";

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-2 py-1 text-[10.5px] font-bold text-white shadow-sm">
      {label}
      <button onClick={onClear} className="opacity-70 transition hover:opacity-100">
        <X size={10} />
      </button>
    </span>
  );
}

const COLUMNS: { id: TaskStatus; accent: string }[] = [
  { id: "todo", accent: "bg-slate-400" },
  { id: "doing", accent: "bg-sky-500" },
  { id: "review", accent: "bg-amber-500" },
  { id: "done", accent: "bg-emerald-500" },
];

export default function Tasks() {
  const { t, lang, tasks, people, addTask, updateTask, removeTask, cycleTaskStatus, pushToast, concepts } = useApp();
  const { go, target } = useNav();
  const [q, setQ] = useState("");
  const [prio, setPrio] = useState<Priority | "all">("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [hoverCol, setHoverCol] = useState<TaskStatus | null>(null);
  const [focus, setFocus] = useState<{ taskId?: string; concept?: string; assignee?: string; date?: string }>({});

  useEffect(() => {
    if (target.page !== "tasks") return;
    setFocus({ taskId: target.taskId, concept: target.concept, assignee: target.assignee, date: target.date });
    if (target.concept) setQ(target.concept);
    if (target.status) setPrio("all");
  }, [target]);

  const focusPerson = focus.assignee ? people.find((p) => p.id === focus.assignee) : undefined;
  const num = (n: number | string) => localeDigits(n, lang);
  const today = isoKey(new Date());

  const [form, setForm] = useState({
    title: "",
    priority: "medium" as Priority,
    due: isoKey(addDays(new Date(), 1)),
    assignee: "",
    project: "",
    tags: [] as string[],
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return tasks.filter((x) => {
      const okQ = !s || x.title.toLowerCase().includes(s) || (x.titleEn ?? "").toLowerCase().includes(s) || x.tags.some((tg) => tg.toLowerCase().includes(s));
      const okP = prio === "all" || x.priority === prio;
      const okConcept = !focus.concept || x.tags.some((tg) => tg === focus.concept) || x.project === focus.concept;
      const okAssignee = !focus.assignee || x.assignee === focus.assignee;
      const okDate = !focus.date || x.due === focus.date;
      return okQ && okP && okConcept && okAssignee && okDate;
    });
  }, [tasks, q, prio, focus]);

  const startCreate = () => {
    setEditingId(null);
    setForm({ title: "", priority: "medium", due: isoKey(addDays(new Date(), 1)), assignee: "", project: "", tags: [] });
    setOpen(true);
  };
  const startEditTask = (task: (typeof tasks)[number]) => {
    setEditingId(task.id);
    setForm({
      title: lang === "fa" ? task.title : task.titleEn ?? task.title,
      priority: task.priority,
      due: task.due,
      assignee: task.assignee ?? "",
      project: task.project ?? "",
      tags: [...task.tags],
    });
    setOpen(true);
  };
  const submit = () => {
    if (!form.title.trim()) return;
    if (editingId) {
      updateTask(editingId, {
        title: form.title.trim(),
        titleEn: form.title.trim(),
        priority: form.priority,
        due: form.due,
        assignee: form.assignee || undefined,
        project: form.project || undefined,
        tags: form.tags,
      });
      pushToast(lang === "fa" ? "تسک به‌روزرسانی شد" : "Task updated");
    } else {
      addTask({
        title: form.title.trim(),
        titleEn: form.title.trim(),
        status: "todo",
        priority: form.priority,
        due: form.due,
        assignee: form.assignee || undefined,
        project: form.project || undefined,
        tags: form.tags,
        source: "manual",
      });
      pushToast(lang === "fa" ? "تسک جدید ثبت شد" : "Task created");
    }
    setForm({ ...form, title: "", project: "", tags: [] });
    setEditingId(null);
    setOpen(false);
  };

  const prios: (Priority | "all")[] = ["all", "urgent", "high", "medium", "low"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("tasks_title")}</h2>
          <p className="text-[12.5px] text-slate-500 dark:text-slate-400">{t("tasks_sub")}</p>
        </div>
        <Button variant="primary" onClick={startCreate}>
          <Plus size={16} /> {t("new_task")}
        </Button>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-xl bg-slate-100/80 px-3 dark:bg-white/[0.05]">
            <Search size={15} className="text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_placeholder")} className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-slate-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400" />
            {prios.map((p) => (
              <button
                key={p}
                onClick={() => setPrio(p)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold transition",
                  prio === p
                    ? "bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/[0.05] dark:text-slate-400 dark:hover:bg-white/[0.1]",
                )}
              >
                {p === "all" ? t("all") : t(`p_${p}`)}
              </button>
            ))}
          </div>
        </div>
        {(focus.concept || focus.assignee || focus.date) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 dark:border-white/[0.06]">
            <span className="text-[10.5px] font-bold text-slate-400">{lang === "fa" ? "فیلتر فعال:" : "Active:"}</span>
            {focus.concept && <ActiveChip label={focus.concept} onClear={() => { setFocus({ ...focus, concept: undefined }); setQ(""); }} />}
            {focusPerson && <ActiveChip label={lang === "fa" ? focusPerson.name : focusPerson.nameEn} onClear={() => setFocus({ ...focus, assignee: undefined })} />}
            {focus.date && <ActiveChip label={formatDate(parseISO(focus.date), lang, { short: true })} onClear={() => setFocus({ ...focus, date: undefined })} />}
            <button onClick={() => { setFocus({}); setQ(""); }} className="text-[10.5px] font-bold text-brand-600 hover:underline dark:text-brand-400">
              {lang === "fa" ? "پاک کردن همه" : "Clear all"}
            </button>
          </div>
        )}
        {!focus.concept && !focus.assignee && !focus.date && (
          <div className="no-scrollbar mt-2.5 flex gap-1.5 overflow-x-auto border-t border-slate-100 pt-2.5 dark:border-white/[0.06]">
            {concepts.map((c) => {
              const n = tasks.filter((x) => x.tags.includes(c.label) || x.project === c.label).length;
              if (!n) return null;
              return (
                <button
                  key={c.id}
                  onClick={() => { setFocus({ ...focus, concept: c.label }); setQ(c.label); }}
                  className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[10.5px] font-semibold text-slate-500 transition hover:bg-brand-100 hover:text-brand-700 dark:bg-white/[0.05] dark:text-slate-400 dark:hover:bg-brand-500/20 dark:hover:text-brand-300"
                >
                  {c.emoji} {lang === "fa" ? c.label : c.labelEn} · {num(n)}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = filtered.filter((x) => x.status === col.id);
          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                setHoverCol(col.id);
              }}
              onDragLeave={() => setHoverCol((c) => (c === col.id ? null : c))}
              onDrop={() => {
                if (dragging) updateTask(dragging, { status: col.id });
                setDragging(null);
                setHoverCol(null);
              }}
              className={cn(
                "flex min-h-[180px] flex-col rounded-2xl border border-slate-200/70 bg-slate-50/60 p-2.5 transition dark:border-white/[0.06] dark:bg-white/[0.02]",
                hoverCol === col.id && "border-brand-400 bg-brand-50/50 dark:border-brand-400/50 dark:bg-brand-500/[0.06]",
              )}
            >
              <div className="mb-2 flex items-center gap-2 px-1.5">
                <span className={cn("h-2 w-2 rounded-full", col.accent)} />
                <span className="text-[12.5px] font-bold text-slate-700 dark:text-slate-200">{t(`status_${col.id}`)}</span>
                <span className="ms-auto rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400 dark:bg-white/[0.06]">
                  {num(items.length)}
                </span>
              </div>
              <div className="scroll-thin flex-1 space-y-2 overflow-y-auto pe-0.5">
                <AnimatePresence mode="popLayout">
                  {items.map((task) => {
                    const person = people.find((p) => p.id === task.assignee);
                    const late = task.status !== "done" && task.due < today;
                    return (
                      <motion.div
                        layout
                        key={task.id}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        draggable
                        onDragStart={() => setDragging(task.id)}
                        onDragEnd={() => setDragging(null)}
                        className={cn(
                          "group cursor-grab rounded-xl border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg active:cursor-grabbing dark:bg-ink-900/70",
                          focus.taskId === task.id
                            ? "border-brand-500 ring-2 ring-brand-500/25"
                            : "border-slate-200 dark:border-white/[0.07]",
                          dragging === task.id && "opacity-40",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <button onClick={() => cycleTaskStatus(task.id)} className="mt-0.5 shrink-0 text-slate-300 transition hover:text-brand-500 dark:text-slate-600">
                            {task.status === "done" ? <CheckCircle2 size={17} className="text-emerald-500" /> : <Circle size={17} />}
                          </button>
                          <p className={cn("flex-1 text-[12.5px] font-semibold leading-5 text-slate-800 dark:text-slate-100", task.status === "done" && "text-slate-400 line-through dark:text-slate-500")}>
                            {lang === "fa" ? task.title : task.titleEn ?? task.title}
                          </p>
                          <button onClick={() => startEditTask(task)} className="shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-brand-500">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => removeTask(task.id)} className="shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-rose-500">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {task.description && (
                          <p className="mt-1.5 line-clamp-2 ps-6 text-[11px] leading-5 text-slate-400">{task.description}</p>
                        )}
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 ps-6">
                          <Badge tone={priorityTone[task.priority]}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", priorityDot[task.priority])} />
                            {t(`p_${task.priority}`)}
                          </Badge>
                          <button onClick={() => go({ page: "calendar", date: task.due })} title={lang === "fa" ? "در تقویم ببین" : "Open in calendar"}>
                            <Badge tone={late ? "rose" : "slate"} className="cursor-pointer transition hover:brightness-95 dark:hover:brightness-125">
                              <CalendarClock size={10} /> {relativeDay(parseISO(task.due), lang)}
                            </Badge>
                          </button>
                          {task.source === "ai" && (
                            <button onClick={() => go({ page: "ai" })} title={lang === "fa" ? "دستیار هوشمند" : "AI assistant"}>
                              <Badge tone="violet" className="cursor-pointer transition hover:brightness-95 dark:hover:brightness-125">
                                <Sparkles size={10} /> AI
                              </Badge>
                            </button>
                          )}
                          <div className="ms-auto">
                            {person ? (
                              <button
                                onClick={() => go({ page: "people", personId: person.id })}
                                title={lang === "fa" ? person.name : person.nameEn}
                                className="block rounded-full transition hover:scale-110"
                              >
                                <Avatar initials={person.initials} color={person.avatarColor} size={22} />
                              </button>
                            ) : (
                              <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/[0.07]">
                                <User2 size={11} />
                              </span>
                            )}
                          </div>
                        </div>
                        {task.tags.filter((tg) => concepts.some((c) => c.label === tg)).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1 ps-6">
                            {task.tags
                              .filter((tg) => concepts.some((c) => c.label === tg))
                              .map((tg) => {
                                const c = concepts.find((x) => x.label === tg)!;
                                return (
                                  <button
                                    key={tg}
                                    onClick={() => { setFocus({ ...focus, concept: tg }); setQ(tg); }}
                                    title={lang === "fa" ? "فیلتر بر اساس این مفهوم" : "Filter by this concept"}
                                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 transition hover:bg-brand-100 hover:text-brand-700 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-brand-500/20 dark:hover:text-brand-300"
                                  >
                                    {c.emoji} {tg}
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {items.length === 0 && (
                  <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 py-8 text-[11px] text-slate-400 dark:border-white/[0.08]">
                    {lang === "fa" ? "خالی" : "Empty"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && <Card><Empty icon={<ListChecks size={22} />} text={t("no_results")} /></Card>}

      <Modal open={open} onClose={() => { setOpen(false); setEditingId(null); }} title={editingId ? (lang === "fa" ? "ویرایش تسک" : "Edit task") : t("new_task")}>
        <div className="space-y-3">
          <Field label={t("task_title_ph")}>
            <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("task_title_ph")} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("filter_priority")}>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} className={inputCls}>
                <option value="urgent">{t("p_urgent")}</option>
                <option value="high">{t("p_high")}</option>
                <option value="medium">{t("p_medium")}</option>
                <option value="low">{t("p_low")}</option>
              </select>
            </Field>
            <Field label={lang === "fa" ? "تاریخ سررسید" : "Due date"}>
              <input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={lang === "fa" ? "مسئول" : "Assignee"}>
              <select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} className={inputCls}>
                <option value="">—</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {lang === "fa" ? p.name : p.nameEn}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={lang === "fa" ? "پروژه" : "Project"}>
              <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} className={inputCls}>
                <option value="">—</option>
                {concepts.map((c) => (
                  <option key={c.id} value={c.label}>
                    {c.emoji} {lang === "fa" ? c.label : c.labelEn}
                  </option>
                ))}
              </select>
            </Field>
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
                      setForm({
                        ...form,
                        tags: on ? form.tags.filter((x) => x !== c.label) : [...form.tags, c.label],
                      })
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
