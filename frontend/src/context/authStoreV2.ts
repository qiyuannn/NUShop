import { API_URL } from "@/lib/api";
import { create } from "zustand";

type authStoreType = {
  token: string | null;
  userID: string | null;
  setAuth: (token: string | null, userID: string | null) => void;
  refreshToken: () => Promise<void>;
};


export const useAuthStore = create<authStoreType>((set) => ({
  token: null,
  userID: null,

  setAuth: (token: string | null, userID: string | null) => {
    set({ token: token, userID: userID });
  },

  refreshToken: async () => {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    const json = await res.json();
    if (res.ok) {
      set({
        token: json?.data?.token ?? null,
        userID: json?.data?.userID ?? null,
      });
    }
  },
}));
