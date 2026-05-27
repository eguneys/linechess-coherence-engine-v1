
import config from '../config.json' with { type: "json" }

export const DEV = config.ENV !== 'production'

export const PORT = config.PORT
export const SECRET = config.SECRET

export const WEB_DOMAIN = config.WEB_DOMAIN