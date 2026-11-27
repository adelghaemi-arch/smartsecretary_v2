import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  FileText,
  GitBranch,
  Link2,
  Orbit,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "../store/AppStore";
import { Avatar, Badge, Button, Field, Modal, inputCls } from "../components/ui";
import { Constellation, layoutFocus, layoutUniverse, KIND_HEX } from "../components/Constellation";
import { buildGraph, neighbors as gNeighbors, relatedItems, topConcepts, type GKind, type GNode } from "../lib/graph";
import { useNav } from "../store/Nav";
import { formatDate, localeDigits, parseISO, relativeDay } from "../lib/jalali";
import { cn } from "../utils/cn";
import type { Concept } from "../lib/types";

const groupColor: Record<string, string> = {
  project: "from-indigo-500 via-violet-500 to-fuchsia-500",
  topic: "from-fuchsia-500 to-purple-600",
  team: "from-sky-500 to-cyan-500",
  client: "from-amber-500 to-orange-500",
  event: "from-rose-500 to-pink-500",
};
const groupLabel: Record<string, { fa: string; en: string }> = {
  project: { fa: "پروژه", en: "Project" },
  topic: { fa: "موضوع", en: "Topic" },
  team: { fa: "تیم", en: "Team" },
  client: { fa: "مشتری", en: "Client" },
  event: { fa: "رویداد", en: "Event" },
};
const kindLabel = (k: GKind, lang: "fa" | "en") =>
  ({
    concept: lang === "fa" ? "مفاهیم" : "Concepts",
    person: lang === "fa" ? "افراد" : "People",
    page: lang === "fa" ? "اسناد" : "Docs",
    date: lang === "fa" ? "زمان" : "Dates",
  })[k];

function PeekTab({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11.5px] font-bold transition",
        active ? "bg-white text-slate-900 shadow" : "text-white/70 hover:bg-white/10 hover:text-white",
      )}
    >
      <span className={cn("transition", active ? "text-brand-600" : "text-white/60")}>{icon}</span>
      <span>{label}</span>
      {count > 0 && (
        <span
          className={cn(
            "grid h-4 min-w-4 place-items-center rounded-md px-1 text-[9.5px] font-extrabold",
            active ? "bg-brand-500 text-white" : "bg-white/12 text-white/80",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default function Concepts() {
  const { lang, tasks, meetings, people, notebooks, concepts, toggleConceptLink, addConcept, updateConcept, removeConcept, pushToast } = useApp();
  const { go, target } = useNav();
  const num = (v: number | string) => localeDigits(v, lang);
  const state = useMemo(
    () => ({ tasks, meetings, people, notebooks, concepts, messages: [], agentMessages: [], notifications: [] }) as never,
    [tasks, meetings, people, notebooks, concepts],
  );

  const graph = useMemo(() => buildGraph(state), [state]);
  const top = useMemo(() => topConcepts(state), [state]);
  const [sel, setSel] = useState(`concept:${concepts[0]?.id ?? ""}`);
  const [mode, setMode] = useState<"focus" | "universe">("focus");
  const [q, setQ] = useState("");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tab, setTab] = useState<null | "links" | "people" | "docs" | "work">(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cform, setCform] = useState({
    label: "",
    labelEn: "",
    group: "project" as Concept["group"],
    emoji: "✨",
    description: "",
  });

  // Deep-link: open a specific concept when routed here
  useEffect(() => {
    if (target.page === "concepts" && target.conceptId) {
      setSel(target.conceptId.startsWith("concept:") ? target.conceptId : `concept:${target.conceptId}`);
      setMode("focus");
      setTab(null);
    }
  }, [target]);

  const { center, nodes, edges } = useMemo(() => gNeighbors(graph, sel), [graph, sel]);
  const selectedConcept = concepts.find((c) => `concept:${c.id}` === sel);
  const related = selectedConcept
    ? relatedItems(state, selectedConcept.label)
    : { tasks: [], meetings: [], pages: [], people: [] };
  const linkedPeople = nodes
    .filter((n) => n.kind === "person")
    .map((n) => people.find((p) => `person:${p.id}` === n.id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const laid = useMemo(() => {
    if (mode === "universe") return layoutUniverse([...graph.nodes.values()]);
    if (!center) return [];
    return layoutFocus(center, nodes.slice(0, 14), edges);
  }, [mode, center, nodes, edges, graph]);

  const visEdges = useMemo(() => {
    if (mode === "universe") {
      const ids = new Set(laid.map((l) => l.node.id));
      return graph.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
    }
    return edges;
  }, [mode, laid, graph.edges, edges]);

  const filtered = concepts.filter((c) => !q || c.label.includes(q) || c.labelEn.toLowerCase().includes(q.toLowerCase()));

  // people reachable through this concept (direct tags + task/meeting involvement)
  const shownPeople = useMemo(() => {
    const direct = new Set(related.people.map((p) => p.id));
    const fromGraph = linkedPeople.filter((p) => !direct.has(p.id));
    return [...related.people, ...fromGraph];
  }, [related.people, linkedPeople]);

  const onSelect = (n: GNode) => {
    if (n.kind === "concept") {
      setSel(n.id);
      setMode("focus");
      setTab(null);
    } else if (n.kind === "person") {
      go({ page: "people", personId: n.id.replace("person:", "") });
    } else if (n.kind === "page") {
      const pid = n.id.replace("page:", "");
      for (const nb of notebooks)
        for (const sec of nb.sections)
          if (sec.pages.some((p) => p.id === pid)) go({ page: "docs", nbId: nb.id, secId: sec.id, pageId: pid });
    } else if (n.kind === "date") {
      go({ page: "calendar", date: n.id.replace("date:", "") });
    }
  };

  const startCreateConcept = () => {
    setEditingId(null);
    setCform({ label: "", labelEn: "", group: "project", emoji: "✨", description: "" });
    setFormOpen(true);
  };
  const startEditConcept = (c: Concept) => {
    setEditingId(c.id);
    setCform({
      label: c.label,
      labelEn: c.labelEn,
      group: c.group,
      emoji: c.emoji,
      description: c.description ?? "",
    });
    setFormOpen(true);
  };
  const submitConcept = () => {
    if (!cform.label.trim()) return;
    const color = groupColor[cform.group] ?? "from-brand-500 to-violet-600";
    if (editingId) {
      updateConcept(editingId, {
        label: cform.label.trim(),
        labelEn: cform.labelEn.trim() || cform.label.trim(),
        group: cform.group,
        emoji: cform.emoji || "✨",
        description: cform.description,
        color,
      });
      pushToast(lang === "fa" ? "مفهوم به‌روزرسانی شد" : "Concept updated");
    } else {
      const id = addConcept({
        label: cform.label.trim(),
        labelEn: cform.labelEn.trim() || cform.label.trim(),
        group: cform.group,
        emoji: cform.emoji || "✨",
        description: cform.description,
        color,
      });
      setSel(`concept:${id}`);
      pushToast(lang === "fa" ? "مفهوم جدید ساخته شد" : "Concept created");
    }
    setFormOpen(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Immersive canvas */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 shadow-[0_30px_80px_-30px_rgba(79,70,229,0.55)]">
        <div className="absolute inset-0 bg-[#070b18]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(99,102,241,0.28),transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(168,85,247,0.22),transparent_50%),radial-gradient(ellipse_at_50%_110%,rgba(14,165,233,0.12),transparent_45%)]" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:48px_48px]" />

        {/* HUD */}
        <div className="relative z-20 flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[10.5px] font-bold tracking-wide text-indigo-200 backdrop-blur">
              <Orbit size={11} className="animate-[orbit-spin_8s_linear_infinite]" />
              {lang === "fa" ? "صورت‌فلکی دانش" : "KNOWLEDGE CONSTELLATION"}
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              {lang === "fa" ? "هر ایده، یک ستاره" : "Every idea is a star"}
            </h2>
            <p className="mt-1 hidden max-w-md text-[12px] leading-5 text-white/55 sm:block">
              {lang === "fa"
                ? "پروژه‌ها، افراد، اسناد و زمان‌ها با تگ به هم وصل می‌شوند. روی هر ستاره بزنید تا منظومه‌اش را ببینید."
                : "Projects, people, docs and dates weave together through tags. Tap a star to enter its orbit."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-white/12 bg-black/30 p-1 backdrop-blur">
              {(
                [
                  { id: "focus" as const, label: lang === "fa" ? "منظومه" : "Orbit" },
                  { id: "universe" as const, label: lang === "fa" ? "کهکشان" : "Galaxy" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[11.5px] font-bold transition",
                    mode === m.id ? "bg-white text-slate-900 shadow" : "text-white/60 hover:text-white",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex h-9 items-center gap-2 rounded-full border border-white/12 bg-black/30 px-3 backdrop-blur">
              <Search size={13} className="text-white/40" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={lang === "fa" ? "جستجوی ستاره…" : "Find a star…"}
                className="w-28 bg-transparent text-[12px] text-white outline-none placeholder:text-white/35 sm:w-36"
              />
            </div>
            <button
              onClick={startCreateConcept}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[11.5px] font-extrabold text-slate-900 shadow-lg transition hover:bg-white/90 active:scale-95"
            >
              <Plus size={14} /> {lang === "fa" ? "مفهوم جدید" : "New concept"}
            </button>
          </div>
        </div>

        {/* Full-width canvas */}
        <div className="relative">
          <div className="relative h-[360px] sm:h-[520px] lg:h-[620px]">
            <Constellation
              laid={laid}
              edges={visEdges}
              lang={lang}
              hoverId={hoverId}
              setHoverId={setHoverId}
              selectedId={sel}
              onSelect={onSelect}
            />

            {/* legend */}
            <div className="absolute top-3 end-3 z-20 hidden flex-wrap gap-1.5 sm:flex">
              {(["concept", "person", "page", "date"] as const).map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold text-white/70 backdrop-blur"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: KIND_HEX[k].core, boxShadow: `0 0 8px ${KIND_HEX[k].glow}` }} />
                  {kindLabel(k, lang)}
                  {mode === "focus" && <span className="text-white/40">{num(nodes.filter((n) => n.kind === k).length)}</span>}
                </span>
              ))}
            </div>
          </div>

          {/* Peek bar + expandable sheet */}
          {selectedConcept && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-3 sm:px-5 sm:pb-4">
              <div className="pointer-events-auto w-full max-w-3xl">
                {/* Expandable drawer */}
                <AnimatePresence>
                  {tab && (
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 12, scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 340, damping: 30 }}
                      className="mb-2 max-h-[42vh] overflow-hidden rounded-2xl border border-white/12 bg-slate-950/85 shadow-2xl backdrop-blur-2xl"
                    >
                      <div className="scroll-thin max-h-[42vh] overflow-y-auto p-3">
                        {tab === "links" && (
                          <div className="flex flex-wrap gap-1.5">
                            {concepts
                              .filter((c) => c.id !== selectedConcept.id)
                              .map((c) => {
                                const on = selectedConcept.related.includes(c.id);
                                return (
                                  <span
                                    key={c.id}
                                    className={cn(
                                      "inline-flex items-center overflow-hidden rounded-full text-[11px] font-semibold transition",
                                      on ? "bg-white text-slate-900 shadow" : "bg-white/8 text-white/70 hover:bg-white/15",
                                    )}
                                  >
                                    <button
                                      onClick={() => { setSel(`concept:${c.id}`); setTab(null); }}
                                      className="inline-flex items-center gap-1 py-1 ps-2.5 pe-1.5 transition active:scale-95"
                                      title={lang === "fa" ? "رفتن به این مفهوم" : "Open this concept"}
                                    >
                                      {c.emoji} {lang === "fa" ? c.label : c.labelEn}
                                    </button>
                                    <button
                                      onClick={() => toggleConceptLink(selectedConcept.id, c.id)}
                                      title={on ? (lang === "fa" ? "قطع ارتباط" : "Unlink") : (lang === "fa" ? "ایجاد ارتباط" : "Link")}
                                      className={cn(
                                        "grid h-full w-7 place-items-center transition",
                                        on ? "bg-slate-900/10 text-slate-900 hover:bg-slate-900/20" : "text-white/50 hover:text-white",
                                      )}
                                    >
                                      {on ? <Link2 size={11} /> : <Plus size={11} />}
                                    </button>
                                  </span>
                                );
                              })}
                          </div>
                        )}
                        {tab === "people" && (
                          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {shownPeople.length === 0 && (
                              <div className="col-span-full py-4 text-center text-[11.5px] text-white/40">{lang === "fa" ? "بدون فرد مرتبط" : "No people linked"}</div>
                            )}
                            {shownPeople.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => go({ page: "people", personId: p.id })}
                                className="group flex items-center gap-2.5 rounded-xl bg-white/6 px-2.5 py-2 text-start transition hover:bg-white/14 active:scale-[0.98]"
                              >
                                <Avatar initials={p.initials} color={p.avatarColor} size={28} />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-[12px] font-bold text-white">{lang === "fa" ? p.name : p.nameEn}</div>
                                  <div className="truncate text-[10px] text-white/45">{lang === "fa" ? p.role : p.roleEn}</div>
                                </div>
                                <span className="text-[9.5px] font-bold text-white/35 opacity-0 transition group-hover:opacity-100">
                                  {lang === "fa" ? "پروفایل" : "Profile"}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        {tab === "docs" && (
                          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {related.pages.length === 0 && (
                              <div className="col-span-full py-4 text-center text-[11.5px] text-white/40">{lang === "fa" ? "بدون سند" : "No docs"}</div>
                            )}
                            {related.pages.map((pg) => (
                              <button
                                key={pg.id}
                                onClick={() => go({ page: "docs", nbId: pg.nb, secId: pg.sec, pageId: pg.id })}
                                className="group flex items-center gap-2 rounded-xl bg-white/6 px-2.5 py-2 text-start transition hover:bg-white/14 active:scale-[0.98]"
                              >
                                <span className="text-base">{pg.emoji}</span>
                                <span className="truncate text-[11.5px] font-semibold text-white/90">{pg.title}</span>
                                <FileText size={11} className="ms-auto shrink-0 text-white/30 transition group-hover:text-white/70" />
                              </button>
                            ))}
                          </div>
                        )}
                        {tab === "work" && (
                          <div className="space-y-1">
                            {related.tasks.length + related.meetings.length === 0 && (
                              <div className="py-4 text-center text-[11.5px] text-white/40">{lang === "fa" ? "بدون کار یا جلسه" : "Nothing scheduled"}</div>
                            )}
                            {related.tasks.slice(0, 5).map((x) => (
                              <button
                                key={x.id}
                                onClick={() => go({ page: "tasks", taskId: x.id })}
                                className="flex w-full items-center gap-2 rounded-xl bg-white/6 px-2.5 py-1.5 text-start transition hover:bg-white/14 active:scale-[0.98]"
                              >
                                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", x.status === "done" ? "bg-emerald-400" : "bg-amber-400")} />
                                <span className={cn("flex-1 truncate text-[11.5px] font-semibold text-white/90", x.status === "done" && "line-through opacity-50")}>
                                  {lang === "fa" ? x.title : x.titleEn ?? x.title}
                                </span>
                                <span className="text-[9.5px] text-white/40">{relativeDay(parseISO(x.due), lang)}</span>
                              </button>
                            ))}
                            {related.meetings.slice(0, 4).map((m) => (
                              <button
                                key={m.id}
                                onClick={() => go({ page: "calendar", meetingId: m.id, date: m.date })}
                                className="flex w-full items-center gap-2 rounded-xl bg-white/6 px-2.5 py-1.5 text-start transition hover:bg-white/14 active:scale-[0.98]"
                              >
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                                <span className="flex-1 truncate text-[11.5px] font-semibold text-white/90">{lang === "fa" ? m.title : m.titleEn ?? m.title}</span>
                                <span className="text-[9.5px] text-white/40">{formatDate(parseISO(m.date), lang, { short: true })}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Peek bar (always visible) */}
                <motion.div
                  layout
                  className="flex items-center gap-2 rounded-2xl border border-white/12 bg-slate-950/70 p-1.5 shadow-2xl backdrop-blur-2xl"
                >
                  <div className={cn("flex min-w-0 items-center gap-2 rounded-xl bg-gradient-to-br px-2.5 py-1.5", groupColor[selectedConcept.group])}>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/25 text-base backdrop-blur">{selectedConcept.emoji}</span>
                    <div className="hidden min-w-0 sm:block">
                      <div className="truncate text-[12px] font-extrabold text-white">{lang === "fa" ? selectedConcept.label : selectedConcept.labelEn}</div>
                      <div className="truncate text-[9.5px] font-semibold text-white/75">{groupLabel[selectedConcept.group][lang]}</div>
                    </div>
                  </div>
                  <div className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto">
                    <PeekTab
                      icon={<Link2 size={12} />}
                      label={lang === "fa" ? "پیوند" : "Links"}
                      count={selectedConcept.related.length}
                      active={tab === "links"}
                      onClick={() => setTab(tab === "links" ? null : "links")}
                    />
                    <PeekTab
                      icon={<Users size={12} />}
                      label={lang === "fa" ? "افراد" : "People"}
                      count={linkedPeople.length}
                      active={tab === "people"}
                      onClick={() => setTab(tab === "people" ? null : "people")}
                    />
                    <PeekTab
                      icon={<FileText size={12} />}
                      label={lang === "fa" ? "اسناد" : "Docs"}
                      count={related.pages.length}
                      active={tab === "docs"}
                      onClick={() => setTab(tab === "docs" ? null : "docs")}
                    />
                    <PeekTab
                      icon={<CalendarDays size={12} />}
                      label={lang === "fa" ? "کار" : "Work"}
                      count={related.tasks.length + related.meetings.length}
                      active={tab === "work"}
                      onClick={() => setTab(tab === "work" ? null : "work")}
                    />
                  </div>
                  <button
                    onClick={() => startEditConcept(selectedConcept)}
                    title={lang === "fa" ? "ویرایش مفهوم" : "Edit concept"}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <Pencil size={14} />
                  </button>
                  {tab && (
                    <button
                      onClick={() => setTab(null)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Galaxy of concepts */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <GitBranch size={16} className="text-brand-500" />
          <h3 className="text-[14px] font-extrabold text-slate-800 dark:text-white">{lang === "fa" ? "کهکشان پروژه‌ها" : "Project galaxy"}</h3>
          <Badge tone="brand">
            <Sparkles size={10} /> {num(concepts.length)}
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, i) => {
            const deg = top.find((x) => x.node.id === `concept:${c.id}`)?.degree ?? 0;
            const active = `concept:${c.id}` === sel;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -4, scale: 1.015 }}
                onClick={() => {
                  setSel(`concept:${c.id}`);
                  setMode("focus");
                }}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-4 text-start transition",
                  active
                    ? "border-transparent shadow-xl shadow-brand-600/25"
                    : "border-slate-200/80 bg-white hover:border-brand-300 dark:border-white/[0.07] dark:bg-white/[0.03] dark:hover:border-brand-400/40",
                )}
              >
                {active && <div className={cn("absolute inset-0 bg-gradient-to-br", groupColor[c.group])} />}
                <div className={cn("relative flex items-start gap-3", active && "text-white")}>
                  <span
                    className={cn(
                      "grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl shadow-lg",
                      active ? "bg-white/20 backdrop-blur" : `bg-gradient-to-br text-white ${groupColor[c.group]}`,
                    )}
                  >
                    {c.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-[14px] font-extrabold", active ? "text-white" : "text-slate-800 dark:text-slate-100")}>
                      {lang === "fa" ? c.label : c.labelEn}
                    </span>
                    <span className={cn("mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px]", active ? "text-white/75" : "text-slate-400")}>
                      <span className={cn("rounded-md px-1.5 py-0.5 font-bold", active ? "bg-white/20" : "bg-slate-100 dark:bg-white/[0.06]")}>
                        {groupLabel[c.group][lang]}
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <Link2 size={9} /> {num(deg)} {lang === "fa" ? "رشته" : "threads"}
                      </span>
                    </span>
                    {c.description && (
                      <span className={cn("mt-2 block line-clamp-2 text-[11px] leading-5", active ? "text-white/80" : "text-slate-500 dark:text-slate-400")}>
                        {c.description}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 flex-col gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEditConcept(c); }}
                      className={cn("grid h-8 w-8 place-items-center rounded-lg transition", active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400 hover:text-brand-600 dark:bg-white/[0.06]")}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeConcept(c.id);
                        if (sel === `concept:${c.id}`) setSel(`concept:${concepts.find((x) => x.id !== c.id)?.id ?? ""}`);
                        pushToast(lang === "fa" ? "مفهوم حذف شد" : "Concept removed", "warn");
                      }}
                      className={cn("grid h-8 w-8 place-items-center rounded-lg transition", active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-300 hover:text-rose-500 dark:bg-white/[0.06]")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingId(null); }}
        title={editingId ? (lang === "fa" ? "ویرایش مفهوم" : "Edit concept") : (lang === "fa" ? "مفهوم جدید" : "New concept")}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-[72px_1fr] gap-3">
            <Field label={lang === "fa" ? "نماد" : "Emoji"}>
              <input value={cform.emoji} onChange={(e) => setCform({ ...cform, emoji: e.target.value.slice(0, 4) })} className={cn(inputCls, "text-center text-xl")} />
            </Field>
            <Field label={lang === "fa" ? "عنوان" : "Title"}>
              <input autoFocus value={cform.label} onChange={(e) => setCform({ ...cform, label: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={lang === "fa" ? "عنوان انگلیسی" : "English title"}>
              <input dir="ltr" value={cform.labelEn} onChange={(e) => setCform({ ...cform, labelEn: e.target.value })} className={inputCls} />
            </Field>
            <Field label={lang === "fa" ? "گروه" : "Group"}>
              <select value={cform.group} onChange={(e) => setCform({ ...cform, group: e.target.value as Concept["group"] })} className={inputCls}>
                {(Object.keys(groupLabel) as Concept["group"][]).map((g) => (
                  <option key={g} value={g}>{groupLabel[g][lang]}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={lang === "fa" ? "توضیحات / یادداشت" : "Description / notes"}>
            <textarea
              value={cform.description}
              onChange={(e) => setCform({ ...cform, description: e.target.value })}
              placeholder={lang === "fa" ? "نکته‌ها، زمینه، تصمیم‌ها یا هر یادداشتی درباره این مفهوم…" : "Context, decisions or any note about this concept…"}
              className={cn(inputCls, "min-h-[96px]")}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            {editingId && (
              <Button
                variant="danger"
                onClick={() => {
                  removeConcept(editingId);
                  if (sel === `concept:${editingId}`) setSel(`concept:${concepts.find((x) => x.id !== editingId)?.id ?? ""}`);
                  setFormOpen(false);
                  setEditingId(null);
                  pushToast(lang === "fa" ? "مفهوم حذف شد" : "Concept removed", "warn");
                }}
              >
                <Trash2 size={14} /> {lang === "fa" ? "حذف" : "Delete"}
              </Button>
            )}
            <Button onClick={() => { setFormOpen(false); setEditingId(null); }}>{lang === "fa" ? "انصراف" : "Cancel"}</Button>
            <Button variant="primary" onClick={submitConcept}>
              {editingId ? <Pencil size={14} /> : <Plus size={14} />} {editingId ? (lang === "fa" ? "ذخیره" : "Save") : (lang === "fa" ? "افزودن" : "Add")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
