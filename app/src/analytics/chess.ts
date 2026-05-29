import { Chess } from "chessops";
import { INITIAL_FEN, makeFen, parseFen } from "chessops/fen";
import { parseSan } from "chessops/san";

const Initial_Setup = parseFen(INITIAL_FEN).unwrap()

export function get_move_fens_for_san_moves(sans: string[]) {
    let pos = Chess.fromSetup(Initial_Setup).unwrap()

    let fens = []
    for (let san of sans) {
        let move = parseSan(pos, san)!
        let fen = makeFen(pos.toSetup())
        fens.push(fen)
        pos.play(move)
    }

    return fens
}