import { useAuth } from "@/context/auth";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";

export function useLogout() {
  const { setToken, setUser } = useAuth();

  async function logout() {
    setUser(null);
    setToken(null);

    toast.success("Logged out", {
      duration: 3000,
    });

    await fetch(`${API_URL}/auth/logout`, {
      method: "PUT",
      credentials: "include",
    });
  }
  
  return logout;
}
