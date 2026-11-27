import { motion } from "framer-motion";
import { Check, Clock, Phone, Plus, RotateCcw, Search, Send, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "../store/AppStore";
import { useAssistant, followMeta, type FollowStatus } from "../store/AssistantStore";
import { useNav } from "../store/Nav";
import { Avatar, Badge, Button, Card, Empty, Field, Modal, inputCls } from "../components/ui";
import { localeDigits, relativeDay } from "../lib/jalali";
import { cn } from "../utils/cn";

const ORDER: FollowStatus[] = ["needs_input", "waiting", "scheduled", "done"];
const channelIcon = { assistant: Send, phone: Phone, message: Send, email: Send } as const;

export default function FollowUps() {
  const { lang, people, t } = useApp();
  const { followUps, pingFollowUp, setFollowStatus, cancelFollowUp, addFollowUp } = useAssistant();
  const { go } = useNav();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", personId: "", status: "needs_input" as FollowStatus, channel: "assistant" as const });
  const num = (v: number | string) => localeDigits(v, lang);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return followUps.filter((f) => !s || f.title.toLowerCase().includes(s) || (f.personName ?? "").toLowerCase().includes(s));
  }, [followUps, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("nav_followups")}</h2>
          <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
            {lang === "fa" ? "منشی کارها را جلو می‌برد و نتیجه را گزارش می‌دهد." : "Your secretary moves work forward and reports back."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-9 items-center gap-2 rounded-xl bg-slate-100/80 px-3 dark:bg-white/[0.05]">
            <Search size={14} className="text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={lang === "fa" ? "جستجو…" : "Search…"} className="w-28 bg-transparent text-[12px] outline-none placeholder:text-slate-400 sm:w-40" />
          </div>
          <Button variant="primary" onClick={() => setOpen(true)}><Plus size={15} /> {lang === "fa" ? "پیگیری جدید" : "New follow-up"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ORDER.map((status) => {
          const list = filtered.filter((f) => f.status === status);
          return (
            <div key={status} className="flex min-h-[200px] flex-col rounded-2xl border border-slate-200/70 bg-slate-50/60 p-2.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className={cn("h-2 w-2 rounded-full", followMeta[status].accent)} />
                <span className="flex-1 text-[12px] font-extrabold text-slate-700 dark:text-slate-200">{followMeta[status][lang]}</span>
                <Badge tone={followMeta[status].tone}>{num(list.length)}</Badge>
              </div>
              <div className="scroll-thin flex-1 space-y-2 overflow-y-auto">
                {list.map((f) => {
                  const p = people.find((x) => x.id === f.personId);
                  const Icon = channelIcon[f.channel] ?? Send;
                  return (
                    <motion.div layout key={f.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/[0.07] dark:bg-ink-900/70">
                      <div className="text-[12px] font-bold leading-5 text-slate-800 dark:text-slate-100">{f.title}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {p ? (
                          <button onClick={() => go({ page: "people", personId: p.id })} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pe-2 ps-0.5 text-[10px] font-semibold text-slate-600 transition hover:bg-brand-100 dark:bg-white/[0.06] dark:text-slate-300">
                            <Avatar initials={p.initials} color={p.avatarColor} size={16} /> {lang === "fa" ? p.name : p.nameEn}
                          </button>
                        ) : (
                          <Badge tone="slate"><UserRound size={9} /> {lang === "fa" ? "بدون مسئول" : "Unassigned"}</Badge>
                        )}
                        <Badge tone="slate"><Icon size={9} /> {lang === "fa" ? "کانال" : "channel"}</Badge>
                      </div>
                      <div className="mt-2 text-[10px] text-slate-400">
                        {f.lastPing ? `${lang === "fa" ? "آخرین پیگیری" : "last ping"}: ${relativeDay(new Date(f.lastPing), lang)}` : `${lang === "fa" ? "ایجاد" : "created"}: ${relativeDay(new Date(f.createdAt), lang)}`}
                      </div>
                      <div className="mt-2 space-y-1 border-t border-dashed border-slate-100 pt-2 dark:border-white/[0.06]">
                        {f.history.slice(-2).map((h, i) => (
                          <div key={i} className="flex gap-1.5 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
                            <Clock size={9} className="mt-0.5 shrink-0" /> <span className="line-clamp-2">{h.text}</span>
                          </div>
                        ))}
                      </div>
                      {status !== "done" && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Button size="sm" variant="soft" onClick={() => pingFollowUp(f.id)}><RotateCcw size={10} /> {lang === "fa" ? "پیگیری مجدد" : "Ping"}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setFollowStatus(f.id, "done")}><Check size={10} /> {lang === "fa" ? "انجام شد" : "Done"}</Button>
                          <Button size="sm" variant="ghost" onClick={() => cancelFollowUp(f.id)}><Trash2 size={10} /></Button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                {list.length === 0 && <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 py-8 text-[11px] text-slate-400 dark:border-white/[0.08]">{lang === "fa" ? "خالی" : "Empty"}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && <Card><Empty icon={<Search size={22} />} text={lang === "fa" ? "نتیجه‌ای نیست" : "Nothing found"} /></Card>}

      <Modal open={open} onClose={() => setOpen(false)} title={lang === "fa" ? "پیگیری جدید" : "New follow-up"}>
        <div className="space-y-3">
          <Field label={lang === "fa" ? "موضوع پیگیری" : "Follow-up title"}>
            <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={lang === "fa" ? "مسئول" : "Owner"}>
              <select value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })} className={inputCls}>
                <option value="">—</option>
                {people.map((p) => <option key={p.id} value={p.id}>{lang === "fa" ? p.name : p.nameEn}</option>)}
              </select>
            </Field>
            <Field label={lang === "fa" ? "وضعیت" : "Status"}>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FollowStatus })} className={inputCls}>
                {ORDER.map((s) => <option key={s} value={s}>{followMeta[s][lang]}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button onClick={() => setOpen(false)}>{lang === "fa" ? "انصراف" : "Cancel"}</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!form.title.trim()) return;
                const p = people.find((x) => x.id === form.personId);
                addFollowUp({ title: form.title, status: form.status, channel: "assistant", personId: form.personId || undefined, personName: p ? (lang === "fa" ? p.name : p.nameEn) : undefined });
                setForm({ title: "", personId: "", status: "needs_input", channel: "assistant" });
                setOpen(false);
              }}
            >
              <Plus size={14} /> {lang === "fa" ? "افزودن" : "Add"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
