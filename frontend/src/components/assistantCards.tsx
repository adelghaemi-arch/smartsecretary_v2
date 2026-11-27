import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Download, FileText, Link2, Mic, Pencil, RotateCcw, Send, Wrench } from "lucide-react";
import { useState } from "react";
import { useApp } from "../store/AppStore";
import { useAssistant, followMeta } from "../store/AssistantStore";
import { useTokens } from "../store/TokenStore";
import { Avatar, Badge, Button } from "./ui";
import { localeDigits } from "../lib/jalali";
import { cn } from "../utils/cn";
import type { Widget } from "../lib/types";

function Shell({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "amber" | "sky" | "violet" }) {
  const map = {
    slate: "border-slate-200 bg-white dark:border-white/[0.08] dark:bg-ink-900/70",
    amber: "border-amber-300/60 bg-amber-50/70 dark:border-amber-400/25 dark:bg-amber-500/[0.08]",
    sky: "border-sky-300/60 bg-sky-50/60 dark:border-sky-400/25 dark:bg-sky-500/[0.08]",
    violet: "border-violet-300/60 bg-violet-50/60 dark:border-violet-400/25 dark:bg-violet-500/[0.08]",
  } as const;
  return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-2 overflow-hidden rounded-2xl border shadow-sm", map[tone])}>{children}</motion.div>;
}

/* ---------------- Disambiguation ---------------- */
export function DisambiguationCard({ w, onDone }: { w: Extract<Widget, { kind: "disambiguation" }>; onDone: (text: string) => void }) {
  const { lang, people } = useApp();
  const { addPreference } = useAssistant();
  const { go } = useNavSafe();
  const [remember, setRemember] = useState(true);
  const [chosen, setChosen] = useState<string | null>(null);
  const num = (v: number | string) => localeDigits(v, lang);

  const choose = (personId: string, name: string) => {
    setChosen(personId);
    if (remember) addPreference(lang === "fa" ? `وقتی گفتم «${w.command}»، منظورم ${name} است.` : `When I say "${w.command}", I mean ${name}.`);
    onDone(lang === "fa" ? `انتخاب شد: ${name}${remember ? " · برای دفعات بعد به خاطر سپرده شد" : ""}` : `Selected: ${name}${remember ? " · remembered for next time" : ""}`);
  };
  const Arrow = lang === "fa" ? ArrowLeft : ArrowRight;

  return (
    <Shell tone="amber">
      <div className="flex items-center gap-2 border-b border-amber-200/60 px-3.5 py-2.5 dark:border-amber-400/20">
        <AlertTriangle size={14} className="text-amber-500" />
        <span className="flex-1 text-[12px] font-extrabold text-amber-800 dark:text-amber-200">
          {lang === "fa" ? "منظورت کدام است؟" : "Which one did you mean?"}
        </span>
        <Badge tone="amber">{w.command}</Badge>
      </div>
      <div className="space-y-1.5 p-2.5">
        {w.options.map((o) => {
          const p = people.find((x) => x.id === o.personId);
          return (
            <button
              key={o.personId}
              onClick={() => choose(o.personId, o.name)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-start transition",
                chosen === o.personId ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10" : "border-slate-200 bg-white hover:border-brand-300 dark:border-white/[0.07] dark:bg-white/[0.04]",
              )}
            >
              {p ? <Avatar initials={p.initials} color={p.avatarColor} size={32} /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-500 text-[10px] font-bold text-white">+</span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-bold text-slate-800 dark:text-slate-100">{o.name}</span>
                <span className="block truncate text-[10px] text-slate-400">{o.role}</span>
              </span>
              <Badge tone={o.tag.includes("کاری") || o.tag.includes("work") ? "brand" : "violet"}>{o.tag}</Badge>
              {chosen === o.personId ? <Check size={14} className="text-emerald-500" /> : <Arrow size={13} className="text-slate-300" />}
            </button>
          );
        })}
        <label className="flex cursor-pointer items-center gap-2 rounded-xl px-1 pt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-3.5 w-3.5 accent-brand-500" />
          {lang === "fa" ? "این انتخاب را برای مواقع مشابه به خاطر بسپار" : "Remember this choice for similar cases"}
        </label>
        <button
          onClick={() => { setChosen("new"); go({ page: "people" }); }}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-300 py-2 text-[11px] font-bold text-amber-700 transition hover:bg-amber-100/60 dark:border-amber-400/30 dark:text-amber-300"
        >
          + {lang === "fa" ? "تعریف مخاطب جدید" : "Define new contact"}
        </button>
      </div>
      {chosen === "new" && <div className="px-3 pb-2 text-[10.5px] text-slate-400">{num(w.options.length)} {lang === "fa" ? "گزینه موجود بود؛ صفحه مخاطبان باز شد." : "options existed; People page opened."}</div>}
    </Shell>
  );
}

/* ---------------- Missing capability ---------------- */
export function CapabilityCard({ w, onDone }: { w: Extract<Widget, { kind: "capability" }>; onDone: (text: string) => void }) {
  const { lang } = useApp();
  const { tools, fixTool } = useAssistant();
  const { hasPro } = useTokens();
  const { go } = useNavSafe();
  const tool = tools.find((t) => t.name.includes(w.tool));

  return (
    <Shell tone="violet">
      <div className="flex items-start gap-2.5 p-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300"><Wrench size={17} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-extrabold text-violet-800 dark:text-violet-200">
            {lang === "fa" ? "به یک ابزار بیشتر نیاز دارم" : "I need one more tool"}
          </div>
          <p className="mt-1 text-[11.5px] leading-6 text-slate-600 dark:text-slate-300">{lang === "fa" ? w.reason : w.reasonEn}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={tool?.status === "active" ? "emerald" : "amber"}>
              {w.tool} · {tool ? (tool.status === "active" ? (lang === "fa" ? "فعال" : "active") : tool.status === "offline" ? (lang === "fa" ? "قطع" : "offline") : (lang === "fa" ? "نیازمند پیکربندی" : "needs setup")) : (lang === "fa" ? "متصل نیست" : "not connected")}
            </Badge>
            {!hasPro && <Badge tone="slate">{lang === "fa" ? "نیازمند توکن" : "needs tokens"}</Badge>}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={() => { if (tool && tool.status !== "active") fixTool(tool.id); onDone(lang === "fa" ? `${w.tool} فعال و پیکربندی شد ✅` : `${w.tool} connected and configured ✅`); }}>
              <Link2 size={13} /> {lang === "fa" ? "اتصال / آموزش ابزار" : "Connect / teach tool"}
            </Button>
            <Button size="sm" onClick={() => { go({ page: "skills" }); onDone(lang === "fa" ? "صفحه مهارت‌ها و ابزارها باز شد." : "Skills & tools opened."); }}>
              {lang === "fa" ? "تنظیمات ابزار" : "Tool settings"}
            </Button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ---------------- Deliverable ---------------- */
export function DeliverableCard({ w, onDone }: { w: Extract<Widget, { kind: "deliverable" }>; onDone: (text: string) => void }) {
  const { lang, pushToast } = useApp();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(w.body);

  const download = () => {
    const blob = new Blob([`${w.title}\n\n${body}`], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${w.kindLabel || "document"}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    pushToast(lang === "fa" ? "فایل دانلود شد" : "File downloaded");
  };

  return (
    <Shell>
      <div className="flex items-center gap-2 border-b border-slate-100 px-3.5 py-2.5 dark:border-white/[0.06]">
        <FileText size={14} className="text-brand-500" />
        <span className="flex-1 truncate text-[12px] font-extrabold text-slate-800 dark:text-slate-100">{w.title}</span>
        <Badge tone="brand">{w.kindLabel}</Badge>
      </div>
      <div className="p-3">
        {editing ? (
          <textarea value={body} onChange={(e) => setBody(e.target.value)} className="h-32 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11.5px] leading-6 outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200" />
        ) : (
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-2.5 text-[11.5px] leading-6 text-slate-700 dark:bg-white/[0.04] dark:text-slate-300">{body}</pre>
        )}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Button size="sm" variant="primary" onClick={() => onDone(lang === "fa" ? "پیش‌نویس تأیید و ارسال شد ✅" : "Draft approved and sent ✅")}>
            <Send size={12} /> {lang === "fa" ? "تأیید و ارسال" : "Approve & send"}
          </Button>
          <Button size="sm" onClick={() => setEditing((v) => !v)}>
            {editing ? <Check size={12} /> : <Pencil size={12} />} {editing ? (lang === "fa" ? "ذخیره" : "Save") : (lang === "fa" ? "ویرایش" : "Edit")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDone(lang === "fa" ? "حالت ویرایش با صدا فعال شد — بگویید چه چیزی عوض شود." : "Voice edit mode on — tell me what to change.")}>
            <Mic size={12} /> {lang === "fa" ? "ویرایش با صدا" : "Edit by voice"}
          </Button>
          <Button size="sm" variant="ghost" onClick={download}>
            <Download size={12} /> {lang === "fa" ? "دانلود" : "Download"}
          </Button>
        </div>
      </div>
    </Shell>
  );
}

/* ---------------- Follow-up card ---------------- */
export function FollowUpCard({ w, onDone }: { w: Extract<Widget, { kind: "followup" }>; onDone: (text: string) => void }) {
  const { lang, people } = useApp();
  const { followUps, pingFollowUp, setFollowStatus } = useAssistant();
  const { go } = useNavSafe();
  const num = (v: number | string) => localeDigits(v, lang);
  const list = w.ids.length ? followUps.filter((f) => w.ids.includes(f.id)) : followUps.filter((f) => f.status !== "done").slice(0, 4);

  return (
    <Shell>
      <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5 dark:border-white/[0.06]">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-slate-800 dark:text-slate-100">
          <RotateCcw size={13} className="text-sky-500" /> {lang === "fa" ? "پیگیری‌های فعال" : "Active follow-ups"}
        </span>
        <button onClick={() => go({ page: "followups" })} className="text-[10.5px] font-bold text-brand-600 hover:underline dark:text-brand-400">
          {lang === "fa" ? "همه" : "All"}
        </button>
      </div>
      <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
        {list.map((f) => {
          const p = people.find((x) => x.id === f.personId);
          return (
            <div key={f.id} className="px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", followMeta[f.status].accent)} />
                <span className="flex-1 truncate text-[12px] font-bold text-slate-800 dark:text-slate-100">{f.title}</span>
                <Badge tone={followMeta[f.status].tone}>{followMeta[f.status][lang]}</Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 ps-3.5 text-[10px] text-slate-400">
                {p && (
                  <button onClick={() => go({ page: "people", personId: p.id })} className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline dark:text-brand-400">
                    <Avatar initials={p.initials} color={p.avatarColor} size={14} /> {lang === "fa" ? p.name : p.nameEn}
                  </button>
                )}
                <span>{lang === "fa" ? "پیگیری:" : "pinged:"} {f.lastPing ? new Date(f.lastPing).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                <span>· {num(f.history.length)} {lang === "fa" ? "اقدام" : "actions"}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 ps-3.5">
                {f.status !== "done" && (
                  <>
                    <Button size="sm" variant="soft" onClick={() => { pingFollowUp(f.id); onDone(lang === "fa" ? `پیگیری «${f.title}» دوباره ارسال شد 🔔` : `Follow-up "${f.title}" sent again 🔔`); }}>
                      <RotateCcw size={11} /> {lang === "fa" ? "پیگیری مجدد الان" : "Ping now"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setFollowStatus(f.id, "done")}>
                      <Check size={11} /> {lang === "fa" ? "انجام شد" : "Done"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

/* small helper to avoid circular import of nav */
import { useNav } from "../store/Nav";
function useNavSafe() {
  const { go } = useNav();
  return { go };
}
