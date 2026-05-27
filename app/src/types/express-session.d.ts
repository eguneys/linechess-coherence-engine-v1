import 'express-session'

declare module 'express-session' {
    interface SessionData {
        verifier: string
        user_id: string
    }
}