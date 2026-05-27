import { createStore } from "solid-js/store"
import { makePersisted } from "@solid-primitives/storage"

export type DashboardTab = 'dashboard' | 'repertoire'

export type State = {
}


export type Actions = {
}

export type LinechessStore = [State, Actions]


type LinechessPersistedStore = {
}

export function make_linechess_store(): LinechessStore {

    let [_temp_store, _set_temp_store] = createStore({
    })

    let [_store, _set_store] = makePersisted(createStore<LinechessPersistedStore>({
    }), { name: '.linechess.store.v2'})


    let state = {
    }

    let actions = {
    }

    return [state, actions]
}
