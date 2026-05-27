import crypto from 'crypto'
import { Router } from 'express'
import { WEB_DOMAIN } from './config.js'
import { set_or_create_new_lichess_user } from './services.js'

const clientId = 'linechess-api'

const base64URLEncode = (str: Buffer) => str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

const sha256 = (buffer: string) => crypto.createHash('sha256').update(buffer).digest()

const createVerifier = () => base64URLEncode(crypto.randomBytes(32))
const createChallenge = (verifier: string) => base64URLEncode(sha256(verifier))


export function init_lichess_auth_routes(router: Router) {
    router.get('/login', async (req, res) => {
        const url = req.protocol + '://' + req.get('host') + req.baseUrl

        const verifier = createVerifier()
        const challenge = createChallenge(verifier)

        req.session.verifier = verifier
        res.redirect('https://lichess.org/oauth?' + new URLSearchParams({
            response_type: 'code',
            'client_id': clientId,
            redirect_uri: `${url}/callback`,
            scope: `preference:read`,
            code_challenge_method: 'S256',
            code_challenge: challenge
        }))
    })


    const getLichessToken = async (authCode: string, verifier: string, url: string) => await fetch('https://lichess.org/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'authorization_code',
            redirect_uri: `${url}/callback`,
            client_id: clientId,
            code: authCode,
            code_verifier: verifier
        })
    }).then(res => res.json())


    const getLichessUser = async (accessToken: string) => await fetch('https://lichess.org/api/account', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    }).then(res => res.json())


    router.get('/callback', async (req, res) => {
        const url = req.protocol + '://' + req.get('host') + req.baseUrl

        const verifier = req.session.verifier!
        const lichessToken = await getLichessToken(req.query.code as string, verifier, url)

        if (!lichessToken.access_token) {
            res.send('Failed getting token')
            return
        }

        const lichessUser = await getLichessUser(lichessToken.access_token)

        await set_or_create_new_lichess_user(req, lichessUser.username, lichessToken.access_token)

        const redirect_url = req.protocol + '://' + WEB_DOMAIN
        res.redirect(redirect_url)
    })
}