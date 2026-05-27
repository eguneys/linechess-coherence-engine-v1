export const metrics = {
  requests: new Map<string, number>(),
  errors: new Map<string, number>(),
  scores: new Map<string, number>()
}

export function inc(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1)
}
