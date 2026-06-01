import { db } from '../db_init.js'

export async function insert_oauth_state(state: string, verifier: string) {
    await db.prepare(`
    INSERT INTO oauth_states (state, verifier, expires_at)
        VALUES (?, ?, datetime('now', '+60 seconds'))
`).run(state, verifier)
}

export async function get_verifier_by_state(state: string) {
    let res = await db.prepare<[string], {verifier: string}>(`
     SELECT verifier FROM oauth_states
     WHERE state = ?
 `).get(state)

 return res?.verifier
}

export async function set_exchange_token_by_state(state: string, exchange_code: string, exchange_token: string) {
    let res = await db.prepare<[string, string, string], {verifier: string}>(`
     UPDATE oauth_states
     SET exchange_code = ?, exchange_token = ?
     WHERE state = ?
 `).run(exchange_code, exchange_token, state)
}


export async function delete_and_get_exchange_token(exchange_code: string) {
    let token = await db.prepare<string, { exchange_token: string }>(`
    DELETE FROM oauth_states 
    WHERE exchange_code = ?
    RETURNING exchange_token
`).get(exchange_code)

    return token?.exchange_token
}

export async function delete_expires_oauth_states() {
    await db.prepare(`
    DELETE FROM oauth_states 
    WHERE expires_at < datetime('now')
`).run()
}