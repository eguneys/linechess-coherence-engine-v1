import crypto from 'crypto'
import { Request, Response, NextFunction, Router } from 'express'
import { JWT_SECRET, WEB_DOMAIN } from '../config.js'
import { set_or_create_new_lichess_user } from '../services.js'
import { rateLimit } from '../rate_limit.js'

import jwt from 'jsonwebtoken'
import { get_existing_user_by_userId } from '../db_layer.js'
import { UserId } from '../types.js'
import { insert_oauth_state, get_verifier_by_state, set_exchange_token_by_state, delete_and_get_exchange_token } from './db_layer.js'

declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}

const clientId = 'linechess-api'

const base64URLEncode = (str: Buffer) => str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

const sha256 = (buffer: string) => crypto.createHash('sha256').update(buffer).digest()

const createState = () => base64URLEncode(crypto.randomBytes(32))
const createVerifier = () => base64URLEncode(crypto.randomBytes(32))
const createChallenge = (verifier: string) => base64URLEncode(sha256(verifier))

const createExchangeCode = () => base64URLEncode(crypto.randomBytes(32))

export function init_lichess_auth_routes(router: Router) {
    router.get('/login', async (req, res) => {

        const url = req.protocol + '://' + req.get('host') + req.baseUrl

        const state = createState()
        const verifier = createVerifier()
        const challenge = createChallenge(verifier)

        await insert_oauth_state(state, verifier)
        res.redirect('https://lichess.org/oauth?' + new URLSearchParams({
            response_type: 'code',
            'client_id': clientId,
            redirect_uri: `${url}/callback`,
            state,
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

        const state = req.query.state as string
        const verifier = await get_verifier_by_state(state)
        if (!verifier) {
            res.send('Failed getting verifier')
            return
        }
        const lichessToken = await getLichessToken(req.query.code as string, verifier, url)

        if (!lichessToken.access_token) {
            res.send('Failed getting token')
            return
        }

        const lichessUser = await getLichessUser(lichessToken.access_token)

        let user = await set_or_create_new_lichess_user(req, lichessUser.username, lichessToken.access_token)

        const redirect_url = req.protocol + '://' + WEB_DOMAIN
        if (!user) {
            res.redirect(redirect_url)
        } else {
            let token = issueToken(user.id)
            let exchange_code = createExchangeCode()
            let exchange_token = token
            set_exchange_token_by_state(state, exchange_code, token)
            res.redirect(redirect_url + `?code=${encodeURIComponent(exchange_code)}`)
        }
    })
}



export function init_account_auth_routes(router: Router) {

    router.get('/profile', authenticateToken, async (req, res) => {
        let user = await get_existing_user_by_userId(req.user_id)
        res.send(user)
    })


    router.post('/code', async (req, res) => {

        let code = req.body?.code

        if (typeof code !== 'string') {
            res.status(400).send({error: 'Bad request'})
            return
        }

        let token = await delete_and_get_exchange_token(code)

        if (!token) {
            res.status(401).send({ error: 'Invalid code'})
            return
        }

        res.send({token})

    })
}

export const issueToken = (user_id: UserId) => {
    const token = jwt.sign(user_id, JWT_SECRET)
    return token
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  // Get the token from the Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Splits "Bearer <token>"

  if (!token) return res.status(401).json({ error: "Access denied" });

  try {
    // Verify the token using your secret key
    const verifiedUser = jwt.verify(token, JWT_SECRET) as string;
    req.user_id = verifiedUser; // Attach user info to the request object
    next(); // Move to the actual route handler
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
};