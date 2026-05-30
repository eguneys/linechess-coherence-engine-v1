import { User, UserId } from "../types.js";
import { Book, BookEdit, BookId, Line, LineEdit, LineId, Playlist, PlaylistEdit, PlaylistId } from "./types.js";
import { db } from '../db_init.js'
import { get_existing_user_by_userId } from "../db_layer.js";
import { parse_mainline_from_pgn } from "../chess/chess_parser.js";
import { gen_id8 } from "../controller.js";
import { get_move_fens_for_san_moves } from "../analytics/chess.js";


export async function put_books(book: Book, author: User) {

    return await db.prepare(`
       INSERT INTO books (id, created_at, updated_at, name, version, nb_playlists, author)
       VALUES (:id, :created_at, :updated_at, :name, :version, :nb_playlists, :author)
       RETURNING *`,
    ).get({...book, author: author.username})!

}

export class UnauthorizedResourceAccess extends Error {
    constructor(id: string) {
        super(`Unauthorized resource access ${id}`)
    }
}

export async function put_playlists(playlist: Playlist, author: User) {

    const row = await db.prepare<[string, string], Book>(`
            SELECT id FROM books
            WHERE id = ? AND author = ?
        `).get(playlist.book_id, author.username)

    if (!row) {
        throw new UnauthorizedResourceAccess(playlist.book_id)
    }

    return await db.prepare<[string, string, number, number, string, number, number], Playlist>(`
       INSERT INTO playlists (id, book_id, created_at, updated_at, name, version, nb_lines)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       RETURNING *`,
    ).get(playlist.id, playlist.book_id, playlist.created_at, playlist.updated_at, playlist.name, playlist.version, playlist.nb_lines)!

}

export async function put_lines(line: Line, author: User) {

    const row = await db.prepare<[string, string], Book>(`
            SELECT books.id FROM books
            JOIN playlists p ON p.book_id = books.id
            WHERE p.id = ? AND books.author = ?
        `).get(line.playlist_id, author.username)

    if (!row) {
        throw new UnauthorizedResourceAccess(line.playlist_id)
    }

    let res = await db.prepare(`
       INSERT INTO lines (id, playlist_id, created_at, updated_at, name, pgn, version)
       VALUES (:id, :playlist_id, :created_at, :updated_at, :name, :pgn, :version)
       RETURNING *`,
    ).get(line)!


    await put_pgn_moves_for_line(line.id, line.pgn)

    await bump_lines_db_version()

    return res
}

export async function delete_books(id: BookId, author: User) {

    const row = await db.prepare<[string, string], Book>(`
            SELECT id FROM books
            WHERE id = ? AND author = ?
        `).get(id, author.username)

    if (!row) {
        throw new UnauthorizedResourceAccess(id)
    }

    await db.prepare(`
        DELETE FROM books where id = ?
    `).run(id)

    await bump_lines_db_version()
}

export async function delete_playlists(id: PlaylistId, author: User) {

    const row = await db.prepare<[string, string], Book>(`
            SELECT books.id FROM books
            JOIN playlists p ON p.book_id = books.id
            WHERE p.id = ? AND books.author = ?
        `).get(id, author.username)

    if (!row) {
        throw new UnauthorizedResourceAccess(id)
    }


    await db.prepare(`
        DELETE FROM playlists where id = ?
    `).run(id)

    await bump_lines_db_version()
}

export async function delete_lines(id: LineId, author: User) {

    const row = await db.prepare<[string, string], Book>(`
            SELECT id FROM books
            JOIN playlists p ON p.book_id = books.id
            JOIN lines l ON l.playlist_id = p.id
            WHERE p.id = ? AND books.author = ?
        `).get(id, author.username)

    if (!row) {
        throw new UnauthorizedResourceAccess(id)
    }


    await db.prepare(`
        DELETE FROM lines where id = ?
    `).run(id)


    await delete_moves_for_line(id)

    await bump_lines_db_version()
}

export async function update_books(edit: BookEdit, author: User) {

    let fields = []

    if (edit.name) {
        fields.push('name')
    }
    if (edit.nb_playlists) {
        fields.push('nb_playlists')
    }

    fields.push('updated_at')
    fields.push('version')

    let Set_Fields = fields.map(_ => `${_} = :${_}`).join(', ')

    const row = await db.prepare(`
           UPDATE books
           SET ${Set_Fields}
           WHERE id = :id AND author = :author
           RETURNING id
        `).get({...edit, author: author.username})

    if (!row) {
        throw new UnauthorizedResourceAccess(edit.id)
    }
}

export async function update_playlists(edit: PlaylistEdit, author: User) {

    let fields = []

    if (edit.name) {
        fields.push('name')
    }
    if (edit.nb_lines) {
        fields.push('nb_lines')
    }

    fields.push('updated_at')
    fields.push('version')

    let Sets = fields.map(_ => `${_} = :${_}`).join(', ')

    const row = await db.prepare(`
           UPDATE playlists
           SET ${Sets}
           FROM books 
           WHERE playlists.book_id = books.id
             AND playlists.id = :id 
             AND books.author = :author
           RETURNING playlists.id
        `).get({...edit, author: author.username})

    if (!row) {
        throw new UnauthorizedResourceAccess(edit.id)
    }
}

export async function update_lines(edit: LineEdit, author: User) {

    let fields = []

    if (edit.name) {
        fields.push('name')
    }

    if (edit.pgn) {
        fields.push('pgn')
    }

    fields.push('updated_at')
    fields.push('version')

    let Sets = fields.map(_ => `${_} = :${_}`).join(', ')

    const row = await db.prepare(`
        UPDATE lines
        SET ${Sets}
        FROM playlists p
        JOIN books b ON p.book_id = b.id
        WHERE lines.playlist_id = p.id
          AND lines.id = :id 
          AND b.author = :author
        RETURNING lines.id
        `).get({...edit, author: author.username})

    if (!row) {
        throw new UnauthorizedResourceAccess(edit.id)
    }

    if (edit.pgn) {
        await delete_moves_for_line(edit.id)
        await put_pgn_moves_for_line(edit.id, edit.pgn)

        await bump_lines_db_version()
    }
}


async function delete_moves_for_line(id: LineId) {

    await db.prepare(`
        DELETE FROM fen_steps where line_id = ?
`).run(id)

}

async function put_pgn_moves_for_line(line_id: LineId, pgn: string) {

    let moves = parse_mainline_from_pgn(pgn)

    let move_fens = get_move_fens_for_san_moves(moves.map(_ => _.san))

    let insertStmnt = db.prepare(`
    INSERT INTO fen_steps (id, line_id, ply, fen, san)
    VALUES (?, ?, ?, ?, ?)
`)

    let tx = db.transaction(() => {
        let ply = 1
        for (let i = 0; i < moves.length; i++) {
            insertStmnt.run(gen_id8(), line_id, ply, move_fens[i], moves[i].san)
            ply += 1
        }
    })
    tx()
}



export type LinesDBVersion = {
    version: number
}

export async function get_lines_db_version() {

    const row = await db.prepare<[], LinesDBVersion>(`
            SELECT version FROM lines_db_version
        `).get()

    return row!.version


}

export async function bump_lines_db_version() {
    await db.prepare(`
            UPDATE lines_db_version SET version = version + 1
        `).run()
}