export type AgentActions = {
    fetch_lichess_username(): Promise<LichessLoginUsername>
    login_with_lichess(): Promise<void>
    logout(): Promise<void>
}

export type LichessLoginUsername = {
    username: string
}

export const API_ENDPOINT = import.meta.env.DEV ? 'http://localhost:3300' : `https://api.linechess.com`
const $ = async (path: string, opts?: RequestInit) => {

    const controller = new AbortController()

    setTimeout(() => controller.abort(), 10_000)

    const res = await fetch(API_ENDPOINT + path, { 
        ...opts,

        credentials: 'include',
        signal: controller.signal
    })

    if (res.redirected) {
        window.location.href = res.url;
        return
    }
    
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`API ${res.status}: ${text}`)
    }

    return res.json()
}

export async function $post(path: string, body: any = {}) {
    const res = await $(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    return res
}



export function create_api_agent(): AgentActions {
    return {
        async login_with_lichess() {
            window.location.href = API_ENDPOINT + '/login'
        },
        async fetch_lichess_username() {
            return $('/profile')
        },
        async logout() {
            return $('/logout')
        }
    }
}