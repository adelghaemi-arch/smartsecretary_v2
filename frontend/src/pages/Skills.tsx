import { motion } from "framer-motion";
import { Check, Copy, Globe, Mic, Plug, Plus, Send, Shield, Sparkles, Trash2, Wrench, Zap } from "lucide-react";
import { useState } from "react";
import { useApp } from "../store/AppStore";
import { useAssistant, type ToolConn } from "../store/AssistantStore";
import { Badge, Button, Card, Field, Modal, SectionTitle, inputCls } from "../components/ui";
import { localeDigits } from "../lib/jalali";
import { cn } from "../utils/cn";

type Tab = "skills" | "tools" | "network";

const statusMeta: Record<ToolConn["status"], { fa: string; en: string; tone: string; dot: string }> = {
  active: { fa: "فعال", en: "Active", tone: "emerald", dot: "bg-emerald-500" },
  needs_config: { fa: "نیازمند پیکربندی", en: "Needs setup", tone: "amber", dot: "bg-amber-500" },
  offline: { fa: "قطع", en: "Offline", tone: "rose", dot: "bg-rose-500" },
};

export default function Skills() {
  const { lang, pushToast, selfAccountId } = useApp();
  const { skills, tools, secretaries, addSkill, toggleSkill, removeSkill, addTool, fixTool, addSecretary, updateSecretary } = useAssistant();
  const num = (v: number | string) => localeDigits(v, lang);
  const [tab, setTab] = useState<Tab>("skills");
  const [skillOpen, setSkillOpen] = useState(false);
  const [method, setMethod] = useState<"prompt" | "playbook">("prompt");
  const [prompt, setPrompt] = useState("");
  const [toolOpen, setToolOpen] = useState(false);
  const [toolForm, setToolForm] = useState({ name: "", emoji: "🔌", detail: "", status: "needs_config" as ToolConn["status"] });
  const [secOpen, setSecOpen] = useState(false);
  const [secForm, setSecForm] = useState({ name: "", handle: "", org: "" });
  const [copied, setCopied] = useState(false);

  const handle = `@sheida.assistant`;
  const tabs: { id: Tab; label: string; icon: typeof Sparkles }[] = [
    { id: "skills", label: lang === "fa" ? "کتابخانه مهارت‌ها" : "Skill library", icon: Sparkles },
    { id: "tools", label: lang === "fa" ? "ابزارهای متصل" : "Connected tools", icon: Plug },
    { id: "network", label: lang === "fa" ? "شبکه منشی‌ها" : "Secretary network", icon: Globe },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          <Wrench size={20} className="text-brand-500" /> {lang === "fa" ? "مهارت‌ها، ابزارها و ارتباط بین‌منشی" : "Skills, tools & secretary network"}
        </h2>
        <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
          {lang === "fa" ? "به منشی کار جدید یاد بده، ابزار وصل کن و با منشی‌های دیگر هماهنگ کن." : "Teach new skills, connect tools, and coordinate with other assistants."}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className={cn("inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold transition", tab === tb.id ? "bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-lg shadow-brand-600/25" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/[0.05] dark:text-slate-400")}>
            <tb.icon size={14} /> {tb.label}
          </button>
        ))}
      </div>

      {tab === "skills" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setSkillOpen(true)}><Plus size={15} /> {lang === "fa" ? "آموزش مهارت جدید" : "Teach a new skill"}</Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {skills.map((sk, i) => (
              <motion.div key={sk.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className={cn("h-full p-4", !sk.enabled && "opacity-60")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow"><Sparkles size={16} /></span>
                      <div>
                        <div className="text-[12.5px] font-extrabold text-slate-800 dark:text-slate-100">{sk.title}</div>
                        <div className="text-[10px] text-slate-400">{sk.kind === "playbook" ? (lang === "fa" ? "رویه گام‌به‌گام" : "Playbook") : (lang === "fa" ? "مهارت پرامپتی" : "Prompt skill")} · {num(sk.uses)} {lang === "fa" ? "بار استفاده" : "runs"}</div>
                      </div>
                    </div>
                    <Badge tone={sk.enabled ? "emerald" : "slate"}>{sk.enabled ? (lang === "fa" ? "فعال" : "on") : (lang === "fa" ? "خاموش" : "off")}</Badge>
                  </div>
                  <ul className="mt-3 space-y-1">
                    {sk.steps.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-[10.8px] leading-5 text-slate-600 dark:text-slate-300">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-500" /> {s}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex gap-1.5">
                    <Button size="sm" onClick={() => toggleSkill(sk.id)}><Zap size={11} /> {sk.enabled ? (lang === "fa" ? "خاموش" : "Disable") : (lang === "fa" ? "فعال" : "Enable")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => removeSkill(sk.id)}><Trash2 size={11} /></Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {tab === "tools" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setToolOpen(true)}><Plus size={15} /> {lang === "fa" ? "اتصال ابزار / سرور MCP" : "Connect tool / MCP server"}</Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tools.map((tl) => {
              const st = statusMeta[tl.status];
              return (
                <Card key={tl.id} className="p-4">
                  <div className="flex items-start gap-2.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-lg dark:bg-white/[0.06]">{tl.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-extrabold text-slate-800 dark:text-slate-100">{tl.name}</div>
                      <div className="truncate text-[10.5px] text-slate-400">{tl.detail}</div>
                    </div>
                    <Badge tone={st.tone}><span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} /> {st[lang]}</Badge>
                  </div>
                  <div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-2 dark:bg-white/[0.04]">
                    <div className="text-[9.5px] font-bold text-slate-400">{lang === "fa" ? "آخرین لاگ" : "Latest log"}</div>
                    {tl.log.slice(0, 2).map((l, i) => <div key={i} className="truncate text-[10px] text-slate-500 dark:text-slate-400">• {l}</div>)}
                  </div>
                  {tl.status !== "active" && (
                    <Button size="sm" variant="primary" className="mt-2 w-full" onClick={() => { fixTool(tl.id); pushToast(lang === "fa" ? `${tl.name} فعال شد` : `${tl.name} activated`); }}>
                      <Plug size={12} /> {lang === "fa" ? "اتصال / پیکربندی" : "Connect / configure"}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {tab === "network" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Card className="p-4">
            <SectionTitle icon={<Send size={15} />} title={lang === "fa" ? "منشی من" : "My assistant"} />
            <div className="mt-3 rounded-2xl bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 p-4 text-white">
              <div className="text-[13px] font-extrabold">منشی شیدا مرادی</div>
              <div className="mt-0.5 text-[10.5px] text-white/70">{lang === "fa" ? "شناسه اشتراک‌گذاری" : "Share handle"}</div>
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 backdrop-blur">
                <code className="flex-1 truncate text-[11.5px]">{handle}</code>
                <button onClick={() => { navigator.clipboard?.writeText(handle); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="grid h-7 w-7 place-items-center rounded-lg bg-white/20">
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
              <div className="mt-2 text-[10px] text-white/60">{lang === "fa" ? "حساب شما:" : "Your account:"} {selfAccountId ?? "acc_self_001"}</div>
            </div>
            <SectionTitle icon={<Shield size={15} />} title={lang === "fa" ? "حریم خصوصی و مجوزها" : "Privacy & permissions"} />
            <div className="mt-3 space-y-2">
              {secretaries.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200/80 p-2.5 dark:border-white/[0.07]">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-300"><Globe size={13} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11.5px] font-bold text-slate-800 dark:text-slate-100">{s.name}</div>
                      <div className="truncate text-[10px] text-slate-400" dir="ltr">{s.handle}</div>
                    </div>
                    <Badge tone={s.status === "connected" ? "emerald" : "amber"}>{s.status === "connected" ? (lang === "fa" ? "متصل" : "linked") : (lang === "fa" ? "در انتظار" : "pending")}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Perm on={s.allowCalendar} label={lang === "fa" ? "زمان‌های آزاد تقویم" : "Free calendar slots"} onClick={() => updateSecretary(s.id, { allowCalendar: !s.allowCalendar })} />
                    <Perm on={s.allowTopics} label={lang === "fa" ? "موضوع جلسات" : "Meeting topics"} onClick={() => updateSecretary(s.id, { allowTopics: !s.allowTopics })} />
                    <Perm on={s.confirmCommitments} label={lang === "fa" ? "تأیید قبل از تعهد" : "Confirm before commitments"} onClick={() => updateSecretary(s.id, { confirmCommitments: !s.confirmCommitments })} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col p-4">
            <SectionTitle icon={<Globe size={15} />} title={lang === "fa" ? "منشی‌های متصل" : "Connected assistants"} action={<Button size="sm" onClick={() => setSecOpen(true)}><Plus size={12} /> {lang === "fa" ? "افزودن" : "Add"}</Button>} />
            <div className="mt-3 space-y-1.5">
              {secretaries.map((s) => (
                <div key={s.id} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.04]">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 text-[10px] font-bold text-white">{s.name.slice(4, 6)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11.5px] font-bold text-slate-800 dark:text-slate-100">{s.name}</div>
                    <div className="truncate text-[10px] text-slate-400">{s.org} · <span dir="ltr">{s.handle}</span></div>
                  </div>
                  <Badge tone={s.status === "connected" ? "emerald" : "slate"}>{s.status === "connected" ? (lang === "fa" ? "فعال" : "active") : (lang === "fa" ? "در انتظار" : "pending")}</Badge>
                </div>
              ))}
            </div>
            <div className="mt-auto rounded-xl border border-dashed border-slate-200 p-3 text-[10.5px] leading-5 text-slate-500 dark:border-white/[0.08] dark:text-slate-400">
              <Mic size={12} className="mb-1 inline" /> {lang === "fa" ? "می‌توانید بگویید: «به منشی دکتر صدر بگو جلسه فردا تأیید شد، اما موضوعش را نگو.»" : "Try: “Tell Dr. Sadr's assistant tomorrow's meeting is confirmed, but don't share the topic.”"}
            </div>
          </Card>
        </div>
      )}

      {/* skill modal */}
      <Modal open={skillOpen} onClose={() => setSkillOpen(false)} title={lang === "fa" ? "آموزش مهارت جدید" : "Teach a new skill"}>
        <div className="space-y-3">
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/[0.06]">
            {(["prompt", "playbook"] as const).map((m) => (
              <button key={m} onClick={() => setMethod(m)} className={cn("flex-1 rounded-lg py-1.5 text-[11.5px] font-bold transition", method === m ? "bg-white text-slate-900 shadow dark:bg-white/15 dark:text-white" : "text-slate-500")}>
                {m === "prompt" ? (lang === "fa" ? "با زبان ساده" : "Plain prompt") : (lang === "fa" ? "گام‌به‌گام" : "Playbook")}
              </button>
            ))}
          </div>
          <Field label={lang === "fa" ? "توضیح دهید منشی چه کاری انجام دهد" : "Describe what the assistant should do"}>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} placeholder={lang === "fa" ? "هر وقت گفتم گزارش جلسه بساز، اول مصوبات، بعد مسئول هر کار و زمان تحویل را جدول کن." : "Whenever I say build a meeting report, list decisions first, then an owner/deadline table."} className={cn(inputCls, "resize-none leading-6")} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setSkillOpen(false)}>{lang === "fa" ? "انصراف" : "Cancel"}</Button>
            <Button variant="primary" onClick={() => {
              if (!prompt.trim()) return;
              const parts = prompt.split(/[،.\n]/).map((x) => x.trim()).filter(Boolean);
              addSkill({ title: prompt.slice(0, 42), kind: method, steps: parts.length ? parts : [prompt], enabled: true });
              setPrompt(""); setSkillOpen(false);
              pushToast(lang === "fa" ? "مهارت جدید ذخیره و فعال شد" : "New skill saved and enabled");
            }}><Sparkles size={14} /> {lang === "fa" ? "ذخیره و فعال‌سازی" : "Save & enable"}</Button>
          </div>
        </div>
      </Modal>

      {/* tool modal */}
      <Modal open={toolOpen} onClose={() => setToolOpen(false)} title={lang === "fa" ? "اتصال ابزار / MCP" : "Connect tool / MCP"}>
        <div className="space-y-3">
          <div className="grid grid-cols-[70px_1fr] gap-3">
            <Field label={lang === "fa" ? "نماد" : "Emoji"}><input value={toolForm.emoji} onChange={(e) => setToolForm({ ...toolForm, emoji: e.target.value.slice(0, 3) })} className={cn(inputCls, "text-center text-lg")} /></Field>
            <Field label={lang === "fa" ? "نام ابزار / سرور" : "Tool / server name"}><input value={toolForm.name} onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label={lang === "fa" ? "آدرس یا توضیح اتصال (Webhook / MCP Endpoint)" : "Webhook / MCP endpoint"}><input dir="ltr" value={toolForm.detail} onChange={(e) => setToolForm({ ...toolForm, detail: e.target.value })} placeholder="https://mcp.example.com/…" className={inputCls} /></Field>
          <Field label={lang === "fa" ? "وضعیت اولیه" : "Initial status"}>
            <select value={toolForm.status} onChange={(e) => setToolForm({ ...toolForm, status: e.target.value as ToolConn["status"] })} className={inputCls}>
              <option value="needs_config">{statusMeta.needs_config[lang]}</option>
              <option value="active">{statusMeta.active[lang]}</option>
              <option value="offline">{statusMeta.offline[lang]}</option>
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setToolOpen(false)}>{lang === "fa" ? "انصراف" : "Cancel"}</Button>
            <Button variant="primary" onClick={() => { if (!toolForm.name.trim()) return; addTool(toolForm); setToolForm({ name: "", emoji: "🔌", detail: "", status: "needs_config" }); setToolOpen(false); pushToast(lang === "fa" ? "ابزار اضافه شد" : "Tool added"); }}><Plug size={14} /> {lang === "fa" ? "افزودن" : "Add"}</Button>
          </div>
        </div>
      </Modal>

      {/* secretary modal */}
      <Modal open={secOpen} onClose={() => setSecOpen(false)} title={lang === "fa" ? "افزودن منشی دیگر" : "Add another assistant"}>
        <div className="space-y-3">
          <Field label={lang === "fa" ? "نام منشی" : "Assistant name"}><input value={secForm.name} onChange={(e) => setSecForm({ ...secForm, name: e.target.value })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={lang === "fa" ? "هندل / شناسه" : "Handle"}><input dir="ltr" value={secForm.handle} onChange={(e) => setSecForm({ ...secForm, handle: e.target.value })} placeholder="@name.assistant" className={inputCls} /></Field>
            <Field label={lang === "fa" ? "سازمان" : "Organization"}><input value={secForm.org} onChange={(e) => setSecForm({ ...secForm, org: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setSecOpen(false)}>{lang === "fa" ? "انصراف" : "Cancel"}</Button>
            <Button variant="primary" onClick={() => { if (!secForm.name.trim()) return; addSecretary({ ...secForm, status: "pending", allowCalendar: false, allowTopics: false, confirmCommitments: true }); setSecForm({ name: "", handle: "", org: "" }); setSecOpen(false); pushToast(lang === "fa" ? "درخواست اتصال منشی ارسال شد" : "Assistant link requested"); }}>
              <Plus size={14} /> {lang === "fa" ? "درخواست اتصال" : "Request link"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Perm({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9.5px] font-bold transition", on ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 text-slate-400 line-through dark:bg-white/[0.06]")}>
      {on ? <Check size={9} /> : null} {label}
    </button>
  );
}
