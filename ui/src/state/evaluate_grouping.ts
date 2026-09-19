import type { PerGameLineFitness } from "./fitness2"
import type { Book, Line, Playlist } from "./shared_types"

export type GroupedLine = {
    book: Book,
    playlist: Playlist,
    line: Line,
    nb_wins: number,
    items: PerGameLineFitness[]
}

export type GroupedLines = {
    lines: GroupedLine[]
    other: PerGameLineFitness[]
}

export function GroupedLines(list: PerGameLineFitness[]): GroupedLines {
    let other = []
    let res = new Map<string, GroupedLine>()

    for (let item of list) {
        if (!item.divergence_model) {
            other.push(item)
            continue
        }
        let key = `
                ${item.divergence_model.best_matching_opening_line.book.id}
                ${item.divergence_model.best_matching_opening_line.playlist.id}
                ${item.divergence_model.best_matching_opening_line.line.id}
                `

        if (res.has(key)) {
            res.get(key)!.items.push(item)
            if (item.match.game.did_you_win) {
                res.get(key)!.nb_wins += 1
            }
        }
        else res.set(key, {
            book: item.divergence_model.best_matching_opening_line.book,
            line: item.divergence_model.best_matching_opening_line.line,
            playlist: item.divergence_model.best_matching_opening_line.playlist,
            items: [item],
            nb_wins: item.match.game.did_you_win ? 1 : 0
        })
    }

    const sort_fn = (a: GroupedLine, b: GroupedLine) => {
        let res = b.items.length - a.items.length
        if (res === 0) {
            return b.nb_wins - a.nb_wins
        }
        return res
    }

    let lines = [...res.values()].sort(sort_fn)

    return {
        lines,
        other,
    }
}


