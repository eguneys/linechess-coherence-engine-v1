import type { AppMutation } from "./types"

export const API_ENDPOINT = import.meta.env.DEV ? 'http://localhost:3300' : `https://api.linechess.com`
export const $ = async (path: string, opts?: RequestInit) => {

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
        const error = await res.json()
        throw new APIError(error.error)
    }

    return res.json()
}

export class APIError extends Error { }

export async function $post(path: string, body: any = {}) {
    const res = await $(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    return res
}



export type SyncApi = {
    pull(since: number): Promise<AppMutation[]>
    push(mutations: AppMutation[]): Promise<void>
}

export function create_sync_api() {
    return {
        async pull(since: number): Promise<AppMutation[]> {
            return (await $(`/sync?since=${since}`)).mutations
        },
        push(mutations: AppMutation[]): Promise<void> {
            return $post('/sync/mutations', { mutations })
        }
    }
}