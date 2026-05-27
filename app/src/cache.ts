type CacheEntry<T> = {
  value: T
  expires_at: number
}

const leaderboardCache = new Map<string, CacheEntry<any>>()

export function getCache<T>(key: string): T | undefined {
  const entry = leaderboardCache.get(key)
  if (!entry) return

  if (entry.expires_at < Date.now()) {
    leaderboardCache.delete(key)
    return
  }

  return entry.value
}

export function setCache<T>(key: string, value: T, ttlMs: number) {
  leaderboardCache.set(key, {
    value,
    expires_at: Date.now() + ttlMs
  })
}


export function invalidateCache(key: string) {
    leaderboardCache.delete(key)
}