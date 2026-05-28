export type PendingMutationId = string

export interface Mutation<Type extends string, Payload> {
    id: PendingMutationId
    type: Type,
    payload: Payload
}

export type MutationBookCreate = Mutation<'book.create', BookAdd>
export type MutationPlaylistCreate = Mutation<'playlist.create', PlaylistAdd>
export type MutationLineCreate = Mutation<'line.create', LineAdd>

export type MutationBookEdit = Mutation<'book.edit', BookEdit>
export type MutationPlaylistEdit = Mutation<'playlist.edit', PlaylistEdit>
export type MutationLineEdit = Mutation<'line.edit', LineEdit>

export type MutationBookDelete = Mutation<'book.delete', BookId>
export type MutationPlaylistDelete = Mutation<'playlist.delete', PlaylistId>
export type MutationLineDelete = Mutation<'line.delete', LineId>

export type AppMutation = 
    MutationBookCreate | MutationPlaylistCreate | MutationLineCreate |
    MutationBookEdit | MutationPlaylistEdit | MutationLineEdit |
    MutationBookDelete | MutationPlaylistDelete | MutationLineDelete

export type SyncState = {
    pending_writes: boolean
    needs_pull: boolean
    last_sync_error?: string
    sync_in_progress: boolean
    last_pulled_at: Timestamp
}


export type BookAdd = {
    id: BookId
    name: string
    created_at: Timestamp
    updated_at: Timestamp
}


export type BookEdit = {
    id: BookId
    version: number
    name?: string
    selected_playlist?: PlaylistId
    updated_at: number
}

export type PlaylistAdd = {
    id: PlaylistId
    book_id: BookId
    name: string
    created_at: Timestamp
    updated_at: Timestamp
}


export type PlaylistEdit = {
    id: PlaylistId
    version: number
    book_id?: BookId
    name?: string
    selected_line?: LineId
    updated_at: number
}

export type LineAdd = {
    id: LineId
    playlist_id: PlaylistId
    name: string
    pgn: string
    created_at: Timestamp
    updated_at: Timestamp
}

export type LineEdit = {
    id: LineId
    version: number
    playlist_id?: PlaylistId
    name?: string
    pgn?: string
    updated_at: number
}

export type Timestamp = number

export type BookId = string

export type Book = {
    id: BookId
    name: string
    selected_playlist?: PlaylistId
    created_at: Timestamp
    updated_at: Timestamp
    deleted_at?: Timestamp
    version: number
    has_pending_writes: boolean
}


export type PlaylistId = string

export type Playlist = {
    id: PlaylistId
    book_id: BookId
    name: string
    selected_line?: LineId
    created_at: Timestamp
    updated_at: Timestamp
    deleted_at?: Timestamp
    version: number
    has_pending_writes: boolean
}


export type LineId = string
export type Line = {
    id: LineId
    playlist_id: PlaylistId
    name: string
    pgn: string
    created_at: Timestamp
    updated_at: Timestamp
    deleted_at?: Timestamp
    version: number
    has_pending_writes: boolean
}

export type MoveId = string
export type Move = {
    id: MoveId
    line_id: LineId
    ply: number
    san: SAN
}

export function gen_id() {
    return Math.random().toString(16).slice(2, 10)
}

export type AllowedSpeed = 'bullet' | 'blitz' | 'rapid' | 'classical'
export let Allowed_speeds: AllowedSpeed[] = ['bullet', 'blitz', 'rapid', 'classical']

export function is_allowed_speed(_: string): _ is AllowedSpeed {
    return Allowed_speeds.includes(_ as AllowedSpeed)
}

export type Color = 'white' | 'black'
export type UCI = string
export type SAN = string