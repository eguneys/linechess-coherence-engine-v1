import type { Database } from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { DEV } from './config.js'

type Migration = {
    id: number
    name: string
    applied_at: number
}

export async function runMigrations(db: Database) {

    await db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            applied_at INTEGER
        )
    `)

    const applied = new Set(
        (await db.prepare<{}, Migration>(`SELECT name FROM migrations`)).all({}).map(r => r.name)
    )

    const files = fs.readdirSync('./migrations').sort()

    for (const file of files) {
        if (applied.has(file)) continue

        if (!DEV && file.match(/test/)) {
            continue
        }

        const sql = fs.readFileSync(`./migrations/${file}`, 'utf8')

        await db.exec(sql)
        await db.prepare(
            `INSERT INTO migrations (name, applied_at) VALUES (?, ?)`
        ).run(
            file,
            Date.now()
        )

        console.log(`Applied migration ${file}`)
    }
}