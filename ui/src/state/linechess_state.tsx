import { createStore } from "solid-js/store"
import { makePersisted } from "@solid-primitives/storage"
import type { BookId, LightPlaylist, LineId, Playlist, PlaylistId } from "./types"

export type DashboardTab = 'dashboard' | 'repertoire'

export type State = {
    is_create_new_playlist_modal_open: boolean
    is_create_new_book_modal_open: boolean
    is_create_new_line_modal_open: boolean
    selected_playlist?: Playlist
    playlists: LightPlaylist[]
    add_new_line_pgn?: string
}


export type Actions = {
    set_open_create_new_playlist(v: boolean): void
    create_playlist(name: string): Promise<PlaylistId>
    select_playlist(id: PlaylistId): void

    set_open_create_new_book(v: boolean): void
    create_book(name: string): Promise<BookId>
    select_book(id: BookId): void


    set_open_create_new_line(v: boolean): void
    create_line(name: string, pgn: string): Promise<LineId>
    select_line(id: LineId): void
}

export type LinechessStore = [State, Actions]


type LinechessPersistedStore = {
    is_create_new_playlist_modal_open: boolean
    is_create_new_book_modal_open: boolean
    is_create_new_line_modal_open: boolean
}

export function make_linechess_store(): LinechessStore {

    let [_temp_store, _set_temp_store] = createStore({
    })

    let [store, set_store] = makePersisted(createStore<LinechessPersistedStore>({
        is_create_new_playlist_modal_open: false,
        is_create_new_book_modal_open: false,
        is_create_new_line_modal_open: false
    }), { name: '.linechess.store.v2'})


    let state = {
        get selected_playlist() {
            return store.selected_playlist
        },
        get playlists() {
            return store.playlists
        },
        get is_create_new_playlist_modal_open() {
            return store.is_create_new_playlist_modal_open
        },
        get is_create_new_book_modal_open() {
            return store.is_create_new_book_modal_open
        },
        get is_create_new_line_modal_open() {
            return store.is_create_new_line_modal_open
        }
    }

    let actions = {
        set_open_create_new_playlist(v: boolean) {
            set_store('is_create_new_playlist_modal_open', v)
        },
        set_open_create_new_book(v: boolean) {
            set_store('is_create_new_book_modal_open', v)
        },
        set_open_create_new_line(v: boolean) {
            set_store('is_create_new_line_modal_open', v)
        },
        async create_playlist(name: string) {
            let res = await $api.create_playlist(name)

            return res.id
        },
        select_playlist(id: PlaylistId) {

        },
        async create_book(name: string) {
            let res = await $api.create_book(name)

            return res.id
        },
        select_book(id: PlaylistId) {

        },
        async create_line(name: string) {
            let res = await $api.create_line(name)

            return res.id
        },
        select_line(id: LineId) {

        },
    }

    return [state, actions]
}
