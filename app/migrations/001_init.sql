CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    token TEXT UNIQUE,
    created_at INTEGER NOT NULL
);


CREATE TABLE game_progress (
    id TEXT PRIMARY KEY,
    lichess_game_id TEXT UNIQUE
);

CREATE TABLE fen_steps (
    id TEXT PRIMARY KEY,
    line_id TEXT NOT NULL,
    ply INTEGER NOT NULL,
    fen TEXT NOT NULL,
    san TEXT NOT NULL,
    FOREIGN KEY(line_id) REFERENCES lines(id) ON DELETE CASCADE
);


CREATE TABLE lines (
    id TEXT PRIMARY KEY,
    playlist_id TEXT NOT NULL,
    name TEXT NOT NULL,
    pgn TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    version INTEGER NOT NULL,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);


CREATE TABLE playlists (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    name TEXT NOT NULL,
    nb_lines INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    version INTEGER NOT NULL,
    FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE books (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    author TEXT NOT NULL,
    nb_playlists INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    version INTEGER NOT NULL
);