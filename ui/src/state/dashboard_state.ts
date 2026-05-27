import { makePersisted } from "@solid-primitives/storage"
import { createStore } from "solid-js/store"

export type DashboardState = {
}


export type DashboardActions = {
}

export type DashboardStore = [DashboardState, DashboardActions]

export type DashboardPersistedStore = {
}


export function make_dashboard(): DashboardStore {

    let [_store, _set_store] = makePersisted(createStore<DashboardPersistedStore>({
    }), { name: '.linechess.dashboardstore.v4'})


    let state = {
    }

    let actions = {
    }

    return [state, actions]
}