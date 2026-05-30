import { Router } from "express";
import { rateLimit } from "../rate_limit.js";
import { apply_mutations_for_user_id } from "./services.js";

export function init_sync_routes(router: Router) {

    router.use('/sync/mutations', async (req, res) => {

        if (!req.session.user_id) {
            res.status(401).json({error: 'Unauthorized'})
            return
        }

        if (!req.body.mutations || !Array.isArray(req.body.mutations) || req.body.mutations.length === 0) {
            res.status(400).json({error: 'Bad request'})
            return
        }

        try {
            await apply_mutations_for_user_id(req.session.user_id, req.body.mutations)
            res.json({ok: true })
        } catch (e) {
            console.error(e)
            res.status(500).send({ error: 'Internal server error' })
        }
    })

    router.use('/sync', async (req, res) => {
        let mutations: any[] = []
        res.send({mutations})
    })


}