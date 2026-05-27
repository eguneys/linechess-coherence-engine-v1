import { makePersisted } from "@solid-primitives/storage"
import { createStore } from "solid-js/store"
import type { LoggedInProfile } from "./types"
import { create_api_agent } from "./api_agent"
import { createAsync } from "@solidjs/router"
import { createSignal } from "solid-js"

export type DashboardState = {
    logged_in_profile?: LoggedInProfile
}


export type DashboardActions = {
    login_with_lichess(): Promise<void>
    logout(): Promise<void>
}

export type DashboardStore = [DashboardState, DashboardActions]

export type DashboardPersistedStore = {
    logged_in_profile?: LoggedInProfile
}


export function make_dashboard(): DashboardStore {

    let $api = create_api_agent()

    let [store, set_store] = makePersisted(createStore<DashboardPersistedStore>({
        logged_in_profile: undefined
    }), { name: '.linechess.dashboardstore.v4'})

    const [fetch_login, set_fetch_login] = createSignal(true)
    const logged_in_profile = createAsync(async () => {
        let should_fetch = fetch_login()
        set_fetch_login(false)

        if (should_fetch && !store.logged_in_profile) {
            let res = await $api.fetch_lichess_username()

            if (res.username) {
                set_store('logged_in_profile', { username: res.username })
            }
        }
        return store.logged_in_profile
    })

    let state = {
        get logged_in_profile() {
            let res = logged_in_profile()
            if (res === null) {
                return undefined
            }
            return res
        }
    }

    let actions = {
        async login_with_lichess() {
            await $api.login_with_lichess()
        },
        async logout() {
            set_store('logged_in_profile', undefined)
            await $api.logout()
        }
    }

    return [state, actions]
}