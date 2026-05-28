import { createStore } from "solid-js/store"
import { makePersisted } from "@solid-primitives/storage"
import type { BookId, LineId, PlaylistId } from "./types"
import { make_idb_model, type BookModel, type LightBookModel, type LineModel, type PlaylistModel } from "./db_sync/idb_model"
import { createAsync } from "@solidjs/router"

export type DashboardTab = 'dashboard' | 'repertoire'

export type State = {
    is_create_new_playlist_modal_open: boolean
    is_create_new_book_modal_open: boolean
    is_create_new_line_modal_open: boolean
    books: LightBookModel[]
    selected_book?: BookModel
    selected_playlist?: PlaylistModel
    selected_line?: LineModel
    add_new_line_pgn?: string
}


export type Actions = {
    set_open_create_new_book(v: boolean): void
    create_book(name: string): Promise<BookId | undefined>
    select_book(id: BookId): void

    set_open_create_new_playlist(v: boolean): void
    create_playlist(book_id: BookId, name: string): Promise<PlaylistId | undefined>
    select_playlist(id: PlaylistId): void

    set_open_create_new_line(v: boolean): void
    create_line(playlist_id: PlaylistId, name: string, pgn: string): Promise<LineId | undefined>
    select_line(id: LineId): void
}

export type LinechessStore = [State, Actions]


type LinechessPersistedStore = {
    is_create_new_playlist_modal_open: boolean
    is_create_new_book_modal_open: boolean
    is_create_new_line_modal_open: boolean
    selected_book_id: BookId | undefined
}

export function make_linechess_store(): LinechessStore {

    const get_db = createAsync(make_idb_model)

    let [store, set_store] = makePersisted(createStore<LinechessPersistedStore>({
        is_create_new_playlist_modal_open: false,
        is_create_new_book_modal_open: false,
        is_create_new_line_modal_open: false,
        selected_book_id: undefined
    }), { name: '.linechess.store.v2'})

    const books = createAsync(async () => {
        let db = get_db()?.[0]
        if (!db) {
            return undefined
        }
        return db.get_books()
    })



    const selected_book = createAsync(async () => {
        let id = store.selected_book_id
        let db = get_db()?.[0]
        if (!db) {
            return undefined
        }
        if (!id) {
            return undefined
        }
        return db.get_book_by_id(id)
    })

    const selected_playlist = createAsync(async () => {
        let db = get_db()?.[0]
        if (!db) {
            return undefined
        }

        let selected_playlist = selected_book()?.selected_playlist
        if (!selected_playlist) {
            return undefined
        }
        return db.get_playlist_by_id(selected_playlist)
    })


    const selected_line = createAsync(async () => {
        let db = get_db()?.[0]
        if (!db) {
            return undefined
        }

        let selected_line = selected_playlist()?.selected_line
        if (!selected_line) {
            return undefined
        }
        return db.get_line_by_id(selected_line)
    })

    let state = {
        get books() {
            return books() ?? []
        },
        get selected_book() {
            return selected_book()
        },
        get selected_playlist() {
            return selected_playlist()
        },
        get selected_line() {
            return selected_line()
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

        async create_book(name: string) {

            let db = get_db()?.[1]
            if (!db) {
                return undefined
            }
            let res = await db.add_book(name)

            return res
        },
        select_book(id: BookId) {
            set_store('selected_book_id', id)
        },
        async create_playlist(id: BookId, name: string) {
            let db = get_db()?.[1]
            if (!db) {
                return undefined
            }
            let res = await db.add_playlist(id, name)

            return res
        },
        async select_playlist(selected_playlist: PlaylistId) {
            let db = get_db()?.[1]
            if (!db) {
                return
            }
            let book = await selected_book()

            if (!book) {
                return
            }
            await db.edit_book({
                id: book.id,
                version: book.version,
                selected_playlist,
                updated_at: Date.now()
            })
        },
        async create_line(playlist_id: PlaylistId, name: string, pgn: string) {

            let db = get_db()?.[1]
            if (!db) {
                return undefined
            }
            let res = await db.add_line(playlist_id, name, pgn)

            return res
        },
        async select_line(selected_line: LineId) {

            let db = get_db()?.[1]
            if (!db) {
                return undefined
            }

            let playlist = selected_playlist()

            if (!playlist) {
                return
            }
            await db.edit_playlist({
                id: playlist.id,
                version: playlist.version,
                selected_line,
                updated_at: Date.now()
            })

        },
    }

    return [state, actions]
}
