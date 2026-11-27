import { Lock, Sparkles } from "lucide-react";
import { useState } from "react";
import { useFeature } from "../store/TokenStore";
import TokenModal from "./TokenModal";
import { Button, Card } from "./ui";
import { cn } from "../utils/cn";

interface Props {
  featureId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  overlay?: boolean;
}

export default function FeatureGate({ featureId, children, fallback, overlay = false }: Props) {
  const { allowed } = useFeature(featureId);
  const [openToken, setOpenToken] = useState(false);

  if (allowed) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  if (overlay) {
    return (
      <div className="relative">
        {children}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/80 backdrop-blur-sm dark:border-white/10 dark:bg-ink-950/80">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-lg">
            <Lock size={20} />
          </div>
          <div className="text-center">
            <div className="text-[13px] font-extrabold text-slate-800 dark:text-white">این قابلیت نیاز به اشتراک حرفه‌ای دارد</div>
            <div className="mt-0.5 text-[11px] text-slate-400">برای دسترسی، از llm.aipg.ir توکن تهیه کنید</div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => setOpenToken(true)}>
              <Sparkles size={14} /> فعال‌سازی
            </Button>
            <a
              href="https://llm.aipg.ir/pricing"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-[11.5px] font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06]"
            >
              خرید توکن
            </a>
          </div>
        </div>
        <TokenModal open={openToken} onClose={() => setOpenToken(false)} />
      </div>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="flex flex-col items-center gap-3 p-8">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-xl shadow-brand-600/25">
          <Lock size={24} />
        </div>
        <div className="text-center">
          <div className="text-[15px] font-extrabold text-slate-800 dark:text-white">قفل شده — نیاز به اشتراک حرفه‌ای</div>
          <div className="mt-1 text-[12px] text-slate-400">
            برای استفاده از این قابلیت، باید از{" "}
            <a href="https://llm.aipg.ir" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline dark:text-brand-400">
              llm.aipg.ir
            </a>{" "}
            توکن تهیه کنید.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={() => setOpenToken(true)}>
            <Sparkles size={14} /> وارد کردن توکن
          </Button>
          <a
            href="https://llm.aipg.ir/pricing"
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex items-center rounded-xl border px-4 py-2 text-[12px] font-bold transition",
              "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06]",
            )}
          >
            مشاهده تعرفه‌ها
          </a>
        </div>
      </div>
      <TokenModal open={openToken} onClose={() => setOpenToken(false)} />
    </Card>
  );
}
