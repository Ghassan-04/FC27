// db.js - PostgreSQL connection pool (lazy, optional)
// The app still starts and tests still pass when DATABASE_URL is not set.
const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
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

module.exports = { query, transaction, isConfigured, checkDb, closeDb };
