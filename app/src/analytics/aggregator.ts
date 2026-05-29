import { exportGameResponse } from "./fetch_lichess.js"
import { gen_id8 } from "../controller.js"
import { Color, DivergedGame, is_allowed_speed, LichessGameId, NormalizedGame } from "./types.js"
import * as db from './db.js'
import { Default_O_params, FitnessFromRecentMatches } from "./fitness2.js"

function map_lichess_export_game_to_normalized(username: string, game: exportGameResponse) {

    if (game.variant !== 'standard') {
        return undefined
    }

    if (!is_allowed_speed(game.speed)) {
        return undefined
    }

    if (game.moves.split(' ').length < 3) {
        return undefined
    }

    if (game.initialFen !== undefined) {
        return undefined
    }

    let white = game.players.white.user.name
    let black = game.players.black.user.name
    let you: Color = white.toLowerCase() === username.toLowerCase() ? 'white' : 'black'
    let did_you_win = game.winner === you
    let did_you_draw = game.status === 'draw'

    return {
        id: gen_id8(),
        lichess_game_id: game.id,
        created_at: game.createdAt,
        last_move_at: game.lastMoveAt,
        is_rated: game.rated,
        white,
        black,
        speed: game.speed,
        played_moves: game.moves.split(' '),
        you,
        did_you_win,
        did_you_draw
    }
}

export function make_game_aggregator(username: string, since: number) {

    let games: NormalizedGame[] = []


    function add_game(game: exportGameResponse) {
        let res = map_lichess_export_game_to_normalized(username, game)
        if (res) {
            games.push(res)
        }
    }

    async function finish_games() {
        games = games.slice(0, 500)

        let res: NormalizedGame[] = []

        let existingIds = await db.get_processed_lichess_game_by_ids(games.map(_ => _.id))

        for (let game of games) {
            let is_duplicate = existingIds.find(_ => _ === game.id)
            if (!is_duplicate) {
                res.push(game)
            }
        }

        await db.save_processed_games_progress(res.map(_ => _.lichess_game_id))

        let diverges = await Promise.all(res.map(async game => ({
            game,
            diverge: (
                await db.find_diverge_for_moves(
                    game.white.toLowerCase() === game.you.toLowerCase(), game.played_moves)
            )
        })))

        let fitness = FitnessFromRecentMatches(diverges, Default_O_params)
        await db.add_fitness_score_to_rank_lines(fitness)

        return diverges
    }

    return {
        add_game,
        finish_games
    }
}