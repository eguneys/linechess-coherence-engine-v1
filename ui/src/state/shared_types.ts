// synced to app/src/analytics/types.ts

import type { openingSpeeds } from "./lichess_agent"

export type FenStepId = string
export type FenStep = {
    id: FenStepId
    line_id: LineId
    ply: number
    fen: string
    san: SAN
}

export type LineId = string
export type Line = {
    id: LineId
    playlist_id: PlaylistId
    name: string
    san_moves: string
}

export type PlaylistId = string
export type Playlist = {
    id: PlaylistId
    book_id: BookId
    name: string
}

export type BookId = string
export type Book = {
    id: BookId
    name: string
    author: string
}

export type FenStepLineInABook = {
    playlist: Playlist
    book: Book
    line: Line
    fen_step: FenStep
}

export type Diverge = {
    most_matched_line: FenStepLineInABook
    diverge_at_ply: number
    did_you_diverge: boolean
}

export type DivergedGame = {
    game: NormalizedGame
    diverge?: Diverge
}

export type ProcessedGameProgress = {
    lichess_game_id: LichessGameId
}

export type LichessGameId = string
export type NormalizedGameId = string
export type NormalizedGame = {
    id: NormalizedGameId
    lichess_game_id: LichessGameId
    speed: AllowedSpeed
    san_moves: string
    move_fens: string[]
    created_at: number
    last_move_at: number
    is_rated: boolean
    white: string
    black: string
    you: string
    did_you_win: boolean
    did_you_draw: boolean
    winner?: Color
}

export type Color = 'white' | 'black'
export type SAN = string

export type AllowedSpeed = 'bullet' | 'blitz' | 'rapid' | 'classical'
export const AllowedSpeeds = ['bullet', 'blitz', 'rapid', 'classical'] 

export function is_allowed_speed(_: openingSpeeds): _ is AllowedSpeed {
    return AllowedSpeeds.includes(_)
}