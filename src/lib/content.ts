import { cacheLife, cacheTag } from "next/cache";

/**
 * Page content for learn.edutou.in.
 *
 * Edited by admins at portal.edutou.in → Admin → Learn Page, served by the
 * Edutou API at GET /api/learn/page. The shape mirrors
 * edutouportal-backend/src/learn/content.ts.
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

export interface LearnPageContent {
  seo: { title: string; description: string };
  brand: { name: string; tagline: string; logoUrl: string };
  hero: {
    eyebrow: string;
    headlineBefore: string;
    headlineHighlight: string;
    headlineAfter: string;
    subhead: string;
    imageUrl: string;
  };
  webinar: { title: string; when: string; duration: string; language: string };
  form: {
    title: string;
    buttonText: string;
    privacyNote: string;
    professions: string[];
    successTitle: string;
    successMessage: string;
    whatsappGroupUrl: string;
  };
  learn: { title: string; points: string[] };
  stats: { value: string; label: string }[];
  institutions: { title: string; names: string[] };
  gallery: { title: string; photos: { url: string; alt: string }[] };
  stickyBar: { enabled: boolean; buttonText: string };
}

/** Used only if the API cannot be reached, so the page never renders empty. */
export const fallbackContent: LearnPageContent = {
  seo: {
    title: "Registration | Edutou",
    description: "Learn to build AI agents and future-ready career skills. Register free for the Edutou live webinar.",
  },
  brand: { name: "Edutou", tagline: "Skill Academy", logoUrl: "/logo.jpg" },
  hero: {
    eyebrow: "Free Live Webinar",
    headlineBefore: "Learn to Build",
    headlineHighlight: "AI Agents",
    headlineAfter: "& Future-Ready Career Skills",
    subhead: "Even if you're a fresher with no coding background, or looking to switch careers.",
    imageUrl: "/images/photo-12.jpg",
  },
  webinar: { title: "Free AI Webinar", when: "Date & time announced soon", duration: "90 minutes", language: "English & Tamil" },
  form: {
    title: "Reserve your free seat",
    buttonText: "Register Now — It's Free",
    privacyNote: "We respect your privacy. No spam, ever.",
    professions: ["Student", "Job", "Business", "Freelancer", "Looking for a job", "Other"],
    successTitle: "You're registered!",
    successMessage: "We'll send the webinar details to your WhatsApp and email.",
    whatsappGroupUrl: "",
  },
  learn: {
    title: "What you'll learn in this free webinar",
    points: [
      "What AI agents are and where companies use them today",
      "Build your first working AI agent live, no coding needed",
      "Tools freshers and career-switchers can start with this week",
      "A clear roadmap to AI roles and how to build a portfolio",
    ],
  },
  stats: [
    { value: "98.7%", label: "Learner satisfaction" },
    { value: "2500+", label: "Lessons completed" },
    { value: "120+", label: "Hands-on projects" },
  ],
  institutions: { title: "Institutions we've worked with", names: ["Saveetha University", "Madras Engineering College"] },
  gallery: {
    title: "Inside the Edutou classroom",
    photos: [
      { url: "/images/photo-01.jpg", alt: "Students in an Edutou AI training session" },
      { url: "/images/photo-04.jpg", alt: "Full computer lab of Edutou students" },
      { url: "/images/photo-08.jpg", alt: "Edutou mentor presenting to students" },
      { url: "/images/photo-05.jpg", alt: "Welcome session on stage at an Edutou campus program" },
      { url: "/images/photo-02.jpg", alt: "Wide view of an Edutou computer lab" },
      { url: "/images/photo-13.jpg", alt: "Edutou cohort group selfie" },
    ],
  },
  stickyBar: { enabled: true, buttonText: "Join now" },
};

/**
 * Cached for 30 seconds: admin edits appear on the live page within about
 * half a minute, while visitors are served from cache in between.
 */
export async function getLearnPage(): Promise<LearnPageContent> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 3600 });
  cacheTag("learn-page");

  try {
    const res = await fetch(`${API_URL}/api/learn/page`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`API responded ${res.status}`);
    const body = (await res.json()) as { data?: { content?: LearnPageContent } };
    return body.data?.content ?? fallbackContent;
  } catch (err) {
    console.error("[learn] could not load page content, using fallback:", (err as Error).message);
    return fallbackContent;
  }
}
