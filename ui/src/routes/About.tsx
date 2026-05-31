import './Site.scss'

export default function About() {
    return (<>
    <main class='about'>
        <div class='box'>
            <div class='header'>About LineChess</div>
            <div class='body'>
                <h2>LineChess Chess Opening Repertoire Coherence Hub</h2>
                <p>Line Chess is a platform for providing the most coherent opening books to the community by the community publicly for free for everyone, and for measuring your daily Opening Fitness Score.</p>
                <p>Users are encouraged to create opening books and add single line chess opening variations in PGN format grouped into playlists. When you connect your Lichess account, this information becomes public and is used to calculate Opening Fitness Score for everyone. </p>
                <p><b>Opening Fitness Score</b> "OFS" is a daily measured metric, that indicates how well you followed the openings in your Lichess games played in the last 24 hours.</p>
                <p>By creating the most coherent opening books, your lines are ranked by how well they perform with the OFS metric against all searched players and best scoring books are featured on the website.</p>
            </div>
        </div>
    </main>
    </>)
}