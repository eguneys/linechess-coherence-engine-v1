import { Chess, makeUci } from "chessops";
import { INITIAL_FEN, parseFen } from "chessops/fen";
import { parsePgn } from "chessops/pgn";
import { parseSan } from "chessops/san";

export type SAN = string
export type UCI = string
export type FEN = string

export function parse_mainline_from_pgn(pgn: string) {
    let res: { uci: UCI, san: SAN } [] = []

    let parsed = parsePgn(pgn)[0]

    let pos = fen_pos()

    for (let mainline of parsed.moves.mainline()) {
        let move = parseSan(pos, mainline.san)!
        let uci = makeUci(move)
        res.push({ uci, san: mainline.san })
        pos.play(move)
    }

    return res
}


export function fen_pos(fen: FEN = INITIAL_FEN) {
    return Chess.fromSetup(parseFen(fen).unwrap()).unwrap()
}