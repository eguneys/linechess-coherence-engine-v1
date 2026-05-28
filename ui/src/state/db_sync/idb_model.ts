import type { Color } from "chessops"
import { parse_mainline_from_pgn } from "./chess_parser"
import { make_database, type DatabaseActions } from "./idb"
import { gen_id, type LichessSearchHandle, type OpeningDiverge, type OpeningLineId, type OpeningList, type OpeningListId, type SingleLineMove } from "./types"
import { Default_O_params, FitnessFromRecentMatches } from "./fitness2"

export type LightOpeningListModel = OpeningList

export type OpeningListModel = {
    id: OpeningListId
    name: string
    lines: LightOpeningLineModel[]
}

export type LightOpeningLineModel = {
    id: string
    name: string
    pgn: string
}

export type SingleLineMoveModel = SingleLineMove

export type OpeningLineModel = {
    id: string
    name: string
    pgn: string
    moves: SingleLineMoveModel[]
}


export type OpeningLineModelWithList = {
    id: string
    name: string
    pgn: string
    moves: SingleLineMoveModel[]
    list: LightOpeningListModel
}

export type Idb_Model_State = {
    get_opening_lists(): Promise<LightOpeningListModel[]>
    get_opening_list_by_id(id: OpeningListId): Promise<OpeningListModel | undefined>
    get_opening_line_by_id(id: OpeningLineId): Promise<OpeningLineModel | undefined>
    get_opening_diverge_for_moves(your_color: Color, sans: string[]): Promise<OpeningDiverge | undefined>
    get_recent_search_handle_by_username_since(username: string, since: number): Promise<LichessSearchHandle | undefined>
}

export type Idb_Model_Actions = {
    db_actions: DatabaseActions
    create_opening_line(id: OpeningListId, name: string, pgn: string): Promise<OpeningLineId>
    set_recent_search_handle(search_handle: LichessSearchHandle): Promise<void>
}

export type Idb_Store = [Idb_Model_State, Idb_Model_Actions]

export async function make_idb_model(): Promise<Idb_Store> {

    let [db_state, db_actions] = await make_database()

    let state: Idb_Model_State = {
        async get_opening_lists() {
            return (await db_state.get_opening_lists())
                .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
        },
        async get_opening_list_by_id(id: OpeningListId) {
            let list = await db_state.get_opening_list_by_id(id)

            if (!list) {
                return undefined
            }
            let lines = await db_state.get_opening_lines_by_list_id(id)
            lines = lines.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())

            let res: OpeningListModel = {
                id: list.id,
                name: list.name,
                lines: lines.map(_ => _)
            }

            return res
        },
        async get_opening_line_by_id(id: OpeningLineId) {
            let line = await db_state.get_opening_line_by_id(id)

            if (!line) {
                return undefined
            }

            let moves = await db_state.get_line_moves_by_line_id(id)

            moves = moves.sort((a, b) => a.ply - b.ply)

            return {
                id: line.id,
                name: line.name,
                pgn: line.pgn,
                moves
            }
        },
        async get_opening_diverge_for_moves(your_color: Color, sans: string[]) {

            let diverge_at_ply = -1
            let most_matched_opening


            let opening_lists = await db_state.get_opening_lists()

            for (let list of opening_lists) {
                let lines = await db_state.get_opening_lines_by_list_id(list.id)

                for (let line of lines) {
                    let line_moves = await db_state.get_line_moves_by_line_id(line.id)

                    line_moves.sort((a, b) => a.ply - b.ply)

                    let diverge_at_ply_i = -1
                    for (let i = 0; i < line_moves.length; i++) {
                        if (line_moves[i].san === sans[i]) {
                            diverge_at_ply_i = i
                            continue
                        }
                        break
                    }

                    if (diverge_at_ply_i > diverge_at_ply) {
                        diverge_at_ply = diverge_at_ply_i
                        most_matched_opening = {
                            id: line.id,
                            name: line.name,
                            pgn: line.pgn,
                            moves: line_moves,
                            list
                        }
                    }

                }

            }


            if (!most_matched_opening) {
                return undefined
            }

            let after_ply = diverge_at_ply
            let after_nb_moves = diverge_at_ply
            let after_move = sans[after_ply]
            let diverge_move = sans[after_ply + 1]
            let diverge_ply = after_ply + 1
            let did_you_diverge = (your_color === 'white') === (diverge_at_ply % 2 === 1)

            let res: OpeningDiverge = {
                most_matched_opening,
                diverge_at_ply,
                after_nb_moves,
                after_ply,
                after_move,
                diverge_move,
                diverge_ply,
                did_you_diverge
            }
            return res
        },
        async get_recent_search_handle_by_username_since(username: string, since: number): Promise<LichessSearchHandle | undefined> {
            let res: LichessSearchHandle = {
                username,
                handle: username.toLowerCase(),
                fitness_score_with_recent_matches: FitnessFromRecentMatches([], Default_O_params),
                is_fetching_recent_games: true,
                last_checked: 0
            }
            since;

            return res
        }
    }

    let actions = {
        db_actions,
        async create_opening_line(list_id: OpeningListId, name: string, pgn: string) {

            let sans = parse_mainline_from_pgn(pgn)

            if (sans.length < 2) {
                throw new InvalidPGNException()
            }
            let line_id = await db_actions.create_opening_line(list_id, name, pgn)

            let moves = sans.map(({uci, san}, index) => {
                return {
                    id: gen_id(),
                    line_id,
                    ply: index + 1,
                    uci,
                    san
                }
            })
            await db_actions.create_line_moves(moves)
            return line_id
        },
        async set_recent_search_handle(search_handle: LichessSearchHandle) {
            console.log(search_handle)
        }
    }
    
    return [state, actions]
}

class InvalidPGNException extends Error {}