import { $ } from "./db_sync/api"
import type { DivergedGame } from "./shared_types"

export type EvaluateAPIResult = {
    result: DivergedGame[]
}

export type EvaluateAPI = {
    evaluate(username: string): Promise<EvaluateAPIResult>
}

export function create_evaluate_api() {

    return {
        evaluate(username: string) {
            return $(`/evaluate?username=${username}`)
        }
    }
}