import { Router } from "express";
import { rateLimit } from "./rate_limit.js";

export function init_sync_routes(router: Router) {

    router.use('/sync/mutations', async (req, res) => {

    })

}