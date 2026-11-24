// auth.js - password hashing, session tokens, validation, rate limiting.
// Pure helpers with NO database access, so they are easy to unit-test.
// Uses only Node's built-in crypto (no extra dependencies).
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
const SESSION_DAYS = 7;
const COOKIE_NAME = 'sid';

// ---------- validation ----------
const USERNAME_RE = /^[A-Za-z0-9_]{3,30}$/;

function validateCredentials(username, password) {
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    return 'Username must be 3-30 characters: letters, numbers or underscore.';
  }
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    return 'Password must be between 10 and 128 characters.';
  }
  return null;
}

// ---------- password hashing (scrypt + random salt) ----------
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join('$');
}

async function verifyPassword(password, stored) {
  try {
    const [scheme, N, r, p, saltB64, keyB64] = String(stored).split('$');
    if (scheme !== 'scrypt') return false;
    const expected = Buffer.from(keyB64, 'base64');
    const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
    });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// Verifying against this when the user does not exist keeps response time the same,
// so an attacker cannot tell "unknown user" from "wrong password" by timing.
let dummyHash = null;
async function dummyVerify(password) {
  if (!dummyHash) dummyHash = await hashPassword('dummy-password-for-timing');
  await verifyPassword(password, dummyHash);
}

// ---------- session tokens ----------
function newSessionToken() {
  const token = crypto.randomBytes(32).toString('base64url'); // goes in the cookie
  return { token, hash: hashToken(token) }; // only the hash goes in the database
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

// ---------- cookies ----------
function parseCookies(header) {
  const out = {};
  String(header || '')
    .split(';')
    .forEach((part) => {
      const i = part.indexOf('=');
      if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
    });
  return out;
}

function sessionCookie(token, { clear = false } = {}) {
  const parts = [`${COOKIE_NAME}=${clear ? '' : token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  parts.push(clear ? 'Max-Age=0' : `Max-Age=${SESSION_DAYS * 24 * 3600}`);
  // Set COOKIE_SECURE=true once the site is served over HTTPS
  if (process.env.COOKIE_SECURE === 'true') parts.push('Secure');
  return parts.join('; ');
}

// ---------- CSRF: reject cross-site requests that carry an Origin header ----------
function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser clients / same-origin GETs
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

// ---------- tiny in-memory rate limiter ----------
const buckets = new Map();

// Returns true if the action is allowed; false once `max` hits occurred within `windowMs`.
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  if (buckets.size > 10000) {
    for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
  }
  let b = buckets.get(key);
  if (!b || b.reset <= now) {
    b = { count: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  return b.count <= max;
}

function rateLimitReset(key) {
  buckets.delete(key);
}

module.exports = {
  SESSION_DAYS,
  COOKIE_NAME,
  validateCredentials,
  hashPassword,
  verifyPassword,
  dummyVerify,
  newSessionToken,
  hashToken,
  parseCookies,
  sessionCookie,
  isSameOrigin,
  rateLimit,
  rateLimitReset,
};
