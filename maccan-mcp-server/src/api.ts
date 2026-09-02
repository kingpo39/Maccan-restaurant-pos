import axios, { AxiosError } from "axios";

export const API_BASE_URL = process.env.MACCAN_API_URL || "http://localhost:3001/api";
export const CHARACTER_LIMIT = 25000;

let authToken: string | null = null;

export async function authenticate(email: string, password: string): Promise<string> {
  const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
  authToken = res.data.token || res.data.access_token;
  if (!authToken) throw new Error("Login succeeded but no token returned");
  return authToken;
}

export function setToken(token: string) {
  authToken = token;
}

export async function apiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: any,
  params?: any,
): Promise<T> {
  if (!authToken) throw new Error("Not authenticated. Call authenticate() first.");
  const res = await axios({
    method,
    url: `${API_BASE_URL}${endpoint}`,
    data,
    params,
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  });
  return res.data;
}

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          return "Error: Authentication failed. Check your MACCAN_EMAIL and MACCAN_PASSWORD environment variables.";
        case 403:
          return "Error: Permission denied. Your account does not have access to this resource.";
        case 404:
          return "Error: Resource not found. Please check the ID is correct.";
        case 429:
          return "Error: Rate limit exceeded. Please wait before making more requests.";
        default:
          return `Error: API request failed with status ${error.response.status}: ${error.response.data?.message || error.response.statusText}`;
      }
    } else if (error.code === "ECONNABORTED") {
      return "Error: Request timed out. Is the Maccan POS backend running on port 3001?";
    } else if (error.code === "ECONNREFUSED") {
      return "Error: Connection refused. Is the Maccan POS backend running on port 3001?";
    }
  }
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
}
