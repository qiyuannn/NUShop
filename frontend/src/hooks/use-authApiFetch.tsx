import { useAuth } from "@/context/auth";

export function useAuthApiFetch() {
    const { setUser, token, setToken} = useAuth()

    async function ApiFetch(url: string, options: RequestInit={}) {
        const res = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                ...(token!== null ? {"Authorisation": `Bearer ${token}`}: {})
            },
            credentials: "include",
        })

        if (res.status !== 401) {
            return res
        }

        const refreshTokenRes = await fetch("http://localhost:8080/auth/refresh", {
            method: "POST",
            credentials: "include"
        })
        if (!refreshTokenRes.ok) {
            setUser(null)
            return res
        }

        const json = await refreshTokenRes.json()
        const newToken = json.data.token
        setToken(newToken)
        
        const newRes = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                ...(newToken !== null ? {"Authorisation": `Bearer ${newToken}`}: {})
            },
            credentials: "include"
        })

        return newRes
    }
    return ApiFetch
}