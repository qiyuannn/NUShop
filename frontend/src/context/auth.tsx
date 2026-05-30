import { API_URL } from "@/lib/api";
import type { User } from "@/types";
import React, { createContext, useContext } from "react";

type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  ready: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const refreshed = React.useRef(false);

  React.useEffect(() => {
    async function refresh() {
      if (refreshed.current) {
        return;
      }
      refreshed.current = true;

      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          setUser(json.data.user);
          setToken(json.data.token);
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
        user,
        setUser,
        token,
        setToken,
        ready,
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
