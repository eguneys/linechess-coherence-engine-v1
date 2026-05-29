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
    FOREIGN KEY(line_id) REFERENCES lines(id)
);


CREATE TABLE lines (
    id TEXT PRIMARY KEY,
    playlist_id TEXT NOT NULL,
    name TEXT NOT NULL,
    san_moves TEXT NOT NULL,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id)
);


CREATE TABLE playlists (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY(book_id) REFERENCES books(id)
);

CREATE TABLE books (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);