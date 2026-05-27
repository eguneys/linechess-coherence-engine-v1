import { User, UserId } from "./types.js";
import { db } from './db_init.js'
import { gen_id8 } from "./controller.js";

class UserDontExist extends Error {
    constructor(user_id: string) {
        super(`User doesn't exist ${user_id}`)
    }
}

export async function get_existing_user_by_username(username: string): Promise<User | undefined> {
    const row = await db.prepare<string, User>(`
            SELECT * FROM users
            WHERE username = ?
        `).get(username)

    return row
}



export async function get_existing_user_by_userId(user_id: UserId): Promise<User | undefined> {
    const row = await db.prepare<string, User>(`
            SELECT * FROM users
            WHERE id = ?
        `).get(user_id)

    return row
}

export async function update_existing_user(user_id: UserId, username: string, token: string): Promise<User | undefined> {

    const row = await db.prepare<string, User>(`
            SELECT * FROM users
            WHERE id = ?
        `).get(user_id)

    if (!row) {
        throw new UserDontExist(user_id)
    }

    if (row.username !== username || row.token !== token) {

        const updated = await db.prepare<[string, string, string], User>(`
            UPDATE users 
            SET username = ?, token = ?
            WHERE id = ?
            RETURNING *
        `).get(username, token, user_id);

        return updated;
    }
}

export async function create_new_user(username: string, token: string): Promise<User> {

    let userId = gen_id8()

    return await db.prepare<[string, string, string], User>(
        `INSERT INTO users (id, created_at, username, token)
       VALUES (?, datetime('now'), ?, ?)
       RETURNING *`,
    ).get(userId, username, token)!
}