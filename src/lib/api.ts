/**
 * Browser client for the Edutou API.
 *
 * Sessions are httpOnly cookies set by the API (POST /auth/login), so every
 * request is sent with credentials. Access tokens are short-lived: a 401 is
 * retried once after POST /auth/refresh.
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://edutou.in").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

async function send(path: string, init: RequestInit): Promise<Response> {
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(isForm ? {} : { "content-type": "application/json" }), ...(init.headers ?? {}) },
  });
}

let refreshing: Promise<boolean> | null = null;
function refreshSession(): Promise<boolean> {
  refreshing ??= send("/auth/refresh", { method: "POST" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await send(path, init);
  if (res.status === 401 && !path.startsWith("/auth/") && (await refreshSession())) {
    res = await send(path, init);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = body?.error ?? {};
    throw new ApiError(e.message ?? `Request failed (${res.status})`, res.status, e.code, e.details);
  }
  return body as T;
}

export const json = (method: string, data?: unknown): RequestInit => ({
  method,
  ...(data === undefined ? {} : { body: JSON.stringify(data) }),
});

/** Upload an image to the public site-media bucket; returns its public URL. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await api<{ data: { publicUrl: string } }>("/api/storage/site-media", { method: "POST", body: form });
  return res.data.publicUrl;
}

/** Site-relative paths ("/internships/x.jpg") are served by edutou.in. */
export const previewUrl = (url: string) => (url.startsWith("/") ? `${SITE_URL}${url}` : url);

export function errorText(e: unknown): string {
  if (e instanceof ApiError && e.details?.length) {
    return `${e.message}: ${e.details
      .slice(0, 4)
      .map((d) => `${d.path || "field"} — ${d.message}`)
      .join("; ")}`;
  }
  return e instanceof Error ? e.message : "Something went wrong";
}
