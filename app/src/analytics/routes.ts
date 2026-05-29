import { Router } from "express";
import { ErrorFetchingUsername, FetchGamesSinceError, serve_username_query } from "./services.js";
import { rateLimit } from "../rate_limit.js";

export function init_analytics_routes(router: Router) {

    router.use('/evaluate', async (req, res) => {
        let query_username = req.query.username

        if (typeof query_username !== 'string' || query_username.length < 3) {
            res.status(400).send({error: 'Bad username'})
            return
        }

        try {
            let result = await serve_username_query(query_username)
            res.send({ result })
        } catch (error) {
            if (error instanceof ErrorFetchingUsername) {
                res.status(404).send({ error: 'Username not found' })
            } else if (error instanceof FetchGamesSinceError) {
                res.status(500).send({ error: 'Error fetching games'})
            } else {
                res.status(500).send({ error: 'Internal server error'})
            }
        }
    })

}