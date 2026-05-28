import type { Accessor } from "solid-js"
import { parse_mainline_from_pgn } from "../chess_parser"
import type { BookId, LineId, PlaylistId } from "../types"
import { make_database } from "./idb"
import { make_syncer } from "./sync"
import { gen_id, type BookEdit, type LineEdit, type MoveId, type PlaylistEdit } from "./types"

export type LightBookModel = {
    id: BookId
    name: string
    nb_playlists: number
}

export type BookModel = {
    id: BookId
    version: number
    name: string
    playlists: LightPlaylistModel[]
    selected_playlist?: PlaylistId
}



export type LightPlaylistModel = {
    id: PlaylistId
    book_id: BookId
    name: string
    nb_lines: number
}

export type PlaylistModel = {
    id: PlaylistId
    version: number
    book_id: BookId
    name: string
    lines: LightLineModel[]
    selected_line?: LineId
}

export type LightLineModel = {
    id: LineId
    playlist_id: PlaylistId
    name: string
    pgn: string
}

export type LineModel = {
    id: LineId
    version: number
    playlist_id: PlaylistId
    name: string
    pgn: string
    moves: MoveModel[]
}

export type LineModelWithPlaylist = {
    id: LineId
    version: number
    playlist_id: PlaylistId
    name: string
    pgn: string
    moves: MoveModel[]
    list: LightPlaylistModel
}

export type MoveModel = {
    id: MoveId
    line_id: LineId
    ply: number
    san: string
}

export type Idb_Model_State = {
    get_books(): Promise<LightBookModel[]>
    get_book_by_id(id: BookId): Promise<BookModel | undefined>
    get_playlist_by_id(id: PlaylistId): Promise<PlaylistModel | undefined>
    get_line_by_id(id: LineId): Promise<LineModel | undefined>
}

export type Idb_Model_Actions = {
    sync(): void
    add_book(name: string): Promise<BookId>
    delete_book(id: BookId): Promise<void>
    edit_book(edit: BookEdit): Promise<void>
    add_playlist(id: BookId, name: string): Promise<PlaylistId>
    delete_playlist(id: PlaylistId): Promise<void>
    edit_playlist(edit: PlaylistEdit): Promise<void>
    add_line(id: PlaylistId, name: string, pgn: string): Promise<LineId>
    delete_line(id: LineId): Promise<void>
    edit_line(edit: LineEdit): Promise<void>
}

export type Idb_Store = [Idb_Model_State, Idb_Model_Actions]

export async function make_idb_model(should_sync: Accessor<boolean>): Promise<Idb_Store> {

    let [db_state, db_actions] = await make_database()

    let syncer = await make_syncer(db_state, db_actions, should_sync)

    let state: Idb_Model_State = {
        async get_books() {
            return (await db_state.get_books())
                .sort((a, b) => b.created_at - a.created_at)
        },
        async get_book_by_id(id: BookId) {
            let book = await db_state.get_book_by_id(id)

            if (!book) {
                return undefined
            }
            let playlists = (await db_state.get_playlists_by_book_id(id))
                .sort((a, b) => b.created_at - a.created_at)

            let res: BookModel = {
                id: book.id,
                name: book.name,
                selected_playlist: book.selected_playlist,
                version: book.version,
                playlists: playlists.map(_ => _)
            }

            return res
        },
        async get_playlist_by_id(id: PlaylistId) {
            let list = await db_state.get_playlist_by_id(id)

            if (!list) {
                return undefined
            }
            let lines = (await db_state.get_lines_by_playlist_id(id))
                .sort((a, b) => b.created_at - a.created_at)

            let res: PlaylistModel = {
                id: list.id,
                book_id: list.book_id,
                selected_line: list.selected_line,
                version: list.version,
                name: list.name,
                lines: lines.map(_ => _)
            }

            return res
        },
        async get_line_by_id(id: LineId) {
            let line = await db_state.get_line_by_id(id)

            if (!line) {
                return undefined
            }

            let moves = (await db_state.get_moves_by_line_id(id))
                .sort((a, b) => a.ply - b.ply)

            return {
                id: line.id,
                playlist_id: line.playlist_id,
                version: line.version,
                name: line.name,
                pgn: line.pgn,
                moves
            }
        },
    }

    let actions = {
        sync() {
            syncer.kick()
        },
        async add_book(name: string) {
            let res = await db_actions.create_book(name)

            syncer.kick()
            return res
        },
        async delete_book(id: BookId) {
            await db_actions.delete_book(id)
            syncer.kick()
        },
        async edit_book(edit: BookEdit) {
            await db_actions.edit_book(edit)
            syncer.kick()
        },
        async add_playlist(book_id: BookId, name: string) {
            let res = await db_actions.create_playlist(book_id, name)

            syncer.kick()
            return res
        },
        async delete_playlist(id: PlaylistId) {
            await db_actions.delete_playlist(id)
            syncer.kick()
        },
        async edit_playlist(edit: PlaylistEdit) {
            await db_actions.edit_playlist(edit)
            syncer.kick()
        },
        async add_line(playlist_id: PlaylistId, name: string, pgn: string) {

            let sans = parse_mainline_from_pgn(pgn)

            if (sans.length < 2) {
                throw new InvalidPGNException()
            }
            let line_id = await db_actions.create_line(playlist_id, name, pgn)

            let moves = sans.map(({uci, san}, index) => {
                return {
                    id: gen_id(),
                    line_id,
                    ply: index + 1,
                    uci,
                    san
                }
            })
            await db_actions.create_moves(moves)

            syncer.kick()

            return line_id
        },
        async delete_line(id: LineId) {
            await db_actions.delete_line(id)
            await db_actions.delete_moves(id)

            syncer.kick()
        },
        async edit_line(edit: LineEdit) {
            await db_actions.edit_line(edit)

            if (edit.pgn) {
                await db_actions.delete_moves(edit.id)

                let sans = parse_mainline_from_pgn(edit.pgn)

                if (sans.length < 2) {
                    throw new InvalidPGNException()
                }

                let moves = sans.map(({ uci, san }, index) => {
                    return {
                        id: gen_id(),
                        line_id: edit.id,
                        ply: index + 1,
                        uci,
                        san
                    }
                })
                await db_actions.create_moves(moves)
            }

            syncer.kick()
        },
    }
    
    return [state, actions]
}

export class InvalidPGNException extends Error {}