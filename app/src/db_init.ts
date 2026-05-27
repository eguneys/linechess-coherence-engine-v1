import sqlite3, { type Database } from "better-sqlite3";

export let db: Database


export async function init_db() {
    db = sqlite3('data/linechess.db', {})
    db.pragma('journal_mode = WAL');
    return db
}