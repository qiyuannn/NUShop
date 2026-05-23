import type { User } from "@/types"
import React, { createContext, useContext } from "react"

type AuthContextType = {
    user: User | null,
    setUser: (user: User| null) => void,
    token: string | null,
    setToken: (token: string|null) => void,
}

const AuthContext = createContext<AuthContextType|null>(null)

export function AuthProvider({children}: {children: React.ReactNode}) {
    const [user, setUser] = React.useState<User|null>(null)
    const [token, setToken] = React.useState<string|null>(null)
    
    return(
        <AuthContext.Provider value={{
            user,
            setUser,
            token,
            setToken,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {throw new Error("useAuth() must be used inside AuthProvider")}
    return context
}

