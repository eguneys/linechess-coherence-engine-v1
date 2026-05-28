export type PendingMutationId = string

export type PendingMutation<Type extends string, Payload> = {
    id: PendingMutationId
    mutation: Mutation<Type, Payload>
}

export interface Mutation<Type extends string, Payload> {
    type: Type,
    payload: Payload
}

export type MutationBookCreate = Mutation<'book.create', Book>
export type MutationPlaylistCreate = Mutation<'playlist.create', Playlist>
export type MutationLineCreate = Mutation<'line.create', Line>

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


export type BookEdit = {
    id: BookId
    name?: string
}

export type PlaylistEdit = {
    id: PlaylistId
    book_id?: BookId
    name?: string
}

export type LineEdit = {
    id: LineId
    playlist_id?: PlaylistId
    name?: string
    pgn?: string
}

export type Timestamp = number

export type BookId = string

export type Book = {
    id: BookId
    name: string
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
    uci: UCI
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