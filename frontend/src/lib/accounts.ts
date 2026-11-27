export interface DirectoryAccount {
  accountId: string;
  displayName: string;
  displayNameEn: string;
  phones: string[];
  avatarColor: string;
  initials: string;
}

/**
 * Mock network directory. In production this lookup is performed server-side
 * so raw phone numbers never need to be exposed to another client.
 */
export const ACCOUNT_DIRECTORY: DirectoryAccount[] = [
  {
    accountId: "acc_sara_44",
    displayName: "سارا محمدی",
    displayNameEn: "Sara Mohammadi",
    phones: ["09124457712"],
    avatarColor: "from-fuchsia-500 to-pink-500",
    initials: "سم",
  },
  {
    accountId: "acc_ali_35",
    displayName: "علی رضوانی",
    displayNameEn: "Ali Rezvani",
    phones: ["09351128840", "09101128840"],
    avatarColor: "from-indigo-500 to-blue-500",
    initials: "عر",
  },
  {
    accountId: "acc_maryam_02",
    displayName: "مریم آذری",
    displayNameEn: "Maryam Azari",
    phones: ["09025551287"],
    avatarColor: "from-violet-500 to-purple-500",
    initials: "مآ",
  },
  {
    accountId: "acc_behnam_12",
    displayName: "بهنام قاسمی",
    displayNameEn: "Behnam Ghasemi",
    phones: ["09123334421"],
    avatarColor: "from-cyan-500 to-sky-500",
    initials: "بق",
  },
  {
    accountId: "acc_ariana_21",
    displayName: "آریانا رضایی",
    displayNameEn: "Ariana Rezaei",
    phones: ["09125554433", "09365554433"],
    avatarColor: "from-violet-500 to-fuchsia-500",
    initials: "آر",
  },
];

const digitMap: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

export function normalizePhone(value: string) {
  let n = value.replace(/[۰-۹٠-٩]/g, (x) => digitMap[x] ?? x).replace(/\D/g, "");
  if (n.startsWith("0098")) n = `0${n.slice(4)}`;
  else if (n.startsWith("98") && n.length === 12) n = `0${n.slice(2)}`;
  else if (n.startsWith("9") && n.length === 10) n = `0${n}`;
  return n;
}

export function lookupAccountByPhones(phones: string[]) {
  const normalized = new Set(phones.map(normalizePhone).filter(Boolean));
  return ACCOUNT_DIRECTORY.find((account) => account.phones.some((p) => normalized.has(normalizePhone(p))));
}
