// This is not used yet

import { API_URL } from "@/lib/api";
import { create } from "zustand";

type authStoreType = {
  token: string | null;
  setToken: (token: string | null) => void;
  refreshToken: () => Promise<void>;
};

export const useAuthStore = create<authStoreType>((set) => ({
  token: null,

  setToken: (token) => {
    set({ token: token });
  },

  refreshToken: async () => {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json();

    if (res.ok) {
      set({ token: json?.data?.token ?? null });
    }

    if (!res.ok) {
      throw new Error("invalid token");
    }
  },
}));
