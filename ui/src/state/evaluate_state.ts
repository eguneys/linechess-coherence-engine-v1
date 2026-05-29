import { createAsync } from "@solidjs/router"
import type { DashboardState } from "./dashboard_state"
import { create_evaluate_api } from "./evaluate_api"
import { makePersisted } from "@solid-primitives/storage"
import { createStore } from "solid-js/store"
import { batch } from "solid-js"

export type EvaluateUsername = {

}

export type EvaluateState = {
    evaluate_username: EvaluateUsername | 'not-found' | undefined
}

export type EvaluateActions = {
    set_evaluate_username(username: string): void
}

export type EvaluateStore = [EvaluateState, EvaluateActions]

export type PersistedState = {
    username: string
}

export function make_evaluate_store(_dashboard_state: DashboardState) {

    const [store, set_store] = makePersisted(createStore<PersistedState>({
        username: ''
    }))

    let api = create_evaluate_api()

    let evaluate_username = createAsync(async () => {
        if (store.username.length < 3) {
            return undefined
        }

        let res = []
        try {
            res = await api.evaluate(store.username)
        } catch (e) {
            return 'not-found'
        }
        

        await new Promise(resolve => setTimeout(resolve, 1000))

        return res
    })

    let state = {
        get evaluate_username() {
            return evaluate_username()
        }
    }

    let actions = {
        set_evaluate_username(username: string) {
            batch(() => {
                set_store('username', '')
                set_store('username', username)
            })
        }
    }

    return [state, actions]
}