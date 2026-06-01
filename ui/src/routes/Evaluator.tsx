import { BiRegularBrain } from "solid-icons/bi";
import './Evaluator.scss'
import { FiCompass, FiSearch } from "solid-icons/fi";
import { BsQuestionSquare, BsSliders2 } from "solid-icons/bs";
import { createEffect, createMemo, createSelector, createSignal, For, Match, onCleanup, onMount, Show, Suspense, Switch } from "solid-js";
import { A } from "@solidjs/router";
import { useState } from "../state/State";
import type { AllowedSpeed, DivergedGame, LichessGameId } from "../state/shared_types";
import type { TT_Params } from "../state/fitness2";

export default function Evaluator() {

    const [{ evaluate_state: state},{ evaluate_actions: { set_evaluate_username}}] = useState()

    let $search_input!: HTMLInputElement

    onMount(() => {
        $search_input.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                set_evaluate_username($search_input.value)
            }
        })
    })

    return (<>
        <main class='evaluator'>
            <div class='search-bar'>
                <div class='title'><BiRegularBrain />Community Repertoire Analyzer</div>
                <p>Evaluate any Lichess player's <b>Opening Fitness Score</b> against community opening repertoires. Every measured book will be compared, the best score will be shown. Calculated metrics will also be used to rank the most coherent repertoires. They are also publicly available for study.</p>
                <div class='search'>
                    <div class='icon-search'><FiSearch /><input ref={$search_input} name="search" spellcheck={false} autocorrect="off" autocomplete="off" type='text' placeholder='Enter an Lichess username...'></input></div>
                    <button onClick={() => set_evaluate_username($search_input.value)}>Evaluate</button>
                </div>
            </div>
            <div class='results'>
                <Suspense fallback={<Loading />}>
                    <Switch fallback={
                        <>
                        <Assesment/>
                        <RecentMatches/>
                        </>
                    }>
                        <Match when={state.api_error} >
                            <ApiError/>
                        </Match>
                        <Match when={state.fitnessScore === undefined || state.user_not_found} >
                            <NotFound />
                        </Match>
                    </Switch>
                </Suspense>
                <HowItWorks/>
            </div>
        </main>
    </>)
}


function ApiError() {
    return (<>
    <div class='api-error'>
        Some server error while fetching games.
    </div>
    </>)
}

function NotFound() {
    return (<>
    <div class='not-found'>
        User not found
    </div>
    </>)
}

function RecentMatches() {

    const [{ evaluate_state: state}] = useState()

    const on_open_lichess_game = (id: LichessGameId) => {
        window.location.href = `https://lichess.org/${id}`
    }

    const list = createMemo(() => {
        return state.fitnessScore!.NAll.sort((a, b) => b.match.game.created_at - a.match.game.created_at)
    })

    const item_who_diverged = (item: DivergedGame) => {

        if (item.game.you === 'white') {
            if (item.diverge!.did_you_diverge) {
                return item.game.white
            } else {
                return item.game.black
            }
        } else {
            if (item.diverge?.did_you_diverge) {
                return item.game.black
            } else {
                return item.game.white
            }
        }
    }

    return (<>
    <div class='recent-matches'>
        <div class='title'><FiCompass/>Played Recent Matches</div>
        <div class='list'>
            <For each={list()}>{item => 
               <div onClick={() => on_open_lichess_game(item.match.game.lichess_game_id)} class='item'>
                        <div class='title'> 
                            <Show when={item.match.diverge} fallback={<div class='unknown'>Unknown opening</div>}>{ diverge =>
                                    <div class='playlist-name'>{diverge().most_matched_line.playlist.name}</div>
                            }</Show>
                            <span class='time'>{item.match.game.speed}</span>
                        </div>
                        <div class='vs'>
                            <A href={`https://lichess.org/@/${item.match.game.white}`}>{item.match.game.white}</A> vs 
                            <A href={`https://lichess.org/@/${item.match.game.black}`}>{item.match.game.black}</A>
                        </div>
                        <div class='pgn'><PgnMovesDivergence played={item.match.game.san_moves} diverge_at_ply={item.match.diverge?.diverge_at_ply} line={item.match.diverge?.most_matched_line.line.san_moves} /></div>
                        <div class='long'></div>
                        <Show when={item.match.diverge} fallback={<p class='unknown'>Opening is not listed in our database.</p>}>{ diverge => 
                            <p>
                                <span class='line-name'>{diverge().most_matched_line.line.name}</span> line played from the book
                                <span class='book-name'>{diverge().most_matched_line.book.name}</span>
                                by <span class='author'>{diverge().most_matched_line.book.author}</span>
                            </p>
                        }</Show>
                   <div class="footer">
                            <span class='time'>
                                <MomentsAgo timestamp={item.match.game.created_at}/>
                            </span>
                            <span class='result'>
                                <Show when={item.match.game.winner} fallback={
                                    <Show when={item.match.game.did_you_draw}>
                                        Game drawn
                                    </Show>
                                }>{winner =>
                                    <span class='won'>{winner() === 'white' ? item.match.game.white : item.match.game.black} won!</span>
                                    }</Show>
                                <Show when={item.match.diverge}>{
                                    <span class='diverged'>{item_who_diverged(item.match)} diverged</span>
                                }</Show>
                            </span>
                    <div class='long'></div>
                            <div class='score'>Score: <Show when={item.Fitness_Score} fallback="---">{score => `${Math.round(score() * 100)}/100`}</Show></div>
                   </div>
               </div>
            }</For>
        </div>
    </div>
    </>)
}


function PgnMovesDivergence(props: { played: string, diverge_at_ply?: number, line?: string }) {
    const well_put = createMemo(() => props.diverge_at_ply ? props.played.split(' ').slice(0, props.diverge_at_ply) : [])
    const diverged = createMemo(() => props.diverge_at_ply ? props.played.split(' ').slice(props.diverge_at_ply) : props.played.split(' '))
    const diverge_at_ply = createMemo(() => props.diverge_at_ply ? props.diverge_at_ply : 0)
    const continues = createMemo(() => props.line ? props.line.split(' ').slice(props.diverge_at_ply!): [])


    return (<>
        <div class='played' classList={{hidable: continues().length > 0}}>
            <For each={well_put()}>{(item, i) =>
                <div class='move well'>
                    <Show when={show_index_ply(i())}>{ply =>
                        <span class='index'>{ply()}</span>
                    }</Show>
                    {item}
                </div>
            }</For>
            <For each={diverged().slice(0, 10)}>{(item, i) =>
                <div class='move'>
                    <Show when={show_index_ply(i() + diverge_at_ply())}>{ply =>
                        <span class='index'>{ply()}</span>
                    }</Show>
                    {item}
                </div>
            }</For>
            <Show when={diverged().length > 10}>
                ...
            </Show>
        </div>
        <div class='line'>
            <For each={well_put()}>{(item, i) =>
                <div class='move well'>
                    <Show when={show_index_ply(i())}>{ply =>
                        <span class='index'>{ply()}</span>
                    }</Show>
                    {item}
                </div>
            }</For>
            <For each={continues()}>{(item, i) =>
                <div class='move'>
                    <Show when={show_index_ply(i() + diverge_at_ply())}>{ply =>
                        <span class='index'>{ply()}</span>
                    }</Show>
                    {item}
                </div>
            }</For>
        </div>
    </>)
}

const show_index_ply = (i: number) => {
    return i % 2 === 0 ? `${(i / 2) + 1}.`: undefined
}

function Assesment() {

    const [{ evaluate_state: state}] = useState()

    return (<>
    
    <div class='assesment-with-config'>
        <SliderParameters/>
        <div class='assesment'>
        <div class='ofs'><CircularProgress label="Opening Fitness Score" progress={state.fitnessScore!.fitness_score * 100}/></div>
        <div class='right'>
            <div class='title'>Profile Assesment: <A href={`https://lichess.org/@/${state.username}`} target="_blank">{state.username}</A></div>
            <div class='bars'>
                <OneBarWithLabel label={`bullet (${state.fitnessScore!.Nb.length}/${state.params.Pb.Gtarget})`} progress={state.fitnessScore!.T_b * 100}/>
                <OneBarWithLabel label={`blitz (${state.fitnessScore!.Nz.length}/${state.params.Pz.Gtarget})`} progress={state.fitnessScore!.T_z * 100}/>
                <OneBarWithLabel label={`rapid (${state.fitnessScore!.Nr.length}/${state.params.Pr.Gtarget})`} progress={state.fitnessScore!.T_r * 100}/>
                <OneBarWithLabel label={`classical (${state.fitnessScore!.Nc.length}/${state.params.Pc.Gtarget})`} progress={state.fitnessScore!.T_c * 100}/>
            </div>
        </div>
            </div>
    </div>
    </>)
}

function SliderParameters() {

    const [show, set_show] = createSignal(false)

    return(<>
        <div class='sliders'>
            <div class='configure'>
                <div onClick={() => set_show(!show())} class='button'><BsSliders2 /></div>
                <Show when={show()}>
                    <ConfigureParameters />
                </Show>
            </div>
        </div>
    </>)
}


function ConfigureParameters() {

  const [{ evaluate_state: state }, { evaluate_actions: { set_overall_params } }] = useState()

  const on_T_changed = 
    (param_a: AllowedSpeed) => 
      (value: number) => set_overall_params(param_a, 'T_ratio', value)


  return (<>
    <div class='configure-parameters-form'>
      <div class='classical'>
        <ConfigureParametersForTimeControl name="classical" params={state.params.Pc} />
      </div>
      <div class='rapid'>
        <ConfigureParametersForTimeControl name="rapid" params={state.params.Pr}  />
      </div>
      <div class='bullet'>
        <ConfigureParametersForTimeControl name="bullet" params={state.params.Pb} />
      </div>
      <div class='blitz'>
        <ConfigureParametersForTimeControl name="blitz" params={state.params.Pz}  />
      </div>

      <div class='general'>
        <div class='title'> Overall Parameters</div>

        <small>How much each time control contributes to the overall score</small>
        <div class='input-group2'>
        <div>
          <label for='T_bullet'>Bullet Factor</label>
          <Slider name={`T_bullet`} step={0.1} min={0} max={1} value={state.params.Tb} on_value_changed={on_T_changed('bullet')} />
        </div>

        <div>
          <label for='T_bullet'>Blitz Factor</label>
          <Slider name={`T_blitz`} step={0.1} min={0} max={1} value={state.params.Tz} on_value_changed={on_T_changed('blitz')} />
        </div>
        <div>
          <label for='T_bullet'>Rapid Factor</label>
          <Slider name={`T_rapid`} step={0.1} min={0} max={1} value={state.params.Tr} on_value_changed={on_T_changed('rapid')} />
        </div>
        <div>
          <label for='T_bullet'>Classical Factor</label>

          <Slider name={`T_classical`} step={0.1} min={0} max={1} value={state.params.Tc} on_value_changed={on_T_changed('classical')} />
        </div>
        </div>
      </div>
    </div>
  </>)
}

function ConfigureParametersForTimeControl(props: { name: AllowedSpeed, params: TT_Params}) {

  const [,{ evaluate_actions: { set_overall_params }}] = useState()

  const on_g_target_changed = (value: number) => {
    set_overall_params(props.name, 'g_target', value)
  }
  const on_alpha_changed = (value: number) => {
    set_overall_params(props.name, 'alpha', value)
  }
  const on_gamma_you_changed = (value: number) => {
    set_overall_params(props.name, 'gamma', value)
  }
  const on_lambda_opp_changed = (value: number) => {
    set_overall_params(props.name, 'lambda', value)
  }

  return (<>
    <div class='title'> {props.name} Parameters</div>


    <div class='input-group'>
      <div class='labels'>
        <label for={`G_target_${props.name}`}>Target number of games</label>
      </div>

      <Slider name={`G_target_${props.name}`} min={0} max={50} value={props.params.Gtarget} on_value_changed={on_g_target_changed}/>
    </div>


    <div class='input-group'>
      <div class='labels'>
        <label for={`alpha_${props.name}`}>Quality Alpha</label>
        <small>(Mixing between quantity vs quality)</small>
      </div>
      <Slider name={`alpha_${props.name}`} step={0.2} min={0} max={1} value={props.params.alpha} on_value_changed={on_alpha_changed}/>
    </div>



    <div class='input-group'>
      <div class='labels'>
        <label for={`you_gamma_${props.name}`}>Your divergence Gamma</label>
        <small>(Less forgiving, more strict)</small>
      </div>
      <Slider name={`you_gamma_${props.name}`} step={0.1} min={0.1} max={2} value={props.params.cc.Gamma_you} on_value_changed={on_gamma_you_changed}/>
    </div>

    <div class='input-group'>
      <div class='labels'>
        <label for={`opp_lambda_${props.name}`}>Opponent's divergence Lambda</label>
        <small>(Less strict, more forgiving)</small>
      </div>
      <Slider name={`opp_lambda_${props.name}`} step={0.2} min={0} max={1} value={props.params.cc.Lambda_opp} on_value_changed={on_lambda_opp_changed}/>
    </div>

  </>)
}

function Slider(props: { name: string, step?: number, min: number, max: number, value: number, on_value_changed: (_: number) => void }) {

  const [G_target, set_G_target] = createSignal(props.value)

  const G_target_with_padding = createMemo(() => pad_float(G_target(), props.max < 2))

  onMount(() => {
    createEffect(() => {
      $input.value = `${props.value}`
    })
  })

  let $input!: HTMLInputElement

  return (<>
    <div class='slider'>
      <span class='value'>{G_target_with_padding()}</span>
      <input ref={$input} step={props.step??1} min={props.min} max={props.max} id={`G_target_${props.name}`} type='range' value={G_target()} onInput={_ => {
        let value = parseFloat((_.target as HTMLInputElement).value)
        set_G_target(value)
        props.on_value_changed(value)
      }} />
    </div>
  </>)
}


function CircularProgress(props: { label: string, progress: number }) {
    return (<>
        <div class='ofsbar-label'>
            <div class='label'>{props.label} <span class='value'>{Math.floor(props.progress)}%</span></div>
            <div class='bar-bg'>
               <div class='bar' style={{width: `${props.progress}%`}}></div>
            </div>
        </div>
    </>)
}

function OneBarWithLabel(props: { label: string, progress: number }) {

    return (<>
    
    <div class='onebar-label'>
        <div class='label'>{props.label} <span class='value'>{Math.floor(props.progress)}%</span></div>
        <div class='bar-bg'>
        <div class='bar' style={{width: `${props.progress}%`}}></div>
        </div>
    </div>
    </>)
}

function Loading() {
    return (<>
    <div class='loading'>
        <SpinnerDots/>
        <div class='title'>Calculating Opening Fitness Score...</div>
        <p>
        </p>
    </div>
    </>)
}

function SpinnerDots() {

    let [one, set_one] = createSignal('one')

    const is_one = createSelector(one)

    onMount(() => {

        function step() {
            clearTimeout(timeout)

            timeout = setTimeout(() => {
                set_one(one() === 'one' ? 'two' : one() === 'two' ? 'three' : 'one')
                step()
            }, 800)
        }

        let timeout = 0
        step()

        onCleanup(() => {
            clearTimeout(timeout)
        })
    })

    return (<>
    <div class='spinner'>
            <span class='dot' classList={{one: is_one('one')}}>.</span>
            <span class='dot' classList={{one: is_one('two')}}>.</span>
            <span class='dot' classList={{one: is_one('three')}}>.</span>
    </div>
    </>)
}

function HowItWorks() {
    return (<>
        <div class='how'>
            <BsQuestionSquare />
            <div class='title'>How opening fitness score works</div>
            <p>
                Opening Fitness Score is calculated as a single percentage that indicates how well you played in the opening phases of your games played in the last 24 hours.
            </p>
            <p>
                The community contributed opening books are used as the source, and the best matching line amongst those is selected as the opening you have played. For every game played, the best matching opening will be selected to be used to calculate a progress score for that game.
                Every game's progress score then will be aggregated differently for every time control and summed up to reach the final Opening Fitness Score.
            </p>
            <p class='highlight'>
                Opening Fitness Score "OFS" is also a measure for how well the matched opening lines performed. Because OFS is only a scale of how deep the line has been followed by both players. This is regardless of the outcome of the game. However it has a certain bias for point of view of the player the score is calculated for.
            </p>
            <p>
                This property enables to rank the opening books submitted to our database. Every Lichess username that is searched by our users will also be used to calculate OFS regularly for ranking the submitted books on the website. The most coherent opening books will rank higher and be featured on the website.
            </p>
            <p>
                The most coherent books are ranked higher, because those are the books that their lines has the highest OFS scores for every player overall. While composing books you have to be selective of which lines you include in your books. The depth of the line, and the overall composition of which lines you include in a book has to be coherent to rank higher and get featured.
            </p>
            <p class='highlight'>
                Line Chess is a platform for providing the most coherent opening books to the community by the community publicly for free for everyone, and for measuring your daily Opening Fitness Score.
            </p>
        </div>
    </>)
}



export function format_fitness_score(value: number) {
    value *= 100
    return value ? `${value.toFixed(2)}%` : '--.--'
}

export function format_zero(value: number, repeat = 1) {
    return value ? value : '-'.repeat(repeat)
}

export function MomentsAgo(props: { timestamp: number }) {

    const [now, set_now] = createSignal(Date.now())

    let interval_id = setInterval(() => set_now(Date.now()), 30 * 1000)

    onCleanup(() => clearInterval(interval_id))

    return <>
        {formatMomentsAgo(now(), props.timestamp)}
    </>
}

export function formatMomentsAgo(now: number, timestamp: number): string {
    const seconds = Math.floor((now - timestamp) / 1000)

    if (seconds < 1) return "just now"
    if (seconds < 60) return `${seconds}s ago`

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`

    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`

    const years = Math.floor(months / 12)
    return `${years}y ago`
}

export const ply_to_dots = (ply: number) => {
    return (ply % 2 === 0) ? `${Math.ceil((ply + 1) / 2)}.` : `${Math.ceil((ply + 1) / 2)}...`
}

export const pad_float = (value: number, pad: boolean) => {
    return pad ? value.toFixed(1) : value
}