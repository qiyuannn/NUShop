import { useAuth } from "@/context/auth";
import { API_URL } from "@/lib/api";

export function useLogout() {
  const { setToken, setUser } = useAuth();

  async function logout() {
    setUser(null);
    setToken(null);

    await fetch(`${API_URL}/auth/logout`, {
      method: "PUT",
      credentials: "include",
    });
  }
  return logout;
}
