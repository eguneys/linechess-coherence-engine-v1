import type { AccessorWithLatest } from "@solidjs/router"
import type { Idb_Store } from "./idb_model"
import { is_allowed_speed, type LichessSearchHandle, type OpeningInfo, type RecentMatch } from "./types"
import { create_lichess_agent, type exportGameResponse } from "./lichess_agent"
import { createStore, produce, unwrap } from "solid-js/store"
import type { Color } from "chessops"
import { Default_O_params, FitnessFromRecentMatches, type Overall_Params } from "./fitness2"
import type { Accessor } from "solid-js"

export type LichessApiState = {
}

export type LichessApiActions = {
    set_search_handle(handle: string): Promise<LichessSearchHandle | undefined>
    check_games_now(): void
    reconfigure_params(): Promise<void>
}

export type LichessApiStore = [LichessApiState, LichessApiActions]

export function make_lichess_api_with_cache(get_db: AccessorWithLatest<Idb_Store | undefined>, get_o_params: Accessor<Overall_Params>): LichessApiStore {

    const [, $set_lichess_cache] = make_lichess_cache_agent(get_db, get_o_params)

    let check_games = () => $set_lichess_cache.read_stream_games_to_fill_handle()

    let interval_id = 0
    async function step() {
        await check_games()
        clearInterval(interval_id)
        interval_id = setTimeout(step, 60 * 1000)
    }

    let actions = {
        async set_search_handle(username: string) {
            let res = await $set_lichess_cache.begin_fill_handle_by_username(username)

            step()

            return res
        },
        check_games_now() {
            step()
        },
        async reconfigure_params() {
            await $set_lichess_cache.reconfigure_params()
        }
    }

    return [{}, actions]
}

export type LichessCacheAgentState = {}

export type LichessCacheAgentActions = {
    begin_fill_handle_by_username(username: string): Promise<LichessSearchHandle | undefined>
    read_stream_games_to_fill_handle(): Promise<void>
    reconfigure_params(): Promise<void>
}

export type LichessCacheAgentStore = [LichessCacheAgentState, LichessCacheAgentActions]

function make_lichess_cache_agent(get_db: AccessorWithLatest<Idb_Store | undefined>, get_o_params: Accessor<Overall_Params>): LichessCacheAgentStore {

    let $agent = create_lichess_agent()

    const [pc_state, pc_actions] = make_lichess_search_handle_computer()

    async function reconfigure_params(db: Idb_Store) {
        let o_params = get_o_params()

        await pc_actions.add_recent_games(db, [], o_params)
    }

    let batched_games: RecentMatch[]
    let cancel_running_stream: () => void = () => {}

    async function read_from_stream_fetching_recent_games(db: Idb_Store, username: string, since: number) {

        let o_params = get_o_params()

        cancel_running_stream()
        batched_games = []

        let { cancel, stream } = $agent.fetch_games(username, since)
        cancel_running_stream = cancel
        let lastFlush = performance.now()

        try {
            for await (const game of stream) {
                let b_game = await map_export_game_to_recent_match(db, username, game)
                if (b_game !== undefined) {
                    batched_games.push(b_game)
                }

                const now = performance.now()

                if (
                    batched_games.length > 0 &&
                    now - lastFlush >= 3_00
                ) {
                    await pc_actions.add_recent_games(db, batched_games, o_params)
                    batched_games = []
                    lastFlush = now
                }
            }

            // flush remaining
            if (batched_games.length > 0) {
                await pc_actions.add_recent_games(db, batched_games, o_params)
                batched_games = []
            }
        } catch (error) {
            console.error(`Stream disrupted or cancelled: `, error)
        } finally {
            pc_actions.finish_games(db)
        }

        return pc_state.lichess_search_handle
    }

    let actions = {
        async reconfigure_params() {
            let db = get_db()

            if (!db) {
                return undefined
            }

            await reconfigure_params(db)

        },
        async begin_fill_handle_by_username(username: string) {
            let db = get_db()

            if (!db) {
                return undefined
            }

            username = await $agent.fetch_username(username)

            let since = YesterdayMs()

            let handle = await db[0].get_recent_search_handle_by_username_since(username, since)

            await pc_actions.set_search_handle(handle)

            return pc_state.lichess_search_handle
        },
        async read_stream_games_to_fill_handle() {
            let db = get_db()

            if (!db) {
                return undefined
            }

            let username = pc_state.lichess_search_handle?.username

            if (!username) {
                return
            }

            let most_recent_game = undefined
            let fitness_score = pc_state.lichess_search_handle?.fitness_score_with_recent_matches

            if (fitness_score) {
                let { Nb, Nz, Nr, Nc } = fitness_score
                for (let game of [...Nb, ...Nz, ...Nr, ...Nc]) {
                    if (!most_recent_game) {
                        most_recent_game = game
                    } else if (most_recent_game.match.game_last_move_at < game.match.game_last_move_at) {
                        most_recent_game = game
                    }
                }
            }

            let since = most_recent_game?.match.game_last_move_at ?? YesterdayMs()

            await read_from_stream_fetching_recent_games(db, username, since + 1)
        }
    }

    return [{}, actions]
}


export async function add_recent_games(_db: Idb_Store, handle: LichessSearchHandle, games_to_add: RecentMatch[], o_params: Overall_Params): Promise<LichessSearchHandle> {

    games_to_add = games_to_add.filter(b => !handle.fitness_score_with_recent_matches.NAll.some(a => a.match.lichess_game_id === b.lichess_game_id))

    let username = handle.username
    let recent_matches = handle.fitness_score_with_recent_matches.NAll.map(_ => _.match)

    let new_recent_matches = [...recent_matches, ...games_to_add]

    new_recent_matches.sort((a, b) => b.game_created_at - a.game_created_at)

    let new_fitness_score_with_recent_matches = FitnessFromRecentMatches(new_recent_matches, o_params)

    let res: LichessSearchHandle = {
        handle: username.toLowerCase(),
        username,
        fitness_score_with_recent_matches: new_fitness_score_with_recent_matches,
        is_fetching_recent_games: true,
        last_checked: Date.now()
    }

    return res
}


async function map_export_game_to_recent_match(db: Idb_Store, username: string, game: exportGameResponse): Promise<RecentMatch | undefined> {

    let is_rated = game.rated
    let game_created_at = game.createdAt
    let game_last_move_at = game.lastMoveAt
    let lichess_game_id = game.id
    let initial_fen = game.initialFen
    let moves = game.moves
    let perf = game.perf
    let black = game.players.black.user.name
    let white = game.players.white.user.name
    let winner = game.winner
    let speed = game.speed
    let variant = game.variant
    let status = game.status

    if (variant !== 'standard') {
        return undefined
    }

    if (!is_allowed_speed(speed)) {
        return undefined
    }

    if (moves.split(' ').length < 3) {
        return undefined
    }

    if (initial_fen !== undefined) {
        return undefined
    }

    let you: Color = white === username ? 'white' : 'black'
    let did_you_win = winner === you
    let did_you_draw = status === 'draw'

    let diverge = await db[0].get_opening_diverge_for_moves(you, moves.split(' '))

    let opening: OpeningInfo = {
        moves: moves.split(' '),
        diverge
    }

    let res: RecentMatch = {
        opening,
        perf,
        game_created_at,
        game_last_move_at,
        is_rated,
        lichess_game_id,
        white,
        black,
        winner,
        speed,
        you,
        did_you_win,
        did_you_draw
    }

    return res
}

// (60 * 60 * 24 = 86400 seconds in a day) * 1000 Ms
export const YesterdayMs = () => (Math.floor(Date.now() / 1000) - (60 * 60 * 24)) * 1000



export type LichessSearchHandleState = {
    lichess_search_handle: LichessSearchHandle | undefined
}
export type LichessSearchHandleActions = {
    set_search_handle(search_handle?: LichessSearchHandle): void
    add_recent_games(db: Idb_Store, games: RecentMatch[], o_params: Overall_Params): Promise<void>
    finish_games(db: Idb_Store, ): void
}

export type LichessSearchHandleComputer = [LichessSearchHandleState, LichessSearchHandleActions]

export function make_lichess_search_handle_computer(): LichessSearchHandleComputer {

    let [store, set_store] = createStore<LichessSearchHandle>({
        username: '',
        handle: '',
        fitness_score_with_recent_matches: FitnessFromRecentMatches([], Default_O_params),
        is_fetching_recent_games: false,
        last_checked: Date.now()
    })

    let state = {
        get lichess_search_handle() {
            return store.username === '' ? undefined : store
        }
    }
    let actions = {
        finish_games(db: Idb_Store) {
            set_store('is_fetching_recent_games', false)
            db[1].set_recent_search_handle(unwrap(store))
        },
        async add_recent_games(db: Idb_Store, games: RecentMatch[], o_params: Overall_Params) {
            let new_store = await add_recent_games(db, unwrap(store), games, o_params)

            set_store(produce(store => {
                store.fitness_score_with_recent_matches = new_store.fitness_score_with_recent_matches
                store.last_checked = Date.now()
            }))

        },
        set_search_handle(new_store?: LichessSearchHandle) {

            if (!new_store) {
                set_store('username', '')
                return
            }

            set_store(produce(store => {
                store.username = new_store.username
                store.handle = new_store.handle
                store.fitness_score_with_recent_matches = new_store.fitness_score_with_recent_matches
                store.is_fetching_recent_games = new_store.is_fetching_recent_games
                store.last_checked = Date.now()
            }))
        }
    }
    return [state, actions]
}

