export type LoggedInProfile = {
    username: string
}

export type PlaylistId = string

export type Playlist = {
    id: PlaylistId
    book_id: BookId
    name: string
    lines: Line[]
}

export type LightPlaylist = {
    id: PlaylistId
    book_id: BookId
    name: string
}

export type BookId = string

export type Book = {
    id: BookId
    name: string
}


export type LineId = string

export type Line = {
    id: LineId
    playlist_id: PlaylistId
    name: string
    pgn: string
}