import { useAuthStore } from "@/lib/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const LOCALE_STORAGE_KEY = "locale";

export function getPreferredLocale() {
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
  code?: string;
  details?: unknown;
  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
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
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as { message?: string; code?: string; details?: unknown };
      throw new ApiError(data.message ?? "Request failed", response.status, data.code, data.details);
    }
    const message = await response.text();
    throw new ApiError(message || "Request failed", response.status);
  }
  if (response.status === 204) {
    return {} as T;
  }
  return (await response.json()) as T;
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  onProgress?: (progress: number) => void,
  didRetry = false
): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;
  const preferredLocale = getPreferredLocale();

  const uploadWithToken = (token: string | null): Promise<T> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_URL}${path}`);
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }
      if (preferredLocale) {
        xhr.setRequestHeader("Accept-Language", preferredLocale);
      }
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
      }
      xhr.onload = () => {
        if (xhr.status === 401 && !didRetry) {
          refreshToken()
            .then((newToken) => {
              if (newToken) {
                return apiUpload<T>(path, formData, onProgress, true).then(resolve).catch(reject);
              }
              reject(new ApiError("Unauthorized", 401, "UNAUTHORIZED"));
              return null;
            })
            .catch(reject);
          return;
        }
        if (xhr.status >= 400) {
          try {
            const data = JSON.parse(xhr.responseText) as { message?: string; code?: string; details?: unknown };
            reject(new ApiError(data.message ?? "Request failed", xhr.status, data.code, data.details));
          } catch (error) {
            reject(new ApiError(xhr.responseText || "Request failed", xhr.status));
          }
          return;
        }
        if (!xhr.responseText) {
          resolve({} as T);
          return;
        }
        resolve(JSON.parse(xhr.responseText) as T);
      };
      xhr.onerror = () => {
        reject(new ApiError("Network error", xhr.status || 0));
      };
      xhr.send(formData);
    });

  return uploadWithToken(accessToken);
}
