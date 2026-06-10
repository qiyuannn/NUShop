import { useAuth } from "@/context/auth";
import { API_URL } from "@/lib/api";

export function useAuthApiFetch() {
  const { token, setToken } = useAuth();

  async function ApiFetch(url: string, options: RequestInit = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });

    if (res.status !== 401) {
      return res;
    }

    const refreshTokenRes = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!refreshTokenRes.ok) {
      return res;
    }

    const json = await refreshTokenRes.json();
    const newToken = json.data.token;
    setToken(newToken);

    const newRes = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(newToken !== null ? { Authorization: `Bearer ${newToken}` } : {}),
      },
      credentials: "include",
    });

    return newRes;
  }
  return ApiFetch;
}
