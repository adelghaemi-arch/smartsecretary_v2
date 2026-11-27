import { addDays, formatDate, isoKey, parseISO, relativeDay, toFaDigits } from "./jalali";
import { detectDate, detectPriority, detectTime, extract, normalizeDigits } from "./extract";
import { conceptSummary, findConceptNode } from "./graph";
import type { AppMode, Lang, Meeting, Notebook, Person, Task, Theme, Widget } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const norm = (s: string) =>
  normalizeDigits(s)
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .replace(/\u200c/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

export interface AgentState {
  tasks: Task[];
  meetings: Meeting[];
  people: Person[];
  notebooks: Notebook[];
  concepts: import("./types").Concept[];
}

export interface AgentActions {
  addTask: (t: Partial<Task> & { title: string }) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  addMeeting: (m: Partial<Meeting> & { title: string; date: string; start: string; end: string }) => string;
  addPerson: (p: { name: string; role: string; org: string; email: string; phone: string }) => string;
  addPage: (nbId: string, secId: string) => string;
  updatePage: (nbId: string, secId: string, pageId: string, patch: { title?: string; content?: string }) => void;
  addConnectionRequest: (personId: string, action: "request" | "disconnect") => void;
  setTheme: (t: Theme) => void;
  setLang: (l: Lang) => void;
  setMode: (m: AppMode) => void;
}

export interface AgentCtx {
  lang: Lang;
  state: AgentState;
  actions: AgentActions;
}

export interface AgentReply {
  text: string;
  widget?: Widget;
  suggestions?: string[];
}

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

const n = (v: number | string, lang: Lang) => (lang === "fa" ? toFaDigits(v) : String(v));

function findTask(tasks: Task[], q: string): Task | null {
  const s = norm(q);
  let best: Task | null = null;
  let bestScore = 0;
  for (const t of tasks) {
    const title = norm(t.title);
    if (!title) continue;
    let score = 0;
    if (s.includes(title)) score += 60;
    for (const w of title.split(" ")) if (w.length > 2 && s.includes(w)) score += w.length;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return bestScore >= 5 ? best : null;
}

function findPeople(people: Person[], q: string): Person[] {
  const s = norm(q);
  return people.filter((p) => {
    const cands = [p.name, p.nameEn, p.name.split(" ")[0], p.nameEn.split(" ")[0], p.name.split(" ").slice(-1)[0]];
    return cands.some((c) => c && c.length > 2 && s.includes(norm(c)));
  });
}

function stripNoise(raw: string, lang: Lang) {
  let s = raw.replace(/\u200c/g, "").trim();
  s = s.replace(
    /^(لطفا|لطفاً|میشه|میشه که|بیزحمت|سلام|هی|please|hey|hi)\s+/gi,
    "",
  );
  s = s.replace(
    /(یادم بنداز که|یادم بنداز|یادآوری کن که|یادآوری کن|یک تسک بساز برای|یه تسک بساز برای|یک تسک برای|یه تسک برای|تسک جدید برای|تسک جدید|تسک بساز|کار جدید|remind me to|add a task to|add task|create task|new task|todo)/gi,
    "",
  );
  s = s.replace(/\s*(رو|را)?\s*(ثبت|اضافه|ایجاد)\s*(کن|کنید)?\s*[.!]?$/g, "");
  s = s.replace(/\s*(بساز|درست کن|create|add)\s*[.!]?$/gi, "");
  s = s.replace(/\b(برای|تا|در)?\s*(امروز|فردا|پسفردا|هفته آینده|هفته بعد|آخر هفته|today|tomorrow|next week)\b/gi, " ");
  s = s.replace(/(تا|برای|روز)?\s*(شنبه|یکشنبه|دوشنبه|سهشنبه|چهارشنبه|پنجشنبه|جمعه)/g, " ");
  s = s.replace(/ساعت\s*\d{1,2}([:.]\d{2})?/g, " ");
  s = s.replace(/\b(خیلی )?(فوری|مهم|اولویت (بالا|پایین|متوسط)|urgent|important)\b/gi, " ");
  s = s.replace(/\s+/g, " ").replace(/^[:،,\-–]+/, "").trim();
  if (!s) s = lang === "fa" ? "مورد جدید" : "New item";
  return s.slice(0, 90);
}

function greetWord(lang: Lang) {
  const h = new Date().getHours();
  if (lang === "fa") return h < 12 ? "صبح بخیر" : h < 18 ? "ظهر بخیر" : "عصر بخیر";
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/* ------------------------------------------------------------------ */
/*  Briefing — the "on open" report                                    */
/* ------------------------------------------------------------------ */

export function buildBriefing(ctx: AgentCtx): AgentReply {
  const { lang, state } = ctx;
  const today = isoKey(new Date());
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const todayMeetings = state.meetings
    .filter((m) => m.date === today)
    .sort((a, b) => a.start.localeCompare(b.start));
  const next = todayMeetings.find((m) => {
    const [h, mi] = m.start.split(":").map(Number);
    return h * 60 + mi >= nowMin;
  });
  const dueToday = state.tasks.filter((t) => t.status !== "done" && t.due === today);
  const overdue = state.tasks.filter((t) => t.status !== "done" && t.due < today);
  const urgent = state.tasks.filter((t) => t.status !== "done" && t.priority === "urgent");
  const waiting = state.tasks.filter((t) => t.status === "review");

  if (lang === "fa") {
    const l1 = `${greetWord("fa")} 👋 امروز ${formatDate(now, "fa", { withWeekday: true })} است؛ ${toFaDigits(todayMeetings.length)} جلسه و ${toFaDigits(dueToday.length)} کار سررسیدشده دارید.`;
    const l2 = next
      ? `نزدیک‌ترین رویداد «${next.title}» ساعت ${toFaDigits(next.start)} در ${next.location} است${next.online ? " (آنلاین)" : ""}.`
      : todayMeetings.length
        ? "همه جلسات امروز برگزار شده‌اند؛ باقی روز برای کار عمیق آزاد است."
        : "امروز جلسه‌ای در تقویم ندارید — فرصت خوبی برای تمرکز روی کارهای عقب‌افتاده.";
    const l3 =
      overdue.length > 0
        ? `⚠️ ${toFaDigits(overdue.length)} پیگیری عقب‌افتاده دارید${urgent.length ? ` و ${toFaDigits(urgent.length)} مورد با اولویت فوری` : ""}؛ مهم‌ترینش «${overdue[0].title}» است.`
        : waiting.length > 0
          ? `${toFaDigits(waiting.length)} مورد در انتظار بازبینی شماست. چیزی عقب‌افتاده نداریم ✅`
          : "هیچ کار عقب‌افتاده‌ای ندارید — همه‌چیز روی ریل است ✅";
    return {
      text: `${l1}\n${l2}\n${l3}\n\nدر خدمتم؛ چه کاری برایتان انجام دهم؟`,
      widget: { kind: "agenda", date: today },
      suggestions: ["پیگیری‌های عقب‌افتاده", "تسک‌های امروز", "تقویم این ماه", "چه کارهایی بلدی؟"],
    };
  }

  const l1 = `${greetWord("en")} 👋 It's ${formatDate(now, "en", { withWeekday: true })} — you have ${todayMeetings.length} meetings and ${dueToday.length} tasks due today.`;
  const l2 = next
    ? `Next up: "${next.titleEn ?? next.title}" at ${next.start} in ${next.location}${next.online ? " (online)" : ""}.`
    : todayMeetings.length
      ? "All of today's meetings are done — the rest of the day is free for deep work."
      : "No meetings on the calendar today — a great window for focused work.";
  const l3 =
    overdue.length > 0
      ? `⚠️ ${overdue.length} follow-ups are overdue${urgent.length ? ` and ${urgent.length} are marked urgent` : ""}; the top one is "${overdue[0].titleEn ?? overdue[0].title}".`
      : waiting.length > 0
        ? `${waiting.length} items are waiting for your review. Nothing overdue ✅`
        : "Nothing overdue — everything is on track ✅";
  return {
    text: `${l1}\n${l2}\n${l3}\n\nHow can I help?`,
    widget: { kind: "agenda", date: today },
    suggestions: ["Overdue follow-ups", "Today's tasks", "Show calendar", "What can you do?"],
  };
}

/* ------------------------------------------------------------------ */
/*  Main intent router                                                 */
/* ------------------------------------------------------------------ */

export function runAgent(raw: string, ctx: AgentCtx): AgentReply {
  const { lang, state, actions } = ctx;
  const fa = lang === "fa";
  const s = norm(raw);
  const today = isoKey(new Date());
  const N = (v: number | string) => n(v, lang);

  const sug = {
    base: fa
      ? ["برنامه امروز", "تسک‌های باز", "تقویم این ماه", "پیگیری‌ها"]
      : ["Today's plan", "Open tasks", "Calendar", "Follow-ups"],
  };

  /* ---------- account connection ---------- */
  if (/(درخواست اتصال|وصلش کن|اتصال بفرست|متصلش کن|send (a )?connection|connect (to )?account)/.test(s)) {
    const mentioned = findPeople(state.people, s)[0];
    const candidate = mentioned ?? state.people.find((p) => p.accountId && (!p.connectionStatus || p.connectionStatus === "none"));
    if (!candidate?.accountId) {
      return {
        text: fa ? "اکانت ثبت‌شده‌ای برای این مخاطب پیدا نکردم. ابتدا شماره موبایلش را در مخاطبان ثبت کنید." : "I couldn't find a registered account for this contact. Add their mobile number first.",
        widget: { kind: "people", ids: state.people.map((p) => p.id) },
      };
    }
    if (candidate.connectionStatus === "connected") {
      return { text: fa ? `شما از قبل به ${candidate.name} متصل هستید ✅` : `You are already connected to ${candidate.nameEn} ✅`, widget: { kind: "people", ids: [candidate.id] } };
    }
    actions.addConnectionRequest(candidate.id, "request");
    return {
      text: fa ? `درخواست اتصال برای ${candidate.name} ارسال شد 🔗 بعد از تایید او، جلسات و پیام‌های مرتبط برایش ارسال می‌شود.` : `Connection request sent to ${candidate.nameEn} 🔗 Once accepted, related meetings and messages will be delivered to them.`,
      widget: { kind: "people", ids: [candidate.id] },
      suggestions: fa ? ["مخاطبان", "یک جلسه باهاش بذار", "برنامه امروز"] : ["People", "Schedule a meeting with them", "Today's plan"],
    };
  }
  if (/^(نه|نه فعلا|فعلا نه|خیر|not now|no thanks)$/.test(s)) {
    return { text: fa ? "باشه، فعلاً درخواستی ارسال نمی‌کنم." : "Okay, I won't send a request for now.", suggestions: sug.base };
  }

  /* ---------- disconnect account ---------- */
  if (/(قطع اتصال|اتصال.*قطع|وصلش نکن|disconnect|remove connection|unlink account)/.test(s)) {
    const mentioned = findPeople(state.people, s)[0];
    const candidate = mentioned ?? state.people.find((p) => p.connectionStatus === "connected");
    if (!candidate || candidate.connectionStatus !== "connected") {
      return {
        text: fa ? "اتصال فعالی با این فرد پیدا نکردم." : "I couldn't find an active connection with this person.",
        widget: { kind: "people", ids: state.people.filter((p) => p.connectionStatus === "connected").map((p) => p.id) },
      };
    }
    actions.addConnectionRequest(candidate.id, "disconnect");
    return {
      text: fa
        ? `اتصال حساب شما با ${candidate.name} قطع شد 🔌 منشی او هم از این موضوع مطلع شد.`
        : `Your account connection with ${candidate.nameEn} was disconnected 🔌 Their secretary was notified as well.`,
      widget: { kind: "people", ids: [candidate.id] },
      suggestions: fa ? ["مخاطبان", "برنامه امروز"] : ["People", "Today's plan"],
    };
  }

  /* ---------- smart cards: disambiguation / capability / deliverable ---------- */
  if (/(پیام بده|پیام بفرست|بگو به|تماس بگیر|زنگ بزن|send (a )?message|message|call )/.test(s)) {
    const token = raw.replace(/^(به|با)\s+|(پیام بده|پیام بفرست|بگو به|تماس بگیر|زنگ بزن).*/gi, "").trim().split(" ")[0];
    const matches = state.people.filter((p) => norm(p.name).includes(norm(token)) || norm(p.nameEn).includes(norm(token)));
    if (/(تماس|زنگ|call)/.test(s) && !matches.length) {
      return {
        text: fa ? "برای برقراری تماس تلفنی به ماژول تلفن نیاز دارم. از این کارت می‌توانید مستقیم وصلش کنید." : "I need the phone module to place calls. You can connect it right from this card.",
        widget: { kind: "capability", tool: "خط تلفن VoIP", reason: "برای برقراری تماس تلفنی به ماژول تلفن نیاز دارم. پس از اتصال، می‌توانم تماس بگیرم، خلاصه مکالمه را ثبت کنم و نتیجه را پیگیری کنم.", reasonEn: "I need the phone module to place calls. Once connected I can call, log a summary and follow up." },
        suggestions: fa ? ["پیگیری‌های منشی", "مهارت‌ها و ابزارها"] : ["Follow-ups", "Skills & tools"],
      };
    }
    if (matches.length || token.length > 1) {
      const options = [
        ...matches.map((p) => ({ personId: p.id, name: lang === "fa" ? p.name : p.nameEn, role: lang === "fa" ? p.role : p.roleEn, tag: p.context === "family" ? (fa ? "اولویت شخصی" : "Personal") : (fa ? "اولویت کاری" : "Work") })),
        { personId: "", name: fa ? "دکتر مریم فرهی" : "Dr. Maryam Farhi", role: fa ? "پزشک — خانم دکتر" : "Physician", tag: fa ? "اولویت کاری" : "Work" },
      ].slice(0, 3);
      return {
        text: fa ? `«${token || "این مخاطب"}» چند گزینه دارد. کدام را می‌خواهی؟` : `“${token || "this contact"}” matches more than one option. Which one?`,
        widget: { kind: "disambiguation", command: token || (fa ? "مریم" : "Maryam"), options },
        suggestions: fa ? ["مخاطبان", "حافظه و افراد"] : ["People", "Memory"],
      };
    }
  }
  if (/(گزارش|مستند|پیش‌نویس|خلاصه|سند|draft|document|report|summary)/.test(s) && /(بساز|تهیه|بنویس|آماده|create|generate|write)/.test(s)) {
    const todayMeetings = state.meetings.filter((m) => m.date === isoKey(new Date()));
    const items = state.tasks.filter((x) => x.status !== "done").slice(0, 4);
    const body = fa
      ? `# پیش‌نویس گزارش جلسه\n\n## مصوبات\n${todayMeetings.map((m) => `- ${m.title}`).join("\n") || "- جمع‌بندی جلسه امروز"}\n\n## مسئول و زمان تحویل\n${items.map((x) => `| ${x.title} | ${state.people.find((p) => p.id === x.assignee)?.name ?? "—"} | ${x.due} |`).join("\n")}\n\n## گام بعدی\n- تأیید شما و ارسال به شرکت‌کنندگان`
      : `# Meeting report draft\n\n## Decisions\n${todayMeetings.map((m) => `- ${m.titleEn ?? m.title}`).join("\n") || "- Summary of today"}\n\n## Owners & due dates\n${items.map((x) => `| ${x.titleEn ?? x.title} | ${state.people.find((p) => p.id === x.assignee)?.nameEn ?? "—"} | ${x.due} |`).join("\n")}\n\n## Next step\n- Your approval, then send to attendees`;
    return {
      text: fa ? "پیش‌نویس مستند را آماده کردم ✍️ می‌توانید تأیید، با صدا ویرایش یا دانلود کنید." : "I drafted the document ✍️ Approve, edit by voice, or download it.",
      widget: { kind: "deliverable", title: fa ? "پیش‌نویس گزارش جلسه" : "Meeting report draft", kindLabel: fa ? "مستند" : "Document", body },
      suggestions: fa ? ["ارسال برای حاضران", "پیگیری‌های منشی", "مستند جدید"] : ["Send to attendees", "Follow-ups", "New document"],
    };
  }
  if (/(پیگیری‌های|پیگیری های|follow.?up|پیگیری منشی)/.test(s) && /(نشون|ببینم|لیست|گزارش|چی|show|list|board)/.test(s)) {
    return {
      text: fa ? "این هم تابلوی پیگیری‌ها. هرکدام را می‌توانید همان‌جا پیگیری مجدد یا تکمیل کنید." : "Here's your follow-up board. Ping or complete any item right here.",
      widget: { kind: "followup", ids: [] },
      suggestions: fa ? ["کارها و پیگیری‌ها", "تسک‌های امروز"] : ["Follow-ups board", "Today's tasks"],
    };
  }

  /* ---------- 0. help ---------- */
  if (/(چیکار|چه کاری|چه کارهایی|راهنما|کمکم کن|بلدی|توانایی|help|what can you|commands)/.test(s)) {
    return {
      text: fa
        ? "من می‌توانم کل سیستم را از همین‌جا اداره کنم — تسک، جلسه، تقویم، اسناد، مخاطبان و تحلیل صورت‌جلسه. کافی است بگویید 👇"
        : "I can run the whole workspace from here — tasks, meetings, calendar, documents, contacts and note analysis. Just ask 👇",
      widget: { kind: "help" },
      suggestions: sug.base,
    };
  }

  /* ---------- 1. mode / theme / lang ---------- */
  if (/(نمای کلاسیک|حالت کلاسیک|داشبورد کلاسیک|پنل کلاسیک|برو به داشبورد|classic view|classic mode|open dashboard)/.test(s)) {
    actions.setMode("classic");
    return { text: fa ? "به نمای کلاسیک سوئیچ کردم 🖥️ هر وقت خواستید با دکمه شناور برگردید." : "Switched to the classic workspace 🖥️ Use the floating button to come back." };
  }
  if (/(حالت تاریک|تم تاریک|دارک|شب|dark mode|dark theme)/.test(s)) {
    actions.setTheme("dark");
    return { text: fa ? "حالت تاریک فعال شد 🌙" : "Dark mode enabled 🌙", suggestions: sug.base };
  }
  if (/(حالت روشن|تم روشن|لایت|روز|light mode|light theme)/.test(s)) {
    actions.setTheme("light");
    return { text: fa ? "حالت روشن فعال شد ☀️" : "Light mode enabled ☀️", suggestions: sug.base };
  }
  if (/(به انگلیسی|زبان انگلیسی|switch to english|english please)/.test(s)) {
    actions.setLang("en");
    return { text: "Switched to English 🇬🇧 How can I help?" };
  }
  if (/(به فارسی|زبان فارسی|switch to persian|farsi please)/.test(s)) {
    actions.setLang("fa");
    return { text: "زبان به فارسی تغییر کرد 🇮🇷 در خدمتم." };
  }

  /* ---------- 2. explicit extraction / long paste ---------- */
  const isLongPaste = raw.trim().length > 170 && raw.includes("\n");
  if (/(تحلیل کن|استخراج کن|استخراج|صورتجلسه|صورت جلسه|این متن|analyze this|extract from|meeting notes)/.test(s) || isLongPaste) {
    const body = raw.replace(/^(این متن را تحلیل کن|این متن رو تحلیل کن|تحلیل کن|استخراج کن|analyze this|extract from)\s*:?\s*/i, "");
    const r = extract(body, state.people);
    return {
      text: fa
        ? `متن را تحلیل کردم 🔍 ${toFaDigits(r.tasks.length)} تسک و ${toFaDigits(r.meetings.length)} جلسه پیدا شد. موارد را تایید یا رد کنید تا در فضای کاری ثبت شوند.`
        : `Analyzed the text 🔍 Found ${r.tasks.length} tasks and ${r.meetings.length} meetings. Accept or reject each card to save it.`,
      widget: { kind: "extract", tasks: r.tasks, meetings: r.meetings, summary: r.summary, summaryEn: r.summaryEn },
      suggestions: fa ? ["تسک‌های باز", "برنامه فردا", "تقویم این ماه"] : ["Open tasks", "Tomorrow's plan", "Calendar"],
    };
  }

  /* ---------- 3. complete / delete a task ---------- */
  if (/(انجام شد|تمام شد|تموم شد|تیک بزن|ببند|کامل شد|مارک کن|mark done|complete|finished)/.test(s)) {
    const target = findTask(state.tasks.filter((t) => t.status !== "done"), s) ?? findTask(state.tasks, s);
    if (target) {
      actions.updateTask(target.id, { status: "done" });
      return {
        text: fa ? `آفرین 🎉 «${target.title}» به‌عنوان انجام‌شده علامت خورد.` : `Nice 🎉 "${target.titleEn ?? target.title}" marked as done.`,
        widget: { kind: "tasks", ids: [target.id], title: "به‌روزرسانی شد", titleEn: "Updated" },
        suggestions: fa ? ["تسک‌های باز", "پیگیری‌ها", "برنامه فردا"] : ["Open tasks", "Follow-ups", "Tomorrow"],
      };
    }
    return {
      text: fa ? "کدام تسک را ببندم؟ از لیست زیر انتخاب کنید یا عنوانش را بنویسید." : "Which task should I close? Pick one below or type its title.",
      widget: { kind: "tasks", ids: state.tasks.filter((t) => t.status !== "done").slice(0, 6).map((t) => t.id), title: "تسک‌های باز", titleEn: "Open tasks" },
    };
  }
  if (/(حذف کن|پاک کن|کنسل کن|لغو کن|delete|remove|cancel)/.test(s) && /(تسک|کار|task)/.test(s)) {
    const target = findTask(state.tasks, s);
    if (target) {
      actions.removeTask(target.id);
      return { text: fa ? `تسک «${target.title}» حذف شد 🗑️` : `Task "${target.titleEn ?? target.title}" deleted 🗑️`, suggestions: sug.base };
    }
  }

  /* ---------- 4. create meeting ---------- */
  const meetingIntent =
    /(جلسه|قرار|ملاقات|نشست|meeting|call|appointment)/.test(s) &&
    /(بذار|بگذار|بزار|تنظیم|ست کن|هماهنگ|رزرو|اضافه|ثبت|بساز|set|schedule|book|arrange|create)/.test(s);
  if (meetingIntent) {
    const d = detectDate(raw);
    const tm = detectTime(raw);
    const attendees = findPeople(state.people, s).map((p) => p.id);
    const cleaned = stripNoise(raw, lang);
    let title = cleaned.replace(/(جلسه|قرار|ملاقات|meeting|call)\s*/i, "").trim();
    title = title ? (fa ? `جلسه ${title}` : `Meeting ${title}`) : fa ? "جلسه جدید" : "New meeting";
    const loc = /(زوم|zoom)/.test(s) ? "Zoom" : /(میت|meet)/.test(s) ? "Google Meet" : /(تلفن|call)/.test(s) ? (fa ? "تلفنی" : "Phone") : /(آنلاین|online)/.test(s) ? (fa ? "آنلاین" : "Online") : fa ? "اتاق جلسات" : "Meeting room";
    const id = actions.addMeeting({
      title,
      titleEn: title,
      date: d.date,
      start: tm.start,
      end: tm.end,
      location: loc,
      kind: /(تماس|call)/.test(s) ? "call" : "meeting",
      priority: detectPriority(raw).priority,
      attendees,
      agenda: fa ? "ایجادشده از طریق گفتگو با منشی هوشمند" : "Created via SmartSecretary chat",
      online: /(زوم|zoom|میت|meet|آنلاین|online)/.test(s),
    });
    const who = attendees.length ? (fa ? ` با ${state.people.filter((p) => attendees.includes(p.id)).map((p) => p.name).join("، ")}` : ` with ${state.people.filter((p) => attendees.includes(p.id)).map((p) => p.nameEn).join(", ")}`) : "";
    const connected = state.people.filter((p) => attendees.includes(p.id) && p.connectionStatus === "connected");
    const delivered = connected.length
      ? fa
        ? ` اعلان جلسه برای ${connected.map((p) => p.name).join("، ")} هم ارسال شد 🔔`
        : ` A notification was also sent to ${connected.map((p) => p.nameEn).join(", ")} 🔔`
      : attendees.length
        ? fa ? " هنوز اتصال حسابی برای ارسال اعلان نداریم." : " No connected account was available for delivery yet."
        : "";
    return {
      text: fa
        ? `جلسه ثبت شد ✅ «${title}»${who} برای ${formatDate(parseISO(d.date), "fa", { withWeekday: true })} ساعت ${toFaDigits(tm.start)} در ${loc}.${delivered}`
        : `Meeting scheduled ✅ "${title}"${who} on ${formatDate(parseISO(d.date), "en", { withWeekday: true })} at ${tm.start} in ${loc}.${delivered}`,
      widget: { kind: "meetings", ids: [id], title: "جلسه جدید", titleEn: "New meeting" },
      suggestions: fa ? ["برنامه آن روز", "تقویم این ماه", "یک تسک هم بساز"] : ["Agenda that day", "Calendar", "Also create a task"],
    };
  }

  /* ---------- 5. create note / page ---------- */
  if (/(یادداشت|صفحه|سند|note|page|doc)/.test(s) && /(بساز|جدید|اضافه|ثبت|بنویس|create|new|add)/.test(s)) {
    const nb = state.notebooks[state.notebooks.length - 1] ?? state.notebooks[0];
    const sec = nb?.sections[0];
    if (nb && sec) {
      const pid = actions.addPage(nb.id, sec.id);
      const title = stripNoise(raw.replace(/(یادداشت|صفحه|سند|note|page|doc)/gi, ""), lang);
      actions.updatePage(nb.id, sec.id, pid, {
        title,
        content: fa ? `# ${title}\n\nنوشته‌شده توسط منشی هوشمند — ${formatDate(new Date(), "fa")}\n\n- ` : `# ${title}\n\nCaptured by SmartSecretary — ${formatDate(new Date(), "en")}\n\n- `,
      });
      return {
        text: fa ? `یادداشت «${title}» در دفترچه «${nb.title}» ساخته شد 📝 می‌توانید همین‌جا ویرایشش کنید.` : `Note "${title}" created in "${nb.title}" 📝 You can edit it right here.`,
        widget: { kind: "doc", nbId: nb.id, secId: sec.id, pageId: pid },
        suggestions: fa ? ["همه اسناد", "یادداشت‌های ستاره‌دار", "تسک‌های باز"] : ["All documents", "Starred notes", "Open tasks"],
      };
    }
  }

  /* ---------- 6. add contact ---------- */
  if (/(مخاطب|همکار|contact|person)/.test(s) && /(اضافه|جدید|ثبت|بساز|add|new|create)/.test(s)) {
    const nameMatch = raw.match(/(?:مخاطب جدید|مخاطب|contact)\s*:?\s*([\p{L}\s]{3,40})/u);
    const name = (nameMatch?.[1] ?? "").replace(/(اضافه|جدید|ثبت|بساز|add|new|create|را|رو)/g, "").trim() || (fa ? "مخاطب جدید" : "New contact");
    const id = actions.addPerson({
      name,
      role: fa ? "همکار" : "Colleague",
      org: fa ? "سایر" : "Other",
      email: "—",
      phone: "—",
    });
    return {
      text: fa ? `مخاطب «${name}» به دفترچه اضافه شد 👤` : `Contact "${name}" added 👤`,
      widget: { kind: "people", ids: [id] },
      suggestions: fa ? ["همه مخاطبان", "بار کاری تیم"] : ["All contacts", "Team workload"],
    };
  }

  /* ---------- 7. create task ---------- */
  const createVerb = /(بساز|اضافه کن|ثبت کن|بنویس|ایجاد کن|درست کن|یادم بنداز|یادآوری کن|add|create|new task|remind)/.test(s);
  const listVerb = /(نشون بده|نشان بده|نمایش|لیست|ببینم|چیه|چیست|کدوم|show|list|view)/.test(s);
  const taskIntent =
    /(یادم بنداز|یادآوری کن|remind me)/.test(s) ||
    (/(تسک|کار جدید|todo|task)/.test(s) && createVerb && !listVerb) ||
    (createVerb && !listVerb && !/(جلسه|meeting|مخاطب|contact|یادداشت|note|صفحه|page|سند)/.test(s));
  if (taskIntent) {
    const d = detectDate(raw);
    const pr = detectPriority(raw);
    const assignees = findPeople(state.people, s);
    const title = stripNoise(raw, lang);
    const id = actions.addTask({
      title,
      titleEn: title,
      status: "todo",
      priority: pr.priority,
      due: d.date,
      assignee: assignees[0]?.id,
      tags: [fa ? "از گفتگو" : "chat"],
      source: "chat",
    });
    return {
      text: fa
        ? `ثبت شد ✅ «${title}» با اولویت ${pr.priority === "urgent" ? "فوری" : pr.priority === "high" ? "بالا" : pr.priority === "low" ? "پایین" : "متوسط"} و سررسید ${relativeDay(parseISO(d.date), "fa")}${assignees[0] ? ` برای ${assignees[0].name}` : ""}.`
        : `Added ✅ "${title}" — ${pr.priority} priority, due ${relativeDay(parseISO(d.date), "en")}${assignees[0] ? `, assigned to ${assignees[0].nameEn}` : ""}.`,
      widget: { kind: "tasks", ids: [id], title: "تسک جدید", titleEn: "New task" },
      suggestions: fa ? ["تسک‌های امروز", "یک جلسه هم بذار", "پیگیری‌ها"] : ["Today's tasks", "Schedule a meeting", "Follow-ups"],
    };
  }

  /* ---------- 8. follow-ups / overdue ---------- */
  if (/(پیگیری|عقب افتاده|عقبافتاده|دیرکرد|منتظر|معوق|follow ?up|overdue|pending|waiting)/.test(s)) {
    const overdue = state.tasks.filter((t) => t.status !== "done" && t.due < today);
    const review = state.tasks.filter((t) => t.status === "review");
    const ids = [...overdue, ...review.filter((r) => !overdue.some((o) => o.id === r.id))].map((t) => t.id);
    return {
      text: fa
        ? ids.length
          ? `گزارش پیگیری‌ها 📌 ${toFaDigits(overdue.length)} مورد عقب‌افتاده و ${toFaDigits(review.length)} مورد در انتظار بازبینی. پیشنهاد می‌کنم از «${(overdue[0] ?? review[0]).title}» شروع کنید.`
          : "هیچ پیگیری عقب‌افتاده‌ای ندارید ✅ همه‌چیز به‌روز است."
        : ids.length
          ? `Follow-up report 📌 ${overdue.length} overdue and ${review.length} awaiting review. I'd start with "${(overdue[0] ?? review[0]).titleEn ?? (overdue[0] ?? review[0]).title}".`
          : "No overdue follow-ups ✅ Everything is up to date.",
      widget: ids.length ? { kind: "tasks", ids, title: "پیگیری‌ها", titleEn: "Follow-ups" } : undefined,
      suggestions: fa ? ["تسک‌های امروز", "بار کاری تیم", "برنامه فردا"] : ["Today's tasks", "Team workload", "Tomorrow"],
    };
  }

  /* ---------- 9. stats / KPI ---------- */
  if (/(آمار|شاخص|پیشرفت|عملکرد|داشبورد آمار|kpi|stats|progress|overview)/.test(s)) {
    const done = state.tasks.filter((t) => t.status === "done").length;
    const pct = state.tasks.length ? Math.round((done / state.tasks.length) * 100) : 0;
    return {
      text: fa
        ? `نمای کلی فضای کاری 📊 پیشرفت کلی ${toFaDigits(pct)}٪ (${toFaDigits(done)} از ${toFaDigits(state.tasks.length)} تسک انجام شده).`
        : `Workspace overview 📊 Overall progress ${pct}% (${done} of ${state.tasks.length} tasks completed).`,
      widget: { kind: "kpi" },
      suggestions: fa ? ["بار کاری تیم", "پیگیری‌ها", "تقویم این ماه"] : ["Team workload", "Follow-ups", "Calendar"],
    };
  }

  /* ---------- 10. calendar ---------- */
  if (/(تقویم|ماه|calendar|month view)/.test(s)) {
    return {
      text: fa ? "این هم نمای تقویم شمسی 🗓️ روی هر روز بزنید تا برنامه‌اش را بگویم." : "Here's the calendar 🗓️ Tap any day and I'll read out its plan.",
      widget: { kind: "calendar", anchor: today },
      suggestions: fa ? ["برنامه فردا", "جلسات این هفته", "یک جلسه بذار"] : ["Tomorrow's plan", "This week's meetings", "Schedule a meeting"],
    };
  }

  /* ---------- 11. people ---------- */
  if (/(مخاطب|شماره|تلفن|ایمیل|تماس با|کیه|کیست|تیم|همکار|contact|phone|email|who is|people|team)/.test(s)) {
    const matched = findPeople(state.people, s);
    if (matched.length) {
      const p = matched[0];
      return {
        text: fa ? `${p.name} — ${p.role} در ${p.org}` : `${p.nameEn} — ${p.roleEn} at ${p.org}`,
        widget: { kind: "people", ids: matched.map((x) => x.id) },
        suggestions: fa ? [`تسک‌های ${p.name.split(" ")[0]}`, "همه مخاطبان", "بار کاری تیم"] : [`${p.nameEn.split(" ")[0]}'s tasks`, "All contacts", "Team workload"],
      };
    }
    return {
      text: fa ? `دفترچه مخاطبان شما ${toFaDigits(state.people.length)} نفر دارد 👥` : `Your registry has ${state.people.length} contacts 👥`,
      widget: { kind: "people", ids: state.people.map((p) => p.id) },
      suggestions: fa ? ["بار کاری تیم", "مخاطب جدید اضافه کن"] : ["Team workload", "Add a contact"],
    };
  }

  /* ---------- 12. documents ---------- */
  if (/(سند|اسناد|یادداشت|دفترچه|صفحه|مستند|note|document|notebook|page|wiki)/.test(s)) {
    let hit: { nb: string; sec: string; pg: string; title: string } | null = null;
    for (const nb of state.notebooks)
      for (const sec of nb.sections)
        for (const pg of sec.pages) {
          const t = norm(pg.title);
          if (t.length > 3 && s.includes(t)) hit = { nb: nb.id, sec: sec.id, pg: pg.id, title: pg.title };
        }
    if (hit) {
      return {
        text: fa ? `صفحه «${hit.title}» را باز کردم 📄 می‌توانید همین‌جا ویرایش کنید.` : `Opened "${hit.title}" 📄 You can edit it inline.`,
        widget: { kind: "doc", nbId: hit.nb, secId: hit.sec, pageId: hit.pg },
        suggestions: fa ? ["همه اسناد", "یادداشت جدید بساز"] : ["All documents", "Create a note"],
      };
    }
    const total = state.notebooks.reduce((a, nb) => a + nb.sections.reduce((b, x) => b + x.pages.length, 0), 0);
    return {
      text: fa ? `${toFaDigits(state.notebooks.length)} دفترچه با ${toFaDigits(total)} صفحه دارید 📚 کدام را باز کنم؟` : `You have ${state.notebooks.length} notebooks with ${total} pages 📚 Which one?`,
      widget: { kind: "docs" },
      suggestions: fa ? ["یادداشت جدید بساز", "تسک‌های باز"] : ["Create a note", "Open tasks"],
    };
  }

  /* ---------- 13. tasks list ---------- */
  if (/(تسک|کارها|کارهام|لیست کار|وظایف|task|todo)/.test(s)) {
    let ids = state.tasks.filter((t) => t.status !== "done").map((t) => t.id);
    let title = fa ? "تسک‌های باز" : "Open tasks";
    if (/(امروز|today)/.test(s)) {
      ids = state.tasks.filter((t) => t.status !== "done" && t.due <= today).map((t) => t.id);
      title = fa ? "کارهای امروز" : "Due today";
    } else if (/(فردا|tomorrow)/.test(s)) {
      const tm = isoKey(addDays(new Date(), 1));
      ids = state.tasks.filter((t) => t.due === tm).map((t) => t.id);
      title = fa ? "کارهای فردا" : "Due tomorrow";
    } else if (/(فوری|urgent)/.test(s)) {
      ids = state.tasks.filter((t) => t.status !== "done" && t.priority === "urgent").map((t) => t.id);
      title = fa ? "تسک‌های فوری" : "Urgent tasks";
    } else if (/(انجام شده|انجامشده|تمام شده|done|completed)/.test(s)) {
      ids = state.tasks.filter((t) => t.status === "done").map((t) => t.id);
      title = fa ? "انجام‌شده‌ها" : "Completed";
    }
    const who = findPeople(state.people, s)[0];
    if (who) {
      ids = state.tasks.filter((t) => t.assignee === who.id && t.status !== "done").map((t) => t.id);
      title = fa ? `تسک‌های ${who.name}` : `${who.nameEn}'s tasks`;
    }
    return {
      text: ids.length
        ? fa
          ? `${N(ids.length)} مورد پیدا کردم. برای بستن هر کدام کافی است روی دایره‌اش بزنید.`
          : `Found ${ids.length} items. Tap the circle to complete any of them.`
        : fa
          ? "چیزی در این دسته پیدا نکردم ✅"
          : "Nothing in this bucket ✅",
      widget: { kind: "tasks", ids, title, titleEn: title },
      suggestions: fa ? ["یک تسک جدید بساز", "پیگیری‌ها", "بار کاری تیم"] : ["Create a task", "Follow-ups", "Team workload"],
    };
  }

  /* ---------- 14. agenda / day plan ---------- */
  if (/(برنامه|چه خبر|جلسات|قرارها|امروز|فردا|هفته|agenda|plan|schedule|today|tomorrow|week|what's on)/.test(s)) {
    if (/(هفته|week)/.test(s)) {
      const end = isoKey(addDays(new Date(), 7));
      const ids = state.meetings.filter((m) => m.date >= today && m.date <= end).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).map((m) => m.id);
      return {
        text: fa ? `${N(ids.length)} رویداد در هفت روز آینده دارید 📅` : `You have ${ids.length} events in the next 7 days 📅`,
        widget: { kind: "meetings", ids, title: "هفته پیش رو", titleEn: "Next 7 days" },
        suggestions: fa ? ["تقویم این ماه", "یک جلسه بذار"] : ["Calendar", "Schedule a meeting"],
      };
    }
    const target = /(فردا|tomorrow)/.test(s) ? isoKey(addDays(new Date(), 1)) : /(پسفردا|day after)/.test(s) ? isoKey(addDays(new Date(), 2)) : detectDate(raw).strong ? detectDate(raw).date : today;
    const evs = state.meetings.filter((m) => m.date === target);
    const tks = state.tasks.filter((t) => t.due === target && t.status !== "done");
    return {
      text: fa
        ? `${formatDate(parseISO(target), "fa", { withWeekday: true })}: ${toFaDigits(evs.length)} جلسه و ${toFaDigits(tks.length)} کار.${evs[0] ? ` اولین مورد «${evs[0].title}» ساعت ${toFaDigits(evs[0].start)}.` : ""}`
        : `${formatDate(parseISO(target), "en", { withWeekday: true })}: ${evs.length} meetings and ${tks.length} tasks.${evs[0] ? ` First up "${evs[0].titleEn ?? evs[0].title}" at ${evs[0].start}.` : ""}`,
      widget: { kind: "agenda", date: target },
      suggestions: fa ? ["تقویم این ماه", "پیگیری‌ها", "یک تسک بساز"] : ["Calendar", "Follow-ups", "Create a task"],
    };
  }

  /* ---------- 14b. concept relationships / knowledge graph ---------- */
  if (/(ارتباط|مرتبط|در ارتباط|به هم وصل|اتصال|connec|relat|link|associa|network)/.test(s)) {
    const pseudo = { ...state } as never;
    const nodeId = findConceptNode(pseudo, raw.replace(/(ارتباطات|ارتباط|در ارتباط|connections of|related to|links of|relations)/gi, "").replace(/[؟?های]/g, "").trim());
    if (nodeId) {
      const sm = conceptSummary(pseudo, nodeId, lang);
      return {
        text: fa ? `${sm.text}${sm.list.length ? " روی هر گره بزنید تا مرکز گراف شود." : ""}` : `${sm.text}${sm.list.length ? " Tap any node to re-center the graph." : ""}`,
        widget: { kind: "graph", center: (state.concepts.find((c) => `concept:${c.id}` === nodeId)?.label) ?? raw },
        suggestions: fa ? ["مفاهیم", "تسک‌های باز", "برنامه فردا"] : ["All concepts", "Open tasks", "Tomorrow"],
      };
    }
    return {
      text: fa ? "کدام مفهوم را بررسی کنم؟ از نقشه مفاهیم انتخاب کنید." : "Which concept should I explore? Pick from the map.",
      widget: { kind: "concepts" },
    };
  }
  if (/(مفاهیم|مفهوم|نقشه ذهن|گراف دانش|تگ‌ها|تگ ها|concepts|knowledge graph|tags|mindmap)/.test(s)) {
    return {
      text: fa ? "این هم نقشه مفاهیم و پروژه‌های شما 🕸️ هر کدام را بزنید تا ارتباطاتش را ببینید." : "Here's your concept & project map 🕸️ Tap any to see its connections.",
      widget: { kind: "concepts" },
      suggestions: fa ? ["ارتباطات پروژه اصلاحات", "ارتباطات پروژه ایران", "تسک‌های باز"] : ["Connections of Reforms", "Connections of Iran", "Open tasks"],
    };
  }

  /* ---------- 15. search ---------- */
  if (/(جستجو|پیدا کن|بگرد|سرچ|search|find)/.test(s)) {
    const q = raw.replace(/(جستجو کن|جستجو|پیدا کن|بگرد|سرچ کن|سرچ|search for|search|find)/gi, "").replace(/[:؟?]/g, "").trim();
    return {
      text: fa ? `نتایج جستجو برای «${q}» 🔎` : `Search results for "${q}" 🔎`,
      widget: { kind: "search", q },
      suggestions: sug.base,
    };
  }

  /* ---------- 16. social ---------- */
  if (/^(سلام|درود|های|هی|hi|hello|hey|صبح بخیر|good morning)/.test(s)) {
    return {
      text: fa ? `${greetWord("fa")}! 👋 در خدمتم — می‌خواهید گزارش امروز را بدهم یا کار خاصی ثبت کنم؟` : `${greetWord("en")}! 👋 Want today's briefing or shall I log something for you?`,
      suggestions: fa ? ["گزارش امروز", "تسک‌های باز", "یک جلسه بذار"] : ["Today's briefing", "Open tasks", "Schedule a meeting"],
    };
  }
  if (/(ممنون|مرسی|سپاس|دمت گرم|thanks|thank you|thx)/.test(s)) {
    return { text: fa ? "خواهش می‌کنم 🌟 هر وقت کاری داشتید همین‌جا هستم." : "Anytime 🌟 I'm right here whenever you need me.", suggestions: sug.base };
  }

  /* ---------- fallback ---------- */
  return {
    text: fa
      ? "کاملاً متوجه نشدم 🤔 اما می‌توانم تسک بسازم، جلسه تنظیم کنم، تقویم و اسناد را نشان دهم یا متن صورت‌جلسه را تحلیل کنم. یکی از این‌ها را انتخاب کنید:"
      : "I didn't fully catch that 🤔 I can create tasks, schedule meetings, show your calendar and docs, or analyze meeting notes. Pick one:",
    widget: { kind: "help" },
    suggestions: sug.base,
  };
}
