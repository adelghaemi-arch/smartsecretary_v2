import { motion } from "framer-motion";
import { Archive, Brain, Check, Link2, Mic, Pencil, Pin, Plus, Search, Sparkles, Trash2, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "../store/AppStore";
import { useAssistant } from "../store/AssistantStore";
import { Avatar, Badge, Button, Card, Empty, SectionTitle, inputCls } from "../components/ui";
import { localeDigits, parseISO, relativeDay } from "../lib/jalali";
import { cn } from "../utils/cn";

const CONTEXT = {
  work: { fa: "کاری", en: "Work", tone: "brand" },
  family: { fa: "خانوادگی", en: "Family", tone: "violet" },
  medical: { fa: "پزشکی", en: "Medical", tone: "emerald" },
  tech: { fa: "فنی", en: "Technical", tone: "sky" },
} as const;

export default function Memory() {
  const { lang, people, updatePerson, pushToast, meetings } = useApp();
  const { preferences, addPreference, updatePreference, removePreference } = useAssistant();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newPref, setNewPref] = useState("");
  const [listening, setListening] = useState(false);
  const [personEdit, setPersonEdit] = useState<string | null>(null);
  const [handle, setHandle] = useState("");
  const num = (v: number | string) => localeDigits(v, lang);

  const weight = (last: string) => {
    const days = Math.max(0, Math.round((Date.now() - parseISO(last).getTime()) / 86400000));
    if (days <= 1) return { label: lang === "fa" ? "امروز/دیروز" : "today/yesterday", pct: 100, days };
    if (days <= 7) return { label: lang === "fa" ? `${num(days)} روز پیش` : `${days}d ago`, pct: 75, days };
    if (days <= 30) return { label: lang === "fa" ? `${num(days)} روز پیش` : `${days}d ago`, pct: 45, days };
    return { label: lang === "fa" ? "کم‌کاربرد" : "Low activity", pct: 20, days };
  };

  const sorted = useMemo(() => {
    const s = q.trim().toLowerCase();
    return people
      .filter((p) => !s || [p.name, p.nameEn, p.role, ...p.tags, p.handle ?? ""].some((x) => x.toLowerCase().includes(s)))
      .sort((a, b) => parseISO(b.lastContact).getTime() - parseISO(a.lastContact).getTime());
  }, [people, q]);

  const active = sorted.filter((p) => !p.archive && weight(p.lastContact).days <= 30);
  const archive = sorted.filter((p) => p.archive || weight(p.lastContact).days > 30);

  const learn = () => {
    if (!newPref.trim()) return;
    addPreference(newPref.trim());
    setNewPref("");
    pushToast(lang === "fa" ? "قانون جدید به حافظه منشی اضافه شد" : "New rule learned");
  };

  const voiceLearn = () => {
    setListening(true);
    const samples = lang === "fa"
      ? ["وقتی می‌گویم گزارش جلسه، اول مصوبات و بعد جدول مسئول و مهلت.", "برای تماس با مشتری‌ها همیشه لحن رسمی داشته باش."]
      : ["When I say meeting report, list decisions first then an owner/deadline table."];
    setTimeout(() => {
      setNewPref(samples[Math.floor(Math.random() * samples.length)]);
      setListening(false);
    }, 1400);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          <Brain size={20} className="text-brand-500" /> {lang === "fa" ? "حافظه، افراد و ترجیحات" : "Memory, people & preferences"}
        </h2>
        <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
          {lang === "fa" ? "ببینید منشی چه چیزهایی یاد گرفته و هر زمان خواستید اصلاحش کنید." : "See what your secretary has learned and refine it anytime."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* People memory */}
        <div className="space-y-3">
          <Card className="p-4">
            <SectionTitle
              icon={<Users size={16} />}
              title={lang === "fa" ? "دفترچه هوشمند افراد" : "Smart people directory"}
              action={<div className="flex h-8 items-center gap-2 rounded-lg bg-slate-100/80 px-2.5 dark:bg-white/[0.05]"><Search size={12} className="text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={lang === "fa" ? "نام، لقب، هندل…" : "name, alias, handle…"} className="w-28 bg-transparent text-[11px] outline-none placeholder:text-slate-400" /></div>}
            />
            <div className="mt-3 space-y-1.5">
              {active.slice(0, 6).map((p) => {
                const w = weight(p.lastContact);
                return (
                  <motion.div layout key={p.id} className="rounded-xl border border-slate-200/80 p-2.5 dark:border-white/[0.07]">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={p.initials} color={p.avatarColor} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{lang === "fa" ? p.name : p.nameEn}</span>
                          {p.handle && <Badge tone="brand">{p.handle}</Badge>}
                        </div>
                        <div className="truncate text-[10.5px] text-slate-400">{lang === "fa" ? p.role : p.roleEn} · {p.org}</div>
                      </div>
                      <div className="w-16 shrink-0 text-end">
                        <div className="mb-1 text-[9.5px] font-bold text-slate-400">{w.label}</div>
                        <div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.07]">
                          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500" style={{ width: `${w.pct}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.tags.slice(0, 3).map((tg) => <Badge key={tg} tone="slate">#{tg}</Badge>)}
                      {p.context && <Badge tone={CONTEXT[p.context].tone}>{CONTEXT[p.context][lang]}</Badge>}
                      <button
                        onClick={() => { setPersonEdit(personEdit === p.id ? null : p.id); setHandle(p.handle ?? ""); }}
                        className="ms-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                      >
                        <Pencil size={9} /> {lang === "fa" ? "شناسه منشی مقابل" : "Secretary handle"}
                      </button>
                    </div>
                    {personEdit === p.id && (
                      <div className="mt-2 flex gap-1.5">
                        <input value={handle} onChange={(e) => setHandle(e.target.value)} dir="ltr" placeholder="@assistant.handle" className={cn(inputCls, "h-8 py-1 text-[11px]")} />
                        <Button size="sm" variant="primary" onClick={() => { updatePerson(p.id, { handle, context: p.context ?? "work" }); setPersonEdit(null); pushToast(lang === "fa" ? "شناسه ذخیره شد" : "Handle saved"); }}><Check size={12} /></Button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-white/[0.06]">
              <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold text-slate-400"><Archive size={11} /> {lang === "fa" ? "کم‌کاربرد / آرشیو" : "Low activity / archive"}</div>
              <div className="flex flex-wrap gap-1.5">
                {archive.map((p) => (
                  <button key={p.id} onClick={() => updatePerson(p.id, { archive: !p.archive })} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pe-2.5 ps-1 text-[10.5px] font-semibold text-slate-500 transition hover:bg-slate-200 dark:bg-white/[0.05] dark:text-slate-400">
                    <Avatar initials={p.initials} color={p.avatarColor} size={18} /> {lang === "fa" ? p.name : p.nameEn}
                  </button>
                ))}
                {archive.length === 0 && <span className="text-[11px] text-slate-400">—</span>}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle icon={<Link2 size={15} />} title={lang === "fa" ? "تاریخچه تعاملات اخیر" : "Recent interactions"} />
            <div className="mt-3 space-y-1.5">
              {meetings.slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.04]">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                  <span className="flex-1 truncate text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">{lang === "fa" ? m.title : m.titleEn ?? m.title}</span>
                  <span className="shrink-0 text-[10px] text-slate-400">{relativeDay(parseISO(m.date), lang)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Learned preferences */}
        <Card className="flex flex-col p-4">
          <SectionTitle icon={<Sparkles size={16} />} title={lang === "fa" ? "قوانین و ترجیحات یادگرفته‌شده" : "Learned rules & preferences"} />
          <div className="mt-3 flex-1 space-y-2">
            {preferences.map((pr) => (
              <div key={pr.id} className="rounded-xl border border-slate-200/80 p-2.5 dark:border-white/[0.07]">
                {editing === pr.id ? (
                  <div className="flex gap-1.5">
                    <input value={draft} onChange={(e) => setDraft(e.target.value)} className={cn(inputCls, "h-8 py-1 text-[11.5px]")} />
                    <Button size="sm" variant="primary" onClick={() => { updatePreference(pr.id, { text: draft }); setEditing(null); }}><Check size={12} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X size={12} /></Button>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <button onClick={() => updatePreference(pr.id, { pinned: !pr.pinned })} title={lang === "fa" ? "پین" : "Pin"} className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md transition", pr.pinned ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-400 dark:bg-white/[0.06]")}>
                      <Pin size={11} />
                    </button>
                    <p className="flex-1 text-[11.8px] leading-6 text-slate-700 dark:text-slate-200">{pr.text}</p>
                    <button onClick={() => { setEditing(pr.id); setDraft(pr.text); }} className="grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:text-brand-600"><Pencil size={11} /></button>
                    <button onClick={() => removePreference(pr.id)} className="grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:text-rose-500"><Trash2 size={11} /></button>
                  </div>
                )}
              </div>
            ))}
            {preferences.length === 0 && <Empty icon={<Sparkles size={20} />} text={lang === "fa" ? "هنوز چیزی یاد نگرفته‌ام" : "Nothing learned yet"} />}
          </div>
          <div className="mt-3 flex gap-1.5 border-t border-slate-100 pt-3 dark:border-white/[0.06]">
            <input value={newPref} onChange={(e) => setNewPref(e.target.value)} onKeyDown={(e) => e.key === "Enter" && learn()} placeholder={lang === "fa" ? "یک قانون جدید به منشی یاد بده…" : "Teach a new rule…"} className={cn(inputCls, "h-9 py-1.5 text-[11.5px]")} />
            <button onClick={voiceLearn} disabled={listening} className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white transition", listening ? "bg-rose-500" : "bg-slate-800 hover:bg-slate-900 dark:bg-white/15")}>
              <Mic size={15} className={listening ? "animate-pulse" : ""} />
            </button>
            <Button size="sm" variant="primary" onClick={learn}><Plus size={13} /></Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
