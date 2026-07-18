import { API_URL } from "@/lib/api";
import React, { createContext, useContext } from "react";
import type { User } from "@/types";

type AuthContextType = {
  token: string | null;
  setToken: (token: string | null) => void;
  ready: boolean;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    async function refresh() {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (res.ok) {
          const json = await res.json();
          setToken(json.data.token ?? null);

          const userRes = await fetch(`${API_URL}/auth/me`, {
            method: "GET",
            credentials: "include",
          });

          if (userRes.ok) {
            const userJson = await userRes.json();
            setUser(userJson.data.user ?? null);
          }
        }
      } finally {
        setReady(true);
      }
    }

    refresh();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        setToken,
        ready,
        user,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth() must be used inside AuthProvider");
  }
  return context;
}
