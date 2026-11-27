import { addDays, isoKey, persianDayIndex } from "./jalali";
import type { ExtractedMeeting, ExtractedTask, Person, Priority } from "./types";

const uid = () => Math.random().toString(36).slice(2, 9);

const FA_DIGIT_MAP: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

export const normalizeDigits = (s: string) => s.replace(/[۰-۹٠-٩]/g, (d) => FA_DIGIT_MAP[d] ?? d);

const WEEKDAY_TOKENS: { names: string[]; idx: number }[] = [
  { names: ["شنبه", "saturday"], idx: 0 },
  { names: ["یکشنبه", "يكشنبه", "sunday"], idx: 1 },
  { names: ["دوشنبه", "monday"], idx: 2 },
  { names: ["سه‌شنبه", "سه شنبه", "سهشنبه", "tuesday"], idx: 3 },
  { names: ["چهارشنبه", "wednesday"], idx: 4 },
  { names: ["پنجشنبه", "پنج‌شنبه", "thursday"], idx: 5 },
  { names: ["جمعه", "friday"], idx: 6 },
];

const URGENT = ["فوری", "خیلی مهم", "حیاتی", "اضطراری", "urgent", "asap", "critical"];
const HIGH = ["مهم", "اولویت بالا", "سریع", "important", "high priority", "priority"];
const LOW = ["کم‌اهمیت", "اولویت پایین", "وقت داشتی", "low priority", "whenever"];
const MEDIUM_HINT = ["اولویتش متوسط", "اولویت متوسط", "medium"];

const MEETING_WORDS = ["جلسه", "نشست", "قرار ملاقات", "ملاقات", "تماس", "کارگاه", "وبینار", "meeting", "call", "sync", "workshop", "standup"];
const TASK_WORDS = [
  "قرار شد", "باید", "آماده", "تهیه", "ارسال", "پیگیری", "بررسی", "مستند", "به‌روز", "بروزرسانی",
  "طراحی", "نهایی", "بنویس", "چک", "هماهنگ", "تکمیل", "انجام", "will", "must", "should", "prepare", "send", "review", "follow up",
];

function findWeekdayDate(text: string): string | null {
  const t = text.toLowerCase();
  for (const w of WEEKDAY_TOKENS) {
    if (w.names.some((n) => t.includes(n))) {
      const now = new Date();
      const cur = persianDayIndex(now);
      let delta = (w.idx - cur + 7) % 7;
      if (delta === 0) delta = 7;
      if (t.includes("هفته آینده") || t.includes("هفته بعد") || t.includes("next week")) delta += 7;
      return isoKey(addDays(now, delta));
    }
  }
  return null;
}

export function detectDate(text: string): { date: string; strong: boolean } {
  const t = normalizeDigits(text).toLowerCase();
  const now = new Date();
  if (/(پس‌فردا|پس فردا|day after tomorrow)/.test(t)) return { date: isoKey(addDays(now, 2)), strong: true };
  if (/(فردا|tomorrow)/.test(t)) return { date: isoKey(addDays(now, 1)), strong: true };
  if (/(امروز|today)/.test(t)) return { date: isoKey(now), strong: true };
  if (/(آخر هفته|end of week)/.test(t)) return { date: isoKey(addDays(now, 4)), strong: true };
  const wd = findWeekdayDate(t);
  if (wd) return { date: wd, strong: true };
  if (/(هفته آینده|هفته بعد|next week)/.test(t)) return { date: isoKey(addDays(now, 7)), strong: true };
  if (/(ماه آینده|next month)/.test(t)) return { date: isoKey(addDays(now, 30)), strong: true };
  return { date: isoKey(addDays(now, 3)), strong: false };
}

export function detectTime(text: string): { start: string; end: string; strong: boolean } {
  const t = normalizeDigits(text);
  const m = t.match(/(\d{1,2})\s*[:٫.]\s*(\d{2})/) || t.match(/ساعت\s*(\d{1,2})/) || t.match(/(\d{1,2})\s*(am|pm)/i);
  if (m) {
    let h = Number(m[1]);
    const min = m[2] && /^\d{2}$/.test(m[2]) ? m[2] : "00";
    if (/pm/i.test(t) && h < 12) h += 12;
    if (/(بعدازظهر|عصر)/.test(t) && h < 12) h += 12;
    h = Math.min(23, Math.max(0, h));
    const start = `${String(h).padStart(2, "0")}:${min}`;
    const end = `${String(Math.min(23, h + 1)).padStart(2, "0")}:${min}`;
    return { start, end, strong: true };
  }
  return { start: "10:00", end: "11:00", strong: false };
}

export function detectPriority(text: string): { priority: Priority; strong: boolean } {
  const t = text.toLowerCase();
  if (URGENT.some((w) => t.includes(w))) return { priority: "urgent", strong: true };
  if (MEDIUM_HINT.some((w) => t.includes(w))) return { priority: "medium", strong: true };
  if (LOW.some((w) => t.includes(w))) return { priority: "low", strong: true };
  if (HIGH.some((w) => t.includes(w))) return { priority: "high", strong: true };
  return { priority: "medium", strong: false };
}

function detectPeople(text: string, people: Person[]): string[] {
  const found: string[] = [];
  const t = text.toLowerCase();
  people.forEach((p) => {
    const parts = [p.name, p.nameEn, p.name.split(" ")[0], p.nameEn.split(" ")[0]];
    if (parts.some((x) => x && t.includes(x.toLowerCase()))) found.push(p.id);
  });
  return [...new Set(found)];
}

function detectLocation(text: string): string | null {
  const t = text;
  const m = t.match(/در\s+(اتاق[^,،.\n]*|سالن[^,،.\n]*|دفتر[^,،.\n]*|رستوران[^,،.\n]*)/);
  if (m) return m[1].trim().replace(/\s+(با|برگزار|تشکیل).*$/, "").trim();
  if (/(زوم|zoom)/i.test(t)) return "Zoom";
  if (/(گوگل میت|google meet|meet)/i.test(t)) return "Google Meet";
  if (/(اسکایپ|skype)/i.test(t)) return "Skype";
  if (/(تلفن|تماس تلفنی|phone)/.test(t)) return "تلفنی";
  if (/(آنلاین|online)/.test(t)) return "آنلاین";
  return null;
}

function cleanTitle(s: string) {
  let out = s
    .replace(/^[\-•*–—\s]+/, "")
    .replace(/^(همچنین|ضمناً|ضمنا|در ضمن|علاوه بر این|also|and)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  out = out.replace(/^(قرار شد|قرار است|مقرر شد)\s+/, "");
  if (out.length > 92) out = out.slice(0, 89).trim() + "…";
  return out;
}

export interface ExtractionResult {
  tasks: ExtractedTask[];
  meetings: ExtractedMeeting[];
  summary: string;
  summaryEn: string;
  stats: { sentences: number; entities: number; dates: number };
}

export function extract(raw: string, people: Person[]): ExtractionResult {
  const text = raw.trim();
  const sentences = text
    .split(/[\n.؛;!?۔]+|(?<=\S)\.(?=\s)/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);

  const tasks: ExtractedTask[] = [];
  const meetings: ExtractedMeeting[] = [];
  let dateHits = 0;
  const entitySet = new Set<string>();

  sentences.forEach((s) => {
    const low = s.toLowerCase();
    const persons = detectPeople(s, people);
    persons.forEach((p) => entitySet.add(p));
    const { date, strong: dStrong } = detectDate(s);
    if (dStrong) dateHits += 1;
    const { priority, strong: pStrong } = detectPriority(s);
    const time = detectTime(s);

    const isMeeting = MEETING_WORDS.some((w) => low.includes(w)) && (time.strong || dStrong);
    const isTask = TASK_WORDS.some((w) => low.includes(w));

    if (isMeeting) {
      let conf = 0.62;
      if (time.strong) conf += 0.15;
      if (dStrong) conf += 0.12;
      if (persons.length) conf += 0.08;
      meetings.push({
        id: uid(),
        title: cleanTitle(s),
        date,
        start: time.start,
        end: time.end,
        location: detectLocation(s) ?? "نامشخص",
        attendees: persons,
        confidence: Math.min(0.98, conf),
        accepted: null,
      });
    } else if (isTask) {
      let conf = 0.6;
      if (dStrong) conf += 0.14;
      if (persons.length) conf += 0.12;
      if (pStrong) conf += 0.09;
      tasks.push({
        id: uid(),
        title: cleanTitle(s),
        priority,
        due: date,
        assignee: persons[0],
        confidence: Math.min(0.98, conf),
        accepted: null,
      });
    }
  });

  // Fallback: if nothing detected, treat the longest lines as tasks
  if (tasks.length === 0 && meetings.length === 0 && sentences.length) {
    sentences
      .slice()
      .sort((a, b) => b.length - a.length)
      .slice(0, 3)
      .forEach((s) => {
        const { date } = detectDate(s);
        tasks.push({
          id: uid(),
          title: cleanTitle(s),
          priority: detectPriority(s).priority,
          due: date,
          assignee: detectPeople(s, people)[0],
          confidence: 0.55,
          accepted: null,
        });
      });
  }

  const summary =
    `از ${sentences.length} جمله تحلیل‌شده، ${tasks.length} تسک و ${meetings.length} جلسه شناسایی شد. ` +
    `${entitySet.size} فرد و ${dateHits} تاریخ زمانی تشخیص داده شد.` +
    (tasks.some((x) => x.priority === "urgent") ? " ⚠️ حداقل یک مورد با اولویت فوری وجود دارد." : "");
  const summaryEn =
    `Analyzed ${sentences.length} sentences — found ${tasks.length} tasks and ${meetings.length} meetings, ` +
    `${entitySet.size} people and ${dateHits} temporal references.` +
    (tasks.some((x) => x.priority === "urgent") ? " ⚠️ At least one urgent item detected." : "");

  return {
    tasks: tasks.slice(0, 8),
    meetings: meetings.slice(0, 6),
    summary,
    summaryEn,
    stats: { sentences: sentences.length, entities: entitySet.size, dates: dateHits },
  };
}
