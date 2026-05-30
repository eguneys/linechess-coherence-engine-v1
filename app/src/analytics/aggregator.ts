import { exportGameResponse } from "./fetch_lichess.js"
import { gen_id8 } from "../controller.js"
import { Color, DivergedGame, is_allowed_speed, LichessGameId, NormalizedGame } from "./types.js"
import * as db from './db.js'
import { Default_O_params, FitnessFromRecentMatches } from "./fitness2.js"
import { get_move_fens_for_san_moves } from "./chess.js"
import { LRUCache } from "lru-cache"

function make_memory_cache() {
    let memory_cache = new LRUCache({
        max: 500_000
    })


    async function get_processed_lichess_game_by_ids(ids: LichessGameId[]) {
        return ids.filter(id => memory_cache.get(id))
    }

    async function save_processed_games_progress(ids: LichessGameId[]) {
        for (let id of ids)
            memory_cache.set(id, true)
    }
    return {
        get_processed_lichess_game_by_ids,
        save_processed_games_progress
    }
}
const memory_cache = make_memory_cache()

function map_lichess_export_game_to_normalized(username: string, game: exportGameResponse): NormalizedGame | undefined {

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
        san_moves: game.moves,
        you,
        did_you_win,
        did_you_draw,
        winner: game.winner
    }
}


export function make_game_aggregator_cache() {

    let cache_by_username = new LRUCache<Username, AggregatorCacheItem>({
        max: 500,
    })

    async function get_past_by_username(username: string, version: number) {

        let res = cache_by_username.get(username)

        if (!res) {
            res = {
                version,
                cached_since: 0,
                games: [],
                diverged: []
            }
        }

        cache_by_username.set(username, res)


        let games = make_game_aggregator(username, res.cached_since, res.games)

        if (version !== res.version) {
            res.diverged = await games.repopulate_diverges_for_games(res.diverged)
        }

        return {
            games,
            cached_since: res.cached_since,
            diverged: res.diverged.slice(0)
        }
    }

    function update_cached_since(username: string, since: number, diverged: DivergedGame[]) {
        let res = cache_by_username.get(username)

        if (res) {
            res.cached_since = since
            res.diverged.push(...diverged)
        }
    }

    return {
        get_past_by_username,
        update_cached_since,
    }
}

export type Username = string
export type AggregatorCacheItem = {
    version: number
    games: NormalizedGame[]
    diverged: DivergedGame[]
    cached_since: number
}

function make_game_aggregator(username: string, since: number, games: NormalizedGame[]) {

    function add_game(game: exportGameResponse) {
        let res = map_lichess_export_game_to_normalized(username, game)
        if (res) {
            games.push(res)
        }
    }

    async function finish_games() {
        games.splice(0, games.length - 500)


        let existingIds = new Set(await memory_cache.get_processed_lichess_game_by_ids(games.map(_ => _.lichess_game_id)))

        const res: NormalizedGame[] = games.filter(game => !existingIds.has(game.lichess_game_id))

        await memory_cache.save_processed_games_progress(res.map(_ => _.lichess_game_id))

        let diverges = await db.batched_find_diverge_for_moves(res)


        let fitness = FitnessFromRecentMatches(diverges, Default_O_params)
        void db.add_fitness_score_to_rank_lines(fitness)

        return diverges
    }

    async function repopulate_diverges_for_games(res: DivergedGame[]) {
        let diverges = await db.batched_find_diverge_for_moves(res.map(_ => _.game))
        return diverges
    }

    return {
        add_game,
        finish_games,
        repopulate_diverges_for_games
    }
}