import { log } from "../logging.js";
import { make_game_aggregator, NormalizedGame } from "./aggregator.js";
import { create_lichess_agent } from "./fetch_lichess.js";
import { QPJ_Manager } from "./job.js";
import { YesterdayMs } from "./time.js";

let lichess_api = create_lichess_agent()

let qpj_manager = new QPJ_Manager<NormalizedGame[]>(async (username: string, since: number) => {

    let since_until_yesterday = Math.max(since, YesterdayMs())

    let { cancel, stream } = lichess_api.fetch_games(username, since_until_yesterday)

    let games = make_game_aggregator(username, since)

    try {
        for await (const game of stream) {
            games.add_game(game)
        }
    } catch (error) {
        log('error', `Stream disrupted or cancelled: ${error}`)
    } finally {
        return await games.finish_games()
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
        username = (await lichess_api.fetch_username(username_query))?.username
    } catch (e) {
        throw new ErrorFetchingUsername(username_query)
    }
    
    return await qpj_manager.search_username(username)
}