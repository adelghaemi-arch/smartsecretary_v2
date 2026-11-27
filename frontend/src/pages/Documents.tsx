import { motion } from "framer-motion";
import { Check, ChevronDown, FileText, FolderOpen, Link2, Plus, Search, Star, Tag, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "../store/AppStore";
import { useNav } from "../store/Nav";
import { Badge, Button, Card, Empty, SectionTitle } from "../components/ui";
import { formatDate, localeDigits, parseISO } from "../lib/jalali";
import { cn } from "../utils/cn";

/** Minimal markdown-ish renderer for the preview pane */
function renderBlocks(md: string) {
  const lines = md.split("\n");
  return lines.map((line, i) => {
    const key = `${i}-${line.slice(0, 8)}`;
    if (/^#\s/.test(line)) return <h1 key={key} className="mt-4 mb-2 text-lg font-extrabold text-slate-900 first:mt-0 dark:text-white">{line.replace(/^#\s/, "")}</h1>;
    if (/^##\s/.test(line)) return <h2 key={key} className="mt-4 mb-1.5 text-[14px] font-bold text-slate-800 dark:text-slate-100">{line.replace(/^##\s/, "")}</h2>;
    if (/^\|/.test(line)) {
      const cells = line.split("|").filter((c) => c.trim() !== "");
      if (cells.every((c) => /^[-\s:]+$/.test(c))) return null;
      return (
        <div key={key} className="grid grid-cols-3 gap-2 border-b border-slate-100 py-1.5 text-[12px] dark:border-white/[0.06]">
          {cells.map((c, j) => (
            <span key={j} className={cn("truncate", j === 0 ? "font-semibold text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400")}>{c.trim()}</span>
          ))}
        </div>
      );
    }
    if (/^-\s\[x\]/i.test(line))
      return (
        <div key={key} className="flex items-center gap-2 py-1 text-[12.5px] text-slate-400 line-through">
          <span className="grid h-4 w-4 place-items-center rounded bg-emerald-500 text-white"><Check size={10} /></span>
          {line.replace(/^-\s\[x\]\s?/i, "")}
        </div>
      );
    if (/^-\s\[\s?\]/.test(line))
      return (
        <div key={key} className="flex items-center gap-2 py-1 text-[12.5px] text-slate-600 dark:text-slate-300">
          <span className="h-4 w-4 rounded border-2 border-slate-300 dark:border-white/20" />
          {line.replace(/^-\s\[\s?\]\s?/, "")}
        </div>
      );
    if (/^[-•]\s/.test(line))
      return (
        <div key={key} className="flex gap-2 py-0.5 text-[12.5px] leading-6 text-slate-600 dark:text-slate-300">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
          <span>{line.replace(/^[-•]\s/, "")}</span>
        </div>
      );
    if (/^[۰-۹0-9]+[.)]\s/.test(line))
      return <div key={key} className="py-0.5 ps-1 text-[12.5px] leading-6 text-slate-600 dark:text-slate-300">{line}</div>;
    if (!line.trim()) return <div key={key} className="h-2" />;
    const bold = line.replace(/\*\*(.+?)\*\*/g, "‹b›$1‹/b›").split(/‹b›|‹\/b›/);
    return (
      <p key={key} className="py-0.5 text-[12.5px] leading-7 text-slate-600 dark:text-slate-300">
        {bold.map((seg, j) => (j % 2 === 1 ? <strong key={j} className="font-bold text-slate-800 dark:text-white">{seg}</strong> : <span key={j}>{seg}</span>))}
      </p>
    );
  });
}

export default function Documents() {
  const { t, lang, notebooks, updatePage, addPage, pushToast, concepts } = useApp();
  const { go, target } = useNav();
  const [nbId, setNbId] = useState(notebooks[0]?.id ?? "");
  const [secId, setSecId] = useState(notebooks[0]?.sections[0]?.id ?? "");
  const [pageId, setPageId] = useState(notebooks[0]?.sections[0]?.pages[0]?.id ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [openSecs, setOpenSecs] = useState<Record<string, boolean>>({});
  const num = (n: number | string) => localeDigits(n, lang);

  const nb = notebooks.find((x) => x.id === nbId) ?? notebooks[0];
  const sec = nb?.sections.find((x) => x.id === secId) ?? nb?.sections[0];
  const page = sec?.pages.find((x) => x.id === pageId) ?? sec?.pages[0];

  useEffect(() => {
    if (page) setDraft(page.content);
    setEditing(false);
  }, [page?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep-link: open a specific page, or search by concept
  useEffect(() => {
    if (target.page !== "docs") return;
    if (target.pageId) {
      for (const b of notebooks)
        for (const s of b.sections)
          if (s.pages.some((p) => p.id === target.pageId)) {
            setNbId(b.id);
            setSecId(s.id);
            setPageId(target.pageId);
            setOpenSecs((o) => ({ ...o, [s.id]: true }));
          }
    } else if (target.concept) {
      setQ(target.concept);
    }
  }, [target, notebooks]);

  const filteredSections = useMemo(() => {
    if (!nb) return [];
    const s = q.trim().toLowerCase();
    if (!s) return nb.sections;
    return nb.sections
      .map((x) => ({ ...x, pages: x.pages.filter((p) => p.title.toLowerCase().includes(s) || p.content.toLowerCase().includes(s)) }))
      .filter((x) => x.pages.length > 0);
  }, [nb, q]);

  const totalPages = notebooks.reduce((a, x) => a + x.sections.reduce((b, s) => b + s.pages.length, 0), 0);
  const wordCount = page ? page.content.trim().split(/\s+/).filter(Boolean).length : 0;

  const save = () => {
    if (!nb || !sec || !page) return;
    updatePage(nb.id, sec.id, page.id, { content: draft });
    setEditing(false);
    pushToast(t("saved"));
  };

  if (!nb) return <Card><Empty icon={<FolderOpen size={22} />} text={t("no_results")} /></Card>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("docs_title")}</h2>
          <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
            {num(notebooks.length)} {t("notebooks")} · {num(totalPages)} {t("pages")}
          </p>
        </div>
        <Button variant="primary" onClick={() => { if (sec) { const id = addPage(nb.id, sec.id); setPageId(id); setEditing(true); } }}>
          <Plus size={16} /> {t("new_page")}
        </Button>
      </div>

      {/* Notebook chips */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {notebooks.map((n) => (
          <button
            key={n.id}
            onClick={() => {
              setNbId(n.id);
              setSecId(n.sections[0]?.id ?? "");
              setPageId(n.sections[0]?.pages[0]?.id ?? "");
            }}
            className={cn(
              "group flex shrink-0 items-center gap-2.5 rounded-2xl border px-4 py-2.5 transition",
              n.id === nb.id
                ? "border-transparent bg-gradient-to-br text-white shadow-lg " + n.color
                : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-slate-300",
            )}
          >
            <span className="text-lg">{n.emoji}</span>
            <span className="text-[12.5px] font-bold">{n.title}</span>
            <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold", n.id === nb.id ? "bg-white/25" : "bg-slate-100 dark:bg-white/[0.07]")}>
              {num(n.sections.reduce((a, s) => a + s.pages.length, 0))}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[290px_minmax(0,1fr)]">
        {/* Tree */}
        <Card className="flex flex-col p-3">
          <div className="mb-2 flex h-9 items-center gap-2 rounded-xl bg-slate-100/80 px-3 dark:bg-white/[0.05]">
            <Search size={14} className="text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={lang === "fa" ? "جستجو در اسناد…" : "Search documents…"} className="w-full bg-transparent text-[12px] outline-none placeholder:text-slate-400" />
          </div>
          <div className="scroll-thin max-h-[540px] flex-1 space-y-1 overflow-y-auto">
            {filteredSections.length === 0 && <Empty icon={<FileText size={20} />} text={t("no_results")} />}
            {filteredSections.map((s) => {
              const collapsed = openSecs[s.id] === false;
              return (
                <div key={s.id}>
                  <button
                    onClick={() => setOpenSecs((p) => ({ ...p, [s.id]: collapsed }))}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start transition hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                  >
                    <ChevronDown size={13} className={cn("shrink-0 text-slate-400 transition-transform", collapsed && "-rotate-90 rtl:rotate-90")} />
                    <span>{s.emoji}</span>
                    <span className="flex-1 truncate text-[12px] font-bold text-slate-700 dark:text-slate-200">{s.title}</span>
                    <span className="text-[10px] font-bold text-slate-400">{num(s.pages.length)}</span>
                  </button>
                  {!collapsed && (
                    <div className="ms-4 space-y-0.5 border-s border-slate-200 ps-2 dark:border-white/[0.08]">
                      {s.pages.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setSecId(s.id); setPageId(p.id); }}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start transition",
                            p.id === page?.id ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.05]",
                          )}
                        >
                          <span className="text-[13px]">{p.emoji}</span>
                          <span className="flex-1 truncate text-[11.5px] font-semibold">{p.title}</span>
                          {p.starred && <Star size={11} className="shrink-0 fill-amber-400 text-amber-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Editor */}
        <Card className="flex min-h-[540px] flex-col overflow-hidden">
          {!page ? (
            <Empty icon={<FileText size={22} />} text={t("no_results")} />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-white/[0.06]">
                <span className="text-2xl">{page.emoji}</span>
                <input
                  value={page.title}
                  onChange={(e) => updatePage(nb.id, sec!.id, page.id, { title: e.target.value })}
                  className="min-w-0 flex-1 bg-transparent text-[16px] font-extrabold text-slate-900 outline-none dark:text-white"
                />
                <button
                  onClick={() => updatePage(nb.id, sec!.id, page.id, { starred: !page.starred })}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 transition hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                >
                  <Star size={16} className={cn(page.starred && "fill-amber-400 text-amber-400")} />
                </button>
                {editing ? (
                  <>
                    <Button size="sm" onClick={() => { setDraft(page.content); setEditing(false); }}>{t("cancel")}</Button>
                    <Button size="sm" variant="primary" onClick={save}><Check size={14} /> {t("save")}</Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => setEditing(true)}>{lang === "fa" ? "ویرایش" : "Edit"}</Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-4 py-2 dark:border-white/[0.06]">
                <Badge tone="slate">{nb.emoji} {nb.title}</Badge>
                <Badge tone="slate">{sec?.emoji} {sec?.title}</Badge>
                <span className="ms-auto text-[10.5px] text-slate-400">
                  {t("last_edit")}: {formatDate(parseISO(page.updatedAt), lang, { short: true })} · {num(wordCount)} {t("words")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-4 py-2 dark:border-white/[0.06]">
                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-400"><Tag size={11} /> {lang === "fa" ? "مفاهیم:" : "Concepts:"}</span>
                {(page.tags ?? []).map((tg) => {
                  const c = concepts.find((x) => x.label === tg);
                  return (
                    <span key={tg} className="inline-flex items-center overflow-hidden rounded-lg bg-brand-50 text-[11px] font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                      <button
                        onClick={() => (c ? go({ page: "concepts", conceptId: c.id }) : go({ page: "docs", concept: tg }))}
                        title={lang === "fa" ? "دیدن ارتباطات این تگ" : "See what this tag connects"}
                        className="inline-flex items-center gap-1 py-0.5 ps-2 pe-1.5 transition hover:bg-brand-100 dark:hover:bg-brand-500/25"
                      >
                        <Link2 size={9} /> {c ? `${c.emoji} ${tg}` : tg}
                      </button>
                      <button
                        onClick={() => updatePage(nb.id, sec!.id, page.id, { tags: (page.tags ?? []).filter((x) => x !== tg) })}
                        title={lang === "fa" ? "حذف تگ" : "Remove tag"}
                        className="grid h-full w-5 place-items-center opacity-60 transition hover:bg-brand-200 hover:opacity-100 dark:hover:bg-brand-500/30"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  );
                })}
                <ConceptAdder
                  concepts={concepts.map((c) => (lang === "fa" ? c.label : c.labelEn))}
                  existing={page.tags ?? []}
                  lang={lang}
                  onAdd={(tag) => updatePage(nb.id, sec!.id, page.id, { tags: [...(page.tags ?? []), tag] })}
                />
              </div>

              <div className="scroll-thin flex-1 overflow-y-auto p-5">
                {editing ? (
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="h-full min-h-[380px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-[12.5px] leading-7 text-slate-700 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200"
                    dir="auto"
                  />
                ) : (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} key={page.id} dir="auto">
                    {renderBlocks(page.content)}
                  </motion.div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      {(page?.tags?.length ?? 0) > 0 && page && (
        <Backlinks
          tags={page.tags ?? []}
          excludeId={page.id}
          notebooks={notebooks}
          lang={lang}
          onOpen={(b, s, p) => { setNbId(b); setSecId(s); setPageId(p); }}
        />
      )}

      <Card className="p-4">
        <SectionTitle icon={<Star size={15} />} title={lang === "fa" ? "صفحات ستاره‌دار" : "Starred pages"} />
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {notebooks.flatMap((n) =>
            n.sections.flatMap((s) =>
              s.pages
                .filter((p) => p.starred)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setNbId(n.id); setSecId(s.id); setPageId(p.id); }}
                    className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3 text-start transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-white/[0.07] dark:hover:border-brand-400/40"
                  >
                    <span className="text-xl">{p.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{p.title}</span>
                      <span className="block truncate text-[10.5px] text-slate-400">{n.title} · {s.title}</span>
                    </span>
                    <Star size={13} className="shrink-0 fill-amber-400 text-amber-400" />
                  </button>
                )),
            ),
          )}
        </div>
      </Card>
    </div>
  );
}

function ConceptAdder({
  concepts,
  existing,
  lang,
  onAdd,
}: {
  concepts: string[];
  existing: string[];
  lang: "fa" | "en";
  onAdd: (tag: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const avail = concepts.filter((c) => !existing.includes(c));
  if (!avail.length) return null;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 py-0.5 text-[11px] font-bold text-slate-400 hover:border-brand-400 hover:text-brand-600 dark:border-white/15"
      >
        <Plus size={10} /> {lang === "fa" ? "تگ" : "tag"}
      </button>
      {open && (
        <div className="absolute start-0 top-7 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-ink-900">
          {avail.map((c) => (
            <button
              key={c}
              onClick={() => {
                onAdd(c);
                setOpen(false);
              }}
              className="block w-full rounded-lg px-2 py-1.5 text-start text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Backlinks({
  tags,
  excludeId,
  notebooks,
  lang,
  onOpen,
}: {
  tags: string[];
  excludeId: string;
  notebooks: { id: string; title: string; sections: { id: string; title: string; pages: { id: string; title: string; emoji: string; tags?: string[] }[] }[] }[];
  lang: "fa" | "en";
  onOpen: (nbId: string, secId: string, pageId: string) => void;
}) {
  const hits = notebooks.flatMap((nb) =>
    nb.sections.flatMap((sec) =>
      sec.pages
        .filter((p) => p.id !== excludeId && (p.tags ?? []).some((t) => tags.includes(t)))
        .map((p) => ({ ...p, nbId: nb.id, nbTitle: nb.title, secId: sec.id, secTitle: sec.title, shared: (p.tags ?? []).filter((t) => tags.includes(t)) })),
    ),
  );
  if (!hits.length) return null;
  return (
    <Card className="p-4">
      <SectionTitle
        icon={<Link2 size={15} />}
        title={lang === "fa" ? "پیوندهای برگشتی" : "Backlinks"}
        action={<span className="text-[10.5px] font-semibold text-slate-400">{lang === "fa" ? "اسنادی که تگ مشترک دارند" : "Docs sharing a tag"}</span>}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {hits.map((p) => (
          <button
            key={p.id}
            onClick={() => onOpen(p.nbId, p.secId, p.id)}
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-start text-[12px] font-semibold transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-white/[0.08] dark:hover:border-brand-400/40"
          >
            <span className="text-base">{p.emoji}</span>
            <span className="min-w-0">
              <span className="block truncate text-slate-700 dark:text-slate-200">{p.title}</span>
              <span className="block truncate text-[10px] font-normal text-slate-400">
                {p.nbTitle} · {p.shared.join("، ")}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
