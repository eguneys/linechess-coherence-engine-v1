import { $, $post } from "../api_agent"
import type { AppMutation } from "./types"

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