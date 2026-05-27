export type LogLevel = 'info' | 'warn' | 'error'

export function log(level: LogLevel, message: string, meta: Record<string, any> = {}) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...meta
  }))
}
