import { LRUCache } from 'lru-cache/raw'
import { db } from './db_init.js'
import { log } from './logging.js'
import { DEV } from './config.js'

export class RateLimitError extends Error {}

type RateLimit = {
    key: string
    count: number
    reset_at: string
}

async function rateLimitDb(
  userId: string,
  endpoint: string,
  limit: number,
  windowSeconds: number
) {
  const key = `${userId}:${endpoint}`
  const now = Date.now()
  const resetAt = new Date(now + windowSeconds * 1000).toISOString()

  const row = await db.prepare<string, RateLimit>(
    `SELECT count, reset_at FROM rate_limits WHERE key = ?`,
  ).get(key)

  if (!row) {
    await db.prepare(
      `INSERT INTO rate_limits (key, count, reset_at)
       VALUES (?, 1, ?)`,
    ).run([key, resetAt])
    return
  }

  if (new Date(row.reset_at).getTime() < now) {
    await db.prepare(
      `UPDATE rate_limits
       SET count = 1, reset_at = ?
       WHERE key = ?`,
    ).run([resetAt, key])
    return
  }

  if (row.count >= limit) {
    throw new RateLimitError()
  }

  await db.prepare(
    `UPDATE rate_limits
     SET count = count + 1
     WHERE key = ?`,
  ).run(key)
}


const rateLimitCache = new LRUCache<string, RateLimit>({
  max: 10_000
})

export async function rateLimit(
  userId: string,
  endpoint: string,
  limit: number,
  windowSeconds: number
) {

  if (DEV) return

  const key = `${userId}:${endpoint}`
  const now = Date.now()
  const resetAt = new Date(now + windowSeconds * 1000).toISOString()

  const row = rateLimitCache.get(key)


  if (!row) {
    let count = 1
    rateLimitCache.set(key, { key, count, reset_at: resetAt })
    return
  }

  if (new Date(row.reset_at).getTime() < now) {
    row.count = 1
    row.reset_at = resetAt

    return
  }

  row.count = row.count + 1

  if (row.count >= limit) {
    log('warn', `Hit Rate Limit ${row.count}/${limit} : ${userId}/${endpoint}`)
    throw new RateLimitError(`${userId}/${endpoint} ${row.count}/${limit}`)
  }

}