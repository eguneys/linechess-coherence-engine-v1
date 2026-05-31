import { A } from '@solidjs/router'
import './Site.scss'

export default function Legal() {
    return (<>
    <main class='legal'>
        <div class='box'>
            <div class='header'>Legal</div>
                <div class='body'>
                    <h2>Terms of Service</h2>
                    <span class='last-updated'>Last Updated: 31 May 2026 </span>
                    <p> Line Chess is a free/open source software for improving your chess openings (collectively the "<b>Services</b>"). By accessing or using our Services, you agree to be bound by these Terms of Service "<b>Terms</b>". If you do not agree with these Terms, you must not use the Service.</p>
                    <p>By using the Service, you represent that you are at least 18 years old.</p>
                    <p>No user accounts are required to use the core features of the Service. You may choose to connect your Lichess account to access extended statistics about your Lichess games and their relation to your openings you enter to Line Chess.</p>

                    <p>You agree to use the Service only for lawful purposes. Prohibited uses include: Violating intellectual property rights, privacy laws, or applicable regulations, attempting to hack, disrupt, or overload the Service. We reserve the right to block access if misuse is suspected.</p>

                    <p>Any data you input into the Service remains your property. You grant us limited, non-exclusive, and revocable license to process this data solely for the purpose of presenting you useful statistics about your chess experience.</p>

                    <p>We do not store your chess openings data on our servers. For more details about how data is handled, please refer to our <a href="#privacy">Privacy Policy</a>.</p>

                    <p>The Service is provided "as is" without warranties of any kind, express or implied, including accuracy, reliability, or fitness for a particular purpose.</p>
                    <p>To the fullest extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>

                    <p>We may suspend or terminate access to the Service at any time without prior notice, for any reason, including suspected violations of these Terms.</p>

                    <p>We may update this Terms, from time to time. Any changes will be reflected by updating the Last Updated Date at the beginning of this Terms of Service section. Continued use of the Service after changes are made constitutes acceptance of the updated Terms.</p>

                    <p>If you have any further questions or requests, our contact information can be found at the end of this page.</p>

                    <h2 id="privacy">Privacy Policy</h2>
                    <span class='last-updated'>Last Updated: 31 May 2026 </span>
                    <p>Our hosting provider <A class='out' href="https://netlify.com">Netlify</A> may collect anonymous usage data such as your IP address, browser type (User Agent), and pages visited for improving your browsing experience. This data does not directly identify you.</p>
                    <p>The information you enter to create opening lines is stored locally in your browser and is not transmitted to our servers.</p>
                    <p><b>Usage data</b> is used to analyse trends, monitor performance, and improve the user experience.</p>
                    <p>You may connect your <A href="https://lichess.org">Lichess</A> account with permission to access your Lichess games. Later we will use this information to display statistics about your games related to your openings information you also provide to this website.</p>
                    <p>You have full control over your data. You can export your opening lines. You can delete your data by using our user interface, and or by clearing your browser's local storage. You may logout of your Lichess account, or revoke your Lichess permissions granted to this website. You may stop using the service at any time.</p>
                    <p>Our website may include links to third-party services such as links to our sponsors or our GitHub repository. We are not responsible for the privacy practices of these external sites.</p>
                    <p>We may update this Privacy Policy, from time to time. Any changes will be reflected by updating the Last Updated Date at the beginning of this Privacy Policy section.</p>
                    <p>You can contact us for further questions or requests at <A href="https://x.com/eguneys">@eguneys from X.com</A></p>
                </div>
            </div>
    </main>
    </>)
}