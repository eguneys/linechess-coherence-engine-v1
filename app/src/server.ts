import { init_db } from "./db_init.js";
import { log } from "./logging.js";
import express from 'express'
import { RateLimitError } from "./rate_limit.js";
import { inc, metrics } from "./metrics.js";
import { router } from "./controller.js";
import bodyParser from "body-parser";
import { runMigrations } from "./migrations.js";
import cors from 'cors'

import { SECRET } from './config.js'

import session from 'express-session'

let app = express()

app.use(express.json())
app.use(bodyParser.json());
app.use(cors({ credentials: true, origin: true }));

app.set('trust proxy', 'loopback')


app.use(session({
  secret: SECRET,
  resave: false,
  saveUninitialized: false
}))

app.use((req, _, next) => {
  inc(metrics.requests, req.path)
  next()
})

app.get('/health', (_, res) => {
  res.send({ ok: true })
})

app.get('/metrics', (req, res) => {
  res.send({
    requests: Object.fromEntries(metrics.requests),
    errors: Object.fromEntries(metrics.errors),
    scores: Object.fromEntries(metrics.scores)
  })
})

app.use(router)

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  
    if (err instanceof RateLimitError)
        return res.status(429).send({ error: 'Too many requests' })

  log('error', 'unhandled_error', {
    path: req.path,
    method: req.method,
    message: err.message
  })



  res.status(500).send({
    error: 'Internal server error'
  })
})

app.use((req, res) => {
  res.status(404).send({error: "Not found"});
});


import { PORT as CONFIG_PORT } from './config.js'

init_db().then(async (db) => {
  await runMigrations(db)

  const PORT = process.env.PORT || CONFIG_PORT || 3300

  app.listen(PORT, (err) => {
    if (err) {
      log('error', err.message)
      return
    }
    log('info', `LineChess API running on ${PORT}`)
  })

})