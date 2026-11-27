import { parseISO, relativeDay } from "./jalali";
import type { AppState, Concept, Person } from "./types";

export type GKind = "concept" | "person" | "page" | "date";

export interface GNode {
  id: string;
  label: string;
  labelEn: string;
  kind: GKind;
  color: string;
  glyph: string;
  count: number;
}

export interface GEdge {
  from: string;
  to: string;
  strength: number;
  reason: string;
}

export interface GraphData {
  nodes: Map<string, GNode>;
  edges: GEdge[];
}

const norm = (s: string) => s.replace(/\u200c/g, "").toLowerCase().trim();

/* map of normalized concept label -> concept id */
export function conceptIndex(concepts: Concept[]): Map<string, Concept> {
  const m = new Map<string, Concept>();
  for (const c of concepts) {
    m.set(norm(c.label), c);
    m.set(norm(c.labelEn), c);
  }
  return m;
}

const kindGlyph: Record<GKind, string> = {
  concept: "🏷️",
  person: "👤",
  page: "📄",
  date: "🗓️",
};
const kindColor: Record<GKind, string> = {
  concept: "from-brand-500 to-violet-600",
  person: "from-sky-500 to-cyan-600",
  page: "from-emerald-500 to-teal-600",
  date: "from-amber-500 to-orange-600",
};

interface Item {
  tags?: string[];
  project?: string;
  assignee?: string;
  due?: string;
  date?: string;
  attendees?: string[];
}

/** Build the full concept graph from app state. */
export function buildGraph(state: AppState): GraphData {
  const idx = conceptIndex(state.concepts);
  const nodes = new Map<string, GNode>();
  const edgeMap = new Map<string, GEdge>();

  // resolve a tag string to a concept id (or undefined if not a known concept)
  const resolveTag = (tag: string): Concept | null => idx.get(norm(tag)) ?? null;

  const addNode = (n: GNode) => {
    const ex = nodes.get(n.id);
    if (ex) ex.count += n.count;
    else nodes.set(n.id, n);
  };
  const conceptNode = (c: Concept): GNode => ({
    id: `concept:${c.id}`,
    label: c.label,
    labelEn: c.labelEn,
    kind: "concept",
    color: c.color,
    glyph: c.emoji || "🏷️",
    count: 0,
  });
  const personNode = (p: Person): GNode => ({
    id: `person:${p.id}`,
    label: p.name,
    labelEn: p.nameEn,
    kind: "person",
    color: p.avatarColor,
    glyph: p.initials,
    count: 0,
  });
  const dateNode = (date: string): GNode => ({
    id: `date:${date}`,
    label: relativeDay(parseISO(date), "fa"),
    labelEn: relativeDay(parseISO(date), "en"),
    kind: "date",
    color: kindColor.date,
    glyph: "🗓️",
    count: 0,
  });
  const pageNode = (pageId: string, emoji: string, title: string, titleEn: string): GNode => ({
    id: `page:${pageId}`,
    label: title,
    labelEn: titleEn,
    kind: "page",
    color: kindColor.page,
    glyph: emoji || "📄",
    count: 0,
  });

  const addEdge = (a: string, b: string, reason: string, strength = 1) => {
    if (!a || !b || a === b) return;
    const [x, y] = a < b ? [a, b] : [b, a];
    const key = `${x}|${y}`;
    const ex = edgeMap.get(key);
    if (ex) {
      ex.strength += strength;
      if (!ex.reason.includes(reason)) ex.reason += `، ${reason}`;
    } else {
      edgeMap.set(key, { from: x, to: y, strength, reason });
    }
  };

  // --- explicit concept <-> concept ---
  for (const c of state.concepts) {
    addNode(conceptNode(c));
    for (const rid of c.related) {
      const r = state.concepts.find((x) => x.id === rid);
      if (r) {
        addNode(conceptNode(r));
        addEdge(`concept:${c.id}`, `concept:${r.id}`, "مرتبط", 3);
      }
    }
  }

  // --- items (tasks + meetings) create edges ---
  const collectItemConcepts = (it: Item): Concept[] => {
    const set = new Map<string, Concept>();
    for (const t of it.tags ?? []) {
      const c = resolveTag(t);
      if (c) set.set(c.id, c);
    }
    if (it.project) {
      const c = resolveTag(it.project);
      if (c) set.set(c.id, c);
    }
    return [...set.values()];
  };

  const walkItem = (it: Item, people: Person[], reasonLabel: string) => {
    const cs = collectItemConcepts(it);
    // concept <-> concept co-occurrence
    for (let i = 0; i < cs.length; i++)
      for (let j = i + 1; j < cs.length; j++) {
        addNode(conceptNode(cs[i]));
        addNode(conceptNode(cs[j]));
        addEdge(`concept:${cs[i].id}`, `concept:${cs[j].id}`, "تگ مشترک", 2);
      }
    // concept <-> person (assignee / attendees)
    const pids = [...(it.attendees ?? [])];
    if (it.assignee) pids.push(it.assignee);
    for (const pid of pids) {
      const p = people.find((x) => x.id === pid);
      if (!p) continue;
      addNode(personNode(p));
      for (const c of cs) {
        addNode(conceptNode(c));
        addEdge(`concept:${c.id}`, `person:${p.id}`, reasonLabel, 1);
      }
    }
    // concept <-> date
    const dateKey = it.due ?? it.date;
    if (dateKey) {
      addNode(dateNode(dateKey));
      for (const c of cs) {
        addNode(conceptNode(c));
        addEdge(`concept:${c.id}`, `date:${dateKey}`, "زمان", 1);
      }
    }
  };

  state.tasks.forEach((t) => walkItem(t, state.people, "مسئول"));
  state.meetings.forEach((m) => walkItem(m, state.people, "شرکت‌کننده"));

  // --- people <-> concepts (direct tags on the person) ---
  for (const p of state.people) {
    for (const tag of p.tags ?? []) {
      const c = resolveTag(tag);
      if (!c) continue;
      addNode(personNode(p));
      addNode(conceptNode(c));
      addEdge(`concept:${c.id}`, `person:${p.id}`, "تیم", 2);
    }
  }

  // --- pages <-> concepts ---
  for (const nb of state.notebooks)
    for (const sec of nb.sections)
      for (const pg of sec.pages) {
        const cs = (pg.tags ?? []).map(resolveTag).filter(Boolean) as Concept[];
        if (!cs.length) continue;
        addNode(pageNode(pg.id, pg.emoji, pg.title, pg.title));
        for (const c of cs) {
          addNode(conceptNode(c));
          addEdge(`concept:${c.id}`, `page:${pg.id}`, "سند", 2);
        }
      }

  return { nodes, edges: [...edgeMap.values()] };
}

/** Direct neighbors of a node id. */
export function neighbors(graph: GraphData, centerId: string): { center: GNode | null; nodes: GNode[]; edges: GEdge[] } {
  const center = graph.nodes.get(centerId) ?? null;
  const ns = new Map<string, GNode>();
  const es: GEdge[] = [];
  for (const e of graph.edges) {
    let other: string | null = null;
    if (e.from === centerId) other = e.to;
    else if (e.to === centerId) other = e.from;
    if (other) {
      const n = graph.nodes.get(other);
      if (n) {
        ns.set(other, n);
        es.push(e);
      }
    }
  }
  const list = [...ns.values()].sort((a, b) => {
    const ka = a.kind === "concept" ? 0 : a.kind === "person" ? 1 : a.kind === "page" ? 2 : 3;
    const kb = b.kind === "concept" ? 0 : b.kind === "person" ? 1 : b.kind === "page" ? 2 : 3;
    return ka - kb;
  });
  return { center, nodes: list, edges: es };
}

/** Find a concept node id from a free-text query. */
export function findConceptNode(state: AppState, q: string): string | null {
  const nq = norm(q);
  const direct = state.concepts.find((c) => norm(c.label) === nq || norm(c.labelEn) === nq);
  if (direct) return `concept:${direct.id}`;
  const partial = state.concepts.find((c) => norm(c.label).includes(nq) || norm(c.labelEn).includes(nq) || nq.includes(norm(c.label)));
  if (partial) return `concept:${partial.id}`;
  // person?
  const p = state.people.find((x) => norm(x.name).includes(nq) || norm(x.nameEn).includes(nq));
  if (p) return `person:${p.id}`;
  return null;
}

/** Human-readable summary of what a concept connects to. */
export function conceptSummary(state: AppState, centerId: string, lang: "fa" | "en"): { text: string; list: string[] } {
  const graph = buildGraph(state);
  const { center, nodes } = neighbors(graph, centerId);
  if (!center) return { text: lang === "fa" ? "مفهومی با این نام پیدا نشد." : "No concept found with that name.", list: [] };
  const byKind = (k: GKind) => nodes.filter((n) => n.kind === k);
  const concepts = byKind("concept");
  const people = byKind("person");
  const pages = byKind("page");
  const dates = byKind("date");
  const list: string[] = [
    ...concepts.map((n) => (lang === "fa" ? n.label : n.labelEn)),
    ...people.map((n) => (lang === "fa" ? n.label : n.labelEn)),
    ...pages.map((n) => (lang === "fa" ? n.label : n.labelEn)),
    ...dates.map((n) => (lang === "fa" ? n.label : n.labelEn)),
  ];
  const fa =
    `«${center.label}» با ${[concepts.length && `${concepts.length} مفهوم`, people.length && `${people.length} نفر`, pages.length && `${pages.length} سند`, dates.length && `${dates.length} زمان`].filter(Boolean).join("، ") || "چیزی"} در ارتباط است.`;
  const en =
    `"${center.labelEn}" connects to ${[concepts.length && `${concepts.length} concept(s)`, people.length && `${people.length} person(s)`, pages.length && `${pages.length} doc(s)`, dates.length && `${dates.length} date(s)`].filter(Boolean).join(", ") || "nothing"}.`;
  return { text: lang === "fa" ? fa : en, list };
}

/** All concept nodes that have at least one connection, sorted by degree. */
export function topConcepts(state: AppState): { node: GNode; degree: number }[] {
  const graph = buildGraph(state);
  const deg = new Map<string, number>();
  for (const e of graph.edges) {
    deg.set(e.from, (deg.get(e.from) ?? 0) + 1);
    deg.set(e.to, (deg.get(e.to) ?? 0) + 1);
  }
  return [...graph.nodes.values()]
    .filter((n) => n.kind === "concept")
    .map((node) => ({ node, degree: deg.get(node.id) ?? 0 }))
    .sort((a, b) => b.degree - a.degree);
}

/** Items (tasks/meetings/pages/people) related to a concept id. */
export function relatedItems(state: AppState, conceptLabel: string) {
  const nlabel = norm(conceptLabel);
  const matchTag = (tags?: string[]) => (tags ?? []).some((t) => norm(t) === nlabel);
  const tasks = state.tasks.filter((t) => matchTag(t.tags) || norm(t.project ?? "") === nlabel);
  const meetings = state.meetings.filter((m) => matchTag(m.tags));
  const pages: { nb: string; sec: string; id: string; emoji: string; title: string; tags?: string[] }[] = [];
  for (const nb of state.notebooks)
    for (const sec of nb.sections)
      for (const pg of sec.pages) if (matchTag(pg.tags)) pages.push({ nb: nb.id, sec: sec.id, id: pg.id, emoji: pg.emoji, title: pg.title, tags: pg.tags });
  const peopleList = state.people.filter((p) => matchTag(p.tags));
  const personIds = new Set<string>();
  tasks.forEach((t) => t.assignee && personIds.add(t.assignee));
  meetings.forEach((m) => m.attendees?.forEach((a) => personIds.add(a)));
  const involved = state.people.filter((p) => personIds.has(p.id) && !peopleList.some((x) => x.id === p.id));
  return { tasks, meetings, pages, people: [...peopleList, ...involved] };
}

export { kindColor, kindGlyph };
