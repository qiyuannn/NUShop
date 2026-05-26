import { useAuth } from "@/context/auth";

export function useLogout() {
  const { setToken, setUser } = useAuth();

  async function logout() {
    setUser(null);
    setToken(null);

    await fetch("http://localhost:8080/auth/logout", {
      method: "PUT",
      credentials: "include",
    });
  }
  return logout;
}
