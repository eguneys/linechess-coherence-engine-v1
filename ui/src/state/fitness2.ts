import type { DivergedGame, FenStepLineInABook } from "./shared_types"

export type PerGameLineFitness = {
    match: DivergedGame
    divergence_model?: DivergenceModel
    Fitness_Score?: number
}

export type DivergenceModel = {
    best_matching_opening_line: FenStepLineInABook
    Pmax: number // max comparable ply in the opening line
    Py?: number // ply where You diverged
    Po?: number // ply where Opponent diverged
}

function progress(d: DivergenceModel) {
    if (d.Py) {
        return d.Py / d.Pmax
    }
    if (d.Po) {
        return d.Po / d.Pmax
    }
    return -1
}

// Gamma exponent based harsh decay 
// Gamma < 1 Forgiving
//  Gamma = 1  Balanced
//  Gamma > 1  Strict
export type ConfigurablePerGameFitnessFunction = {
    W_complete: number // reward for full line completion
    Gamma_you: number // Gamma for your divergence
    Lambda_opp: number // Lambda for opponent divergence
    W_nomatch: number // optional penalty for no line
}


function S_i(d: DivergenceModel | undefined, cc: ConfigurablePerGameFitnessFunction) {
    if (d === undefined || d.Po === 0 || d.Py === 0) {
        return cc.W_nomatch
    }
    if (d.Po !== undefined) {
        return S_Opponent_diverged(d, cc)
    }
    if (d.Py !== undefined) {
        return S_You_diverged(d, cc)
    }
    return S_CompleteLine(cc)
}

// Usually W_complete = 1
function S_CompleteLine(cc: ConfigurablePerGameFitnessFunction) {
    return cc.W_complete
}

//  deeper divergence hurts less, early divergence hurts heavily
function S_You_diverged(d: DivergenceModel, cc: ConfigurablePerGameFitnessFunction) {
    //let S = cc.W_progress * progress(d) - cc.W_you * (1 - progress(d))
    let S = Math.pow(progress(d), cc.Gamma_you)
    return S
}

// Typically W_opp < W_you
function S_Opponent_diverged(d: DivergenceModel, cc: ConfigurablePerGameFitnessFunction) {
    //let S = cc.W_progress * progress(d) - cc.W_opp * (1 - progress(d))
    let S = 0.5 + 0.5 * progress(d) * cc.Lambda_opp
    return S
}


function Aggregate_TimeControl(dd: DivergenceModel[], cc: ConfigurablePerGameFitnessFunction) {
    let sum_S = dd.map(_ => S_i(_, cc)).reduce((a, b) => a + b, 0)

    if (dd.length === 0) {
        return 0
    }
    return sum_S / dd.length
}

export type ConfigurableGTarget = number

function V_t(dd: DivergenceModel[], Gtarget: ConfigurableGTarget) {
    let Gplayed = dd.length
    return Math.min(1, Gtarget === 0 ? 0 : Gplayed / Gtarget)
}

export type TT_Params = {
    cc: ConfigurablePerGameFitnessFunction
    Gtarget: ConfigurableGTarget
    alpha: number // 0.7 = quality  0.3 = volume
}

function F_t(dd: DivergenceModel[], tt_params: TT_Params) {
    return tt_params.alpha * Aggregate_TimeControl(dd, tt_params.cc) + 
        (1 - tt_params.alpha) * V_t(dd, tt_params.Gtarget)
}


export type Overall_Params = {
    Tb: number
    Tz: number
    Tr: number
    Tc: number
    Pb: TT_Params
    Pz: TT_Params
    Pr: TT_Params
    Pc: TT_Params
}

export type FitnessScore2 = {
    NAll: PerGameLineFitness[],
    Nb: PerGameLineFitness[],
    Nz: PerGameLineFitness[],
    Nr: PerGameLineFitness[],
    Nc: PerGameLineFitness[],
    fitness_score: number
    T_total_score: number
    T_b: number
    T_z: number
    T_r: number
    T_c: number
}

function Fitness(dd: PerGameLineFitness[], params: Overall_Params): FitnessScore2 {

    let Nb = dd.filter(_ => _.match.game.speed === 'bullet')
    let Nz = dd.filter(_ => _.match.game.speed === 'blitz')
    let Nr = dd.filter(_ => _.match.game.speed === 'rapid')
    let Nc = dd.filter(_ => _.match.game.speed === 'classical')

    let NAll = [...Nb, ...Nz, ...Nr, ...Nc]

    Nb.forEach(_ => _.Fitness_Score = S_i(_.divergence_model, params.Pb.cc))
    Nz.forEach(_ => _.Fitness_Score = S_i(_.divergence_model, params.Pz.cc))
    Nr.forEach(_ => _.Fitness_Score = S_i(_.divergence_model, params.Pr.cc))
    Nc.forEach(_ => _.Fitness_Score = S_i(_.divergence_model, params.Pc.cc))

    let Tb = Nb.map(_ => _.divergence_model!).filter(Boolean)
    let Tz = Nz.map(_ => _.divergence_model!).filter(Boolean)
    let Tr = Nr.map(_ => _.divergence_model!).filter(Boolean)
    let Tc = Nc.map(_ => _.divergence_model!).filter(Boolean)

    let T_b = params.Tb * F_t(Tb, params.Pb)
    let T_z = params.Tz * F_t(Tz, params.Pz)
    let T_r = params.Tr * F_t(Tr, params.Pr)
    let T_c = params.Tc * F_t(Tc, params.Pc)

    let T_sums = T_b + T_z + T_r + T_c

    let T_total = params.Tb + params.Tz + params.Tr + params.Tc

    let Fitness = T_total === 0 ? 0 : T_sums / T_total

    let T_total_goal = params.Pb.Gtarget + params.Pz.Gtarget + params.Pr.Gtarget + params.Pc.Gtarget

    let T_total_score = T_total / T_total_goal

    return {
        NAll,
        Nb,
        Nz,
        Nr,
        Nc,
        fitness_score: Fitness,
        T_total_score,
        T_b,
        T_z,
        T_r,
        T_c
    }
}

export function FitnessFromRecentMatches(rr: DivergedGame[], params: Overall_Params) {
    let dd: PerGameLineFitness[] = rr.map(match => ({
        match,
        divergence_model: get_divergence_model_for_match(match)
    }))

    return Fitness(dd, params)
}


function get_divergence_model_for_match(match: DivergedGame): DivergenceModel | undefined {

    if (!match.diverge) {
        return undefined
    }

    let Pmax = match.diverge.most_matched_line.line.san_moves.length

    let Py = match.diverge.did_you_diverge ? match.diverge.diverge_at_ply : undefined
    let Po = !match.diverge.did_you_diverge ? match.diverge.diverge_at_ply : undefined

    if (Py === Pmax) {
        Py = undefined
    }
    if (Po === Pmax) {
        Po = undefined
    }

    let res: DivergenceModel = {
        best_matching_opening_line: match.diverge.most_matched_line,
        Pmax,
        Py,
        Po
    }

    return res
}


export const Default_O_params: Overall_Params = {
    Tb: 0.1,
    Tz: 0.4,
    Tr: 0.2,
    Tc: 0.3,
    Pb: {
        cc: {
            W_complete: 1,
            Gamma_you: .1,
            Lambda_opp: 1.0,
            W_nomatch: 0
        },
        Gtarget: 12,
        alpha: 0.3
    },
    Pz: {
        cc: {
            W_complete: 1,
            Gamma_you: .3,
            Lambda_opp: .7,
            W_nomatch: 0
        },
        Gtarget: 9,
        alpha: 0.4
    },
    Pr: {
        cc: {
            W_complete: 1,
            Gamma_you: 1,
            Lambda_opp: .6,
            W_nomatch: 0
        },
        Gtarget: 8,
        alpha: 0.7
    },
    Pc: {
        cc: {
            W_complete: 1,
            Gamma_you: 2,
            Lambda_opp: 0.3,
            W_nomatch: 0
        },
        Gtarget: 2,
        alpha: 1.0
    }
}