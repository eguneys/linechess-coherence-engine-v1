import { BiRegularBrain } from "solid-icons/bi";
import './Evaluator.scss'
import { FiCompass, FiSearch } from "solid-icons/fi";
import { BsQuestionSquare } from "solid-icons/bs";
import { createSelector, createSignal, For, onCleanup, onMount } from "solid-js";
import { A } from "@solidjs/router";

export default function Evaluator() {
    return (<>
        <main class='evaluator'>
            <div class='search-bar'>
                <div class='title'><BiRegularBrain />Community Repertoire Analyzer</div>
                <p>Evaluate any Lichess player's <b>Opening Fitness Score</b> against community opening repertoires. Every measured book will be compared, the best score will be shown. Calculated metrics will also be used to rank the most coherent repertoires. They are also publicly available for study.</p>
                <div class='search'>
                    <div class='icon-search'><FiSearch/><input name="search" spellcheck={false} autocorrect="off" autocomplete="off" type='text' placeholder='Enter an Lichess username...'></input></div>
                    <button>Evaluate</button>
                </div>
            </div>
            <div class='results'>
                <Assesment/>
                <RecentMatches/>
            </div>
        </main>
    </>)
}


function RecentMatches() {

    return (<>
    <div class='recent-matches'>
        <div class='title'><FiCompass/>Played Recent Matches</div>
        <div class='list'>
            <For each={'asd,'.repeat(30).split(',')}>{item => 
               <div class='item'>
                   <div class='title'>The Berlin Wall <span class='time'>Blitz</span></div>
                   <div class='pgn'>1.e4 e5 2. c4 c5</div>
                   <p>
                            <span class='line-name'>The French defense advanced variation</span> played in the book 
                            <span class='book-name'>1.e4 White Repertoire for Grandmasters</span> 
                            by <span class='author'>heroku</span></p>
                   <div class="footer">
                    <span class='result'>heroku won</span>
                    <div class='long'></div>
                      <div class='score'>Score: 88/100</div>
                   </div>
               </div>
            }</For>
        </div>
    </div>
    </>)
}


function Assesment() {
    return (<>
    
    <div class='assesment'>
        <div class='ofs'><CircularProgress label="Opening Fitness Score" progress={30}/></div>
        <div class='right'>
            <div class='title'>Profile Assesment: <A href="https://lichess.org/@/heroku" target="_blank">heroku</A></div>
            <div class='bars'>
                <OneBarWithLabel label="bullet (10)" progress={30}/>
                <OneBarWithLabel label="blitz (8)" progress={30}/>
                <OneBarWithLabel label="rapid (10)" progress={30}/>
                <OneBarWithLabel label="classical (2)" progress={30}/>
            </div>
        </div>
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

// @ts-ignore
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