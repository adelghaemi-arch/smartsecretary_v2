/* ------------------------------------------------------------------
 * Jalali (Solar Hijri) <-> Gregorian conversion
 * Port of the well-known jalaali-js algorithm (Behrang Norouzinia)
 * ------------------------------------------------------------------ */

const div = (a: number, b: number) => ~~(a / b);
const mod = (a: number, b: number) => a - ~~(a / b) * b;

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
  2192, 2262, 2324, 2394, 2456, 3178,
];

function jalCal(jy: number) {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jm = 0;
  let jump = 0;

  for (let i = 1; i < bl; i += 1) {
    jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

export function g2d(gy: number, gm: number, gd: number) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

export function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

export function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

export function d2j(jdn: number) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export function isJalaliLeap(jy: number) {
  return jalCal(jy).leap === 0;
}

export function jalaliMonthLength(jy: number, jm: number) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}

export interface JDate {
  jy: number;
  jm: number;
  jd: number;
}

export function toJalali(date: Date): JDate {
  return d2j(g2d(date.getFullYear(), date.getMonth() + 1, date.getDate()));
}

export function toGregorian(jy: number, jm: number, jd: number): Date {
  const g = d2g(j2d(jy, jm, jd));
  return new Date(g.gy, g.gm - 1, g.gd);
}

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export const JALALI_MONTHS_EN = [
  "Farvardin",
  "Ordibehesht",
  "Khordad",
  "Tir",
  "Mordad",
  "Shahrivar",
  "Mehr",
  "Aban",
  "Azar",
  "Dey",
  "Bahman",
  "Esfand",
];

export const GREGORIAN_MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Persian week: Saturday = 0 ... Friday = 6 */
export const WEEKDAYS_FA = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
export const WEEKDAYS_FA_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
export const WEEKDAYS_EN = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const WEEKDAYS_EN_SHORT = ["Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"];

/** 0 = Saturday ... 6 = Friday */
export function persianDayIndex(date: Date) {
  return (date.getDay() + 1) % 7;
}

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

export function localeDigits(input: string | number, lang: "fa" | "en") {
  return lang === "fa" ? toFaDigits(input) : String(input);
}

/** yyyy-mm-dd (gregorian ISO, local time) */
export function isoKey(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function parseISO(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfPersianWeek(date: Date) {
  return addDays(date, -persianDayIndex(date));
}

export function sameDay(a: Date, b: Date) {
  return isoKey(a) === isoKey(b);
}

export function formatDate(date: Date, lang: "fa" | "en", opts?: { withWeekday?: boolean; short?: boolean }) {
  if (lang === "fa") {
    const { jy, jm, jd } = toJalali(date);
    const base = `${toFaDigits(jd)} ${JALALI_MONTHS[jm - 1]}${opts?.short ? "" : " " + toFaDigits(jy)}`;
    return opts?.withWeekday ? `${WEEKDAYS_FA[persianDayIndex(date)]}، ${base}` : base;
  }
  const base = `${date.getDate()} ${GREGORIAN_MONTHS_EN[date.getMonth()]}${opts?.short ? "" : " " + date.getFullYear()}`;
  return opts?.withWeekday ? `${WEEKDAYS_EN[persianDayIndex(date)]}, ${base}` : base;
}

export function relativeDay(date: Date, lang: "fa" | "en") {
  const today = new Date();
  const diff = Math.round((new Date(isoKey(date)).getTime() - new Date(isoKey(today)).getTime()) / 86400000);
  if (diff === 0) return lang === "fa" ? "امروز" : "Today";
  if (diff === 1) return lang === "fa" ? "فردا" : "Tomorrow";
  if (diff === -1) return lang === "fa" ? "دیروز" : "Yesterday";
  if (diff > 1 && diff < 7) return lang === "fa" ? `${toFaDigits(diff)} روز دیگر` : `In ${diff} days`;
  if (diff < -1 && diff > -7) return lang === "fa" ? `${toFaDigits(-diff)} روز پیش` : `${-diff} days ago`;
  return formatDate(date, lang, { short: true });
}
