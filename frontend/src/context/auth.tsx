import { API_URL } from "@/lib/api";
import React, { createContext, useContext } from "react";

type AuthContextType = {
  token: string | null;
  setToken: (token: string | null) => void;
  ready: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

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
