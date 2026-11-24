// test/auth.test.js - unit tests for auth helpers (no database needed)
const assert = require('assert');
const auth = require('../auth.js');

(async () => {
  console.log('🔐 Auth helper tests\n');

  // Validation
  assert.strictEqual(auth.validateCredentials('ghassan_1', 'a-long-password'), null);
  assert(auth.validateCredentials('ab', 'a-long-password'), 'short username rejected');
  assert(auth.validateCredentials('bad name!', 'a-long-password'), 'invalid characters rejected');
  assert(auth.validateCredentials('ghassan', 'short'), 'short password rejected');
  assert(auth.validateCredentials('ghassan', 'x'.repeat(129)), 'huge password rejected');
  assert(auth.validateCredentials({ $ne: '' }, 'a-long-password'), 'non-string username rejected');
  console.log('✅ Credential validation');

  // Password hashing
  const hash = await auth.hashPassword('correct-horse-battery');
  assert(hash.startsWith('scrypt$'), 'uses scrypt');
  assert(!hash.includes('correct-horse'), 'plaintext not in hash');
  assert(await auth.verifyPassword('correct-horse-battery', hash), 'right password verifies');
  assert(!(await auth.verifyPassword('wrong-password-xx', hash)), 'wrong password fails');
  assert(!(await auth.verifyPassword('x', 'garbage')), 'malformed hash fails safely');
  assert.notStrictEqual(hash, await auth.hashPassword('correct-horse-battery'), 'salted: hashes differ');
  console.log('✅ Password hashing (scrypt, salted)');

  // Session tokens
  const t = auth.newSessionToken();
  assert(t.token.length >= 43, 'token has 256 bits of randomness');
  assert.strictEqual(t.hash, auth.hashToken(t.token));
  assert.notStrictEqual(t.token, t.hash, 'database stores the hash, not the token');
  console.log('✅ Session tokens');

  // Cookies
  assert.strictEqual(auth.parseCookies('a=1; sid=abc; b=2').sid, 'abc');
  const c = auth.sessionCookie('tok');
  assert(c.includes('HttpOnly') && c.includes('SameSite=Lax'), 'cookie flags set');
  assert(auth.sessionCookie('', { clear: true }).includes('Max-Age=0'), 'logout clears cookie');
  console.log('✅ Cookie handling');

  // Origin check (CSRF)
  assert(auth.isSameOrigin({ headers: { host: 'a.com' } }));
  assert(auth.isSameOrigin({ headers: { host: 'a.com', origin: 'http://a.com' } }));
  assert(!auth.isSameOrigin({ headers: { host: 'a.com', origin: 'http://evil.com' } }));
  console.log('✅ Same-origin check');

  // Rate limiting
  const results = [1, 2, 3, 4].map(() => auth.rateLimit('test-key', 3, 60000));
  assert.deepStrictEqual(results, [true, true, true, false]);
  auth.rateLimitReset('test-key');
  assert(auth.rateLimit('test-key', 3, 60000), 'reset works');
  console.log('✅ Rate limiter');

  console.log('\n🎉 ALL AUTH TESTS PASSED');
})().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
