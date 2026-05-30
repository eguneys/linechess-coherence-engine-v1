CREATE TABLE lines_db_version (
    version INTEGER NOT NULL
);

INSERT OR IGNORE INTO lines_db_version (version) VALUES (0);