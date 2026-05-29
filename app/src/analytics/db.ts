import { FitnessScore2 } from "./fitness2.js";
import { Diverge, LichessGameId, SAN } from "./types.js";

export async function find_diverge_for_moves(are_you_white: boolean, moves: SAN[]): Promise<Diverge | undefined> {
    return undefined
}

export async function get_processed_lichess_game_by_ids(ids: LichessGameId[]) {

    return ids
}

export async function save_processed_games_progress(ids: LichessGameId[]) {

}

export async function add_fitness_score_to_rank_lines(fitness: FitnessScore2) {

}