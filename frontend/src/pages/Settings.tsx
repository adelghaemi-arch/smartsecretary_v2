import { useState } from "react";
import { Coins, Database, ExternalLink, Globe, Info, Key, Languages, Moon, Palette, RotateCcw, Shield, Sun, Zap } from "lucide-react";
import { useApp } from "../store/AppStore";
import { useTokens } from "../store/TokenStore";
import { Badge, Button, Card, SectionTitle } from "../components/ui";
import TokenModal from "../components/TokenModal";
import { localeDigits } from "../lib/jalali";
import { cn } from "../utils/cn";

export default function Settings() {
  const { t, lang, theme, toggleTheme, setLang, resetAll, pushToast, tasks, meetings, people, notebooks, messages } = useApp();
  const { hasPro, apiKey, balance, refreshBalance, isLoading } = useTokens();
  const [openToken, setOpenToken] = useState(false);
  const num = (n: number | string) => localeDigits(n, lang);

  const stats = [
    { label: t("nav_tasks"), value: tasks.length },
    { label: t("nav_calendar"), value: meetings.length },
    { label: t("nav_people"), value: people.length },
    { label: t("notebooks"), value: notebooks.length },
    { label: t("nav_chat"), value: messages.length },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("settings_title")}</h2>
        <p className="text-[12.5px] text-slate-500 dark:text-slate-400">{t("storage_note")}</p>
      </div>

      <Card className="p-5">
        <SectionTitle icon={<Palette size={16} />} title={t("appearance")} />
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 p-4 dark:border-white/[0.07]">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white dark:from-amber-400 dark:to-orange-500">
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </span>
              <div>
                <div className="text-[13px] font-bold text-slate-800 dark:text-white">{theme === "dark" ? t("theme_dark") : t("theme_light")}</div>
                <div className="text-[11px] text-slate-400">{lang === "fa" ? "بین حالت تاریک و روشن جابجا شوید" : "Switch between dark and light"}</div>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={cn("relative h-7 w-13 rounded-full transition", theme === "dark" ? "bg-brand-500" : "bg-slate-300 dark:bg-white/15")}
            >
              <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", theme === "dark" ? "start-[26px]" : "start-1")} />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 p-4 dark:border-white/[0.07]">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white">
                <Languages size={18} />
              </span>
              <div>
                <div className="text-[13px] font-bold text-slate-800 dark:text-white">{t("language")}</div>
                <div className="text-[11px] text-slate-400">{lang === "fa" ? "راست‌چین فارسی با تقویم جلالی" : "LTR English with Gregorian calendar"}</div>
              </div>
            </div>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/[0.06]">
              {(["fa", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-[12px] font-bold transition",
                    lang === l ? "bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow" : "text-slate-500 dark:text-slate-400",
                  )}
                >
                  {l === "fa" ? "فارسی" : "English"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className={cn("relative overflow-hidden p-5", hasPro ? "bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 text-white" : "")}>
          {hasPro && (
            <div className="grid-bg pointer-events-none absolute inset-0 opacity-20" />
          )}
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
                  hasPro ? "bg-white/20 backdrop-blur" : "bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-lg",
                )}
              >
                {hasPro ? <Coins size={20} /> : <Zap size={20} />}
              </span>
              <div>
                <div className={cn("text-[15px] font-extrabold", hasPro ? "text-white" : "text-slate-900 dark:text-white")}>
                  {hasPro ? (lang === "fa" ? "اشتراک حرفه‌ای فعال" : "Pro plan active") : (lang === "fa" ? "نسخه رایگان" : "Free plan")}
                </div>
                <div className={cn("mt-0.5 text-[11.5px]", hasPro ? "text-white/80" : "text-slate-500 dark:text-slate-400")}>
                  {hasPro
                    ? (lang === "fa" ? `${num(balance ?? 0)} توکن باقی‌مانده` : `${balance ?? 0} tokens remaining`)
                    : (lang === "fa" ? "برای قابلیت‌های هوش مصنوعی توکن لازم است" : "Tokens required for AI features")}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {hasPro ? (
                <Button
                  onClick={refreshBalance}
                  className="border border-white/30 bg-white/15 text-white hover:bg-white/25"
                >
                  <RotateCcw size={14} className={cn(isLoading && "animate-spin")} />
                  {lang === "fa" ? "به‌روزرسانی" : "Refresh"}
                </Button>
              ) : (
                <a
                  href="https://llm.aipg.ir/pricing"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 px-4 py-2 text-[12.5px] font-bold text-white shadow-lg transition hover:brightness-110 active:scale-95"
                >
                  <Coins size={14} /> {lang === "fa" ? "خرید توکن" : "Buy tokens"}
                </a>
              )}
              <Button
                variant={hasPro ? "soft" : "outline"}
                onClick={() => setOpenToken(true)}
                className={cn(hasPro && "border border-white/25 bg-white/10 text-white hover:bg-white/20")}
              >
                <Key size={14} /> {hasPro ? (lang === "fa" ? "مدیریت توکن" : "Manage key") : (lang === "fa" ? "وارد کردن کلید" : "Enter API key")}
              </Button>
            </div>
          </div>
        </div>

        {hasPro && apiKey && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3 dark:border-white/[0.06]">
            <span className="text-[10.5px] font-bold text-slate-400">API KEY</span>
            <code className="truncate rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
              {`${apiKey.slice(0, 6)}••••••••${apiKey.slice(-4)}`}
            </code>
            <a
              href="https://llm.aipg.ir/dashboard"
              target="_blank"
              rel="noreferrer"
              className="ms-auto inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline dark:text-brand-400"
            >
              {lang === "fa" ? "پنل کاربری" : "Dashboard"} <ExternalLink size={10} />
            </a>
          </div>
        )}
        <TokenModal open={openToken} onClose={() => setOpenToken(false)} />
      </Card>

      <Card className="p-5">
        <SectionTitle icon={<Database size={16} />} title={t("data")} />
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-white/[0.04]">
              <div className="text-lg font-extrabold text-slate-800 dark:text-white">{num(s.value)}</div>
              <div className="truncate text-[10px] text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200/70 bg-rose-50/50 p-4 dark:border-rose-400/20 dark:bg-rose-500/[0.06]">
          <div>
            <div className="text-[13px] font-bold text-rose-600 dark:text-rose-300">{t("reset_data")}</div>
            <div className="text-[11px] text-rose-500/80 dark:text-rose-300/70">{t("reset_hint")}</div>
          </div>
          <Button
            variant="danger"
            onClick={() => {
              resetAll();
              pushToast(lang === "fa" ? "داده‌های نمونه بازیابی شد" : "Demo data restored", "warn");
            }}
          >
            <RotateCcw size={15} /> {t("reset_data")}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle icon={<Info size={16} />} title={lang === "fa" ? "درباره" : "About"} />
        <div className="mt-4 space-y-3 text-[12.5px] leading-7 text-slate-600 dark:text-slate-300">
          <p>
            {lang === "fa"
              ? "«منشی هوشمند» یک نمونه اولیه فرانت‌اند خالص است که تمام اطلاعات را در حافظه مرورگر نگه می‌دارد. هیچ سرور، پایگاه داده یا کلید API‌ای در کار نیست."
              : "SmartSecretary is a pure front-end prototype. All data lives in your browser's storage — no server, database or API keys involved."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="brand"><Shield size={10} /> {lang === "fa" ? "بدون سرور" : "No backend"}</Badge>
            <Badge tone="emerald"><Globe size={10} /> {lang === "fa" ? "دوزبانه RTL/LTR" : "Bilingual RTL/LTR"}</Badge>
            <Badge tone="violet">React 19 · TypeScript · Tailwind 4</Badge>
            <Badge tone="sky">{lang === "fa" ? "تقویم جلالی" : "Jalali calendar"}</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
