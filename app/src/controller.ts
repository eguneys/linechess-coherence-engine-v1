import { Router } from "express";
import { db } from "./db_init.js";

import crypto from 'crypto'
import { rateLimit, RateLimitError } from "./rate_limit.js";
import { getCache, invalidateCache, setCache } from "./cache.js";
import { DEV } from "./config.js";
import { inc, metrics } from "./metrics.js";
import { init_lichess_auth_routes } from "./lichess_oauth.js";
import { get_existing_user_by_userId } from "./db_layer.js";
import { init_sync_routes } from "./sync_routes.js";
import { init_analytics_routes } from "./analytics/routes.js";


export const gen_id8 = () => Math.random().toString(16).slice(2, 10)


class LockedDayError extends Error {}
class InvalidHashError extends Error {}


export const router = Router()

router.use(async (req, res, next) => {
    try {
        let ip = req.ip
        if (ip) {
            await rateLimit(ip, 'ip_fast', 15, 5)
            await rateLimit(ip, 'ip_hour', 100, 3600)
        }
    } catch (error) {
        if (error instanceof RateLimitError) {
            return res.status(429).json({
                error: 'Too many requests, please try again later'
            })
        }
    }

    next()
})

init_lichess_auth_routes(router)

init_account_auth_routes(router)

init_sync_routes(router)

init_analytics_routes(router)

function init_account_auth_routes(router: Router) {

    router.get('/logout', async (req, res) => {
        if (req.session.user_id) {
            //await logout_user(req.session.user_id)
            req.session.user_id = undefined
            res.send({ ok: true })
        } else {
            res.status(404).send({ error: 'Not logged in' })
        }
    })

    router.get('/profile', async (req, res) => {
        if (req.session.user_id) {
            let user = await get_existing_user_by_userId(req.session.user_id)
            res.send(user)
        } else {
            res.status(401).send({ error: 'Not logged in' })
        }
    })
}