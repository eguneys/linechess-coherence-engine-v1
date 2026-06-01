import { createAsync } from "@solidjs/router"
import type { DashboardActions } from "./dashboard_state"
import { create_evaluate_api } from "./evaluate_api"
import { makePersisted } from "@solid-primitives/storage"
import { createStore } from "solid-js/store"
import { batch, createMemo } from "solid-js"
import { Default_O_params, FitnessFromRecentMatches, type FitnessScore2, type Overall_Params } from "./fitness2"
import { APIError } from "./db_sync/api"
import type { DivergedGame } from "./shared_types"

export type EvaluateState = {
    fitnessScore: FitnessScore2 | undefined
    user_not_found: boolean
    api_error: boolean
    username: string | undefined
}

export type EvaluateActions = {
    set_evaluate_username(username: string): void
}

export type EvaluateStore = [EvaluateState, EvaluateActions]

export type PersistedState = {
    username: string
    overall_params: Overall_Params
}

export function make_evaluate_store(dashboard_actions: DashboardActions): EvaluateStore {

    const [store, set_store] = makePersisted(createStore<PersistedState>({
        username: '',
        overall_params: Default_O_params
    }))

    dashboard_actions.set_on_login((username: string) => {
        set_store('username', username)
    })

    let api = create_evaluate_api()

    let diverge_games = createAsync<{ username: string, games: DivergedGame[]} | 'api-error' | 'not-found' | undefined>(async () => {
        if (store.username.length < 3) {
            return undefined
        }

        let res = []
        try {
            res = await api.evaluate(store.username)
            return res
        } catch (e) {
            if (e instanceof APIError) {
                return 'api-error'
            }
            return 'not-found'
        }
    })

    const fitness_score = () => {

        let res = diverge_games()

        if (res === undefined || res === 'not-found' || res === 'api-error') {
            return undefined
        }

        return FitnessFromRecentMatches(res.games, store.overall_params)
    }

    const user_not_found = createMemo(() => diverge_games() === 'not-found')
    const api_error = createMemo(() => diverge_games() === 'api-error')

    const username = createMemo(() => {

        let res = diverge_games()

        if (res === undefined || res === 'not-found' || res === 'api-error') {
            return undefined
        }

        return res.username
    })

    let state = {
        get fitnessScore() {
            return fitness_score()
        },
        get user_not_found() {
            return user_not_found()
        },
        get api_error() {
            return api_error()
        },
        get username() {
            return username()
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