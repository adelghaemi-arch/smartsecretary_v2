import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Files,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  Languages,
  MessagesSquare,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Users,
  X,
} from "lucide-react";
import { cn } from "../utils/cn";
import { useApp } from "../store/AppStore";
import type { DictKey } from "../lib/i18n";
import { toFaDigits } from "../lib/jalali";

export type PageId =
  | "dashboard"
  | "tasks"
  | "calendar"
  | "ai"
  | "docs"
  | "concepts"
  | "people"
  | "followups"
  | "memory"
  | "skills"
  | "chat"
  | "settings";

const groups: { key: DictKey; items: { id: PageId; key: DictKey; icon: typeof Bot }[] }[] = [
  {
    key: "group_main",
    items: [
      { id: "dashboard", key: "nav_dashboard", icon: LayoutDashboard },
      { id: "tasks", key: "nav_tasks", icon: ListChecks },
      { id: "calendar", key: "nav_calendar", icon: CalendarDays },
      { id: "followups", key: "nav_followups", icon: ListChecks },
      { id: "docs", key: "nav_docs", icon: Files },
      { id: "concepts", key: "nav_concepts", icon: GitBranch },
      { id: "people", key: "nav_people", icon: Users },
      { id: "memory", key: "nav_memory", icon: Sparkles },
    ],
  },
  {
    key: "group_ai",
    items: [
      { id: "ai", key: "nav_ai", icon: Sparkles },
      { id: "skills", key: "nav_skills", icon: Sparkles },
      { id: "chat", key: "nav_chat", icon: MessagesSquare },
    ],
  },
  { key: "group_other", items: [{ id: "settings", key: "nav_settings", icon: Settings }] },
];

export default function Sidebar({
  page,
  setPage,
  mobileOpen,
  setMobileOpen,
}: {
  page: PageId;
  setPage: (p: PageId) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) {
  const { t, lang, theme, toggleTheme, toggleLang, sidebarCollapsed, setSidebarCollapsed, tasks, meetings } = useApp();
  const collapsed = sidebarCollapsed;

  const counts: Partial<Record<PageId, number>> = {
    tasks: tasks.filter((x) => x.status !== "done").length,
    calendar: meetings.length,
  };

  const CollapseIcon = lang === "fa" ? (collapsed ? ChevronLeft : ChevronRight) : collapsed ? ChevronRight : ChevronLeft;

  const renderBody = (scope: string) => (
    <div
      className={cn(
        "flex h-full flex-col border-slate-200/80 bg-white/80 backdrop-blur-xl transition-[width] duration-300 dark:border-white/[0.07] dark:bg-ink-950/80",
        lang === "fa" ? "border-l" : "border-r",
        collapsed ? "w-[76px]" : "w-[264px]",
      )}
    >
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-4">
        <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-brand-600/30">
          <Bot size={20} className="text-white" />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 dark:border-ink-950" />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: lang === "fa" ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: lang === "fa" ? 10 : -10 }}
              className="min-w-0 flex-1"
            >
              <div className="truncate text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                {t("appName")}
              </div>
              <div className="truncate text-[10.5px] font-medium text-slate-400 dark:text-slate-500">{t("appTag")}</div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setMobileOpen(false)}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 lg:hidden dark:hover:bg-white/10"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="scroll-thin flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {groups.map((g) => (
          <div key={g.key}>
            {!collapsed && (
              <div className="mb-1.5 px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-600">
                {t(g.key)}
              </div>
            )}
            <div className="space-y-1">
              {g.items.map((it) => {
                const active = page === it.id;
                const Icon = it.icon;
                return (
                  <button
                    key={it.id}
                    onClick={() => {
                      setPage(it.id);
                      setMobileOpen(false);
                    }}
                    title={collapsed ? t(it.key) : undefined}
                    className={cn(
                      "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors",
                      collapsed && "justify-center px-0",
                      active
                        ? "text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId={`nav-active-${scope}`}
                        transition={{ type: "spring", stiffness: 400, damping: 34 }}
                        className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-lg shadow-brand-600/25"
                      />
                    )}
                    <Icon size={18} className="relative z-10 shrink-0" />
                    {!collapsed && <span className="relative z-10 flex-1 truncate text-start">{t(it.key)}</span>}
                    {!collapsed && counts[it.id] ? (
                      <span
                        className={cn(
                          "relative z-10 rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                          active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300",
                        )}
                      >
                        {lang === "fa" ? toFaDigits(counts[it.id]!) : counts[it.id]}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer controls */}
      <div className="shrink-0 space-y-2 border-t border-slate-200/80 p-3 dark:border-white/[0.07]">
        <div className={cn("flex gap-2", collapsed && "flex-col")}>
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? t("theme_light") : t("theme_dark")}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1]"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {!collapsed && <span>{theme === "dark" ? t("theme_light") : t("theme_dark")}</span>}
          </button>
          <button
            onClick={toggleLang}
            title={t("language")}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2.5 text-[12px] font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1]"
          >
            <Languages size={15} />
            <span>{lang === "fa" ? "EN" : "فا"}</span>
          </button>
        </div>
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="hidden w-full items-center justify-center gap-2 rounded-xl py-2 text-[11.5px] font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:flex dark:hover:bg-white/[0.05] dark:hover:text-white"
        >
          <CollapseIcon size={15} />
          {!collapsed && <span>{t("collapse")}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden shrink-0 lg:block">{renderBody("desktop")}</aside>
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[90] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm dark:bg-black/70"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: lang === "fa" ? 300 : -300 }}
              animate={{ x: 0 }}
              exit={{ x: lang === "fa" ? 300 : -300 }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
              className={cn("absolute inset-y-0", lang === "fa" ? "right-0" : "left-0")}
            >
              {renderBody("mobile")}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
