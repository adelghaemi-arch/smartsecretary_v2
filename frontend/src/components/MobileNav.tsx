import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CalendarDays,
  Files,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  Languages,
  Moon,
  MoreHorizontal,
  Settings,
  Sparkles,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "../store/AppStore";
import { cn } from "../utils/cn";
import type { PageId } from "./Sidebar";

interface Props {
  page: PageId;
  setPage: (p: PageId) => void;
}

const MORE_PAGES: PageId[] = ["docs", "concepts", "people", "ai", "settings", "followups", "memory", "skills"];

export default function MobileNav({ page, setPage }: Props) {
  const { lang, mode, setMode, theme, toggleTheme, toggleLang, t } = useApp();
  const [more, setMore] = useState(false);

  const go = (p: PageId | "chat") => {
    setMore(false);
    if (p === "chat") {
      setMode("chat");
      return;
    }
    setPage(p);
    setMode("classic");
  };

  const chatOn = mode === "chat";
  const moreOn = !chatOn && MORE_PAGES.includes(page);

  const tabs: { id: "dashboard" | "tasks" | "chat" | "calendar" | "more"; label: string; icon: typeof Bot }[] = [
    { id: "dashboard", label: lang === "fa" ? "خانه" : "Home", icon: LayoutDashboard },
    { id: "tasks", label: t("nav_tasks"), icon: ListChecks },
    { id: "chat", label: lang === "fa" ? "منشی" : "Chat", icon: Bot },
    { id: "calendar", label: lang === "fa" ? "تقویم" : "Cal", icon: CalendarDays },
    { id: "more", label: lang === "fa" ? "بیشتر" : "More", icon: MoreHorizontal },
  ];

  const extras: { id: PageId; label: string; icon: typeof Bot; grad: string }[] = [
    { id: "followups", label: t("nav_followups"), icon: ListChecks, grad: "from-amber-500 to-orange-500" },
    { id: "memory", label: t("nav_memory"), icon: Sparkles, grad: "from-brand-500 to-indigo-500" },
    { id: "skills", label: t("nav_skills"), icon: Users, grad: "from-rose-500 to-pink-500" },
    { id: "concepts", label: t("nav_concepts"), icon: GitBranch, grad: "from-violet-500 to-fuchsia-500" },
    { id: "docs", label: t("nav_docs"), icon: Files, grad: "from-emerald-500 to-teal-500" },
    { id: "people", label: t("nav_people"), icon: Users, grad: "from-sky-500 to-cyan-500" },
    { id: "ai", label: t("nav_ai"), icon: Sparkles, grad: "from-brand-500 to-violet-500" },
    { id: "settings", label: t("nav_settings"), icon: Settings, grad: "from-slate-500 to-zinc-600" },
  ];

  const isActive = (id: (typeof tabs)[number]["id"]) => {
    if (id === "chat") return chatOn;
    if (id === "more") return moreOn || more;
    return !chatOn && page === id;
  };

  return (
    <>
      <AnimatePresence>
        {more && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] lg:hidden"
          >
            <button className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm dark:bg-black/70" onClick={() => setMore(false)} />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-white/10 bg-white/95 p-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] shadow-2xl dark:border-white/10 dark:bg-ink-900/95"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-white/15" />
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-extrabold text-slate-900 dark:text-white">
                    {lang === "fa" ? "فضای کاری" : "Workspace"}
                  </div>
                  <div className="text-[11px] text-slate-400">{lang === "fa" ? "همه بخش‌ها در یک نگاه" : "Every section, one tap"}</div>
                </div>
                <button onClick={() => setMore(false)} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
                  <X size={15} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {extras.map((x) => {
                  const on = !chatOn && page === x.id;
                  const Icon = x.icon;
                  return (
                    <button
                      key={x.id}
                      onClick={() => go(x.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-2xl border p-3 transition active:scale-95",
                        on
                          ? "border-brand-400/50 bg-brand-50 dark:border-brand-400/40 dark:bg-brand-500/15"
                          : "border-slate-200/80 bg-slate-50/80 dark:border-white/[0.07] dark:bg-white/[0.04]",
                      )}
                    >
                      <span className={cn("grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow", x.grad)}>
                        <Icon size={18} />
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{x.label}</span>
                    </button>
                  );
                })}
                <button
                  onClick={toggleTheme}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/[0.07] dark:bg-white/[0.04]"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white dark:from-amber-400 dark:to-orange-500">
                    {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{theme === "dark" ? t("theme_light") : t("theme_dark")}</span>
                </button>
                <button
                  onClick={toggleLang}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/[0.07] dark:bg-white/[0.04]"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white">
                    <Languages size={18} />
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{lang === "fa" ? "English" : "فارسی"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-0 z-[170] px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-1 lg:hidden">
        <div className="relative mx-auto flex h-[64px] max-w-lg items-end justify-between rounded-[22px] border border-white/40 bg-white/80 px-1.5 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.35)] backdrop-blur-2xl dark:border-white/10 dark:bg-ink-900/80">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.id);
            if (tab.id === "chat") {
              return (
                <button
                  key={tab.id}
                  onClick={() => go("chat")}
                  className="relative -top-4 flex w-[68px] flex-col items-center"
                >
                  <span
                    className={cn(
                      "relative grid h-14 w-14 place-items-center rounded-2xl text-white shadow-xl transition active:scale-95",
                      "bg-gradient-to-br from-brand-500 via-violet-500 to-fuchsia-500 shadow-brand-600/40",
                      active && "ring-4 ring-brand-400/30",
                    )}
                  >
                    {chatOn && (
                      <motion.span
                        animate={{ scale: [1, 1.35], opacity: [0.4, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8 }}
                        className="absolute inset-0 rounded-2xl bg-brand-400"
                      />
                    )}
                    <Bot size={22} className="relative z-10" />
                    <span className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-ink-900" />
                  </span>
                  <span className={cn("mt-1 text-[10px] font-extrabold", active ? "text-brand-600 dark:text-brand-300" : "text-slate-400")}>
                    {tab.label}
                  </span>
                </button>
              );
            }
            return (
              <button
                key={tab.id}
                onClick={() => (tab.id === "more" ? setMore((v) => !v) : go(tab.id))}
                className="relative flex h-full w-[62px] flex-col items-center justify-center gap-0.5"
              >
                {active && (
                  <motion.span
                    layoutId="mnav-pill"
                    className="absolute inset-x-2 top-1.5 h-9 rounded-xl bg-brand-500/12 dark:bg-brand-400/15"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <Icon size={20} className={cn("relative z-10", active ? "text-brand-600 dark:text-brand-300" : "text-slate-400")} />
                <span className={cn("relative z-10 text-[10px] font-bold", active ? "text-brand-600 dark:text-brand-300" : "text-slate-400")}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
