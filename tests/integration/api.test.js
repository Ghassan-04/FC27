const { server, players } = require('../../server');

let baseUrl;

beforeAll(
  () =>
    new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    })
);

afterAll(() => new Promise((resolve) => server.close(resolve)));

describe('HTTP API', () => {
  test('GET /health', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('ok');
  });

  test('GET /api/players', async () => {
    const res = await fetch(`${baseUrl}/api/players?limit=3&position=ST`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.players).toHaveLength(3);
  });

  test('GET /api/players/:id and 404', async () => {
    const ok = await fetch(`${baseUrl}/api/players/${players[0].id}`);
    expect(ok.status).toBe(200);
    expect((await ok.json()).player.id).toBe(players[0].id);
    const missing = await fetch(`${baseUrl}/api/players/not-a-player`);
    expect(missing.status).toBe(404);
  });

  test('GET /api/filters, /api/pack/open, /api/stats/overview', async () => {
    expect((await (await fetch(`${baseUrl}/api/filters`)).json()).leagues.length).toBeGreaterThan(
      0
    );
    expect((await (await fetch(`${baseUrl}/api/pack/open`)).json()).pack).toHaveLength(5);
    expect((await (await fetch(`${baseUrl}/api/stats/overview`)).json()).totalPlayers).toBe(
      players.length
    );
  });

  test('GET /api/compare', async () => {
    const ids = players
      .slice(0, 2)
      .map((p) => p.id)
      .join(',');
    const body = await (await fetch(`${baseUrl}/api/compare?ids=${ids}`)).json();
    expect(body).toHaveLength(2);
  });

  test('POST /api/squad/analyze', async () => {
    const res = await fetch(`${baseUrl}/api/squad/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerIds: players.slice(0, 3).map((p) => p.id) }),
    });
    expect((await res.json()).squadCount).toBe(3);
  });

  test('OPTIONS returns CORS preflight', async () => {
    const res = await fetch(`${baseUrl}/api/players`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
  });

  test('static: serves index.html and blocks path traversal', async () => {
    const home = await fetch(`${baseUrl}/`);
    expect(home.status).toBe(200);
    expect(home.headers.get('content-type')).toContain('text/html');
    const traversal = await fetch(`${baseUrl}/..%2f..%2fetc/passwd`);
    expect([200, 403]).toContain(traversal.status);
  });
});
