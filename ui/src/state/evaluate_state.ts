import { createAsync } from "@solidjs/router"
import type { DashboardActions } from "./dashboard_state"
import { create_evaluate_api } from "./evaluate_api"
import { makePersisted } from "@solid-primitives/storage"
import { createStore, produce } from "solid-js/store"
import { batch, createMemo } from "solid-js"
import { Default_O_params, FitnessFromRecentMatches, type FitnessScore2, type Overall_Params } from "./fitness2"
import type { AllowedSpeed, DivergedGame } from "./shared_types"
import { APIError } from "./api_agent"

export type ParamA = AllowedSpeed | 'general'
export type ParamB = 'alpha' | 'gamma' | 'lambda' | 'g_target' | 'T_ratio'

export type EvaluateState = {
    fitnessScore: FitnessScore2 | undefined
    user_not_found: boolean
    api_error: boolean
    username: string | undefined
    params: Overall_Params
}

export type EvaluateActions = {
    set_evaluate_username(username: string): void
    set_overall_params(param_a: ParamA, param_b: ParamB, value: number): void
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
        get params() {
            return store.overall_params
        },
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
        },
        set_overall_params(a: ParamA, b: ParamB, value: number) {
            if (a === 'general') {
            } else {

                if (b === 'T_ratio') {
                    set_store(produce(store => {
                        if (a === 'bullet') {
                            store.overall_params.Tb = value
                        }
                        if (a === 'blitz') {
                            store.overall_params.Tz = value
                        }
                        if (a === 'rapid') {
                            store.overall_params.Tr = value
                        }
                        if (a === 'classical') {
                            store.overall_params.Tc = value
                        }
                    }))
                }

                if (b === 'alpha') {
                    set_store(produce(store => {
                        if (a === 'bullet') {
                            store.overall_params.Pb.alpha = value
                        }
                        if (a === 'blitz') {
                            store.overall_params.Pz.alpha = value
                        }
                        if (a === 'rapid') {
                            store.overall_params.Pr.alpha = value
                        }
                        if (a === 'classical') {
                            store.overall_params.Pc.alpha = value
                        }
                    }))
                }

                if (b === 'g_target') {
                    set_store(produce(store => {
                        if (a === 'bullet') {
                            store.overall_params.Pb.Gtarget = value
                        }
                        if (a === 'blitz') {
                            store.overall_params.Pz.Gtarget = value
                        }
                        if (a === 'rapid') {
                            store.overall_params.Pr.Gtarget = value
                        }
                        if (a === 'classical') {
                            store.overall_params.Pc.Gtarget = value
                        }
                    }))
                }

                if (b === 'gamma') {
                    set_store(produce(store => {
                        if (a === 'bullet') {
                            store.overall_params.Pb.cc.Gamma_you = value
                        }
                        if (a === 'blitz') {
                            store.overall_params.Pz.cc.Gamma_you = value
                        }
                        if (a === 'rapid') {
                            store.overall_params.Pr.cc.Gamma_you = value
                        }
                        if (a === 'classical') {
                            store.overall_params.Pc.cc.Gamma_you = value
                        }
                    }))
                }


                if (b === 'lambda') {
                    set_store(produce(store => {
                        if (a === 'bullet') {
                            store.overall_params.Pb.cc.Lambda_opp = value
                        }
                        if (a === 'blitz') {
                            store.overall_params.Pz.cc.Lambda_opp = value
                        }
                        if (a === 'rapid') {
                            store.overall_params.Pr.cc.Lambda_opp = value
                        }
                        if (a === 'classical') {
                            store.overall_params.Pc.cc.Lambda_opp = value
                        }
                    }))
                }
            }
        }
    }

    return [state, actions]
}