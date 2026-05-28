import { BiRegularBrain } from "solid-icons/bi";
import './Evaluator.scss'
import { FiSearch } from "solid-icons/fi";

export default function Evaluator() {
    return (<>
        <main class='evaluator'>
            <div class='search-bar'>
                <div class='title'><BiRegularBrain />Community Repertoire Analyzer</div>
                <p>Evaluate any Lichess player's opening fitness score against community opening repertoires. Every measured book will be compared, the best score will be shown. Calculated metrics will also be used to rank the most coherent repertoires. They are also publicly available for study.</p>
                <div class='search'>
                    <div class='icon-search'><FiSearch/><input type='text' placeholder='Enter an Lichess username...'></input></div>
                    <button>Evaluate</button>
                </div>
            </div>
            <img alt="" src="screen2.png" />
        </main>
    </>)
}