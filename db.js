// db.js - PostgreSQL connection pool (lazy, optional)
// The app still starts and tests still pass when DATABASE_URL is not set.
const { Pool } = require('pg');

let pool = null;

// Turns DATABASE_URL into discrete pool options. The standard URL parser throws
// "Invalid URL" when the password contains characters like / + ? # (e.g. random
// base64 passwords), which made every account request fail with "Server error".
// Splitting manually at the LAST "@" accepts any password.
function parseDatabaseUrl(raw) {
  const m = /^postgres(?:ql)?:\/\/([^:/@]+):(.*)@([^@/:?#]+)(?::(\d+))?\/([^?#]+)(?:[?#].*)?$/.exec(raw);
  if (!m) return { connectionString: raw };
  const safeDecode = (v) => {
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  return {
    user: safeDecode(m[1]),
    password: safeDecode(m[2]),
    host: m[3],
    port: m[4] ? Number(m[4]) : 5432,
    database: safeDecode(m[5]),
  };
}

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      ...parseDatabaseUrl(process.env.DATABASE_URL),
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    // Never crash the app on an idle-client error
    pool.on('error', (err) => console.error('Postgres pool error:', err.message));
  }
  return pool;
}

// ALWAYS pass user input via `params` ($1, $2, ...). Never build SQL with string concatenation.
async function query(text, params) {
  const p = getPool();
  if (!p) throw new Error('DATABASE_URL is not configured');
  return p.query(text, params);
}

function isConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

// Runs fn(client) inside BEGIN/COMMIT; rolls back on any error.
async function transaction(fn) {
  const p = getPool();
  if (!p) throw new Error('DATABASE_URL is not configured');
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function checkDb() {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function closeDb() {
  if (pool) await pool.end();
  pool = null;
}

module.exports = { parseDatabaseUrl, query, transaction, isConfigured, checkDb, closeDb };
