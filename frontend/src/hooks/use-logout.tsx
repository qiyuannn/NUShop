import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/context/authStoreV2";

export function useLogout() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const nav = useNavigate();

  async function logout() {
    setAuth(null, null);

    toast.success("Logged out", {
      duration: 3000,
    });

    await fetch(`${API_URL}/auth/logout`, {
      method: "PUT",
      credentials: "include",
    });
    nav("/");
  }

  return logout;
}
