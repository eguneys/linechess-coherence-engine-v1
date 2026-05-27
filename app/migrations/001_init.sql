CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    token TEXT UNIQUE,
    created_at INTEGER NOT NULL
);