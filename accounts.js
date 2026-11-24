// accounts.js - /api/auth/* and /api/squad routes (the parts that need the database)
const auth = require('./auth');
const db = require('./db');

const MAX_BODY = 10 * 1024; // 10 KB is plenty for these requests
const WINDOW = 15 * 60 * 1000;

function send(res, status, data, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(data));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new Error();
        resolve(body);
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

async function createSession(res, userId) {
  const { token, hash } = auth.newSessionToken();
  await db.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [hash, userId, String(auth.SESSION_DAYS)]
  );
  // opportunistic cleanup of expired sessions
  db.query('DELETE FROM sessions WHERE expires_at < now()').catch(() => {});
  return auth.sessionCookie(token);
}

async function currentUser(req) {
  const token = auth.parseCookies(req.headers.cookie)[auth.COOKIE_NAME];
  if (!token) return null;
  const r = await db.query(
    `SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [auth.hashToken(token)]
  );
  return r.rows[0] || null;
}

function clientIp(req) {
  return req.socket.remoteAddress || 'unknown';
}

// ---------- handlers ----------
async function register(req, res) {
  const { username, password } = await readJson(req);
  const problem = auth.validateCredentials(username, password);
  if (problem) return send(res, 400, { error: problem });
  if (!auth.rateLimit(`reg:${clientIp(req)}`, 10, WINDOW)) {
    return send(res, 429, { error: 'Too many attempts. Try again later.' });
  }

  const hash = await auth.hashPassword(password);
  let user;
  try {
    user = (
      await db.query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username', [
        username,
        hash,
      ])
    ).rows[0];
  } catch (err) {
    if (err.code === '23505') return send(res, 409, { error: 'That username is already taken.' });
    throw err;
  }
  const cookie = await createSession(res, user.id);
  return send(res, 201, { user: { username: user.username } }, { 'Set-Cookie': cookie });
}

async function login(req, res) {
  const { username, password } = await readJson(req);
  const generic = { error: 'Invalid username or password.' };
  if (typeof username !== 'string' || typeof password !== 'string' || password.length > 128) {
    return send(res, 401, generic);
  }

  const ipKey = `login-ip:${clientIp(req)}`;
  const userKey = `login-user:${username.toLowerCase()}`;
  if (!auth.rateLimit(ipKey, 30, WINDOW) || !auth.rateLimit(userKey, 5, WINDOW)) {
    return send(res, 429, { error: 'Too many attempts. Try again later.' });
  }

  const r = await db.query('SELECT id, username, password_hash FROM users WHERE lower(username) = lower($1)', [
    username,
  ]);
  const row = r.rows[0];
  if (!row) {
    await auth.dummyVerify(password);
    return send(res, 401, generic);
  }
  if (!(await auth.verifyPassword(password, row.password_hash))) return send(res, 401, generic);

  auth.rateLimitReset(userKey);
  const cookie = await createSession(res, row.id);
  return send(res, 200, { user: { username: row.username } }, { 'Set-Cookie': cookie });
}

async function logout(req, res) {
  const token = auth.parseCookies(req.headers.cookie)[auth.COOKIE_NAME];
  if (token) await db.query('DELETE FROM sessions WHERE token_hash = $1', [auth.hashToken(token)]);
  return send(res, 200, { ok: true }, { 'Set-Cookie': auth.sessionCookie('', { clear: true }) });
}

async function getSquad(user, res) {
  const r = await db.query('SELECT player_id FROM squad_players WHERE user_id = $1 ORDER BY slot', [user.id]);
  return send(res, 200, { playerIds: r.rows.map((x) => x.player_id) });
}

async function putSquad(user, req, res) {
  const { playerIds } = await readJson(req);
  const valid =
    Array.isArray(playerIds) &&
    playerIds.length <= 11 &&
    playerIds.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 64) &&
    new Set(playerIds).size === playerIds.length;
  if (!valid) return send(res, 400, { error: 'playerIds must be up to 11 unique player ids.' });

  try {
    await db.transaction(async (c) => {
      await c.query('DELETE FROM squad_players WHERE user_id = $1', [user.id]);
      if (playerIds.length) {
        await c.query(
          `INSERT INTO squad_players (user_id, player_id, slot)
           SELECT $1, t.player_id, t.ord - 1
           FROM unnest($2::text[]) WITH ORDINALITY AS t(player_id, ord)`,
          [user.id, playerIds]
        );
      }
    });
  } catch (err) {
    if (err.code === '23503') return send(res, 400, { error: 'Unknown player id.' });
    throw err;
  }
  return send(res, 200, { playerIds });
}

// Returns true if the request was handled here.
async function handleAccountRoutes(req, res, pathname) {
  const isAuth = pathname.startsWith('/api/auth/');
  if (!isAuth && pathname !== '/api/squad') return false;

  try {
    if (!db.isConfigured()) return send(res, 503, { error: 'Accounts are not available (no database).' }) || true;

    const method = req.method;
    if (method !== 'GET' && !auth.isSameOrigin(req)) return send(res, 403, { error: 'Cross-site request blocked.' }) || true;
    if (method !== 'GET' && !String(req.headers['content-type'] || '').startsWith('application/json')) {
      return send(res, 415, { error: 'Content-Type must be application/json.' }) || true;
    }

    if (pathname === '/api/auth/register' && method === 'POST') await register(req, res);
    else if (pathname === '/api/auth/login' && method === 'POST') await login(req, res);
    else if (pathname === '/api/auth/logout' && method === 'POST') await logout(req, res);
    else if (pathname === '/api/auth/me' && method === 'GET') {
      const user = await currentUser(req);
      send(res, 200, { user: user ? { username: user.username } : null });
    } else if (pathname === '/api/squad' && (method === 'GET' || method === 'PUT')) {
      const user = await currentUser(req);
      if (!user) send(res, 401, { error: 'Please log in.' });
      else if (method === 'GET') await getSquad(user, res);
      else await putSquad(user, req, res);
    } else {
      send(res, 404, { error: 'Not found' });
    }
  } catch (err) {
    if (err.status) send(res, err.status, { error: err.message });
    else {
      console.error('Account route error:', err.message);
      send(res, 500, { error: 'Server error' });
    }
  }
  return true;
}

module.exports = { handleAccountRoutes };
