import { useAuth } from "@/context/auth";
import { API_URL } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export function useLogout() {
  const { setToken } = useAuth();
  const nav = useNavigate();

  function logout() {
    setToken(null);

    fetch(`${API_URL}/auth/logout`, {
      method: "PUT",
      credentials: "include",
    });
    nav("/");
  }
  return logout;
}
