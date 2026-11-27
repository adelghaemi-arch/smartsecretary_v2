import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Coins,
  Contact,
  Languages,
  Mic,
  Moon,
  Paperclip,
  Plus,
  Radio,
  Video,
  RefreshCw,
  Send,
  Slash,
  Sparkles,
  Sun,
  Trash2,
  Volume2,
  WifiOff,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useAssistant } from "../store/AssistantStore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../store/AppStore";
import { useTokens } from "../store/TokenStore";
import TokenModal from "../components/TokenModal";
import { ChatActionsCtx, WidgetView } from "../components/widgets";
import { buildBriefing, runAgent, uid, type AgentCtx } from "../lib/agent";
import { formatDate, localeDigits } from "../lib/jalali";
import { cn } from "../utils/cn";
import type { AgentMessage } from "../lib/types";

const VOICE_FA = [
  "برای فردا ساعت ۱۰ صبح یک جلسه با تیم فنی بذار.",
  "یادم بنداز گزارش هفتگی رو تا پنجشنبه بفرستم، فوریه.",
  "پیگیری‌های عقب‌افتاده رو بهم بگو.",
  "برنامه فردا چیه؟",
];
const VOICE_EN = [
  "Schedule a meeting with the tech team tomorrow at 10.",
  "Remind me to send the weekly report by Thursday, it's urgent.",
  "Show me the overdue follow-ups.",
  "What's my plan for tomorrow?",
];

export default function ChatOS({ variant = "full" }: { variant?: "full" | "panel" }) {
  const app = useApp();
  const {
    lang, theme, agentMessages, addAgentMessage, clearAgentMessages,
    tasks, meetings, people, notebooks, concepts,
    addTask, updateTask, removeTask, addMeeting, addPerson, addPage, updatePage, addConnectionRequest,
    setTheme, setLang, setMode, toggleLang, toggleTheme, pushToast,
  } = app;

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [openToken, setOpenToken] = useState(false);
  const { hasPro, balance } = useTokens();
  const { online, queue, enqueue, flushQueue } = useAssistant();
  const [handsFree, setHandsFree] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [tts, setTts] = useState(false);
const [addMenuOpen, setAddMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* live transcript while recording (zero-friction voice) */
  useEffect(() => {
    if (!recording) return;
    const sentence = (lang === "fa" ? VOICE_FA : VOICE_EN)[0];
    const words = sentence.split(" ");
    setTranscript("");
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setTranscript(words.slice(0, i).join(" "));
      if (i >= words.length) window.clearInterval(t);
    }, 320);
    return () => window.clearInterval(t);
  }, [recording, lang]);

  /* flush offline queue when back online */
  useEffect(() => {
    if (!online || queue.length === 0) return;
    const items = flushQueue();
    items.forEach((q) => send(q.text, q.kind, q.seconds));
    pushToast(lang === "fa" ? `${items.length} دستور آفلاین ارسال شد` : `${items.length} queued command(s) sent`, "info");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const booted = useRef(false);
  const num = (v: number | string) => localeDigits(v, lang);

  const ctx: AgentCtx = useMemo(
    () => ({
      lang,
      state: { tasks, meetings, people, notebooks, concepts },
      actions: {
        addTask: (t) => addTask({ status: "todo", priority: "medium", due: new Date().toISOString().slice(0, 10), tags: [], ...t }),
        updateTask,
        removeTask,
        addMeeting: (m) => addMeeting({ location: "—", kind: "meeting", priority: "medium", attendees: [], ...m }),
        addPerson: (p) => {
          const parts = p.name.trim().split(" ");
          return addPerson({
            ...p,
            nameEn: p.name,
            roleEn: p.role,
            avatarColor: "from-indigo-500 to-blue-500",
            initials: (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? ""),
            tags: [],
            favorite: false,
            lastContact: new Date().toISOString().slice(0, 10),
          });
        },
        addPage,
        updatePage,
        addConnectionRequest,
        setTheme,
        setLang,
        setMode,
      },
    }),
    [lang, tasks, meetings, people, notebooks, concepts, addTask, updateTask, removeTask, addMeeting, addPerson, addPage, updatePage, addConnectionRequest, setTheme, setLang, setMode],
  );

  const push = useCallback((m: Omit<AgentMessage, "id" | "at"> & Partial<Pick<AgentMessage, "id" | "at">>) => {
    addAgentMessage({ id: m.id ?? uid(), at: m.at ?? new Date().toISOString(), ...m } as AgentMessage);
  }, [addAgentMessage]);

  /* ---------- boot briefing ---------- */
  const runBriefing = useCallback(() => {
    setTyping(true);
    window.setTimeout(() => {
      const r = buildBriefing(ctx);
      push({ role: "assistant", text: r.text, widget: r.widget, suggestions: r.suggestions });
      setTyping(false);
    }, 1100);
  }, [ctx, push]);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const last = agentMessages[agentMessages.length - 1];
    const stale = !last || Date.now() - new Date(last.at).getTime() > 1000 * 60 * 90;
    if (stale) runBriefing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [agentMessages.length, typing, transcribing]);

  useEffect(() => {
    if (!recording) return;
    const i = window.setInterval(() => setRecSecs((s) => s + 1), 1000);
    return () => window.clearInterval(i);
  }, [recording]);

  /* requests that consume LLM tokens */
  const needsTokens = useCallback((s: string) => {
    const t = s.toLowerCase();
    return /(تحلیل|استخراج|صورتجلسه|صورت جلسه|خلاصه|analyze|extract|summar|summary)/.test(t) || s.trim().length > 170;
  }, []);

  /* ---------- send ---------- */
  const send = useCallback(
    (raw?: string, kind: "text" | "voice" = "text", secs?: number) => {
      const body = (raw ?? input).trim();
      if (!body) return;
      if (attachments.length) setAttachments([]);
      if (!online) {
        enqueue({ text: body, kind, seconds: secs });
        push({ role: "user", text: body, kind, voiceSeconds: secs });
        push({ role: "assistant", text: lang === "fa" ? "📴 آفلاین هستید — دستور شما در صف ذخیره شد و به‌محض اتصال ارسال می‌شود." : "📴 You're offline — saved to the queue and will be sent once connected." });
        setInput("");
        return;
      }
      push({ role: "user", text: body, kind, voiceSeconds: secs });
      setInput("");
      setTyping(true);
      window.setTimeout(() => {
        if (!hasPro && needsTokens(body)) {
          push({
            role: "assistant",
            text:
              lang === "fa"
                ? "این کار از مدل زبانی استفاده می‌کند و به توکن نیاز دارد 🔑\nبرای ادامه، از llm.aipg.ir توکن تهیه کنید و کلید API را وارد کنید. بقیهٔ کارها (تسک، جلسه، تقویم، اسناد) بدون توکن هم انجام می‌شوند."
                : "This runs on the language model and needs tokens 🔑\nGet a token from llm.aipg.ir and enter your API key. Everything else (tasks, meetings, calendar, docs) still works for free.",
            suggestions: lang === "fa" ? ["تسک‌های باز", "برنامه امروز", "تقویم این ماه"] : ["Open tasks", "Today's plan", "Calendar"],
          });
          setOpenToken(true);
          setTyping(false);
          return;
        }
        const r = runAgent(body, ctx);
        push({ role: "assistant", text: r.text, widget: r.widget, suggestions: r.suggestions });
        setTyping(false);
        if (tts && typeof window !== "undefined" && window.speechSynthesis) {
          const u = new SpeechSynthesisUtterance(r.text.replace(/[*#_`]/g, ""));
          u.lang = lang === "fa" ? "fa-IR" : "en-US";
          u.rate = 1.05;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(u);
        }
      }, 700 + Math.random() * 600);
    },
    [input, ctx, push, hasPro, needsTokens, lang, online, enqueue, tts, attachments.length],
  );

  const stopRecording = () => {
    setRecording(false);
    const secs = Math.max(2, recSecs);
    setRecSecs(0);
    setTranscribing(true);
    window.setTimeout(() => {
      const pool = lang === "fa" ? VOICE_FA : VOICE_EN;
      const text = transcript.trim() || pool[Math.floor(Math.random() * pool.length)];
      setTranscribing(false);
      setTranscript("");
      send(text, "voice", secs);
    }, 1400);
  };

  const slash = input.startsWith("/");
  const slashCmds = useMemo(() => {
    const cmds = lang === "fa"
      ? [
          { c: "/گزارش", d: "گزارش امروز", q: "گزارش امروز" },
          { c: "/تسک", d: "تسک‌های باز", q: "تسک‌های باز" },
          { c: "/جلسه", d: "جلسه جدید بذار", q: "فردا ساعت ۱۰ جلسه بذار" },
          { c: "/تقویم", d: "نمای تقویم", q: "تقویم این ماه" },
          { c: "/پیگیری", d: "پیگیری‌های عقب‌افتاده", q: "پیگیری‌ها" },
          { c: "/آمار", d: "شاخص‌های کلیدی", q: "آمار" },
          { c: "/اسناد", d: "مرکز اسناد", q: "اسناد" },
          { c: "/مخاطبان", d: "دفترچه تلفن", q: "مخاطبان" },
          { c: "/راهنما", d: "همه قابلیت‌ها", q: "چه کارهایی بلدی؟" },
        ]
      : [
          { c: "/brief", d: "Today's briefing", q: "Today's briefing" },
          { c: "/tasks", d: "Open tasks", q: "Open tasks" },
          { c: "/meet", d: "Schedule a meeting", q: "Schedule a meeting tomorrow at 10" },
          { c: "/calendar", d: "Calendar view", q: "Show calendar" },
          { c: "/follow", d: "Overdue follow-ups", q: "Follow-ups" },
          { c: "/stats", d: "Key metrics", q: "Stats" },
          { c: "/docs", d: "Document center", q: "Documents" },
          { c: "/people", d: "Contacts", q: "People" },
          { c: "/help", d: "All capabilities", q: "What can you do?" },
        ];
    const q = input.slice(1).toLowerCase();
    return cmds.filter((x) => !q || x.c.slice(1).toLowerCase().includes(q) || x.d.toLowerCase().includes(q));
  }, [input, lang]);

  const lastSuggestions = useMemo(() => {
    for (let i = agentMessages.length - 1; i >= 0; i--) {
      const m = agentMessages[i];
      if (m.role === "assistant" && m.suggestions?.length) return m.suggestions;
    }
    return lang === "fa"
      ? ["گزارش امروز", "تسک‌های باز", "تقویم این ماه", "چه کارهایی بلدی؟"]
      : ["Today's briefing", "Open tasks", "Calendar", "What can you do?"];
  }, [agentMessages, lang]);

  const full = variant === "full";

  return (
    <ChatActionsCtx.Provider value={{ ask: (t) => send(t) }}>
      <div
        className={cn(
          "relative flex flex-col overflow-hidden",
          full
            ? "h-full w-full bg-slate-50 pb-[calc(5.75rem+env(safe-area-inset-bottom))] dark:bg-ink-950 lg:pb-0"
            : "h-[calc(100dvh-220px)] min-h-[420px] rounded-2xl border border-slate-200/80 bg-white/90 dark:border-white/[0.07] dark:bg-white/[0.03]",
        )}
      >
        {/* ambient */}
        {full && (
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-52 start-1/4 h-[460px] w-[460px] rounded-full bg-brand-500/12 blur-[130px]" />
            <div className="absolute -bottom-60 end-1/4 h-[460px] w-[460px] rounded-full bg-fuchsia-500/12 blur-[130px]" />
          </div>
        )}

        {/* header */}
        <div className={cn("z-10 flex shrink-0 items-center gap-2 border-b px-3 sm:gap-3 sm:px-5", full ? "h-14 border-slate-200/80 bg-white/70 backdrop-blur-xl sm:h-16 dark:border-white/[0.07] dark:bg-ink-950/70" : "h-14 border-slate-100 dark:border-white/[0.06]")}>
          <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-brand-600/30">
            <Bot size={20} />
            <motion.span
              animate={{ scale: [1, 1.35, 1], opacity: [0.9, 0.3, 0.9] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 dark:border-ink-950"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                {lang === "fa" ? "منشی هوشمند" : "SmartSecretary"}
              </span>
              <span className="hidden rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 sm:inline dark:text-emerald-400">
                {lang === "fa" ? "فعال" : "LIVE"}
              </span>
            </div>
            <div className="truncate text-[10.5px] text-slate-400">
              {formatDate(new Date(), lang, { withWeekday: true })} · {lang === "fa" ? "همه کارها را از همین‌جا انجام دهید" : "run everything from here"}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setOpenToken(true)}
              title={lang === "fa" ? "اشتراک و توکن" : "Subscription & tokens"}
              className={cn(
                "hidden items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition sm:inline-flex",
                hasPro
                  ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400"
                  : "bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 dark:text-amber-400",
              )}
            >
              <Coins size={13} />
              {hasPro ? num(balance ?? 0) : lang === "fa" ? "خرید توکن" : "Get tokens"}
            </button>
            <IconBtn onClick={runBriefing} title={lang === "fa" ? "گزارش تازه" : "Refresh briefing"}><RefreshCw size={16} /></IconBtn>
            {full && (
              <span className="hidden sm:contents">
                <IconBtn onClick={toggleTheme} title="theme">{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</IconBtn>
                <IconBtn onClick={toggleLang} title="lang">
                  <span className="flex items-center gap-1 text-[11px] font-bold"><Languages size={15} />{lang === "fa" ? "EN" : "فا"}</span>
                </IconBtn>
              </span>
            )}
            <IconBtn
              onClick={() => { clearAgentMessages(); booted.current = false; pushToast(lang === "fa" ? "گفتگو پاک شد" : "Conversation cleared", "warn"); window.setTimeout(runBriefing, 250); }}
              title={lang === "fa" ? "گفتگوی جدید" : "New chat"}
            >
              <Trash2 size={16} />
            </IconBtn>
          </div>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="scroll-thin relative z-0 flex-1 overflow-y-auto px-2.5 py-3 sm:px-5 sm:py-5">
          <div className="mx-auto w-full max-w-3xl space-y-4">
            {agentMessages.length === 0 && !typing && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-xl">
                  <Sparkles size={26} />
                </div>
                <p className="max-w-sm text-[13px] leading-6 text-slate-500 dark:text-slate-400">
                  {lang === "fa" ? "سلام! من منشی هوشمند شما هستم. برای شروع «گزارش امروز» را بزنید." : "Hi! I'm your smart secretary. Tap \"Today's briefing\" to start."}
                </p>
                <button onClick={runBriefing} className="rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 px-4 py-2.5 text-[12.5px] font-bold text-white shadow-lg">
                  {lang === "fa" ? "گزارش امروز" : "Today's briefing"}
                </button>
              </div>
            )}

            <AnimatePresence initial={false}>
              {agentMessages.map((m) => (
                <Bubble key={m.id} m={m} num={num} lang={lang} />
              ))}
            </AnimatePresence>

            {typing && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2">
                <BotDot />
                <div className="flex items-center gap-1.5 rounded-2xl rounded-es-md bg-white px-4 py-3 shadow-sm dark:bg-white/[0.06]">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.16 }} className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                  ))}
                  <span className="ms-1.5 text-[10.5px] text-slate-400">{lang === "fa" ? "منشی در حال بررسی است…" : "Secretary is thinking…"}</span>
                </div>
              </motion.div>
            )}
            {transcribing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-violet-500/15 px-2.5 py-1.5 text-[11px] font-bold text-violet-600 dark:text-violet-300">
                  <Sparkles size={11} /> {lang === "fa" ? "در حال تبدیل گفتار به متن…" : "Transcribing…"}
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* composer */}
        <div className={cn("z-10 shrink-0 border-t px-3 pb-3 pt-2 sm:px-5", full ? "border-slate-200/80 bg-white/70 backdrop-blur-xl dark:border-white/[0.07] dark:bg-ink-950/70" : "border-slate-100 dark:border-white/[0.06]")}>
          <div className="mx-auto w-full max-w-3xl">
            {/* omni-input actions */}
            <div className="mb-2 flex flex-wrap items-center gap-1">
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const names = Array.from(e.target.files ?? []).map((f) => f.name);
                  setAttachments((a) => [...a, ...names]);
                }}
              />
              <ActionBtn icon={<Paperclip size={12} />} label={lang === "fa" ? "فایل / عکس" : "File / photo"} onClick={() => fileRef.current?.click()} />
              <ActionBtn
                icon={<Contact size={12} />}
                label={lang === "fa" ? "مخاطب" : "Contact"}
                onClick={() => {
                  const p = people[0];
                  if (p) setAttachments((a) => [...a, `👤 ${lang === "fa" ? p.name : p.nameEn}`]);
                }}
              />
              <ActionBtn
                icon={<Radio size={12} />}
                active={handsFree}
                label={handsFree ? (lang === "fa" ? "مکالمه پیوسته: روشن" : "Hands-free: on") : (lang === "fa" ? "مکالمه پیوسته" : "Hands-free")}
                onClick={() => {
                  const next = !handsFree;
                  setHandsFree(next);
                  if (next) setRecording(true);
                  else if (recording) stopRecording();
                  pushToast(lang === "fa" ? (next ? "مکالمه پیوسته روشن شد — بدون لمس صحبت کنید" : "مکالمه پیوسته خاموش شد") : "Hands-free mode toggled", "info");
                }}
              />
              <ActionBtn icon={<Volume2 size={12} />} active={tts} label={lang === "fa" ? "پاسخ صوتی" : "Read aloud"} onClick={() => setTts((v) => !v)} />
              <ActionBtn icon={<Wrench size={12} />} label={lang === "fa" ? "ابزارها" : "Tools"} onClick={() => send(lang === "fa" ? "تماس بگیر با علی" : "Call Ali")} />
              {!online && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-300">
                  <WifiOff size={10} /> {lang === "fa" ? `آفلاین · ${queue.length} در صف` : `Offline · ${queue.length} queued`}
                </span>
              )}
            </div>

            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {attachments.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10.5px] font-semibold text-slate-600 dark:bg-white/[0.07] dark:text-slate-300">
                    <Paperclip size={9} /> {a}
                    <button onClick={() => setAttachments((x) => x.filter((y) => y !== a))}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}

            {/* suggestions */}
            <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">
              {lastSuggestions.slice(0, 5).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-600 hover:shadow dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-brand-400/40"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* recording bar */}
            <AnimatePresence>
              {recording && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-2 overflow-hidden">
                  <div className="flex items-center gap-3 rounded-xl bg-rose-50 px-3.5 py-2.5 dark:bg-rose-500/10">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
                    </span>
                    <span className="text-[12px] font-bold text-rose-600 dark:text-rose-300">{lang === "fa" ? "در حال ضبط…" : "Recording…"}</span>
                    <span className="font-mono text-[12px] font-bold text-rose-500">{num(`0:${String(recSecs).padStart(2, "0")}`)}</span>
                    <div className="flex flex-1 items-center gap-0.5">
                      {Array.from({ length: 14 }, (_, i) => (
                        <motion.span key={i} animate={{ height: [4, 4 + Math.random() * 18, 4] }} transition={{ repeat: Infinity, duration: 0.5 + Math.random() * 0.5, delay: i * 0.02 }} className="w-1 rounded-full bg-rose-400/70" />
                      ))}
                    </div>
                  </div>
                  {transcript && (
                    <div className="mt-1 px-1 text-[11px] leading-5 text-rose-600/90 dark:text-rose-300/90" dir="auto">
                      « {transcript} <span className="inline-block h-3 w-0.5 animate-pulse bg-rose-400 align-middle" />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* slash palette */}
            <AnimatePresence>
              {slash && slashCmds.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="scroll-thin mb-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-ink-900"
                >
                  {slashCmds.map((c) => (
                    <button
                      key={c.c}
                      onClick={() => { setInput(""); send(c.q); }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start transition hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                    >
                      <Slash size={12} className="shrink-0 text-brand-500" />
                      <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{c.c}</span>
                      <span className="truncate text-[11px] text-slate-400">{c.d}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-2">
              {/* add / input menu */}
              <div className="relative flex items-end gap-2">
                <button
                  onClick={() => setAddMenuOpen((v) => !v)}
                  title={lang === "fa" ? "افزودن" : "Add"}
                  className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition active:scale-95", addMenuOpen ? "bg-brand-500 text-white shadow-lg shadow-brand-600/30" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.1]")}
                >
                  <Plus size={18} />
                </button>
                {addMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute bottom-[60px] end-0 flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/[0.08] dark:bg-ink-900"
                  >
                    <button
                      onClick={() => {
                        setAddMenuOpen(false);
                        setRecording(true);
                      }}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-start text-[12px] font-semibold text-slate-700 transition hover:bg-brand-50 dark:bg-white/[0.06] dark:hover:bg-brand-500/10 dark:text-brand-400"
                    >
                      <Mic size={14} /> {lang === "fa" ? "پیام صوتی" : "Voice message"}
                    </button>
                    <button
                      onClick={() => { fileRef.current?.click(); setAddMenuOpen(false); }}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-start text-[12px] font-semibold text-slate-700 transition hover:bg-brand-50 dark:bg-white/[0.06] dark:hover:bg-brand-500/10 dark:text-brand-400"
                    >
                      <Paperclip size={14} /> {lang === "fa" ? "فایل / عکس" : "File / photo"}
                    </button>
                    <button
                      onClick={() => {
                        setAddMenuOpen(false);
                        setRecording(true);
                      }}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-start text-[12px] font-semibold text-slate-700 transition hover:bg-brand-50 dark:bg-white/[0.06] dark:hover:bg-brand-500/10 dark:text-brand-400"
                    >
                      <Video size={14} /> {lang === "fa" ? "ویدیو" : "Video"}
                    </button>
                  </motion.div>
                )}
              </div>
              <div className="relative flex-1">
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={lang === "fa" ? "پیام به منشی…" : "Message secretary…"}
                  className="max-h-40 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] leading-5 text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100"
                />
              </div>
              {input.trim() || attachments.length > 0 ? (
                <button
                  onClick={() => send()}
                  disabled={!input.trim()}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-lg shadow-brand-600/25 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
                >
                  <Send size={17} className="rtl:-scale-x-100" />
                </button>
              ) : (
                <button
                  onClick={() => send()}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 active:scale-95"
                >
                  <Slash size={17} className="rtl:-scale-x-100" />
                </button>
              )}
            </div>
            <div className="mt-1 hidden items-center justify-center gap-3 text-[9.5px] text-slate-400 sm:flex">
              <span className="inline-flex items-center gap-1"><Zap size={9} /> {lang === "fa" ? "کنترل کامل سیستم از طریق گفتگو" : "Full system control via chat"}</span>
            </div>
          </div>
        </div>
        <TokenModal open={openToken} onClose={() => setOpenToken(false)} />
      </div>
    </ChatActionsCtx.Provider>
  );
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="grid h-9 min-w-9 place-items-center rounded-xl px-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.07]"
    >
      {children}
    </button>
  );
}

function ActionBtn({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-bold transition",
        active
          ? "bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/[0.05] dark:text-slate-400 dark:hover:bg-white/[0.1]",
      )}
    >
      {icon} {label}
    </button>
  );
}

function BotDot() {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-sm">
      <Bot size={14} />
    </span>
  );
}

function Bubble({ m, num, lang }: { m: AgentMessage; num: (v: number | string) => string; lang: "fa" | "en" }) {
  const mine = m.role === "user";
  const d = new Date(m.at);
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className={cn("flex items-end gap-2", mine && "flex-row-reverse")}
    >
      {!mine && <BotDot />}
      <div className={cn("min-w-0 max-w-[min(92%,28rem)] sm:max-w-[88%]", mine && "flex flex-col items-end")}>
        <div
          className={cn(
            "whitespace-pre-line rounded-2xl px-4 py-2.5 text-[12.5px] leading-6 shadow-sm",
            mine
              ? "rounded-ee-md bg-gradient-to-br from-brand-500 to-violet-600 text-white"
              : "rounded-es-md bg-white text-slate-700 dark:bg-white/[0.06] dark:text-slate-200",
          )}
        >
          {m.kind === "voice" && (
            <div className={cn("mb-2 flex items-center gap-2 rounded-xl px-2 py-1.5", mine ? "bg-white/15" : "bg-slate-50 dark:bg-white/[0.06]")}>
              <Mic size={13} />
              <div className="flex flex-1 items-center gap-0.5">
                {Array.from({ length: 22 }, (_, i) => (
                  <span key={i} className={cn("w-0.5 rounded-full", mine ? "bg-white/70" : "bg-brand-400")} style={{ height: 3 + ((i * 7) % 13) }} />
                ))}
              </div>
              <span className="text-[10px] font-bold opacity-80">{num(`0:${String(m.voiceSeconds ?? 8).padStart(2, "0")}`)}</span>
            </div>
          )}
          {m.text}
        </div>
        {m.widget && (
          <div className={cn("w-full", mine ? "max-w-full" : "max-w-full")}>
            <WidgetView widget={m.widget} msgId={m.id} />
          </div>
        )}
        <div className={cn("px-1 pt-1 text-[9.5px] text-slate-400", mine && "text-end")}>
          {num(hm)} {!mine && <span className="opacity-60">· {lang === "fa" ? "منشی" : "Secretary"}</span>}
        </div>
      </div>
    </motion.div>
  );
}
