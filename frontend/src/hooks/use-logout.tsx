import { useAuth } from "@/context/auth";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function useLogout() {
  const { setToken } = useAuth();
  const nav = useNavigate();

  async function logout() {
    setToken(null);

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
