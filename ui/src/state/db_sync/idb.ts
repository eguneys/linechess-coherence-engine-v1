import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { gen_id, type Book, type BookId, type Line, type LineId, type Playlist, type PlaylistId, type Move, type MoveId, type BookEdit, type PlaylistEdit, type LineEdit, type PendingMutationId, type AppMutation, type LineAdd, type PlaylistAdd, type BookAdd, type SyncState, Sync_State_One_Id } from './types'

class BookNotFoundError extends Error {
    constructor(id: BookId) {
        super(`Book not found ${id}`)
    }
}
class PlaylistNotFoundError extends Error {
    constructor(id: PlaylistId) {
        super(`Playlist not found ${id}`)
    }
}
class LineNotFoundError extends Error {
    constructor(id: LineId) {
        super(`Line not found ${id}`)
    }
}




interface LinechessDB extends DBSchema {
    sync_state: {
        key: Sync_State_One_Id,
        value: SyncState
    },
    books: {
        key: BookId
        value: Book
    }
    playlists: {
        key: PlaylistId
        value: Playlist
        indexes: { 'by_book_id': BookId }
    }
    lines: {
        key: LineId
        value: Line
        indexes: { 'by_playlist_id': PlaylistId }
    }
    moves: {
        key: MoveId
        value: Move
        indexes: { 'by_line_id': LineId }
    },
    pending_mutations: {
        key: PendingMutationId
        value: AppMutation
    }
}

export type DatabaseState = {
    get_sync_state(): Promise<SyncState>
    get_books(): Promise<Book[]>
    get_book_by_id(id: BookId): Promise<Book | undefined>
    get_playlists_by_book_id(book: BookId): Promise<Playlist[]>
    get_playlist_by_id(id: PlaylistId): Promise<Playlist | undefined>
    get_lines_by_playlist_id(playlist_id: PlaylistId): Promise<Line[]>
    get_line_by_id(id: LineId): Promise<Line | undefined>
    get_moves_by_line_id(id: LineId): Promise<Move[]>
    get_pending_mutations(): Promise<AppMutation[]>
}

export type DatabaseActions = {
    create_book(name: string): Promise<BookId>
    edit_book(book: BookEdit): Promise<void>
    delete_book(id: BookId): Promise<void>
    create_playlist(book_id: BookId, name: string): Promise<PlaylistId>
    edit_playlist(playlist: PlaylistEdit): Promise<void>
    delete_playlist(id: PlaylistId): Promise<void>
    create_line(playlist_id: PlaylistId, name: string, pgn: string): Promise<LineId>
    edit_line(line: LineEdit): Promise<void>
    delete_line(id: LineId): Promise<void>
    create_moves(moves: Move[]): Promise<void>
    delete_moves(id: LineId): Promise<void>
    delete_mutations(id: PendingMutationId[]): Promise<void>
    apply_mutations(mutations: AppMutation[]): Promise<void>
    set_sync_state(sync_state: SyncState): Promise<void>
}

export type DatabaseStore = [DatabaseState, DatabaseActions]

const DB_VERSION = 1

export async function make_database(): Promise<DatabaseStore> {

    const db = await openDB<LinechessDB>('linechess-db', DB_VERSION, {
        upgrade(db) {
            create_tables(db)
        }
    })


    let state = {
        get_books() {
            return db.getAll('books')
        },
        get_book_by_id(id: BookId) {
            return db.get('books', id)
        },
        get_playlists_by_book_id(book_id: BookId) {
            return db.getAllFromIndex('playlists', 'by_book_id', book_id)
        },
        get_playlist_by_id(id: PlaylistId) {
            return db.get('playlists', id)
        },
        get_lines_by_playlist_id(playlist_id: PlaylistId) {
            return db.getAllFromIndex('lines', 'by_playlist_id', playlist_id)
        },
        get_line_by_id(id: LineId) {
            return db.get('lines', id)
        },
        get_moves_by_line_id(id: LineId) {
            return db.getAllFromIndex('moves', 'by_line_id', id)
        },
        get_pending_mutations() {
            return db.getAll('pending_mutations')
        },
        async get_sync_state() {
            let res = await db.get('sync_state', 'sync_state_id_1')

            if (!res) {
                let value: SyncState = {
                    id: Sync_State_One_Id,
                    pending_writes: false,
                    needs_pull: false,
                    sync_in_progress: false,
                    last_pulled_at: 0
                }
                await db.add('sync_state', value)
                return value
            }
            return res
        }
    }

    let actions = {
        async create_book(name: string) {
            let created_at = Date.now()
            let value: Book = {
                id: gen_id(),
                name,
                nb_playlists: 0,
                version: 1,
                has_pending_writes: true,
                created_at,
                updated_at: created_at
            }
            let res = await db.put('books', value)


            await db.put('pending_mutations', {
                id: gen_id(),
                type: 'book.create',
                payload: value
            })

            return res
        },
        async delete_book(id: BookId) {
            let res =  await db.delete('books', id)

            await db.put('pending_mutations', {
                id: gen_id(),
                type: 'book.delete',
                payload: id
            })

            return res
        },
        async edit_book(edit: BookEdit) {
            let book = await db.get('books', edit.id)
            if (!book) {
                throw new BookNotFoundError(edit.id)
            }
            await db.put('books', {
                id: book.id,
                name: edit.name ?? book.name,
                nb_playlists: edit.nb_playlists ?? book.nb_playlists,
                version: edit.version,
                has_pending_writes: true,
                created_at: book.created_at,
                updated_at: edit.updated_at
            })

            if (book.version !== edit.version) {
                await db.put('pending_mutations', {
                    id: gen_id(),
                    type: 'book.edit',
                    payload: edit
                })
            }

        },
        async create_playlist(book_id: BookId, name: string) {
            let created_at = Date.now()
            let value: Playlist = {
                id: gen_id(),
                name,
                book_id,
                nb_lines: 0,
                version: 1,
                has_pending_writes: true,
                created_at,
                updated_at: created_at
            }
            let res = await db.put('playlists', value)

            book_edit_with_book(book_id, async book => ({
                nb_playlists: book.nb_playlists + 1,
                updated_at: created_at
            }))

            await db.put('pending_mutations', {
                id: gen_id(),
                type: 'playlist.create',
                payload: value
            })

            return res
        },
        async delete_playlist(id: PlaylistId) {
            let playlist = await db.get('playlists', id)

            if (!playlist) {
                throw new PlaylistNotFoundError(id)
            }

            let res = await db.delete('playlists', id)

            book_edit_with_book(playlist.book_id, async book => ({
                nb_playlists: book.nb_playlists - 1,
                updated_at: Date.now()
            }))

            await db.put('pending_mutations', {
                id: gen_id(),
                type: 'playlist.delete',
                payload: id
            })

            return res
        },
        async edit_playlist(edit: PlaylistEdit) {
            let playlist = await db.get('playlists', edit.id)
            if (!playlist) {
                throw new PlaylistNotFoundError(edit.id)
            }

            await db.put('playlists', {
                id: playlist.id,
                book_id: edit.book_id ?? playlist.book_id,
                name: edit.name ?? playlist.name,
                nb_lines: edit.nb_lines ?? playlist.nb_lines,
                version: edit.version,
                has_pending_writes: true,
                created_at: playlist.created_at,
                updated_at: edit.updated_at
            })

            if (playlist.version !== edit.version) {
                await db.put('pending_mutations', {
                    id: gen_id(),
                    type: 'playlist.edit',
                    payload: edit
                })
            }
        },
        async create_line(playlist_id: PlaylistId, name: string, pgn: string) {
            let created_at = Date.now()
            let value: Line = {
                id: gen_id(),
                playlist_id,
                pgn,
                name,
                version: 1,
                has_pending_writes: true,
                created_at,
                updated_at: created_at
            }

            let res = await db.put('lines', value)

            playlist_edit_with_playlist(playlist_id, async playlist => ({
                nb_playlists: playlist.nb_lines + 1,
                updated_at: Date.now()
            }))

            await db.put('pending_mutations', {
                id: gen_id(),
                type: 'line.create',
                payload: value
            })

            return res
        },
        async delete_line(id: LineId) {
            let line = await db.get('lines', id)
            if (!line) {
                throw new LineNotFoundError(id)
            }

            let res = await db.delete('lines', id)

            playlist_edit_with_playlist(line.playlist_id, async playlist => ({
                nb_playlists: playlist.nb_lines - 1,
                updated_at: Date.now()
            }))

            await db.put('pending_mutations', {
                id: gen_id(),
                type: 'line.delete',
                payload: id
            })

            return res
        },
        async edit_line(edit: LineEdit) {
            let line = await db.get('lines', edit.id)
            if (!line) {
                throw new LineNotFoundError(edit.id)
            }

            await db.put('lines', {
                id: line.id,
                playlist_id: edit.playlist_id ?? line.playlist_id,
                name: edit.name ?? line.name,
                pgn: edit.pgn ?? line.pgn,
                version: edit.version,
                has_pending_writes: true,
                created_at: line.created_at,
                updated_at: edit.updated_at
            })

            if (line.version !== edit.version) {
                await db.put('pending_mutations', {
                    id: gen_id(),
                    type: 'line.edit',
                    payload: edit
                })
            }

        },
        async create_moves(moves: Move[]) {

            const tx = db.transaction('moves', 'readwrite')

            await Promise.all([
                ...moves.map(async move =>
                    await tx.store.put(move)
                ),
            ])

            await tx.done
        },
        async delete_moves(id: LineId) {
            const tx = db.transaction('moves', 'readwrite')
            for await (const cursor of tx.store.index('by_line_id').iterate(id)) {
                await cursor.delete()
            }
            await tx.done
        },
        async delete_mutations(ids: PendingMutationId[]) {
            const tx = db.transaction('pending_mutations', 'readwrite')
            for (let id of ids) tx.store.delete(id)
            await tx.done
        },
        async apply_mutations(mutations: AppMutation[]) {
            for (let mutation of mutations) {
                switch (mutation.type) {
                    case 'book.create':
                        await apply_book_create(mutation.payload)
                        break
                    case 'playlist.create':
                        await apply_playlist_create(mutation.payload)
                        break
                    case 'line.create':
                        await apply_line_create(mutation.payload)
                        break
                    case 'book.delete':
                        await apply_book_delete(mutation.payload)
                        break
                    case 'playlist.delete':
                        await apply_playlist_delete(mutation.payload)
                        break
                    case 'line.delete':
                        await apply_line_delete(mutation.payload)
                        break
                    case 'book.edit':
                        await apply_book_edit(mutation.payload)
                        break
                    case 'playlist.edit':
                        await apply_playlist_edit(mutation.payload)
                        break
                    case 'line.edit':
                        await apply_line_edit(mutation.payload)
                        break
                }
            }
        },
        async set_sync_state(state: SyncState) {
            await db.put('sync_state', state)
        }
    }

    async function apply_book_create(book: BookAdd) {
        await db.put('books', {
            id: book.id,
            name: book.name,
            nb_playlists: 0,
            version: 1,
            created_at: book.created_at,
            updated_at: book.updated_at,
            has_pending_writes: false
        })
    }

    async function apply_playlist_create(value: PlaylistAdd) {
        await db.put('playlists', {
            id: value.id,
            book_id: value.book_id,
            name: value.name,
            nb_lines: 0,
            created_at: value.created_at,
            updated_at: value.updated_at,
            version: 1,
            has_pending_writes: false
        })
    }
    async function apply_line_create(value: LineAdd) {
        await db.put('lines', {
            id: value.id,
            playlist_id: value.playlist_id,
            name: value.name,
            pgn: value.pgn,
            created_at: value.created_at,
            updated_at: value.updated_at,
            version: 1,
            has_pending_writes: false
        })
    }

    async function apply_book_delete(id: BookId) {
        await db.delete('books', id)
    }
    async function apply_playlist_delete(id: PlaylistId) {
        await db.delete('playlists', id)
    }
    async function apply_line_delete(id: LineId) {
        await db.delete('lines', id)
        const tx = db.transaction('moves', 'readwrite')
        for await (const cursor of tx.store.index('by_line_id').iterate(id)) {
            await cursor.delete()
        }
        await tx.done
    }

    async function apply_book_edit(edit: BookEdit) {
        let book = await db.get('books', edit.id)
        if (!book) {
            throw new BookNotFoundError(edit.id)
        }
        await db.put('books', {
            id: book.id,
            name: edit.name ?? book.name,
            nb_playlists: edit.nb_playlists ?? book.nb_playlists,
            version: edit.version,
            has_pending_writes: false,
            created_at: book.created_at,
            updated_at: edit.updated_at
        })
    }
    async function apply_playlist_edit(edit: PlaylistEdit) {
        let playlist = await db.get('playlists', edit.id)
        if (!playlist) {
            throw new PlaylistNotFoundError(edit.id)
        }
        await db.put('playlists', {
            id: playlist.id,
            book_id: edit.book_id ?? playlist.book_id,
            name: edit.name ?? playlist.name,
            nb_lines: edit.nb_lines ?? playlist.nb_lines,
            version: edit.version,
            has_pending_writes: false,
            created_at: playlist.created_at,
            updated_at: edit.updated_at
        })
    }
    async function apply_line_edit(edit: LineEdit) {
        let line = await db.get('lines', edit.id)
        if (!line) {
            throw new LineNotFoundError(edit.id)
        }
        await db.put('lines', {
            id: line.id,
            playlist_id: edit.playlist_id ?? line.playlist_id,
            name: edit.name ?? line.name,
            pgn: edit.pgn ?? line.pgn,
            version: edit.version,
            has_pending_writes: false,
            created_at: line.created_at,
            updated_at: edit.updated_at
        })
    }


    async function book_edit_with_book(book_id: BookId, fn: (book: Book) => Promise<Partial<BookEdit> & { updated_at: number }>) {
        let book = await db.get('books', book_id)
        if (!book) {
            throw new BookNotFoundError(book_id)
        }

        let edit = await fn(book)
        await db.put('books', {
            id: book.id,
            name: edit.name ?? book.name,
            nb_playlists: edit.nb_playlists ?? book.nb_playlists,
            version: book.version + 1,
            has_pending_writes: false,
            created_at: book.created_at,
            updated_at: edit.updated_at
        })
    }

    async function playlist_edit_with_playlist(playlist_id: PlaylistId, fn: (playlist: Playlist) => Promise<Partial<PlaylistEdit> & { updated_at: number }>) {
        let playlist = await db.get('playlists', playlist_id)
        if (!playlist) {
            throw new PlaylistNotFoundError(playlist_id)
        }

        let edit = await fn(playlist)
        await db.put('playlists', {
            id: playlist.id,
            book_id: playlist.book_id,
            name: edit.name ?? playlist.name,
            nb_lines: edit.nb_lines ?? playlist.nb_lines,
            version: playlist.version + 1,
            has_pending_writes: false,
            created_at: playlist.created_at,
            updated_at: edit.updated_at
        })
    }

    return [state, actions]
}


function create_tables(db: IDBPDatabase<LinechessDB>) {

    if (!db.objectStoreNames.contains('books')) {

        db.createObjectStore('books', {
            keyPath: 'id',
        })
    }

    if (!db.objectStoreNames.contains('playlists')) {
        const playlists_store = db.createObjectStore('playlists', {
            keyPath: 'id',
        })

        playlists_store.createIndex('by_book_id', 'book_id')
    }

 
    if (!db.objectStoreNames.contains('lines')) {
        const line_store = db.createObjectStore('lines', {
            keyPath: 'id',
        })

        line_store.createIndex('by_playlist_id', 'playlist_id')
    }

    if (!db.objectStoreNames.contains('moves')) {
        let move_store = db.createObjectStore('moves', {
            keyPath: 'id'
        })
        
        move_store.createIndex('by_line_id', 'line_id')
    }

    if (!db.objectStoreNames.contains('pending_mutations')) {
        db.createObjectStore('pending_mutations', {
            keyPath: 'id'
        })
    }

    if (!db.objectStoreNames.contains('sync_state')) {
        db.createObjectStore('sync_state', {
            keyPath: 'id'
        })
    }
}