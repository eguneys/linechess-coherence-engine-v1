import { log } from "../logging.js";
import { make_game_aggregator_cache } from "./aggregator.js";
import { create_lichess_agent } from "./fetch_lichess.js";
import { QPJ_Manager } from "./job.js";
import { YesterdayMs } from "./time.js";
import { DivergedGame } from "./types.js";
import { get_lines_db_version } from '../sync/db_layer.js'


export class FetchGamesSinceError extends Error {}

let lichess_api = create_lichess_agent()
let aggregator_cache = make_game_aggregator_cache()

const FETCH_THRESHOLD = 1000 * 30

const format = (date: Date) => `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
const formatN = (n: number) => format(new Date(n))
let qpj_manager = new QPJ_Manager<DivergedGame>(async (username: string) => {

    let lines_db_version = await get_lines_db_version()

    let { games, cached_since, diverged } = await aggregator_cache.get_past_by_username(username, lines_db_version)

    let now = Date.now()
    let missingDuration = Math.max(0, now - cached_since)

    try {
        if (missingDuration > FETCH_THRESHOLD) {
            let since_until_yesterday = now - 86400000 // one day
            let { cancel, stream } = lichess_api.fetch_games(username, since_until_yesterday)
            for await (const game of stream) {
                games.add_game(game)
            }
            let res = await games.finish_games()

            aggregator_cache.update_cached_since(username, now, res)

            return [...res, ...diverged]
        }

        return diverged
    } catch (error) {
        log('error', `Stream disrupted or cancelled: ${error}`)
        throw new FetchGamesSinceError(`${error}`)
    }
})

export class ErrorFetchingUsername extends Error {
    constructor(username: string) {
        super(`Error fetching username ${username}`)
    }
}

export async function serve_username_query(username_query: string) {

    let username
    try {
        username = await lichess_api.fetch_username(username_query)
    } catch (e) {
        throw new ErrorFetchingUsername(username_query)
    }
    
    let games = await qpj_manager.search_username(username)

    return {
        username,
        games
    }
}