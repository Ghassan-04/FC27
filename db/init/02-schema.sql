-- Runs ONCE, on first start of an empty data volume, as the admin user.
-- The app user (fc27_app) automatically gets SELECT/INSERT/UPDATE/DELETE on new tables
-- (see 01-create-app-user.sh); players is tightened to read-only at the bottom.

-- ---------------------------------------------------------------
-- players: the card database (seeded from data/players.json by 03-seed-players.sql)
-- ---------------------------------------------------------------
CREATE TABLE players (
  id             TEXT PRIMARY KEY,                 -- slug, e.g. 'kylian-mbappe'
  name           TEXT NOT NULL,
  common_name    TEXT NOT NULL,
  rating         SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 99),
  position       TEXT NOT NULL,
  alt_positions  TEXT[] NOT NULL DEFAULT '{}',
  card_type      TEXT NOT NULL,
  club           TEXT NOT NULL,
  league         TEXT NOT NULL,
  nation         TEXT NOT NULL,
  nation_code    TEXT,
  flag           TEXT,
  gender         CHAR(1),
  age            SMALLINT,
  height         SMALLINT,
  weight         SMALLINT,
  foot           TEXT,
  skill_moves    SMALLINT CHECK (skill_moves BETWEEN 1 AND 5),
  weak_foot      SMALLINT CHECK (weak_foot BETWEEN 1 AND 5),
  work_rate_att  TEXT,
  work_rate_def  TEXT,
  price_estimate INTEGER NOT NULL DEFAULT 0 CHECK (price_estimate >= 0),
  avatar_color   TEXT,
  card_accent    TEXT,
  pac SMALLINT, sho SMALLINT, pas SMALLINT, dri SMALLINT, def SMALLINT, phy SMALLINT,
  detailed_stats JSONB NOT NULL DEFAULT '{}',      -- the 29 sub-stats, grouped as in the JSON
  play_styles_plus TEXT[] NOT NULL DEFAULT '{}',
  play_styles      TEXT[] NOT NULL DEFAULT '{}',
  bio            TEXT
);

CREATE INDEX players_rating_idx   ON players (rating DESC);
CREATE INDEX players_position_idx ON players (position);
CREATE INDEX players_club_idx     ON players (club);
CREATE INDEX players_league_idx   ON players (league);
CREATE INDEX players_nation_idx   ON players (nation);

-- ---------------------------------------------------------------
-- users: one row per account. Only a salted scrypt hash of the password is stored.
-- ---------------------------------------------------------------
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL CHECK (username ~ '^[A-Za-z0-9_]{3,30}$'),
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Usernames are unique ignoring case ("Ghassan" and "ghassan" are the same account)
CREATE UNIQUE INDEX users_username_lower_idx ON users (lower(username));

-- ---------------------------------------------------------------
-- sessions: logged-in browsers. Only the SHA-256 of the cookie token is stored,
-- so a database leak does not hand out usable sessions.
-- ---------------------------------------------------------------
CREATE TABLE sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessions_user_idx    ON sessions (user_id);
CREATE INDEX sessions_expires_idx ON sessions (expires_at);

-- ---------------------------------------------------------------
-- squad_players: each user's Dream XI (replaces localStorage 'fc27_squad').
-- slot 0..10 = the starting XI. One squad per user.
-- ---------------------------------------------------------------
CREATE TABLE squad_players (
  user_id   UUID     NOT NULL REFERENCES users (id)   ON DELETE CASCADE,
  player_id TEXT     NOT NULL REFERENCES players (id) ON DELETE RESTRICT,
  slot      SMALLINT NOT NULL CHECK (slot BETWEEN 0 AND 10),
  PRIMARY KEY (user_id, slot),
  UNIQUE (user_id, player_id)                       -- same player can't be added twice
);
CREATE INDEX squad_players_player_idx ON squad_players (player_id);

-- The card catalogue is read-only for the app
REVOKE INSERT, UPDATE, DELETE ON players FROM fc27_app;
