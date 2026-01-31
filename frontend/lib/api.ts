import { useAuthStore } from "@/lib/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const LOCALE_STORAGE_KEY = "locale";

function getPreferredLocale() {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored) {
    return stored;
  }
  const cookieMatch = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]+)/);
  return cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function refreshToken() {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) {
    return null;
  }
  const preferredLocale = getPreferredLocale();
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(preferredLocale ? { "Accept-Language": preferredLocale } : {}),
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) {
    useAuthStore.getState().clearTokens();
    return null;
  }
  const data = await response.json();
  useAuthStore.getState().setTokens(data.access_token, data.refresh_token);
  return data.access_token as string;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;
  const headers = new Headers(options.headers ?? {});
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const preferredLocale = getPreferredLocale();
  if (preferredLocale) {
    headers.set("Accept-Language", preferredLocale);
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const newToken = await refreshToken();
    if (newToken) {
      const retryHeaders = new Headers(options.headers ?? {});
      if (!(options.body instanceof FormData)) {
        retryHeaders.set("Content-Type", "application/json");
      }
      if (preferredLocale) {
        retryHeaders.set("Accept-Language", preferredLocale);
      }
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
      const retry = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: retryHeaders,
      });
      if (!retry.ok) {
        throw new ApiError(await retry.text(), retry.status);
      }
      return (await retry.json()) as T;
    }
  }

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(message || "Request failed", response.status);
  }
  if (response.status === 204) {
    return {} as T;
  }
  return (await response.json()) as T;
}
