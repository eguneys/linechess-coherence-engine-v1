import { FitnessScore2 } from "./fitness2.js";
import { Diverge, DivergedGame, FenStepLineInABook, LichessGameId, Line, NormalizedGame, SAN } from "./types.js";
import { db } from '../db_init.js'
import { gen_id8 } from "../controller.js";
import { get_move_fens_for_san_moves } from "./chess.js";
import { parse_mainline_from_pgn } from "../chess/chess_parser.js";

function find_diverge_for_game(game: NormalizedGame, line: FenStepLineInABook): Diverge {

    let diverge_at_ply = line.fen_step.ply

    let did_you_diverge = (game.white === game.you) === (line.fen_step.ply % 2 === 1)

    return {
        diverge_at_ply,
        did_you_diverge,
        most_matched_line: line
    }
}

export async function batched_find_diverge_for_moves(na: NormalizedGame[]): Promise<DivergedGame[]> {

    let na_move_fens = na.map(_ => get_move_fens_for_san_moves(_.san_moves.split(' ')))

    const searchTerms = na.flatMap((_, i) => na_move_fens[i])//['apple', 'banana', 'cherry'];

    const placeholders = searchTerms.map(term => `?`).join(',');

    const query = db.prepare(`
  SELECT
     json_object('id', s.id, 'ply', s.ply, 'san', s.san, 'fen', s.fen) AS fen_step,
     json_object('id', l.id, 'name', l.name, 'pgn', l.pgn) AS line,
     json_object('id', p.id, 'name', p.name) AS playlist,
     json_object('id', b.id, 'name', b.name, 'author', b.author) AS book
  FROM fen_steps s
  JOIN lines l ON s.line_id = l.id
  JOIN playlists p ON l.playlist_id = p.id
  JOIN books b ON p.book_id = b.id
  WHERE s.fen IN (${placeholders})
`);

    const results: FenStepLineInABook[] = query.all(searchTerms).map((_: any) => {
        let fen_step = JSON.parse(_.fen_step)
        let line = JSON.parse(_.line)
        let playlist = JSON.parse(_.playlist)
        let book = JSON.parse(_.book)
        return {
            fen_step: {
                id: fen_step.id,
                line_id: line.id,
                ply: fen_step.ply,
                fen: fen_step.fen,
                san: fen_step.san
            },
            playlist: {
                id: playlist.id,
                name: playlist.name,
                book_id: book.id
            },
            book: {
                id: book.id,
                name: book.name,
                author: book.author
            },
            line: {
                id: line.id,
                playlist_id: playlist.id,
                name: line.name,
                san_moves: parse_mainline_from_pgn(line.pgn).map(_ => _.san).join(' ')
            }
        }
    })

    return na.map((game, j) => {

        let most_matched_line: FenStepLineInABook | undefined = undefined

        for (let r of results) {
            let move_fens = na_move_fens[j]
            for (let i = 0; i < move_fens.length; i++) {
                if (move_fens[i] === r.fen_step.fen) {
                    if (most_matched_line === undefined) {
                        most_matched_line = r
                    } else {
                        if (r.fen_step.ply > most_matched_line.fen_step.ply) {
                            most_matched_line = r
                        }
                    }
                }
            }
        }

        let diverge = most_matched_line ? find_diverge_for_game(game, most_matched_line) : undefined

        return {
            game, diverge
        }
    })
}

export async function get_processed_lichess_game_by_ids(ids: LichessGameId[]) {

    const placeholders = ids.map(term => `?`).join(',');

    const query = db.prepare(`
  SELECT g.lichess_game_id
  FROM game_progress g
  WHERE g.lichess_game_id IN (${placeholders})
`);

    const results: LichessGameId[] = query.all(ids)
        .map<LichessGameId>((_: any) => _.lichess_game_id)

    return results
}

export async function save_processed_games_progress(ids: LichessGameId[]) {

    const insert = db.prepare(`
        INSERT INTO game_progress (id, lichess_game_id) VALUES (?, ?)
`)

    const insertMany = db.transaction(ids => {
        for (const id of ids)
            insert.run(gen_id8(), id)
    })

    insertMany(ids)
}

export async function add_fitness_score_to_rank_lines(fitness: FitnessScore2) {

}
