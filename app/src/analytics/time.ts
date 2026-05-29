// (60 * 60 * 24 = 86400 seconds in a day) * 1000 Ms
export const YesterdayMs = () => (Math.floor(Date.now() / 1000) - (60 * 60 * 24)) * 1000