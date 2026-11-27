import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Bot, CheckCircle2, Info, LayoutDashboard, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import Header from "./components/Header";
import MobileNav from "./components/MobileNav";
import Sidebar, { type PageId } from "./components/Sidebar";
import AiAssistant from "./pages/AiAssistant";
import CalendarPage from "./pages/CalendarPage";
import ChatOS from "./pages/ChatOS";
import Concepts from "./pages/Concepts";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import FollowUps from "./pages/FollowUps";
import Memory from "./pages/Memory";
import People from "./pages/People";
import Settings from "./pages/Settings";
import Skills from "./pages/Skills";
import Tasks from "./pages/Tasks";
import { AppProvider, useApp } from "./store/AppStore";
import { AssistantProvider } from "./store/AssistantStore";
import { NavProvider, useNav } from "./store/Nav";
import { TokenProvider } from "./store/TokenStore";
import { cn } from "./utils/cn";

function ClassicShell({ page, setPage }: { page: PageId; setPage: (p: PageId) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        (document.querySelector("header input") as HTMLInputElement | null)?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar page={page} setPage={setPage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header page={page} setPage={setPage} onOpenMobile={() => setMobileOpen(true)} />
        <main className="scroll-thin flex-1 overflow-y-auto p-3 pb-[calc(6.25rem+env(safe-area-inset-bottom))] sm:p-5 lg:pb-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="mx-auto w-full max-w-[1500px]"
            >
              {page === "dashboard" && <Dashboard setPage={setPage} />}
              {page === "tasks" && <Tasks />}
              {page === "calendar" && <CalendarPage />}
              {page === "ai" && <AiAssistant />}
              {page === "docs" && <Documents />}
              {page === "concepts" && <Concepts />}
              {page === "people" && <People />}
              {page === "followups" && <FollowUps />}
              {page === "memory" && <Memory />}
              {page === "skills" && <Skills />}
              {page === "chat" && <ChatOS variant="panel" />}
              {page === "settings" && <Settings />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function ModeFab() {
  const { mode, setMode, lang, tasks, meetings } = useApp();
  const toChat = mode === "classic";
  const today = new Date().toISOString().slice(0, 10);
  const pending = tasks.filter((x) => x.status !== "done" && x.due <= today).length + meetings.filter((m) => m.date === today).length;
  const label = toChat
    ? lang === "fa" ? "گفتگو با منشی" : "Talk to secretary"
    : lang === "fa" ? "نمای کلاسیک" : "Classic workspace";

  return (
    <motion.button
      layout
      onClick={() => setMode(toChat ? "chat" : "classic")}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.35 }}
      className={cn(
        "group fixed end-6 z-[150] hidden items-center gap-2.5 rounded-2xl px-4 py-3.5 text-white shadow-2xl transition-all active:scale-95 lg:flex",
        toChat
          ? "bottom-6 bg-gradient-to-br from-brand-500 via-violet-500 to-fuchsia-500 shadow-brand-600/40"
          : "bottom-6 bg-gradient-to-br from-slate-800 to-slate-900 shadow-slate-900/40 dark:from-white dark:to-slate-200 dark:text-slate-900",
      )}
    >
      {toChat && (
        <motion.span
          animate={{ scale: [1, 1.6], opacity: [0.45, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 -z-10 rounded-2xl bg-brand-500"
        />
      )}
      {toChat ? <Bot size={19} /> : <LayoutDashboard size={18} />}
      <span className="whitespace-nowrap text-[12.5px] font-extrabold">{label}</span>
      {toChat && pending > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white/25 px-1.5 text-[10px] font-bold">
          {lang === "fa" ? pending.toLocaleString("fa-IR") : pending}
        </span>
      )}
      {!toChat && <Sparkles size={13} className="opacity-60" />}
    </motion.button>
  );
}

function Shell() {
  const { dir, toasts, mode, setMode } = useApp();
  const { target, stamp } = useNav();
  const [page, setPage] = useState<PageId>("dashboard");

  // Deep links: every in-app click routes through the nav target
  useEffect(() => {
    if (stamp === 0) return;
    setPage(target.page);
    setMode(target.page === "chat" ? "chat" : "classic");
  }, [target, stamp, setMode]);

  return (
    <div dir={dir} className="relative h-dvh w-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-ink-950 dark:text-slate-200">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 start-1/4 h-[420px] w-[420px] rounded-full bg-brand-500/10 blur-[120px] dark:bg-brand-500/15" />
        <div className="absolute -bottom-52 end-1/4 h-[420px] w-[420px] rounded-full bg-fuchsia-500/10 blur-[120px] dark:bg-violet-600/15" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.995 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className="h-full w-full"
        >
          {mode === "chat" ? <ChatOS variant="full" /> : <ClassicShell page={page} setPage={setPage} />}
        </motion.div>
      </AnimatePresence>

      <MobileNav page={page} setPage={setPage} />
      <ModeFab />

      <div className="pointer-events-none fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] start-1/2 z-[200] flex w-[min(92vw,380px)] -translate-x-1/2 flex-col gap-2 lg:bottom-5 rtl:translate-x-1/2">
        <AnimatePresence>
          {toasts.map((tst) => (
            <motion.div
              key={tst.id}
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className={cn(
                "pointer-events-auto flex items-center gap-2.5 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl",
                tst.tone === "warn"
                  ? "border-amber-300/60 bg-amber-50/95 text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-200"
                  : tst.tone === "info"
                    ? "border-sky-300/60 bg-sky-50/95 text-sky-800 dark:border-sky-400/25 dark:bg-sky-500/15 dark:text-sky-200"
                    : "border-emerald-300/60 bg-emerald-50/95 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-200",
              )}
            >
              {tst.tone === "warn" ? <AlertTriangle size={16} /> : tst.tone === "info" ? <Info size={16} /> : <CheckCircle2 size={16} />}
              <span className="text-[12.5px] font-semibold">{tst.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AssistantProvider>
        <TokenProvider>
          <NavProvider>
            <Shell />
          </NavProvider>
        </TokenProvider>
      </AssistantProvider>
    </AppProvider>
  );
}
