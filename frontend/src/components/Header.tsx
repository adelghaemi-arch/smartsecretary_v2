import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleUser,
  Command,
  ListChecks,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { useApp } from "../store/AppStore";
import { useNav } from "../store/Nav";
import { useTokens } from "../store/TokenStore";
import { Avatar, Badge } from "./ui";
import TokenModal from "./TokenModal";
import { formatDate, isoKey, parseISO, relativeDay, toFaDigits } from "../lib/jalali";
import type { PageId } from "./Sidebar";

function timeAgo(iso: string, lang: "fa" | "en") {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return lang === "fa" ? `${toFaDigits(mins)} دقیقه پیش` : `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return lang === "fa" ? `${toFaDigits(hrs)} ساعت پیش` : `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return lang === "fa" ? `${toFaDigits(days)} روز پیش` : `${days}d ago`;
}

export default function Header({
  page,
  setPage,
  onOpenMobile,
}: {
  page: PageId;
  setPage: (p: PageId) => void;
  onOpenMobile: () => void;
}) {
  const { t, lang, tasks, meetings, people, notifications, readAllNotifications, readNotification, pushToast } = useApp();
  const { go } = useNav();
  const { hasPro, balance } = useTokens();
  const [openToken, setOpenToken] = useState(false);
  const [q, setQ] = useState("");
  const [openSearch, setOpenSearch] = useState(false);
  const [openBell, setOpenBell] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpenBell(false);
        setOpenProfile(false);
        setOpenSearch(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return null;
    const match = (v?: string) => (v ?? "").toLowerCase().includes(s);
    return {
      tasks: tasks.filter((x) => match(x.title) || match(x.titleEn) || x.tags.some(match)).slice(0, 4),
      meetings: meetings.filter((x) => match(x.title) || match(x.titleEn) || match(x.location)).slice(0, 4),
      people: people.filter((x) => match(x.name) || match(x.nameEn) || match(x.role) || match(x.roleEn)).slice(0, 4),
    };
  }, [q, tasks, meetings, people]);

  const empty = results && !results.tasks.length && !results.meetings.length && !results.people.length;
  const titleMap: Record<PageId, string> = {
    dashboard: t("nav_dashboard"),
    tasks: t("nav_tasks"),
    calendar: t("nav_calendar"),
    ai: t("nav_ai"),
    docs: t("nav_docs"),
    concepts: t("nav_concepts"),
    people: t("nav_people"),
    followups: t("nav_followups"),
    memory: t("nav_memory"),
    skills: t("nav_skills"),
    chat: t("nav_chat"),
    settings: t("nav_settings"),
  };

  return (
    <header
      ref={wrapRef}
      className="relative z-50 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200/80 bg-white/70 px-2.5 backdrop-blur-xl sm:h-16 sm:px-5 dark:border-white/[0.07] dark:bg-ink-950/70"
    >
      <button
        onClick={onOpenMobile}
        className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
      >
        <Menu size={18} />
      </button>

      <div className="hidden min-w-0 shrink-0 md:block">
        <div className="truncate text-sm font-bold text-slate-800 dark:text-white">{titleMap[page]}</div>
        <div className="truncate text-[11px] text-slate-400 dark:text-slate-500">
          {formatDate(new Date(), lang, { withWeekday: true })}
        </div>
      </div>

      {/* Search */}
      <div className="relative mx-auto w-full max-w-xl">
        <div
          className={cn(
            "flex h-10 items-center gap-2.5 rounded-xl border bg-slate-100/70 px-3 transition-all dark:bg-white/[0.04]",
            openSearch
              ? "border-brand-400 bg-white ring-4 ring-brand-500/10 dark:border-brand-400/60 dark:bg-white/[0.07]"
              : "border-transparent dark:border-white/[0.06]",
          )}
        >
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            value={q}
            onFocus={() => setOpenSearch(true)}
            onChange={(e) => {
              setQ(e.target.value);
              setOpenSearch(true);
            }}
            placeholder={t("search_placeholder")}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
          />
          {q ? (
            <button onClick={() => setQ("")} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          ) : (
            <kbd className="hidden items-center gap-0.5 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 sm:flex dark:border-white/10">
              <Command size={10} /> K
            </kbd>
          )}
        </div>

        <AnimatePresence>
          {openSearch && results && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.99 }}
              transition={{ duration: 0.16 }}
              className="scroll-thin absolute inset-x-0 top-12 max-h-[62vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-ink-900"
            >
              {empty && <div className="px-3 py-6 text-center text-[13px] text-slate-400">{t("no_results")}</div>}
              {!!results.tasks.length && (
                <ResultGroup icon={<ListChecks size={13} />} label={t("nav_tasks")}>
                  {results.tasks.map((x) => (
                    <ResultRow
                      key={x.id}
                      title={lang === "fa" ? x.title : x.titleEn ?? x.title}
                      meta={relativeDay(parseISO(x.due), lang)}
                      onClick={() => {
                        setPage("tasks");
                        setOpenSearch(false);
                        setQ("");
                      }}
                    />
                  ))}
                </ResultGroup>
              )}
              {!!results.meetings.length && (
                <ResultGroup icon={<CalendarDays size={13} />} label={t("nav_calendar")}>
                  {results.meetings.map((x) => (
                    <ResultRow
                      key={x.id}
                      title={lang === "fa" ? x.title : x.titleEn ?? x.title}
                      meta={`${x.start} · ${x.location}`}
                      onClick={() => {
                        setPage("calendar");
                        setOpenSearch(false);
                        setQ("");
                      }}
                    />
                  ))}
                </ResultGroup>
              )}
              {!!results.people.length && (
                <ResultGroup icon={<UserRound size={13} />} label={t("nav_people")}>
                  {results.people.map((x) => (
                    <ResultRow
                      key={x.id}
                      title={lang === "fa" ? x.name : x.nameEn}
                      meta={lang === "fa" ? x.role : x.roleEn}
                      onClick={() => {
                        setPage("people");
                        setOpenSearch(false);
                        setQ("");
                      }}
                    />
                  ))}
                </ResultGroup>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={() => {
            setOpenBell((v) => !v);
            setOpenProfile(false);
          }}
          className="relative grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.07]"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute top-1.5 end-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
              {lang === "fa" ? toFaDigits(unread) : unread}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setOpenProfile((v) => !v);
            setOpenBell(false);
          }}
          className="flex items-center gap-2 rounded-xl p-1 pe-2 transition hover:bg-slate-100 dark:hover:bg-white/[0.07]"
        >
          <Avatar initials={lang === "fa" ? "شم" : "SM"} color="from-brand-500 to-violet-600" size={32} />
          <div className="hidden text-start sm:block">
            <div className="text-[12px] font-bold text-slate-800 dark:text-white">
              {lang === "fa" ? "شیدا مرادی" : "Sheida Moradi"}
            </div>
            <div className="text-[10px] text-slate-400">{lang === "fa" ? "مدیر اجرایی" : "Chief of Staff"}</div>
          </div>
          <ChevronDown size={14} className="hidden text-slate-400 sm:block" />
        </button>
      </div>

      {/* Notifications dropdown */}
      <AnimatePresence>
        {openBell && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute top-[60px] end-3 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-ink-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/[0.07]">
              <span className="text-[13px] font-bold text-slate-800 dark:text-white">{t("notifications")}</span>
              <button onClick={readAllNotifications} className="text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400">
                {t("mark_all_read")}
              </button>
            </div>
            <div className="scroll-thin max-h-[52vh] overflow-y-auto">
              {notifications.length === 0 && (
                <div className="px-4 py-10 text-center text-[13px] text-slate-400">{t("no_notifications")}</div>
              )}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    readNotification(n.id);
                    setOpenBell(false);
                    if (n.type === "meeting") go({ page: "calendar", date: isoKey(new Date()) });
                    else if (n.type === "task") go({ page: "tasks" });
                    else if (n.type === "ai") go({ page: "ai" });
                    else go({ page: "settings" });
                  }}
                  className={cn(
                    "flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-start transition last:border-0 hover:bg-slate-50 dark:border-white/[0.04] dark:hover:bg-white/[0.04]",
                    !n.read && "bg-brand-50/40 dark:bg-brand-500/[0.07]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                      n.type === "meeting" && "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
                      n.type === "task" && "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
                      n.type === "ai" && "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
                      n.type === "system" && "bg-slate-100 text-slate-500 dark:bg-white/[0.07] dark:text-slate-400",
                    )}
                  >
                    {n.type === "meeting" && <CalendarDays size={15} />}
                    {n.type === "task" && <ListChecks size={15} />}
                    {n.type === "ai" && <Sparkles size={15} />}
                    {n.type === "system" && <CheckCircle2 size={15} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">
                        {lang === "fa" ? n.title : n.titleEn}
                      </span>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-5 text-slate-500 dark:text-slate-400">
                      {lang === "fa" ? n.body : n.bodyEn}
                    </span>
                    <span className="mt-1 block text-[10px] text-slate-400">{timeAgo(n.at, lang)}</span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile dropdown */}
      <AnimatePresence>
        {openProfile && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute top-[60px] end-3 w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-ink-900"
          >
            <div className="mb-2 flex items-center gap-3 rounded-xl bg-gradient-to-br from-brand-500/10 to-violet-500/10 p-3">
              <Avatar initials={lang === "fa" ? "شم" : "SM"} color="from-brand-500 to-violet-600" size={40} />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold text-slate-800 dark:text-white">
                  {lang === "fa" ? "شیدا مرادی" : "Sheida Moradi"}
                </div>
                <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">sheida@smartsec.ir</div>
              </div>
            </div>
            <div className="space-y-0.5">
              <MenuRow icon={<CircleUser size={15} />} label={t("profile")} onClick={() => { go({ page: "people" }); setOpenProfile(false); }} />
              <MenuRow
                icon={<Sparkles size={15} />}
                label={hasPro ? `اشتراک حرفه‌ای (${balance ?? 0} توکن)` : "ارتقا به حرفه‌ای"}
                onClick={() => { setOpenProfile(false); setOpenToken(true); }}
              />
              <MenuRow icon={<Settings size={15} />} label={t("nav_settings")} onClick={() => { go({ page: "settings" }); setOpenProfile(false); }} />
              <MenuRow
                icon={<LogOut size={15} />}
                label={t("logout")}
                danger
                onClick={() => {
                  setOpenProfile(false);
                  pushToast(lang === "fa" ? "این یک نسخهٔ نمایشی است — خروج واقعی وجود ندارد" : "This is a demo build — no real sign-out", "info");
                }}
              />
            </div>
            <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-400 dark:bg-white/[0.04]">
              <Badge tone="emerald">{lang === "fa" ? "نسخه دمو" : "Demo build"}</Badge>{" "}
              {t("storage_note")}
            </div>
            <TokenModal open={openToken} onClose={() => setOpenToken(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function MenuRow({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick?: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition",
        danger
          ? "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ResultGroup({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function ResultRow({ title, meta, onClick }: { title: string; meta: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start transition hover:bg-slate-100 dark:hover:bg-white/[0.06]"
    >
      <span className="truncate text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{title}</span>
      <span className="shrink-0 text-[10.5px] text-slate-400">{meta}</span>
    </button>
  );
}
