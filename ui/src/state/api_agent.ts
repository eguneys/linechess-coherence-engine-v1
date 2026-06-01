export type AgentActions = {
    is_token_just_exchanged: boolean
    fetch_lichess_username(): Promise<LichessLoginUsername>
    login_with_lichess(): Promise<void>
}

export type LichessLoginUsername = {
    username: string
}

export class APIError extends Error { }

export const API_ENDPOINT = import.meta.env.DEV ? 'http://localhost:3300' : `https://api.linechess.com`
export const $ = async (path: string, opts?: RequestInit) => {

    const controller = new AbortController()

    setTimeout(() => controller.abort(), 10_000)


    let token = getToken_LocalStorage().token
    let auth_headers = token ? {
        'Authorization': `Bearer ${token}`
    }: undefined

    const res = await fetch(API_ENDPOINT + path, { 
        ...opts,
        credentials: 'include',
        signal: controller.signal,
        headers: {
            ...opts?.headers,
            ...auth_headers 
        }
    })

    if (res.redirected) {
        window.location.href = res.url;
        return
    }
    
    if (!res.ok) {
        const error = await res.json()
        throw new APIError(error.error)
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
        get is_token_just_exchanged() {
            return getToken_LocalStorage().is_token_just_exchanged
        },
        async login_with_lichess() {
            window.location.href = API_ENDPOINT + '/login'
        },
        async fetch_lichess_username() {
            return $('/profile')
        }
    }
}


const API_TOKEN_LOCAL_STORAGE = 'linechess.api_token'
const setToken_LocalStorage = (token: string) => {
    window.localStorage.setItem(API_TOKEN_LOCAL_STORAGE, JSON.stringify({ token, is_token_just_exchanged: true }))
}
export const getToken_LocalStorage = () => {
    let res =  JSON.parse(window.localStorage.getItem(API_TOKEN_LOCAL_STORAGE) ?? '{}')
    window.localStorage.setItem(API_TOKEN_LOCAL_STORAGE, JSON.stringify({ token: res.token, is_token_just_exchanged: false }))

    return res
}

function processAuthCode() {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    
    if (code) {
        $post('/code', { code: code })
            .catch(error => console.error('Error:', error))
            .then(_ => {

                setToken_LocalStorage(_.token)
                window.location.replace(url.toString());
            })

        // Remove code parameter and refresh immediately
        url.searchParams.delete('code');
    }
}

window.addEventListener('DOMContentLoaded', processAuthCode);