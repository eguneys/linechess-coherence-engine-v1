const API_ENDPOINT = 'https://lichess.org'
export function create_lichess_agent(token?: string) {
    const $ = (path: string) => {

        let headers = token ?  {
                'Authorization': `Bearer ${token}`
        } : undefined
        return fetch_stream(path, { headers }).then(_ => _.json())
    }


    return {
        async fetch_username(username: string) {
            let profile = await $(`/api/user/${username}`)
            return profile.username
        },
        fetch_games(username: string, since: number) {
            let query = `?since=${since}&perfType=bullet,blitz,rapid,classical`

            const acceptHeader = 'application/x-ndjson'

            return createNDJSONStream<exportGameResponse>(`/api/games/user/${username}${query}`, { headers: { Accept: acceptHeader } });
        }
    }
}


export type openingVariants = 'standard' | 'chess960' | 'crazyhouse' | 'antichess' | 'atomic' | 'horde' | 'kingOfTheHill' | 'racingKings' | 'threeCheck' | 'fromPosition'
export type openingSpeeds = 'ultraBullet' | 'bullet' | 'blitz' | 'rapid' | 'classical' | 'correspondence'
export type statuses = 'created' |'started' |'aborted' |'mate' |'resign' |'stalemate' |'timeout' |'draw' |'outoftime' |'cheat' |'noStart' |'unknownFinish' |'variantEnd'

export type titles = 'GM' | 'WGM' | 'IM' | 'WIM' | 'FM' | 'WFM' | 'NM' | 'CM' | 'WCM' | 'WNM' | 'LM' | 'BOT'

export type gamePlayers = {
  user: { id: string, name: string, title: titles, patron: boolean },
  rating: number,
  ratingDiff: number,
  name: string,
  provisional: boolean,
  aiLevel: number,
  analysis: {
    inaccuracy: number,
    mistake: number,
    blunder: number,
    acpl: number
  },
  team: string
}

export type exportGameResponse = {
  id: string,
  rated: boolean,
  variant: openingVariants,
  speed: openingSpeeds,
  perf: string,
  createdAt: number,
  lastMoveAt: number,
  status: statuses,
  players: {
    white: gamePlayers,
    black: gamePlayers
  },
  initialFen: string,
  winner: 'white' | 'black',
  opening: {
    eco: string,
    name: string,
    ply: number
  },
  moves: string,
  pgn?: string,
  daysPerTurn: number,
  tournament: string,
  swiss: string,
}

export type RunningStream<T> = {
    cancel(): void
    stream: AsyncGenerator<T, void, void>
}

export function createNDJSONStream<T>(
    path: string,
    opts: RequestInit = {}
) {
    const controller = new AbortController()

    return {
        cancel: () => controller.abort(),

        stream: streamNDJSON<T>(path, {
            ...opts,
            signal: controller.signal
        })
    }
}


let Lichess_NextAllowed_Fetch = 0
let nextAllowedFetchAt = () => {
    let res = Lichess_NextAllowed_Fetch

    return res ?? 0
}
const setNextAllowedFetch = () => {
    let nextAllowedFetchAt = Date.now() + 60_000
    Lichess_NextAllowed_Fetch = nextAllowedFetchAt
}

async function fetch_stream(path: string, opts?: RequestInit) {

    // cooldown check
    const now = Date.now()

    if (now < nextAllowedFetchAt()) {
        setNextAllowedFetch()
        throw new Error('Fetch temporarily blocked due to rate limit')
    }

    const response = await fetch(API_ENDPOINT + path, opts)

    // rate limit detected
    if (response.status === 429) {
        throw new Error('Rate limited')
    }

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
    }

    return response
}


export async function* streamNDJSON<T>(
    path: string,
    opts: RequestInit & {
        signal?: AbortSignal
    } = {}
): AsyncGenerator<T, void, void> {

    //const response = await fetch(API_ENDPOINT + path, opts)
    const response = await fetch_stream(path, opts)

    if (!response.body) {
        throw new Error('Response body is null')
    }

    const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader()

    let buffer = ''

    try {
        while (true) {
            const { done, value } = await reader.read()

            if (done) break

            buffer += value

            let newlineIndex: number

            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, newlineIndex).trim()
                buffer = buffer.slice(newlineIndex + 1)

                if (!line) continue

                yield JSON.parse(line) as T
            }
        }

        // Handle trailing line without newline
        const remaining = buffer.trim()

        if (remaining) {
            yield JSON.parse(remaining) as T
        }

    } finally {
        reader.releaseLock()
    }
}