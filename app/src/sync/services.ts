import { User, UserId } from "../types.js";
import { AppMutation, BookAdd, BookEdit, BookId, LineAdd, LineEdit, LineId, PlaylistAdd, PlaylistEdit, PlaylistId } from "./types.js";
import * as db from './db_layer.js'
import { get_existing_user_by_userId } from "../db_layer.js";

export async function apply_mutations_for_user_id(user_id: UserId, mutations: AppMutation[]) {

    const author = await get_existing_user_by_userId(user_id)

    if (author === undefined) {
        throw new ResourceNotFoundError(user_id)
    }

    for (let mutation of mutations) {
        switch (mutation.type) {
            case 'book.create':
                await apply_book_create(mutation.payload, author)
                break
            case 'playlist.create':
                await apply_playlist_create(mutation.payload, author)
                break
            case 'line.create':
                await apply_line_create(mutation.payload, author)
                break
            case 'book.delete':
                await apply_book_delete(mutation.payload, author)
                break
            case 'playlist.delete':
                await apply_playlist_delete(mutation.payload, author)
                break
            case 'line.delete':
                await apply_line_delete(mutation.payload, author)
                break
            case 'book.edit':
                await apply_book_edit(mutation.payload, author)
                break
            case 'playlist.edit':
                await apply_playlist_edit(mutation.payload, author)
                break
            case 'line.edit':
                await apply_line_edit(mutation.payload, author)
                break
        }
    }

}



async function apply_book_create(book: BookAdd, author: User) {
    await db.put_books({
        id: book.id,
        name: book.name,
        nb_playlists: 0,
        version: 1,
        created_at: book.created_at,
        updated_at: book.updated_at,
        has_pending_writes: false
    }, author)
}

async function apply_playlist_create(value: PlaylistAdd, author: User) {
    await db.put_playlists({
        id: value.id,
        book_id: value.book_id,
        name: value.name,
        nb_lines: 0,
        created_at: value.created_at,
        updated_at: value.updated_at,
        version: 1,
        has_pending_writes: false
    }, author)
}
async function apply_line_create(value: LineAdd, author: User) {
    await db.put_lines({
        id: value.id,
        playlist_id: value.playlist_id,
        name: value.name,
        pgn: value.pgn,
        created_at: value.created_at,
        updated_at: value.updated_at,
        version: 1,
        has_pending_writes: false
    }, author)
}

async function apply_book_delete(id: BookId, author: User) {
    await db.delete_books(id, author)
}
async function apply_playlist_delete(id: PlaylistId, author: User) {
    await db.delete_playlists(id, author)
}
async function apply_line_delete(id: LineId, author: User) {
    await db.delete_lines(id, author)
}

async function apply_book_edit(edit: BookEdit, author: User) {
    await db.update_books(edit, author)
}
async function apply_playlist_edit(edit: PlaylistEdit, author: User) {
    await db.update_playlists(edit, author)
}
async function apply_line_edit(edit: LineEdit, author: User) {
    await db.update_lines(edit, author)
}

class ResourceNotFoundError extends Error {
    constructor(id: string) {
        super(`Resource not found ${id}`)
    }
}