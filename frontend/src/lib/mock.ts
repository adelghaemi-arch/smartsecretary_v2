import { addDays, isoKey } from "./jalali";
import type { AppState, ChatMessage, Concept, Meeting, Notebook, Notification, Person, Task } from "./types";

const today = new Date();
const D = (n: number) => isoKey(addDays(today, n));

export const people: Person[] = [
  {
    id: "p1", name: "سارا محمدی", nameEn: "Sara Mohammadi", role: "مدیر محصول", roleEn: "Head of Product",
    org: "واحد محصول", email: "s.mohammadi@smartsec.ir", phones: ["۰۹۱۲ ۴۴۵ ۷۷ ۱۲"],
    notes: "هماهنگی جلسات محصول ترجیحاً قبل از ظهر انجام شود.", accountId: "acc_sara_44", connectionStatus: "connected",
    avatarColor: "from-fuchsia-500 to-pink-500", initials: "سم", tags: ["پروژه ایران", "هیئت مدیره", "محصول"], favorite: true, lastContact: D(-1),
  },
  {
    id: "p2", name: "علی رضوانی", nameEn: "Ali Rezvani", role: "سرپرست تیم فنی", roleEn: "Engineering Lead",
    org: "واحد فناوری", email: "a.rezvani@smartsec.ir", phones: ["۰۹۳۵ ۱۱۲ ۸۸ ۴۰", "۰۹۱۰ ۱۱۲ ۸۸ ۴۰"],
    notes: "شماره دوم برای تماس‌های اضطراری زیرساخت است.", accountId: "acc_ali_35", connectionStatus: "incoming",
    avatarColor: "from-indigo-500 to-blue-500", initials: "عر", tags: ["پلتفرم", "اپ موبایل", "زیرساخت"], favorite: true, lastContact: D(0),
  },
  {
    id: "p3", name: "نگار کاظمی", nameEn: "Negar Kazemi", role: "طراح ارشد UI/UX", roleEn: "Senior UI/UX Designer",
    org: "واحد طراحی", email: "n.kazemi@smartsec.ir", phone: "۰۹۱۹ ۷۷۳ ۲۲ ۰۵",
    avatarColor: "from-emerald-500 to-teal-500", initials: "نک", tags: ["پروژه ایران", "اپ موبایل", "دیزاین سیستم"], favorite: false, lastContact: D(-3),
  },
  {
    id: "p4", name: "دکتر مهرداد صدر", nameEn: "Dr. Mehrdad Sadr", role: "مدیرعامل", roleEn: "Chief Executive Officer",
    org: "هیئت مدیره", email: "m.sadr@smartsec.ir", phone: "۰۹۱۲ ۱۰۰ ۵۵ ۹۹",
    avatarColor: "from-amber-500 to-orange-500", initials: "مص", tags: ["هیئت مدیره", "پروژه اصلاحات", "مشتری آریانا"], favorite: true, lastContact: D(-2),
  },
  {
    id: "p5", name: "الهام فراهانی", nameEn: "Elham Farahani", role: "کارشناس منابع انسانی", roleEn: "HR Specialist",
    org: "منابع انسانی", email: "e.farahani@smartsec.ir", phone: "۰۹۳۹ ۶۶۴ ۱۹ ۳۳",
    avatarColor: "from-rose-500 to-red-500", initials: "اف", tags: ["استخدام", "پروژه اصلاحات"], favorite: false, lastContact: D(-6),
  },
  {
    id: "p6", name: "بهنام قاسمی", nameEn: "Behnam Ghasemi", role: "مدیر فروش سازمانی", roleEn: "Enterprise Sales Manager",
    org: "واحد فروش", email: "b.ghasemi@smartsec.ir", phones: ["۰۹۱۲ ۳۳۳ ۴۴ ۲۱"], accountId: "acc_behnam_12", connectionStatus: "requested",
    avatarColor: "from-cyan-500 to-sky-500", initials: "بق", tags: ["مشتری تدبیر", "مشتری آریانا", "توسعه کسب‌وکار"], favorite: false, lastContact: D(-4),
  },
  {
    id: "p7", name: "مریم آذری", nameEn: "Maryam Azari", role: "تحلیلگر داده", roleEn: "Data Analyst",
    org: "واحد داده", email: "m.azari@smartsec.ir", phones: ["۰۹۰۲ ۵۵۵ ۱۲ ۸۷"],
    notes: "گزارش‌های پروژه اصلاحات با مریم پیگیری می‌شود.", accountId: "acc_maryam_02", connectionStatus: "connected",
    avatarColor: "from-violet-500 to-purple-500", initials: "مآ", tags: ["پروژه اصلاحات", "هیئت مدیره", "گزارش"], favorite: false, lastContact: D(-8),
  },
  {
    id: "p8", name: "رضا طاهرپور", nameEn: "Reza Taherpour", role: "مشاور حقوقی", roleEn: "Legal Counsel",
    org: "برون‌سازمانی", email: "r.taherpour@lexfirm.ir", phone: "۰۹۱۲ ۸۸۸ ۰۰ ۱۴",
    avatarColor: "from-slate-500 to-zinc-600", initials: "رط", tags: ["مشتری آریانا", "حقوقی"], favorite: false, lastContact: D(-12),
  },
  {
    id: "p9", name: "آریانا رضایی", nameEn: "Ariana Rezaei", role: "مدیر ارتباط با مشتری", roleEn: "Customer Relations Manager",
    org: "شرکت آریانا", email: "ariana@ariana.co", phones: ["۰۹۱۲ ۵۵۵ ۴۴ ۳۳", "۰۹۳۶ ۵۵۵ ۴۴ ۳۳"],
    notes: "برای جلسات قرارداد آریانا؛ پیام‌ها از طریق اتصال حساب برای او هم ارسال شود.",
    accountId: "acc_ariana_21", connectionStatus: "connected",
    avatarColor: "from-violet-500 to-fuchsia-500", initials: "آر", tags: ["مشتری آریانا", "توسعه کسب‌وکار"], favorite: true, lastContact: D(-1),
  },
];

export const tasks: Task[] = [
  {
    id: "t1", title: "نهایی‌سازی گزارش عملکرد فصل پاییز", titleEn: "Finalize autumn performance report",
    description: "شامل شاخص‌های فروش، نرخ ریزش و پیش‌بینی فصل بعد.",
    status: "doing", priority: "urgent", due: D(0), time: "16:00", assignee: "p7",
    tags: ["گزارش", "مدیریتی", "پروژه اصلاحات", "پروژه ایران"], project: "بازبینی فصلی", createdAt: D(-4), source: "manual",
  },
  {
    id: "t2", title: "بازبینی قرارداد همکاری با شرکت آریانا", titleEn: "Review Ariana partnership contract",
    description: "بندهای ۷ و ۱۲ نیاز به تایید مشاور حقوقی دارد.",
    status: "review", priority: "high", due: D(0), time: "11:30", assignee: "p8",
    tags: ["مشتری آریانا", "توسعه کسب‌وکار", "حقوقی"], project: "توسعه کسب‌وکار", createdAt: D(-6), source: "ai",
  },
  {
    id: "t3", title: "آماده‌سازی اسلایدهای جلسه هیئت مدیره", titleEn: "Prepare board meeting slides",
    status: "todo", priority: "urgent", due: D(1), time: "09:00", assignee: "p1",
    tags: ["هیئت مدیره", "پروژه اصلاحات", "ارائه"], project: "هیئت مدیره", createdAt: D(-2), source: "manual",
  },
  {
    id: "t4", title: "رفع باگ ورود دو مرحله‌ای در اپ موبایل", titleEn: "Fix 2FA login bug on mobile",
    status: "doing", priority: "high", due: D(2), assignee: "p2",
    tags: ["اپ موبایل", "پلتفرم", "باگ"], project: "اپ موبایل", createdAt: D(-3), source: "chat",
  },
  {
    id: "t5", title: "طراحی نسخه جدید صفحه فرود", titleEn: "Design new landing page",
    status: "doing", priority: "medium", due: D(3), assignee: "p3",
    tags: ["پروژه ایران", "دیزاین"], project: "بازاریابی", createdAt: D(-5), source: "manual",
  },
  {
    id: "t6", title: "هماهنگی مصاحبه استخدامی توسعه‌دهنده فرانت", titleEn: "Schedule frontend developer interview",
    status: "todo", priority: "medium", due: D(4), assignee: "p5",
    tags: ["استخدام", "پروژه اصلاحات"], project: "استخدام", createdAt: D(-1), source: "manual",
  },
  {
    id: "t7", title: "پیگیری فاکتور معوق مشتری تدبیر", titleEn: "Follow up Tadbir overdue invoice",
    status: "todo", priority: "high", due: D(-1), assignee: "p6",
    tags: ["مشتری تدبیر", "پروژه ایران", "مالی"], project: "فروش", createdAt: D(-9), source: "manual",
  },
  {
    id: "t8", title: "به‌روزرسانی مستندات API نسخه ۳", titleEn: "Update API v3 documentation",
    status: "todo", priority: "low", due: D(6), assignee: "p2",
    tags: ["پلتفرم", "مستندات"], project: "پلتفرم", createdAt: D(-7), source: "manual",
  },
  {
    id: "t9", title: "تهیه صورت‌جلسه نشست هم‌افزایی تیم‌ها", titleEn: "Write cross-team sync minutes",
    status: "done", priority: "medium", due: D(-2), assignee: "p1",
    tags: ["پروژه اصلاحات", "صورت‌جلسه"], project: "عملیات", createdAt: D(-8), source: "ai",
  },
  {
    id: "t10", title: "ارسال دعوت‌نامه وبینار محصول", titleEn: "Send product webinar invitations",
    status: "done", priority: "low", due: D(-3), assignee: "p6",
    tags: ["پروژه ایران", "بازاریابی"], project: "بازاریابی", createdAt: D(-10), source: "manual",
  },
  {
    id: "t11", title: "بازطراحی داشبورد شاخص‌های کلیدی", titleEn: "Redesign KPI dashboard",
    status: "review", priority: "medium", due: D(5), assignee: "p3",
    tags: ["پلتفرم", "هوش مصنوعی", "داده"], project: "پلتفرم", createdAt: D(-6), source: "manual",
  },
  {
    id: "t12", title: "تنظیم بودجه سه‌ماهه واحد فناوری", titleEn: "Set Q budget for engineering",
    status: "done", priority: "high", due: D(-5), assignee: "p4",
    tags: ["هیئت مدیره", "مالی", "مدیریتی"], project: "برنامه‌ریزی", createdAt: D(-14), source: "manual",
  },
  {
    id: "t13", title: "تحلیل داده‌های فاز اول پروژه اصلاحات", titleEn: "Analyze phase-1 data of Reforms project",
    description: "مریم باید نتایج آزمایش فرآیند جدید را برای جلسه فردا آماده کند.",
    status: "doing", priority: "high", due: D(1), time: "09:30", assignee: "p7",
    tags: ["داده", "پروژه اصلاحات", "پروژه ایران"], project: "پروژه اصلاحات", createdAt: D(-2), source: "manual",
  },
  {
    id: "t14", title: "کشف ایده‌های محصول با کمک هوش مصنوعی", titleEn: "Discover product ideas with AI",
    status: "todo", priority: "medium", due: D(6), assignee: "p1",
    tags: ["هوش مصنوعی", "محصول"], project: "پلتفرم", createdAt: D(-1), source: "ai",
  },
];

export const meetings: Meeting[] = [
  {
    id: "m1", title: "استندآپ روزانه تیم محصول", titleEn: "Product daily standup",
    date: D(0), start: "09:00", end: "09:20", location: "اتاق شیشه‌ای", kind: "meeting", priority: "medium",
    attendees: ["p1", "p2", "p3"], agenda: "مرور تسک‌های دیروز، موانع امروز و اولویت‌های هفته.", online: false,
    tags: ["پلتفرم", "اپ موبایل"],
  },
  {
    id: "m2", title: "بازبینی قرارداد آریانا با مشاور حقوقی", titleEn: "Ariana contract legal review",
    date: D(0), start: "11:30", end: "12:30", location: "گوگل میت", kind: "review", priority: "high",
    attendees: ["p4", "p8", "p6"], agenda: "بررسی بندهای ۷ و ۱۲، تعیین سقف جریمه تاخیر.", online: true,
    tags: ["توسعه کسب‌وکار", "مشتری آریانا", "حقوقی"],
  },
  {
    id: "m3", title: "جلسه هم‌اندیشی طراحی محصول", titleEn: "Product design sync",
    date: D(0), start: "15:00", end: "16:00", location: "اتاق جلسات طبقه ۳", kind: "meeting", priority: "medium",
    attendees: ["p1", "p3"], agenda: "بررسی نسخه دوم دیزاین سیستم و کامپوننت‌های جدید.", online: false,
    tags: ["پروژه ایران", "هوش مصنوعی"],
  },
  {
    id: "m4", title: "جلسه هیئت مدیره — گزارش فصلی", titleEn: "Board meeting — quarterly report",
    date: D(1), start: "10:00", end: "12:00", location: "سالن کنفرانس مرکزی", kind: "meeting", priority: "urgent",
    attendees: ["p4", "p1", "p7"], agenda: "ارائه شاخص‌های فصل، تصویب بودجه و نقشه راه.", online: false,
    tags: ["هیئت مدیره", "پروژه اصلاحات", "پروژه ایران"],
  },
  {
    id: "m5", title: "تماس با مشتری تدبیر", titleEn: "Call with Tadbir client",
    date: D(1), start: "14:30", end: "15:00", location: "تلفنی", kind: "call", priority: "high",
    attendees: ["p6"], agenda: "پیگیری فاکتور معوق و تمدید اشتراک سالانه.", online: true,
    tags: ["مشتری تدبیر", "پروژه ایران"],
  },
  {
    id: "m6", title: "مصاحبه فنی — توسعه‌دهنده فرانت‌اند", titleEn: "Technical interview — frontend",
    date: D(2), start: "13:00", end: "14:00", location: "اتاق مصاحبه", kind: "meeting", priority: "medium",
    attendees: ["p5", "p2"], agenda: "ارزیابی مهارت React و حل مسئله زنده.", online: false,
    tags: ["استخدام", "پروژه اصلاحات"],
  },
  {
    id: "m7", title: "مهلت تحویل نسخه ۳٫۲ اپلیکیشن", titleEn: "Release 3.2 deadline",
    date: D(3), start: "18:00", end: "18:30", location: "—", kind: "deadline", priority: "urgent",
    attendees: ["p2"], agenda: "انتشار نسخه پایدار در استورها.", online: false,
    tags: ["اپ موبایل", "پلتفرم"],
  },
  {
    id: "m8", title: "کارگاه داخلی: نوشتن با هوش مصنوعی", titleEn: "Internal AI writing workshop",
    date: D(4), start: "10:30", end: "12:00", location: "سالن آموزش", kind: "meeting", priority: "low",
    attendees: ["p1", "p3", "p5", "p7"], agenda: "آموزش پرامپت‌نویسی و اتوماسیون مستندات.", online: false,
    tags: ["هوش مصنوعی", "پروژه اصلاحات"],
  },
  {
    id: "m9", title: "قرار ناهار کاری با شریک تجاری", titleEn: "Business lunch with partner",
    date: D(5), start: "12:30", end: "14:00", location: "رستوران البرز", kind: "personal", priority: "medium",
    attendees: ["p4", "p6"], agenda: "گفتگوی اولیه درباره سرمایه‌گذاری مشترک.", online: false,
    tags: ["توسعه کسب‌وکار", "پروژه ایران"],
  },
  {
    id: "m10", title: "رتروسپکتیو دو هفته‌ای", titleEn: "Bi-weekly retrospective",
    date: D(-2), start: "16:00", end: "17:00", location: "اتاق شیشه‌ای", kind: "review", priority: "medium",
    attendees: ["p1", "p2", "p3", "p7"], agenda: "چه چیزی خوب بود، چه چیزی باید بهتر شود.", online: false,
    tags: ["پروژه اصلاحات", "پلتفرم"],
  },
  {
    id: "m11", title: "جلسه بررسی زیرساخت ابری", titleEn: "Cloud infrastructure review",
    date: D(7), start: "09:30", end: "11:00", location: "زوم", kind: "meeting", priority: "high",
    attendees: ["p2", "p4"], agenda: "بررسی هزینه‌ها و مهاجرت به معماری جدید.", online: true,
    tags: ["پلتفرم", "هیئت مدیره"],
  },
];

export const notebooks: Notebook[] = [
  {
    id: "n1", title: "مدیریت و راهبری", emoji: "🎯", color: "from-indigo-500 to-violet-500",
    sections: [
      {
        id: "s1", title: "صورت‌جلسات هیئت مدیره", emoji: "🏛️",
        pages: [
          {
            id: "pg1", title: "صورت‌جلسه فصل پاییز", emoji: "📋", starred: true, updatedAt: D(-1),
            tags: ["هیئت مدیره", "پروژه اصلاحات", "پروژه ایران"],
            content: `# صورت‌جلسه هیئت مدیره — فصل پاییز

## حاضرین
دکتر مهرداد صدر (مدیرعامل)، سارا محمدی (مدیر محصول)، مریم آذری (تحلیلگر داده)

## مصوبات کلیدی
۱. بودجه واحد فناوری برای سه‌ماهه آینده ۱۸٪ افزایش می‌یابد.
۲. راه‌اندازی نسخه سازمانی محصول تا پایان دی‌ماه نهایی شود.
۳. استخدام دو توسعه‌دهنده فرانت‌اند در اولویت منابع انسانی قرار گرفت.

## ریسک‌ها
- وابستگی به یک تامین‌کننده زیرساخت ابری
- تاخیر احتمالی در دریافت مجوزهای حقوقی قرارداد آریانا

## اقدامات بعدی
- تهیه گزارش تطبیقی هزینه‌ها (مسئول: مریم آذری)
- مذاکره مجدد با تامین‌کننده دوم (مسئول: علی رضوانی)`,
          },
          {
            id: "pg2", title: "نقشه راه ۱۴۰۵", emoji: "🗺️", updatedAt: D(-5),
            tags: ["هیئت مدیره", "پروژه ایران", "هوش مصنوعی"],
            content: `# نقشه راه محصول ۱۴۰۵

## سه‌ماهه اول
- بازطراحی کامل داشبورد و تجربه کاربری
- افزودن موتور استخراج تسک از متن فارسی

## سه‌ماهه دوم
- انتشار API عمومی نسخه ۳
- یکپارچه‌سازی با تقویم‌های سازمانی

## سه‌ماهه سوم
- دستیار صوتی فارسی با پشتیبانی لهجه‌ها
- پنل تحلیلی مدیران`,
          },
        ],
      },
      {
        id: "s2", title: "استراتژی و برنامه‌ریزی", emoji: "♟️",
        pages: [
          {
            id: "pg3", title: "تحلیل رقبا", emoji: "🔍", updatedAt: D(-9),
            tags: ["پروژه ایران", "توسعه کسب‌وکار"],
            content: `# تحلیل رقبا

| رقیب | نقطه قوت | نقطه ضعف |
|---|---|---|
| نوشن | انعطاف بالا | فارسی‌سازی ضعیف |
| تسک‌یار | قیمت مناسب | نبود هوش مصنوعی |
| کلیک‌آپ | امکانات زیاد | پیچیدگی رابط |

**جمع‌بندی:** مزیت رقابتی ما «درک زبان فارسی + تقویم شمسی + استخراج خودکار» است.`,
          },
        ],
      },
    ],
  },
  {
    id: "n2", title: "فنی و مهندسی", emoji: "⚙️", color: "from-cyan-500 to-blue-500",
    sections: [
      {
        id: "s3", title: "معماری سامانه", emoji: "🏗️",
        pages: [
          {
            id: "pg4", title: "معماری میکروسرویس", emoji: "🧩", updatedAt: D(-2),
            tags: ["پلتفرم", "هوش مصنوعی"],
            content: `# معماری میکروسرویس

## سرویس‌ها
- \`auth-service\` — احراز هویت و مدیریت نشست
- \`nlp-service\` — پردازش زبان طبیعی فارسی
- \`calendar-service\` — تبدیل و همگام‌سازی تقویم جلالی
- \`notify-service\` — اعلان‌ها و پیامک

## تصمیمات
صف پیام‌ها روی RabbitMQ و ذخیره‌سازی اسناد روی S3 سازگار انجام می‌شود.`,
          },
          {
            id: "pg5", title: "چک‌لیست انتشار نسخه", emoji: "🚀", starred: true, updatedAt: D(0),
            tags: ["اپ موبایل", "پلتفرم"],
            content: `# چک‌لیست انتشار

- [x] اجرای تست‌های یکپارچه
- [x] بررسی کارایی روی محیط استیجینگ
- [ ] بازبینی امنیتی نهایی
- [ ] تهیه یادداشت انتشار فارسی
- [ ] اطلاع‌رسانی به مشتریان سازمانی`,
          },
        ],
      },
    ],
  },
  {
    id: "n3", title: "یادداشت‌های شخصی", emoji: "🧠", color: "from-emerald-500 to-teal-500",
    sections: [
      {
        id: "s4", title: "ایده‌ها", emoji: "💡",
        pages: [
          {
            id: "pg6", title: "ایده‌های خام محصول", emoji: "✨", updatedAt: D(-3),
            tags: ["هوش مصنوعی", "پروژه ایران"],
            content: `# ایده‌های خام

- ویجت «آنچه امروز مهم است» روی صفحه قفل موبایل
- خلاصه صوتی روزانه با صدای طبیعی فارسی
- حالت «تمرکز عمیق» که اعلان‌ها را تا پایان یک تسک قفل می‌کند
- تشخیص خودکار تاریخ‌های شمسی داخل پیام‌های واتساپ`,
          },
          {
            id: "pg7", title: "کتاب‌های در دست مطالعه", emoji: "📚", updatedAt: D(-11),
            tags: ["پروژه اصلاحات"],
            content: `# در دست مطالعه

۱. «کار عمیق» — کال نیوپورت
۲. «سازمان بدون ترس» — ایمی ادموندسون
۳. «طراحی چیزهای روزمره» — دونالد نورمن`,
          },
        ],
      },
    ],
  },
];

const now = new Date();
const at = (minsAgo: number) => new Date(now.getTime() - minsAgo * 60000).toISOString();

export const messages: ChatMessage[] = [
  {
    id: "c1", role: "assistant", kind: "text", at: at(240),
    text: "سلام! من منشی هوشمند شما هستم 👋\nمی‌توانید تسک بسازید، جلسه تنظیم کنید یا از من خلاصه روز را بخواهید.",
  },
  { id: "c2", role: "user", kind: "text", at: at(232), text: "برنامه امروزم چیه؟" },
  {
    id: "c3", role: "assistant", kind: "card", at: at(231),
    text: "امروز ۳ جلسه و ۲ تسک فوری دارید. مهم‌ترین مورد، بازبینی قرارداد آریانا ساعت ۱۱:۳۰ است.",
    attachments: [
      { label: "بازبینی قرارداد آریانا — ۱۱:۳۰", type: "meeting" },
      { label: "گزارش عملکرد فصل پاییز — تا ۱۶:۰۰", type: "task" },
    ],
  },
  { id: "c4", role: "user", kind: "voice", voiceSeconds: 12, at: at(120), text: "یادم بنداز فردا صبح قبل جلسه هیئت مدیره اسلایدها رو مرور کنم." },
  {
    id: "c5", role: "assistant", kind: "text", at: at(119),
    text: "ثبت شد ✅ یادآور «مرور اسلایدهای هیئت مدیره» برای فردا ساعت ۰۸:۳۰ تنظیم شد و به سارا محمدی هم اطلاع دادم.",
  },
];

export const notifications: Notification[] = [
  {
    id: "nt1", type: "meeting", read: false, at: at(8),
    title: "جلسه تا ۱۵ دقیقه دیگر", titleEn: "Meeting in 15 minutes",
    body: "بازبینی قرارداد آریانا با مشاور حقوقی — گوگل میت", bodyEn: "Ariana contract legal review — Google Meet",
  },
  {
    id: "nt2", type: "ai", read: false, at: at(46),
    title: "۳ تسک جدید استخراج شد", titleEn: "3 new tasks extracted",
    body: "از صورت‌جلسه «هم‌افزایی تیم‌ها» تسک‌های جدیدی پیشنهاد شده است.", bodyEn: "New tasks suggested from the cross-team sync notes.",
  },
  {
    id: "nt3", type: "task", read: false, at: at(180),
    title: "تسک عقب‌افتاده", titleEn: "Overdue task",
    body: "پیگیری فاکتور معوق مشتری تدبیر از دیروز عقب افتاده است.", bodyEn: "Tadbir invoice follow-up is overdue since yesterday.",
  },
  {
    id: "nt4", type: "system", read: true, at: at(1440),
    title: "پشتیبان‌گیری انجام شد", titleEn: "Backup completed",
    body: "نسخه پشتیبان فضای کاری شما با موفقیت ذخیره شد.", bodyEn: "Your workspace backup was saved successfully.",
  },
];

export const concepts: Concept[] = [
  {
    id: "c_reforms", label: "پروژه اصلاحات", labelEn: "Reforms Project", group: "project",
    color: "from-brand-500 to-violet-600", emoji: "🛠️",
    description: "برنامه جامع اصلاح فرآیندها و بازطراحی ساختار سازمانی.",
    related: ["c_iran", "c_board"],
  },
  {
    id: "c_iran", label: "پروژه ایران", labelEn: "Iran Project", group: "project",
    color: "from-emerald-500 to-teal-600", emoji: "🇮🇷",
    description: "توسعه بازار داخلی و بومی‌سازی کامل پلتفرم.",
    related: ["c_reforms", "c_growth", "c_client_tadbir"],
  },
  {
    id: "c_board", label: "هیئت مدیره", labelEn: "Board", group: "team",
    color: "from-amber-500 to-orange-600", emoji: "🏛️",
    description: "جلسات و مصوبات هیئت مدیره.",
    related: ["c_reforms"],
  },
  {
    id: "c_growth", label: "توسعه کسب‌وکار", labelEn: "Business Growth", group: "project",
    color: "from-rose-500 to-pink-600", emoji: "📈",
    description: "رشد درآمد، شراکی‌های جدید و ورود به بازارها.",
    related: ["c_iran", "c_client_aryana"],
  },
  {
    id: "c_mobile", label: "اپ موبایل", labelEn: "Mobile App", group: "project",
    color: "from-sky-500 to-cyan-600", emoji: "📱",
    description: "توسعه و انتشار نسخه موبایل محصول.",
    related: ["c_platform"],
  },
  {
    id: "c_platform", label: "پلتفرم", labelEn: "Platform", group: "project",
    color: "from-indigo-500 to-blue-600", emoji: "🧩",
    description: "هسته فنی، API و زیرساخت محصول.",
    related: ["c_mobile", "c_ai"],
  },
  {
    id: "c_ai", label: "هوش مصنوعی", labelEn: "Artificial Intelligence", group: "topic",
    color: "from-fuchsia-500 to-purple-600", emoji: "✨",
    description: "موتور استخراج و پردازش زبان طبیعی فارسی.",
    related: ["c_platform"],
  },
  {
    id: "c_hr", label: "استخدام", labelEn: "Hiring", group: "team",
    color: "from-teal-500 to-emerald-600", emoji: "🧑‍💼",
    description: "فرآیند جذب و مصاحبه نیروی جدید.",
    related: [],
  },
  {
    id: "c_client_aryana", label: "مشتری آریانا", labelEn: "Client: Ariana", group: "client",
    color: "from-cyan-500 to-sky-600", emoji: "🤝",
    description: "قرارداد و شراکت با شرکت آریانا.",
    related: ["c_growth"],
  },
  {
    id: "c_client_tadbir", label: "مشتری تدبیر", labelEn: "Client: Tadbir", group: "client",
    color: "from-slate-500 to-zinc-600", emoji: "🏢",
    description: "حساب سازمانی مشتری تدبیر و پیگیری فاکتورها.",
    related: ["c_iran"],
  },
];

export const sampleNote = `صورت‌جلسه نشست هم‌افزایی — دفتر مرکزی

امروز با تیم فنی و محصول جلسه داشتیم. سارا گفت طراحی نسخه جدید داشبورد تا پنجشنبه آماده می‌شود.
قرار شد علی رضوانی تا چهارشنبه گزارش کارایی سرورها را آماده کند، این خیلی فوری است چون مدیرعامل منتظر است.
نگار باید تا هفته آینده کامپوننت‌های دیزاین سیستم را مستند کند.
جلسه بعدی دوشنبه ساعت ۱۰ صبح در اتاق جلسات طبقه سوم با حضور مدیرعامل برگزار می‌شود.
همچنین یک تماس پیگیری با مشتری تدبیر برای فردا ساعت ۱۴:۳۰ هماهنگ شد.
مریم هم قرار شد داشبورد شاخص‌ها را با داده‌های جدید به‌روز کند، اولویتش متوسط است.`;

export function seedState(): AppState {
  return {
    tasks: JSON.parse(JSON.stringify(tasks)),
    meetings: JSON.parse(JSON.stringify(meetings)),
    people: JSON.parse(JSON.stringify(people)),
    notebooks: JSON.parse(JSON.stringify(notebooks)),
    concepts: JSON.parse(JSON.stringify(concepts)),
    messages: JSON.parse(JSON.stringify(messages)),
    agentMessages: [],
    notifications: JSON.parse(JSON.stringify(notifications)),
    userTokens: { apiKey: undefined, balance: 0, lastSync: undefined },
    selfAccountId: "acc_self_001",
    connectionRequests: [
      { id: "cr_in_ali", direction: "inbound", personId: "p2", status: "incoming", createdAt: new Date(Date.now() - 35 * 60_000).toISOString(), message: "برای هماهنگی تسک‌ها و جلسات تیم فنی" },
      { id: "cr_out_behnam", direction: "outbound", personId: "p6", status: "requested", createdAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString() },
    ],
  };
}
