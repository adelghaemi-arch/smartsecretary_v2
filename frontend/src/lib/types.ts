export type Lang = "fa" | "en";
export type Theme = "light" | "dark";

export type Priority = "urgent" | "high" | "medium" | "low";
export type TaskStatus = "todo" | "doing" | "review" | "done";

export interface Task {
  id: string;
  title: string;
  titleEn?: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  due: string; // ISO yyyy-mm-dd
  time?: string; // HH:mm
  assignee?: string; // person id
  tags: string[];
  project?: string;
  createdAt: string;
  source?: "manual" | "ai" | "chat";
}

export type MeetingKind = "meeting" | "call" | "review" | "personal" | "deadline";

export interface Meeting {
  id: string;
  title: string;
  titleEn?: string;
  date: string; // ISO yyyy-mm-dd
  start: string; // HH:mm
  end: string; // HH:mm
  location: string;
  kind: MeetingKind;
  priority: Priority;
  attendees: string[]; // person ids
  agenda?: string;
  online?: boolean;
  tags?: string[];
}

export type ConnectionStatus = "none" | "requested" | "incoming" | "connected" | "declined";

export interface Person {
  id: string;
  name: string;
  nameEn: string;
  role: string;
  roleEn: string;
  org: string;
  email: string;
  phone?: string;
  phones?: string[];
  notes?: string;
  avatarColor: string;
  initials: string;
  tags: string[];
  favorite: boolean;
  lastContact: string;
  /** account id if this person has one in the system */
  accountId?: string;
  connectionStatus?: ConnectionStatus;
  /** secretarial handle / MCP endpoint of the person's own assistant */
  handle?: string;
  /** relationship context: work | family | medical | tech */
  context?: "work" | "family" | "medical" | "tech";
  /** recurrence bucket used by the smart directory */
  archive?: boolean;
}

export interface ConnectionRequest {
  id: string;
  /** who initiated (can be "self" for outbound, or another accountId for inbound) */
  direction: "outbound" | "inbound";
  personId: string;
  status: ConnectionStatus;
  createdAt: string;
  message?: string;
}

export interface DocPage {
  id: string;
  title: string;
  emoji: string;
  content: string;
  updatedAt: string;
  starred?: boolean;
  tags?: string[];
}

export type ConceptGroup = "project" | "topic" | "team" | "client" | "event";

export interface Concept {
  id: string;
  label: string;
  labelEn: string;
  group: ConceptGroup;
  color: string;
  emoji: string;
  description?: string;
  related: string[]; // concept ids explicitly linked
}

export interface DocSection {
  id: string;
  title: string;
  emoji: string;
  pages: DocPage[];
}

export interface Notebook {
  id: string;
  title: string;
  emoji: string;
  color: string;
  sections: DocSection[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string; // ISO datetime
  kind?: "text" | "voice" | "card";
  voiceSeconds?: number;
  attachments?: { label: string; type: "task" | "meeting" | "note" }[];
}

export interface Notification {
  id: string;
  title: string;
  titleEn: string;
  body: string;
  bodyEn: string;
  at: string;
  read: boolean;
  type: "task" | "meeting" | "ai" | "system";
}

export interface ExtractedTask {
  id: string;
  title: string;
  priority: Priority;
  due: string;
  assignee?: string;
  confidence: number;
  accepted: boolean | null;
}

export interface ExtractedMeeting {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  location: string;
  attendees: string[];
  confidence: number;
  accepted: boolean | null;
}

export type AppMode = "chat" | "classic";

export interface UserTokens {
  apiKey?: string;
  balance?: number;
  lastSync?: string;
}

export type FeatureTier = "free" | "pro";

export interface FeatureGate {
  id: string;
  name: string;
  nameEn: string;
  tier: FeatureTier;
  description: string;
  descriptionEn: string;
  icon: string;
}

export const FEATURES: Record<string, FeatureGate> = {
  "ai-extract": {
    id: "ai-extract",
    name: "استخراج هوشمند تسک",
    nameEn: "AI Task Extraction",
    tier: "pro",
    description: "تحلیل خودکار صورت‌جلسه و استخراج تسک‌ها و جلسات",
    descriptionEn: "Auto-analyze meeting notes and extract tasks & meetings",
    icon: "✨",
  },
  "ai-chat": {
    id: "ai-chat",
    name: "منشی هوشمند",
    nameEn: "Smart Secretary Chat",
    tier: "pro",
    description: "گفتگوی طبیعی با منشی برای مدیریت کارها",
    descriptionEn: "Natural conversation with secretary to manage work",
    icon: "🤖",
  },
  "ai-summary": {
    id: "ai-summary",
    name: "خلاصه‌سازی هوشمند",
    nameEn: "AI Summary",
    tier: "pro",
    description: "خلاصه‌سازی خودکار متون طولانی",
    descriptionEn: "Auto-summarize long texts",
    icon: "📝",
  },
  "graph-advanced": {
    id: "graph-advanced",
    name: "نقشه دانش پیشرفته",
    nameEn: "Advanced Knowledge Graph",
    tier: "pro",
    description: "تحلیل عمیق ارتباطات بین مفاهیم",
    descriptionEn: "Deep analysis of concept relationships",
    icon: "🕸️",
  },
  "voice-transcribe": {
    id: "voice-transcribe",
    name: "تبدیل گفتار به متن",
    nameEn: "Voice Transcription",
    tier: "pro",
    description: "تبدیل پیام‌های صوتی به متن",
    descriptionEn: "Convert voice messages to text",
    icon: "🎤",
  },
  "unlimited-storage": {
    id: "unlimited-storage",
    name: "ذخیره‌سازی نامحدود",
    nameEn: "Unlimited Storage",
    tier: "pro",
    description: "ذخیره‌سازی نامحدود اسناد و داده‌ها",
    descriptionEn: "Unlimited document & data storage",
    icon: "💾",
  },
};

export type Widget =
  | { kind: "agenda"; date: string }
  | { kind: "tasks"; ids: string[]; title: string; titleEn: string }
  | { kind: "meetings"; ids: string[]; title: string; titleEn: string }
  | { kind: "calendar"; anchor: string }
  | { kind: "kpi" }
  | { kind: "people"; ids: string[] }
  | { kind: "doc"; nbId: string; secId: string; pageId: string }
  | { kind: "docs" }
  | { kind: "extract"; tasks: ExtractedTask[]; meetings: ExtractedMeeting[]; summary: string; summaryEn: string }
  | { kind: "created"; entity: "task" | "meeting" | "person" | "page"; id: string; nbId?: string; secId?: string }
  | { kind: "search"; q: string }
  | { kind: "graph"; center: string }
  | { kind: "concepts" }
  | { kind: "disambiguation"; command: string; options: { personId: string; name: string; role: string; tag: string }[] }
  | { kind: "capability"; tool: string; reason: string; reasonEn: string }
  | { kind: "deliverable"; title: string; body: string; kindLabel: string }
  | { kind: "followup"; ids: string[] }
  | { kind: "help" };

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string;
  kind?: "text" | "voice";
  voiceSeconds?: number;
  widget?: Widget;
  suggestions?: string[];
}

export interface AppState {
  tasks: Task[];
  meetings: Meeting[];
  people: Person[];
  notebooks: Notebook[];
  concepts: Concept[];
  messages: ChatMessage[];
  agentMessages: AgentMessage[];
  notifications: Notification[];
  userTokens: UserTokens;
  /** my own account id (self) */
  selfAccountId?: string;
  connectionRequests: ConnectionRequest[];
}
