import { Check, Copy, CreditCard, ExternalLink, Key, Loader2, LogOut, RefreshCw, Shield } from "lucide-react";
import { useState } from "react";
import { useTokens } from "../store/TokenStore";
import { Button, Modal } from "./ui";
import { cn } from "../utils/cn";
import { FEATURES } from "../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function TokenModal({ open, onClose }: Props) {
  const { apiKey, balance, isLoading, error, setApiKey, clearApiKey, refreshBalance, hasPro } = useTokens();
  const [input, setInput] = useState(apiKey ?? "");
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const save = () => {
    if (input.trim().length < 10) return;
    setApiKey(input.trim());
    onClose();
  };

  const proFeatures = Object.values(FEATURES).filter((f) => f.tier === "pro");

  return (
    <Modal open={open} onClose={onClose} title="مدیریت اشتراک و توکن">
      <div className="space-y-4">
        {/* Balance card */}
        <div className={cn("rounded-2xl p-4", hasPro ? "bg-gradient-to-br from-brand-500/10 to-violet-500/10" : "bg-slate-50 dark:bg-white/[0.04]")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("grid h-10 w-10 place-items-center rounded-xl", hasPro ? "bg-gradient-to-br from-brand-500 to-violet-600 text-white" : "bg-slate-200 text-slate-400 dark:bg-white/[0.07]")}>
                <CreditCard size={18} />
              </div>
              <div>
                <div className="text-[13px] font-bold text-slate-800 dark:text-white">{hasPro ? "اشتراک فعال" : "نسخه رایگان"}</div>
                <div className="text-[11px] text-slate-400">
                  {hasPro ? `${balance ?? 0} توکن باقی‌مانده` : "دسترسی محدود به قابلیت‌ها"}
                </div>
              </div>
            </div>
            {hasPro && (
              <button
                onClick={refreshBalance}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:bg-white/[0.07] dark:text-slate-300"
              >
                {isLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                به‌روزرسانی
              </button>
            )}
          </div>
          {error && <div className="mt-2 text-[11px] text-rose-500">{error}</div>}
        </div>

        {/* API Key input */}
        {!hasPro ? (
          <div className="space-y-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                کلید API از{" "}
                <a
                  href="https://llm.aipg.ir"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400"
                >
                  llm.aipg.ir <ExternalLink size={10} />
                </a>
              </span>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  type={showKey ? "text" : "password"}
                  placeholder="sk-..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
                />
                <button
                  onClick={() => setShowKey((v) => !v)}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-400 transition hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300"
                  title={showKey ? "مخفی کردن" : "نمایش"}
                >
                  <Key size={16} />
                </button>
              </div>
            </label>
            <div className="flex justify-end gap-2">
              <Button onClick={onClose}>انصراف</Button>
              <Button variant="primary" onClick={save} disabled={!input.trim() || input.length < 10}>
                <Shield size={14} /> ذخیره توکن
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
              <div className="mb-1.5 text-[11px] font-bold text-slate-400">کلید API فعلی</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-white px-2.5 py-1.5 text-[11.5px] text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                  {showKey ? apiKey : `${apiKey?.slice(0, 8)}...${apiKey?.slice(-4)}`}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(apiKey ?? "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-400 transition hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
                <button
                  onClick={() => {
                    setShowKey((v) => !v);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-400 transition hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300"
                >
                  <Key size={14} />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="danger"
                onClick={() => {
                  clearApiKey();
                  onClose();
                }}
              >
                <LogOut size={14} /> حذف توکن
              </Button>
              <Button onClick={onClose}>بستن</Button>
            </div>
          </div>
        )}

        {/* Pro features list */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase">
            <Shield size={11} /> قابلیت‌های حرفه‌ای
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {proFeatures.map((f) => (
              <div
                key={f.id}
                className={cn(
                  "flex items-start gap-2 rounded-xl border p-2.5",
                  hasPro
                    ? "border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-400/20 dark:bg-emerald-500/[0.07]"
                    : "border-slate-200/80 bg-slate-50 dark:border-white/[0.07] dark:bg-white/[0.03]",
                )}
              >
                <span className="text-lg">{f.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100">{f.name}</div>
                  <div className="text-[10px] text-slate-400">{f.description}</div>
                </div>
                {hasPro && <Check size={14} className="shrink-0 text-emerald-500" />}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        {!hasPro && (
          <a
            href="https://llm.aipg.ir/pricing"
            target="_blank"
            rel="noreferrer"
            className="block rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 p-4 text-center text-white shadow-lg shadow-brand-600/25 transition hover:brightness-110"
          >
            <div className="text-[14px] font-extrabold">خرید توکن و ارتقا به حرفه‌ای</div>
            <div className="mt-0.5 text-[11px] text-white/80">دسترسی نامحدود به تمام قابلیت‌های هوش مصنوعی</div>
          </a>
        )}
      </div>
    </Modal>
  );
}
