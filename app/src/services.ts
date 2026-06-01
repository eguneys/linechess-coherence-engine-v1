import { Request } from "express";
import { create_new_user, get_existing_user_by_userId, get_existing_user_by_username, update_existing_user } from "./db_layer.js";

export async function set_or_create_new_lichess_user(req: Request, username: string, token: string) {


    let user = await get_existing_user_by_username(username)

    if (!user) {
        let new_user = await create_new_user(username, token)
        return new_user
    } else if (user.token !== token) {
        return await update_existing_user(user.id, username, token)
    } else {
        return user
    }

}