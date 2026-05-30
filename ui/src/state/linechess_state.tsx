import { createStore } from "solid-js/store"
import { makePersisted } from "@solid-primitives/storage"
import type { BookId, LineId, PlaylistId } from "./types"
import { make_idb_model, type BookModel, type LightBookModel, type LineModel, type PlaylistModel, type SyncState } from "./db_sync/idb_model"
import { createAsync } from "@solidjs/router"
import { createMemo, createSignal } from "solid-js"
import type { DashboardState } from "./dashboard_state"


export class NoBookSelected extends Error {
    constructor() {
        super('No book selected')
    }
}



export class NoLineSelected extends Error {
    constructor() {
        super('No line selected')
    }
}

export class NoPlaylistSelected extends Error {
    constructor() {
        super('No playlist selected')
    }
}

export type DashboardTab = 'dashboard' | 'repertoire'

export type State = {
    sync_state: SyncState | undefined
    is_create_new_playlist_modal_open: boolean
    is_create_new_book_modal_open: boolean
    is_create_new_line_modal_open: boolean
    is_edit_line_modal_open: boolean
    is_edit_playlist_modal_open: boolean
    is_edit_book_modal_open: boolean
    books: LightBookModel[]
    selected_book?: BookModel
    selected_playlist?: PlaylistModel
    selected_line?: LineModel
    add_new_line_pgn?: string
}


export type Actions = {
    delete_selected_book(): void
    edit_book(name: string): Promise<void>
    set_open_edit_book(v: boolean): void
    set_open_create_new_book(v: boolean): void
    create_book(name: string): Promise<BookId | undefined>
    select_book(id: BookId): void

    delete_selected_playlist(): void
    set_open_edit_playlist(v: boolean): void
    edit_playlist(name: string): Promise<void>
    set_open_create_new_playlist(v: boolean): void
    create_playlist(name: string): Promise<PlaylistId | undefined>
    select_playlist(id: PlaylistId): void

    delete_line(id: LineId): void
    edit_line(name?: string, pgn?: string): Promise<void>
    set_open_edit_line(v: boolean): void
    set_open_create_new_line(v: boolean): void
    create_line(name: string, pgn: string): Promise<LineId | undefined>
    select_line(id: LineId): void
}

export type LinechessStore = [State, Actions]


type LinechessPersistedStore = {
    is_create_new_playlist_modal_open: boolean
    is_create_new_book_modal_open: boolean
    is_create_new_line_modal_open: boolean
    is_edit_line_modal_open: boolean
    is_edit_playlist_modal_open: boolean
    is_edit_book_modal_open: boolean
    selected_book_id: BookId | undefined
}

export function make_linechess_store(dash_state: DashboardState): LinechessStore {

    const should_sync = createMemo(() => dash_state.logged_in_profile !== undefined)
    const [fetch_sync_state, set_fetch_sync_state] = createSignal(false, { equals: false })

    const get_db = createAsync(async () => {
        let db = await make_idb_model(should_sync, () => set_fetch_sync_state(true))

        if (db) {
            db[1].sync()
        }

        return db
    })

    let [store, set_store] = makePersisted(createStore<LinechessPersistedStore>({
        is_create_new_playlist_modal_open: false,
        is_create_new_book_modal_open: false,
        is_create_new_line_modal_open: false,
        is_edit_line_modal_open: false,
        is_edit_playlist_modal_open: false,
        is_edit_book_modal_open: false,
        selected_book_id: undefined
    }), { name: '.linechess.store.v3'})

    const [fetch_books, set_fetch_books] = createSignal(false, { equals: false })
    const books = createAsync(async () => {
        fetch_books()
        let db = get_db()?.[0]
        if (!db) {
            return undefined
        }
        return db.get_books()
    })



    const [fetch_selected_book, set_fetch_selected_book] = createSignal(false, { equals: false })
    const selected_book = createAsync(async () => {
        fetch_selected_book()
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

    const [fetch_selected_playlist, set_fetch_selected_playlist] = createSignal(false, { equals: false })
    const selected_playlist = createAsync(async () => {
        fetch_selected_playlist()
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


    const [fetch_selected_line, set_fetch_selected_line] = createSignal(false, { equals: false })
    const selected_line = createAsync(async () => {
        fetch_selected_line()
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


    const sync_state = createAsync(async () => {
        fetch_sync_state()
        let db = get_db()?.[0]
        if (!db) {
            return undefined
        }
        return await db.get_sync_state()
    })

    let state = {
        get sync_state() {
            return sync_state()
        },
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
        },
        get is_edit_line_modal_open() {
            return store.is_edit_line_modal_open
        },
        get is_edit_playlist_modal_open() {
            return store.is_edit_playlist_modal_open
        },
        get is_edit_book_modal_open() {
            return store.is_edit_book_modal_open
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
        set_open_edit_line(v: boolean) {
            set_store('is_edit_line_modal_open', v)
        },
        set_open_edit_playlist(v: boolean) {
            set_store('is_edit_playlist_modal_open', v)
        },
        set_open_edit_book(v: boolean) {
            set_store('is_edit_book_modal_open', v)
        },
        async create_book(name: string) {

            let db = get_db()?.[1]
            if (!db) {
                return undefined
            }
            let res = await db.add_book(name)

            set_fetch_books(true)
            set_fetch_sync_state(true)
            return res
        },
        async edit_book(name: string) {

            let db = get_db()?.[1]
            if (!db) {
                return undefined
            }
            let  book = selected_book()
            if (!book) {
                throw new NoBookSelected()
            }

            await db.edit_book({
                id: book.id,
                version: book.version + 1,
                updated_at: Date.now(),
                name
            })

            set_fetch_selected_book(true)
            set_fetch_books(true)
            set_fetch_sync_state(true)
        },
        async delete_selected_book() {
            let db = get_db()?.[1]
            if (!db) {
                return undefined
            }

            let book = selected_book()

            if (!book) {
                throw new NoBookSelected()
            }

            await db.delete_book(book.id)

            set_fetch_selected_book(true)
            set_fetch_books(true)
            set_fetch_sync_state(true)
        },
        select_book(id: BookId) {
            set_store('selected_book_id', id)
        },
        async create_playlist(name: string) {
            let db = get_db()?.[1]
            if (!db) {
                return undefined
            }

            let book_id = selected_book()?.id
            if (!book_id) {
                return undefined
            }

            let res = await db.add_playlist(book_id, name)

            set_fetch_selected_book(true)
            set_fetch_books(true)
            set_fetch_sync_state(true)

            return res
        },
        async select_playlist(playlist_id: PlaylistId) {
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
                selected_playlist: playlist_id,
                updated_at: Date.now()
            })

            set_fetch_selected_book(true)
            set_fetch_sync_state(true)
        },
        async delete_selected_playlist() {
            let db = get_db()?.[1]
            if (!db) {
                return undefined
            }

            let playlist = selected_playlist()

            if (!playlist) {
                throw new NoPlaylistSelected()
            }

            await db.delete_playlist(playlist.id)

            set_fetch_selected_book(true)
            set_fetch_books(true)
            set_fetch_sync_state(true)
        },
        async edit_playlist(name: string) {

            let db = get_db()?.[1]
            if (!db) {
                return undefined
            }
            let  playlist = selected_playlist()
            if (!playlist) {
                throw new NoPlaylistSelected()
            }

            await db.edit_playlist({
                id: playlist.id,
                version: playlist.version + 1,
                updated_at: Date.now(),
                name
            })

            set_fetch_selected_playlist(true)
            set_fetch_selected_book(true)
            set_fetch_sync_state(true)
        },
        async edit_line(name?: string, pgn?: string) {

            let db = get_db()?.[1]
            if (!db) {
                return undefined
            }
            let  line = selected_line()
            if (!line) {
                throw new NoLineSelected()
            }

            if (pgn === selected_line()?.pgn) {
                pgn = undefined
            }

            await db.edit_line({
                id: line.id,
                version: line.version + 1,
                updated_at: Date.now(),
                name,
                pgn
            })

            set_fetch_selected_playlist(true)
            set_fetch_selected_line(true)
            set_fetch_sync_state(true)
        },
        async create_line(name: string, pgn: string) {

            let db = get_db()?.[1]
            if (!db) {
                return undefined
            }
            let playlist_id = selected_playlist()?.id
            if (!playlist_id) {
                throw new NoPlaylistSelected()
            }

            let res = await db.add_line(playlist_id, name, pgn)

            set_fetch_selected_playlist(true)
            set_fetch_selected_line(true)
            set_fetch_sync_state(true)

            return res
        },
        async delete_line(id: LineId) {
            let db = get_db()?.[1]
            if (!db) {
                return undefined
            }

            await db.delete_line(id)

            set_fetch_selected_playlist(true)
            set_fetch_sync_state(true)
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

            set_fetch_selected_playlist(true)
            set_fetch_sync_state(true)
        },

    }

    return [state, actions]
}
