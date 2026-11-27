import { AnimatePresence, motion } from "framer-motion";
import {
  BrainCircuit,
  Check,
  CheckCheck,
  CalendarPlus,
  Clock,
  Eraser,
  FileText,
  Gauge,
  Loader2,
  MapPin,
  Sparkles,
  UserRound,
  Wand2,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useApp } from "../store/AppStore";
import FeatureGate from "../components/FeatureGate";
import { Avatar, Badge, Button, Card, Empty, SectionTitle, inputCls, priorityDot } from "../components/ui";
import { sampleNote } from "../lib/mock";
import { extract, type ExtractionResult } from "../lib/extract";
import { formatDate, localeDigits, parseISO, relativeDay } from "../lib/jalali";
import { cn } from "../utils/cn";
import type { ExtractedMeeting, ExtractedTask, Priority } from "../lib/types";

const STEP_KEYS = ["step_read", "step_ner", "step_date", "step_build"] as const;

export default function AiAssistant() {
  const { t, lang, people, addTask, addMeeting, pushToast, pushNotification } = useApp();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(-1);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [meetings, setMeetings] = useState<ExtractedMeeting[]>([]);
  const timers = useRef<number[]>([]);
  const num = (n: number | string) => localeDigits(n, lang);

  const wordCount = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text]);

  const run = () => {
    if (!text.trim() || loading) return;
    timers.current.forEach(clearTimeout);
    setLoading(true);
    setResult(null);
    setTasks([]);
    setMeetings([]);
    setStep(0);
    STEP_KEYS.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setStep(i), 420 * i + 200));
    });
    timers.current.push(
      window.setTimeout(() => {
        const r = extract(text, people);
        setResult(r);
        setTasks(r.tasks);
        setMeetings(r.meetings);
        setLoading(false);
        setStep(-1);
        pushNotification({
          type: "ai",
          title: `${r.tasks.length} تسک و ${r.meetings.length} جلسه استخراج شد`,
          titleEn: `${r.tasks.length} tasks & ${r.meetings.length} meetings extracted`,
          body: "برای تایید یا ویرایش به صفحه دستیار هوشمند بروید.",
          bodyEn: "Open the AI Assistant to accept or edit them.",
        });
      }, 420 * STEP_KEYS.length + 520),
    );
  };

  const acceptTask = (x: ExtractedTask) => {
    setTasks((p) => p.map((y) => (y.id === x.id ? { ...y, accepted: true } : y)));
    addTask({
      title: x.title,
      titleEn: x.title,
      status: "todo",
      priority: x.priority,
      due: x.due,
      assignee: x.assignee,
      tags: [lang === "fa" ? "استخراج AI" : "AI"],
      source: "ai",
    });
    pushToast(t("ai_saved"));
  };

  const acceptMeeting = (x: ExtractedMeeting) => {
    setMeetings((p) => p.map((y) => (y.id === x.id ? { ...y, accepted: true } : y)));
    addMeeting({
      title: x.title,
      titleEn: x.title,
      date: x.date,
      start: x.start,
      end: x.end,
      location: x.location,
      kind: "meeting",
      priority: "medium",
      attendees: x.attendees,
      agenda: lang === "fa" ? "استخراج‌شده توسط منشی هوشمند" : "Extracted by SmartSecretary",
    });
    pushToast(t("ai_saved"));
  };

  const acceptAll = () => {
    tasks.filter((x) => x.accepted === null).forEach(acceptTask);
    meetings.filter((x) => x.accepted === null).forEach(acceptMeeting);
  };

  const pendingCount = tasks.filter((x) => x.accepted === null).length + meetings.filter((x) => x.accepted === null).length;

  return (
    <FeatureGate featureId="ai-extract" overlay>
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.03]">
          <div className="absolute -top-20 -end-10 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute -bottom-24 start-0 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-600/30">
              <BrainCircuit size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {t("ai_title")} <span className="shimmer-text">✦</span>
              </h2>
              <p className="mt-1 max-w-2xl text-[12.5px] leading-6 text-slate-500 dark:text-slate-400">{t("ai_sub")}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* Input */}
          <Card className="flex flex-col p-4">
            <SectionTitle
              icon={<FileText size={16} />}
              title={lang === "fa" ? "یادداشت خام" : "Raw notes"}
              action={<span className="text-[10.5px] font-semibold text-slate-400">{num(wordCount)} {t("words")}</span>}
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("ai_placeholder")}
              className={cn(inputCls, "mt-3 min-h-[260px] flex-1 leading-7")}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" onClick={run} disabled={!text.trim() || loading} className="flex-1 min-w-[190px]">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {t("ai_analyze")}
              </Button>
              <Button onClick={() => setText(sampleNote)}>
                <Sparkles size={15} /> {t("ai_sample")}
              </Button>
              <Button variant="ghost" onClick={() => { setText(""); setResult(null); setTasks([]); setMeetings([]); }}>
                <Eraser size={15} /> {t("ai_clear")}
              </Button>
            </div>

            {/* loading steps */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 overflow-hidden"
                >
                  <div className="space-y-2 rounded-2xl border border-brand-200/60 bg-brand-50/60 p-3.5 dark:border-brand-400/20 dark:bg-brand-500/[0.07]">
                    {STEP_KEYS.map((k, i) => (
                      <div key={k} className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "grid h-5 w-5 shrink-0 place-items-center rounded-full transition-all",
                            i < step ? "bg-emerald-500 text-white" : i === step ? "bg-brand-500 text-white" : "bg-slate-200 text-slate-400 dark:bg-white/10",
                          )}
                        >
                          {i < step ? <Check size={11} /> : i === step ? <Loader2 size={11} className="animate-spin" /> : <span className="text-[9px] font-bold">{num(i + 1)}</span>}
                        </span>
                        <span className={cn("text-[12px] font-semibold", i <= step ? "text-slate-700 dark:text-slate-200" : "text-slate-400")}>{t(k)}</span>
                        {i === step && (
                          <span className="ms-auto h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                            <motion.span
                              initial={{ x: "-100%" }}
                              animate={{ x: "100%" }}
                              transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                              className="block h-full w-1/2 rounded-full bg-gradient-to-r from-brand-500 to-violet-500"
                            />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Output */}
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {!result && !loading && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Card>
                    <Empty icon={<Sparkles size={22} />} text={t("ai_empty")} />
                  </Card>
                </motion.div>
              )}

              {loading && (
                <motion.div key="skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Card key={i} className="p-4">
                      <div className="animate-pulse space-y-2.5">
                        <div className="h-3.5 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
                        <div className="h-2.5 w-1/3 rounded bg-slate-100 dark:bg-white/[0.06]" />
                        <div className="flex gap-2 pt-1">
                          <div className="h-5 w-14 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                          <div className="h-5 w-20 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </motion.div>
              )}

              {result && !loading && (
                <motion.div key="res" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                  {/* Summary */}
                  <Card className="overflow-hidden">
                    <div className="border-b border-slate-100 bg-gradient-to-br from-violet-500/10 to-brand-500/10 p-4 dark:border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <Sparkles size={15} className="text-violet-500" />
                        <span className="text-[13px] font-extrabold text-slate-800 dark:text-white">{t("ai_summary")}</span>
                      </div>
                      <p className="mt-2 text-[12.5px] leading-6 text-slate-600 dark:text-slate-300">
                        {lang === "fa" ? result.summary : result.summaryEn}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-slate-100 rtl:divide-x-reverse dark:divide-white/[0.06]">
                      {[
                        { l: lang === "fa" ? "جملات" : "Sentences", v: result.stats.sentences },
                        { l: lang === "fa" ? "موجودیت‌ها" : "Entities", v: result.stats.entities },
                        { l: lang === "fa" ? "تاریخ‌ها" : "Dates", v: result.stats.dates },
                      ].map((s) => (
                        <div key={s.l} className="p-3 text-center">
                          <div className="text-lg font-extrabold text-slate-800 dark:text-white">{num(s.v)}</div>
                          <div className="text-[10.5px] text-slate-400">{s.l}</div>
                        </div>
                      ))}
                    </div>
                    {pendingCount > 0 && (
                      <div className="border-t border-slate-100 p-3 dark:border-white/[0.06]">
                        <Button variant="primary" className="w-full" onClick={acceptAll}>
                          <CheckCheck size={16} /> {t("ai_accept_all")} ({num(pendingCount)})
                        </Button>
                      </div>
                    )}
                  </Card>

                  {/* Tasks */}
                  {tasks.length > 0 && (
                    <div className="space-y-2">
                      <SectionTitle icon={<Sparkles size={15} />} title={`${t("ai_extracted_tasks")} · ${num(tasks.length)}`} />
                      {tasks.map((x, i) => (
                        <PreviewCard
                          key={x.id}
                          index={i}
                          accepted={x.accepted}
                          confidence={x.confidence}
                          onAccept={() => acceptTask(x)}
                          onReject={() => setTasks((p) => p.map((y) => (y.id === x.id ? { ...y, accepted: false } : y)))}
                          acceptLabel={t("ai_accept")}
                          rejectLabel={t("ai_reject")}
                          confLabel={t("ai_confidence")}
                          num={num}
                        >
                          <input
                            value={x.title}
                            onChange={(e) => setTasks((p) => p.map((y) => (y.id === x.id ? { ...y, title: e.target.value } : y)))}
                            className="w-full bg-transparent text-[13px] font-bold text-slate-800 outline-none focus:underline dark:text-slate-100"
                          />
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <select
                              value={x.priority}
                              onChange={(e) => setTasks((p) => p.map((y) => (y.id === x.id ? { ...y, priority: e.target.value as Priority } : y)))}
                              className={cn(
                                "cursor-pointer rounded-lg px-2 py-0.5 text-[11px] font-bold outline-none",
                                x.priority === "urgent" && "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
                                x.priority === "high" && "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
                                x.priority === "medium" && "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
                                x.priority === "low" && "bg-slate-100 text-slate-600 dark:bg-white/[0.07] dark:text-slate-300",
                              )}
                            >
                              <option value="urgent">{t("p_urgent")}</option>
                              <option value="high">{t("p_high")}</option>
                              <option value="medium">{t("p_medium")}</option>
                              <option value="low">{t("p_low")}</option>
                            </select>
                            <Badge tone="slate"><Clock size={10} /> {relativeDay(parseISO(x.due), lang)}</Badge>
                            <Badge tone="slate">{formatDate(parseISO(x.due), lang, { short: true })}</Badge>
                            {x.assignee && (() => {
                              const p = people.find((y) => y.id === x.assignee);
                              return p ? (
                                <span className="flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pe-2 ps-0.5 dark:bg-white/[0.07]">
                                  <Avatar initials={p.initials} color={p.avatarColor} size={18} />
                                  <span className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-300">{lang === "fa" ? p.name : p.nameEn}</span>
                                </span>
                              ) : null;
                            })()}
                            {!x.assignee && <Badge tone="slate"><UserRound size={10} /> {lang === "fa" ? "بدون مسئول" : "Unassigned"}</Badge>}
                            <span className={cn("h-2 w-2 rounded-full", priorityDot[x.priority])} />
                          </div>
                        </PreviewCard>
                      ))}
                    </div>
                  )}

                  {/* Meetings */}
                  {meetings.length > 0 && (
                    <div className="space-y-2">
                      <SectionTitle icon={<CalendarPlus size={15} />} title={`${t("ai_extracted_meetings")} · ${num(meetings.length)}`} />
                      {meetings.map((x, i) => (
                        <PreviewCard
                          key={x.id}
                          index={i}
                          accepted={x.accepted}
                          confidence={x.confidence}
                          onAccept={() => acceptMeeting(x)}
                          onReject={() => setMeetings((p) => p.map((y) => (y.id === x.id ? { ...y, accepted: false } : y)))}
                          acceptLabel={t("ai_accept")}
                          rejectLabel={t("ai_reject")}
                          confLabel={t("ai_confidence")}
                          num={num}
                        >
                          <input
                            value={x.title}
                            onChange={(e) => setMeetings((p) => p.map((y) => (y.id === x.id ? { ...y, title: e.target.value } : y)))}
                            className="w-full bg-transparent text-[13px] font-bold text-slate-800 outline-none focus:underline dark:text-slate-100"
                          />
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge tone="brand"><Clock size={10} /> {num(`${x.start} - ${x.end}`)}</Badge>
                            <Badge tone="slate">{formatDate(parseISO(x.date), lang, { withWeekday: true })}</Badge>
                            <Badge tone="emerald"><MapPin size={10} /> {x.location}</Badge>
                            <div className="flex -space-x-2 rtl:space-x-reverse">
                              {x.attendees.map((a) => {
                                const p = people.find((y) => y.id === a);
                                return p ? <Avatar key={a} initials={p.initials} color={p.avatarColor} size={20} ring /> : null;
                              })}
                            </div>
                          </div>
                        </PreviewCard>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </FeatureGate>
  );
}

function PreviewCard({
  children,
  accepted,
  confidence,
  onAccept,
  onReject,
  acceptLabel,
  rejectLabel,
  confLabel,
  index,
  num,
}: {
  children: React.ReactNode;
  accepted: boolean | null;
  confidence: number;
  onAccept: () => void;
  onReject: () => void;
  acceptLabel: string;
  rejectLabel: string;
  confLabel: string;
  index: number;
  num: (n: number | string) => string;
}) {
  const pct = Math.round(confidence * 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 300, damping: 26 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden p-4 transition",
          accepted === true && "border-emerald-400/60 bg-emerald-50/40 dark:border-emerald-400/30 dark:bg-emerald-500/[0.06]",
          accepted === false && "opacity-45 grayscale",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">{children}</div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400" title={confLabel}>
              <Gauge size={11} />
              <span className={cn(pct >= 85 ? "text-emerald-500" : pct >= 70 ? "text-amber-500" : "text-slate-400")}>{num(pct)}٪</span>
            </div>
            {accepted === null ? (
              <div className="flex gap-1.5">
                <button
                  onClick={onAccept}
                  title={acceptLabel}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500 text-white shadow transition hover:brightness-110 active:scale-95"
                >
                  <Check size={15} />
                </button>
                <button
                  onClick={onReject}
                  title={rejectLabel}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 active:scale-95 dark:bg-white/[0.07] dark:hover:bg-rose-500/15"
                >
                  <X size={15} />
                </button>
              </div>
            ) : accepted ? (
              <Badge tone="emerald"><Check size={10} /> {acceptLabel}</Badge>
            ) : (
              <Badge tone="slate"><X size={10} /> {rejectLabel}</Badge>
            )}
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.07]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: 0.2 + index * 0.06, duration: 0.7 }}
            className={cn("h-full rounded-full", pct >= 85 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-slate-400")}
          />
        </div>
      </Card>
    </motion.div>
  );
}
