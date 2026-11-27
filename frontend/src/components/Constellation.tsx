import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";
import type { GEdge, GKind, GNode } from "../lib/graph";

export interface LaidNode {
  node: GNode;
  x: number; // 0..1
  y: number;
  ring: number;
}

const KIND_HEX: Record<GKind, { core: string; glow: string; ring: string }> = {
  concept: { core: "#818cf8", glow: "rgba(129,140,248,0.55)", ring: "#a78bfa" },
  person: { core: "#38bdf8", glow: "rgba(56,189,248,0.5)", ring: "#22d3ee" },
  page: { core: "#34d399", glow: "rgba(52,211,153,0.5)", ring: "#2dd4bf" },
  date: { core: "#fbbf24", glow: "rgba(251,191,36,0.5)", ring: "#fb923c" },
};

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Focus layout: center + 2 orbital rings */
export function layoutFocus(center: GNode, neighbors: GNode[], edges: GEdge[]): LaidNode[] {
  const inner = neighbors.filter((n) => n.kind === "concept");
  const outer = neighbors.filter((n) => n.kind !== "concept");
  const laid: LaidNode[] = [{ node: center, x: 0.5, y: 0.5, ring: 0 }];
  const place = (list: GNode[], r: number, ring: number, phase: number) => {
    list.forEach((n, i) => {
      const a = phase + (i / Math.max(1, list.length)) * Math.PI * 2 - Math.PI / 2;
      const jitter = ((hash(n.id) % 13) - 6) * 0.004;
      laid.push({
        node: n,
        x: 0.5 + (r + jitter) * Math.cos(a),
        y: 0.5 + (r + jitter) * Math.sin(a) * 0.92,
        ring,
      });
    });
  };
  place(inner, 0.28, 1, 0.15);
  place(outer, 0.42, 2, 0.4);
  void edges;
  return laid;
}

/** Universe layout: all concept nodes on a slightly organic ellipse */
export function layoutUniverse(nodes: GNode[]): LaidNode[] {
  const concepts = nodes.filter((n) => n.kind === "concept");
  return concepts.map((n, i) => {
    const a = (i / Math.max(1, concepts.length)) * Math.PI * 2 - Math.PI / 2;
    const wobble = ((hash(n.id) % 17) - 8) * 0.008;
    const r = 0.34 + wobble;
    return {
      node: n,
      x: 0.5 + r * Math.cos(a + wobble),
      y: 0.5 + r * 0.78 * Math.sin(a),
      ring: 1,
    };
  });
}

function Starfield({ count = 48 }: { count?: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        l: `${(hash(`s${i}`) % 96) + 2}%`,
        t: `${(hash(`t${i}`) % 94) + 3}%`,
        s: 1 + (hash(`z${i}`) % 3),
        d: `${(hash(`d${i}`) % 40) / 10 + 1.4}s`,
        delay: `${(hash(`w${i}`) % 30) / 10}s`,
      })),
    [count],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left: s.l,
            top: s.t,
            width: s.s,
            height: s.s,
            animation: `twinkle ${s.d} ease-in-out ${s.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function Constellation({
  laid,
  edges,
  lang,
  hoverId,
  setHoverId,
  selectedId,
  onSelect,
  compact = false,
}: {
  laid: LaidNode[];
  edges: GEdge[];
  lang: "fa" | "en";
  hoverId: string | null;
  setHoverId: (id: string | null) => void;
  selectedId?: string;
  onSelect: (n: GNode) => void;
  compact?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 560 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number; node: GNode; ring: number }>();
    laid.forEach((l) => m.set(l.node.id, { x: l.x * size.w, y: l.y * size.h, node: l.node, ring: l.ring }));
    return m;
  }, [laid, size]);

  const linkedToHover = useMemo(() => {
    if (!hoverId) return new Set<string>();
    const s = new Set<string>([hoverId]);
    edges.forEach((e) => {
      if (e.from === hoverId) s.add(e.to);
      if (e.to === hoverId) s.add(e.from);
    });
    return s;
  }, [hoverId, edges]);

  const curve = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const cx = mx - dy * 0.16;
    const cy = my + dx * 0.16;
    return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
  };

  return (
    <div
      ref={wrapRef}
      className={cn("relative h-full w-full overflow-hidden", compact ? "min-h-[260px]" : "min-h-[420px]")}
    >
      <Starfield count={compact ? 22 : 56} />

      {/* orbital rings */}
      {!compact && (
        <>
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[56%] w-[56%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/8" style={{ animation: "orbit-spin 80s linear infinite" }} />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[82%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/6" style={{ animation: "orbit-spin-rev 120s linear infinite" }} />
        </>
      )}

      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`edge-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#c084fc" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.05" />
          </linearGradient>
          <filter id={`glow-${uid}`}>
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {edges.map((e, i) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          const hot = !hoverId || linkedToHover.has(e.from) && linkedToHover.has(e.to);
          const d = curve(a, b);
          return (
            <g key={`${e.from}-${e.to}-${i}`}>
              <path
                d={d}
                fill="none"
                stroke={`url(#edge-${uid})`}
                strokeWidth={hot ? 1.8 + Math.min(2.4, e.strength * 0.4) : 0.6}
                opacity={hot ? 1 : 0.12}
                filter={hot ? `url(#glow-${uid})` : undefined}
              />
              {hot && (
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth={1.1}
                  strokeDasharray="6 18"
                  style={{ animation: `dash-flow ${1.8 + (i % 5) * 0.35}s linear infinite` }}
                  opacity={0.7}
                />
              )}
            </g>
          );
        })}
      </svg>

      {laid.map((l, i) => {
        const p = pos.get(l.node.id);
        if (!p) return null;
        const k = KIND_HEX[l.node.kind];
        const isCenter = l.ring === 0;
        const dim = hoverId && !linkedToHover.has(l.node.id);
        const selected = selectedId === l.node.id;
        const label = lang === "fa" ? l.node.label : l.node.labelEn;
        const sizePx = isCenter ? (compact ? 58 : 78) : l.node.kind === "concept" ? (compact ? 42 : 52) : compact ? 34 : 42;
        return (
          <motion.button
            key={l.node.id}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: dim ? 0.28 : 1, scale: 1 }}
            transition={{ delay: i * 0.035, type: "spring", stiffness: 260, damping: 20 }}
            onMouseEnter={() => setHoverId(l.node.id)}
            onMouseLeave={() => setHoverId(null)}
            onClick={() => onSelect(l.node)}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ left: p.x, top: p.y }}
          >
            <span
              className="relative mx-auto grid place-items-center rounded-full"
              style={{
                width: sizePx,
                height: sizePx,
                background: `radial-gradient(circle at 35% 30%, #fff 0%, ${k.core} 42%, #0b1020 100%)`,
                boxShadow: selected
                  ? `0 0 0 2px #fff, 0 0 28px 8px ${k.glow}`
                  : `0 0 0 1px rgba(255,255,255,0.25), 0 0 18px 4px ${k.glow}`,
                animation: isCenter ? "node-breathe 3.4s ease-in-out infinite" : undefined,
              }}
            >
              {isCenter && (
                <span
                  className="absolute inset-[-10px] rounded-full border"
                  style={{ borderColor: `${k.ring}55`, animation: "pulse-ring 2.4s ease-out infinite" }}
                />
              )}
              <span className="relative z-10 select-none" style={{ fontSize: isCenter ? 22 : l.node.kind === "person" ? 11 : 16, fontWeight: 800, color: l.node.kind === "person" ? "#fff" : undefined }}>
                {l.node.glyph}
              </span>
            </span>
            <span
              className={cn(
                "mt-1.5 inline-block max-w-[110px] truncate rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-md",
                isCenter ? "bg-white/15 text-white" : "bg-black/35 text-white/85",
              )}
            >
              {label.length > 16 ? label.slice(0, 15) + "…" : label}
            </span>
          </motion.button>
        );
      })}

      <AnimatePresence>
        {hoverId && pos.get(hoverId) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute z-20 rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-start shadow-2xl backdrop-blur-xl"
            style={{
              left: Math.min(size.w - 180, Math.max(8, pos.get(hoverId)!.x + 28)),
              top: Math.max(8, pos.get(hoverId)!.y - 18),
            }}
          >
            <div className="text-[11.5px] font-extrabold text-white">{lang === "fa" ? pos.get(hoverId)!.node.label : pos.get(hoverId)!.node.labelEn}</div>
            <div className="text-[10px] text-white/55">
              {({ concept: lang === "fa" ? "مفهوم" : "Concept", person: lang === "fa" ? "فرد" : "Person", page: lang === "fa" ? "سند" : "Document", date: lang === "fa" ? "زمان" : "Date" } as Record<GKind, string>)[pos.get(hoverId)!.node.kind]}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { KIND_HEX };
