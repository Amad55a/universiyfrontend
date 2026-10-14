import apiClient from "../../api/client";

export function getDesignRequestErrorMessage(error: unknown): string {
  const response = error && typeof error === "object" && "response" in error
    ? error.response
    : undefined;
  const status = response && typeof response === "object" && "status" in response
    && typeof response.status === "number"
    ? response.status
    : undefined;
  const code = error && typeof error === "object" && "code" in error
    ? error.code
    : undefined;

  if (status === 401) return "Your session has expired. Sign in again to access designs.";
  if (status === 403) return "You do not have permission to access this design.";
  if (status === 404) return "The requested design or page could not be found.";
  if (status && status >= 500) return "The design service is temporarily unavailable. Please try again.";
  if (code === "ECONNABORTED" || code === "ETIMEDOUT") {
    return "The design request timed out. Please try again.";
  }
  if (!response) {
    return "Could not connect to the design service. Check your connection and try again.";
  }
  return `The design request failed (${status}).`;
}

export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  try {
    const { data } = await apiClient.request<T>({
      method,
      url: path,
      data: body,
      timeout: 15000,
    });
    return data;
  } catch (error) {
    throw new Error(getDesignRequestErrorMessage(error));
  }
}
