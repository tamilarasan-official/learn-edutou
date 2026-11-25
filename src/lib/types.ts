// Mirrors edutouportal-backend/src/cms/schema.ts.

export interface Titled { title: string; desc: string }
export interface Button { label: string; href: string }
export interface Img { url: string; alt: string; focus: string }

interface BlockBase { id: string; label: string; title: string; lead: string }

export type Block =
  | (BlockBase & {
      type: "text_media";
      paragraphs: string[];
      stat: { prefix: string; value: string; label: string; source: string };
      image: Img;
    })
  | (BlockBase & {
      type: "cards";
      columns: 2 | 3 | 4;
      numbered: boolean;
      numberPrefix: string;
      items: Titled[];
      buttons: Button[];
    })
  | (BlockBase & {
      type: "split_list";
      body: string;
      noteLabel: string;
      note: string;
      listTitle: string;
      list: string[];
    })
  | (BlockBase & { type: "tag_groups"; groups: { name: string; items: string[] }[] })
  | (BlockBase & {
      type: "plans";
      plansTitle: string;
      plans: { name: string; desc: string; weight: number }[];
      modesTitle: string;
      modes: Titled[];
      stepsTitle: string;
      steps: Titled[];
    });

export type BlockType = Block["type"];

export interface ProgrammeData {
  title: string;
  category: string;
  alsoIn: string[];
  domains: string[];
  type: string;
  pricing: {
    model: "free" | "paid" | "hidden";
    amount: number | null;
    currency: "INR" | "USD";
    showCompareAt: boolean;
    compareAtAmount: number | null;
    note: string;
  };
  enrolment: { whatsappGroupUrl: string; emailNote: string };
  payment: { collectOnline: boolean; provider: string; productRef: string };
  schedule: { startDate: string; time: string; duration: string; mode: string; language: string; seats: number | null };
  image: Img;
  card: {
    meta: string[];
    summary: string;
    highlights: string[];
    tools: string[];
    details: { enabled: boolean; roles: string[]; projects: string[]; note: string };
  };
  page: {
    enabled: boolean;
    eyebrow: string;
    tagline: string;
    topics: string[];
    facts: { value: string; label: string }[];
    primaryButton: string;
    counsellor: { name: string; phone: string };
    blocks: Block[];
    related: { enabled: boolean; label: string; title: string };
    cta: { title: string; text: string };
  };
}

export type ProgrammeStatus = "draft" | "published" | "hidden";

export interface Programme {
  id: string;
  slug: string;
  status: ProgrammeStatus;
  sortOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  data: ProgrammeData;
}

export interface Category {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  no: string;
  programmes?: number;
}

export interface EnrolForm {
  title: string;
  intro: string;
  professions: string[];
  buttonText: string;
  privacyNote: string;
  successTitle: string;
  successMessage: string;
  whatsappGroupUrl: string;
}

export type EnrolmentStatus = "new" | "contacted" | "enrolled" | "not_interested";
export type PaymentStatus = "not_required" | "pending" | "paid" | "failed" | "refunded";

export interface Enrolment {
  id: string;
  programme_id: string | null;
  programme_key: string;
  programme_title: string;
  name: string;
  email: string;
  whatsapp: string;
  profession: string;
  city: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  status: EnrolmentStatus;
  notes: string;
  seen_at: string | null;
  amount: string | null;
  currency: string | null;
  payment_status: PaymentStatus;
  payment_provider: string | null;
  payment_reference: string | null;
  razorpay_order_id: string | null;
  paid_at: string | null;
  created_at: string;
  confirmation_email: EmailStatus | null;
  team_email: EmailStatus | null;
  email_error: string | null;
}

export type EmailStatus = "pending" | "sending" | "sent" | "failed";

export interface Notifications {
  sendConfirmation: boolean;
  confirmationSubject: string;
  confirmationIntro: string;
  confirmationSignoff: string;
  sendTeam: boolean;
  teamEmails: string[];
  whatsappMessage: string;
}

export interface EmailServerStatus {
  configured: boolean;
  from: string;
  pending: number;
  failed: number;
  sent_today: number;
}

export interface User {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
}

export const emptyProgramme = (category = ""): ProgrammeData => ({
  title: "",
  category,
  alsoIn: [],
  domains: [],
  type: "Course",
  pricing: { model: "free", amount: null, currency: "INR", showCompareAt: false, compareAtAmount: null, note: "" },
  enrolment: { whatsappGroupUrl: "", emailNote: "" },
  payment: { collectOnline: false, provider: "razorpay", productRef: "" },
  schedule: { startDate: "", time: "", duration: "", mode: "", language: "", seats: null },
  image: { url: "", alt: "", focus: "" },
  card: { meta: [], summary: "", highlights: [], tools: [], details: { enabled: false, roles: [], projects: [], note: "" } },
  page: {
    enabled: false,
    eyebrow: "",
    tagline: "",
    topics: [],
    facts: [],
    primaryButton: "Enquire / Enrol",
    counsellor: { name: "", phone: "" },
    blocks: [],
    related: { enabled: true, label: "", title: "" },
    cta: { title: "", text: "" },
  },
});

export const PROGRAMME_TYPES = ["Course", "Webinar", "Workshop", "Bootcamp", "Masterclass", "Internship"];

export const STATUS_LABEL: Record<EnrolmentStatus, string> = {
  new: "New",
  contacted: "Contacted",
  enrolled: "Enrolled",
  not_interested: "Not interested",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  not_required: "Not required",
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);

/** Badge text: "Free", "₹99", "₹99 (was ₹199)", the note, or "" when hidden. */
export const priceLabel = (p: ProgrammeData["pricing"]) => {
  if (p.model === "free") return "Free";
  if (p.model === "hidden") return "";
  if (p.amount == null) return p.note || "Paid";
  const now = formatMoney(p.amount, p.currency);
  return p.showCompareAt && p.compareAtAmount != null && p.compareAtAmount > p.amount
    ? `${now} (was ${formatMoney(p.compareAtAmount, p.currency)})`
    : now;
};

export interface PaymentsStatus {
  configured: boolean;
  mode: "test" | "live" | null;
  keyId: string;
  webhookConfigured: boolean;
  webhookUrl: string;
  totals: { currency: string; paid: number; amount: string }[];
}
