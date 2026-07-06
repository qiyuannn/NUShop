import { useAuthStore } from "@/context/authStoreV2";

export function useAuthApiFetch() {
  const refresh = useAuthStore((s) => s.refreshToken);

  async function ApiFetch(url: string, options: RequestInit = {}) {
    let token = useAuthStore.getState().token;
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

    await refresh();

    token = useAuthStore.getState().token;

    const newRes = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });

    return newRes;
  }
  return ApiFetch;
}
