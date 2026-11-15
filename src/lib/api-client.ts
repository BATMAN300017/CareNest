export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers: customHeaders, ...fetchOptions } = options;

  let url = endpoint;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    const base =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    url = `${base.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
  }

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes("?") ? "&" : "?") + qs;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  // Attach JWT token from client storage if available
  if (typeof window !== "undefined" && window.localStorage) {
    const token = localStorage.getItem("carenest_token");
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  let data: unknown;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const record = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
    const errorMessage =
      (record && typeof record.error === "string" && record.error) ||
      (record && typeof record.message === "string" && record.message) ||
      `HTTP Error ${response.status}: ${response.statusText}`;

    // Handle token expiration
    if (response.status === 401 && typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem("carenest_token");
      localStorage.removeItem("carenest_user");
    }

    throw new ApiError(response.status, errorMessage, data);
  }

  // Handle standard { success: true, data: ... } wrapped payloads
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: T }).data;
  }

  return data as T;
}

export const api = {
  get: <T = unknown>(url: string, params?: Record<string, string | number | boolean | undefined>, options?: RequestInit) =>
    apiClient<T>(url, { method: "GET", params, ...options }),

  post: <T = unknown>(url: string, body?: unknown, options?: RequestInit) =>
    apiClient<T>(url, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T = unknown>(url: string, body?: unknown, options?: RequestInit) =>
    apiClient<T>(url, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T = unknown>(url: string, body?: unknown, options?: RequestInit) =>
    apiClient<T>(url, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T = unknown>(url: string, options?: RequestInit) =>
    apiClient<T>(url, { method: "DELETE", ...options }),
};
