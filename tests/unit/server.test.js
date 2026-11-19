const {
  handleHealthCheck,
  handleGetPlayers,
  handleGetFilters,
  handlePackOpen,
  handleCompare,
  handleAnalyzeSquad,
  players,
} = require('../../server');

describe('server handlers', () => {
  test('database is loaded', () => {
    expect(players.length).toBeGreaterThan(0);
  });

  test('health check reports ok and player count', () => {
    const res = handleHealthCheck();
    expect(res.status).toBe('ok');
    expect(res.playersLoaded).toBe(players.length);
  });

  test('getPlayers paginates and sorts by rating desc by default', () => {
    const res = handleGetPlayers({ limit: '5' });
    expect(res.players).toHaveLength(5);
    expect(res.limit).toBe(5);
    const ratings = res.players.map((p) => p.rating);
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
  });

  test('getPlayers filters by text, ignoring diacritics', () => {
    const res = handleGetPlayers({ q: 'mbappe' });
    expect(res.total).toBeGreaterThan(0);
    expect(res.players.some((p) => p.commonName.includes('Mbappé'))).toBe(true);
  });

  test('getPlayers filters by position group and exact position', () => {
    const gk = handleGetPlayers({ position: 'GK', limit: '100' });
    expect(gk.players.every((p) => p.position === 'GK' || p.altPositions.includes('GK'))).toBe(
      true
    );
    const st = handleGetPlayers({ position: 'ST', limit: '100' });
    expect(st.total).toBeGreaterThan(0);
    const att = handleGetPlayers({ position: 'ATT', limit: '100' });
    expect(att.total).toBeGreaterThanOrEqual(st.total);
  });

  test('getPlayers applies rating and stat filters', () => {
    const res = handleGetPlayers({ ratingMin: '90', paceMin: '90', limit: '100' });
    res.players.forEach((p) => {
      expect(p.rating).toBeGreaterThanOrEqual(90);
      expect(p.stats.pac).toBeGreaterThanOrEqual(90);
    });
    const capped = handleGetPlayers({ ratingMax: '80', limit: '100' });
    capped.players.forEach((p) => expect(p.rating).toBeLessThanOrEqual(80));
  });

  test('getPlayers supports alternative sort keys and ascending order', () => {
    const byName = handleGetPlayers({ sortBy: 'name', sortOrder: 'asc', limit: '100' });
    const names = byName.players.map((p) => p.commonName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    const byPace = handleGetPlayers({ sortBy: 'pac', limit: '10' });
    expect(byPace.players[0].stats.pac).toBeGreaterThanOrEqual(byPace.players[9].stats.pac);
    const byPrice = handleGetPlayers({ sortBy: 'price', limit: '10' });
    expect(byPrice.players[0].priceEstimate).toBeGreaterThanOrEqual(
      byPrice.players[9].priceEstimate
    );
    expect(handleGetPlayers({ sortBy: 'age', limit: '5' }).players).toHaveLength(5);
  });

  test('getPlayers applies categorical and attribute filters', () => {
    const sample = players[0];
    const checks = [
      [{ league: sample.league }, (p) => p.league === sample.league],
      [{ nation: sample.nation }, (p) => p.nation === sample.nation],
      [{ club: sample.club }, (p) => p.club === sample.club],
      [{ cardType: sample.cardType }, (p) => p.cardType === sample.cardType],
      [{ gender: sample.gender }, (p) => p.gender === sample.gender],
      [{ foot: sample.foot }, (p) => p.foot === sample.foot],
      [{ skillMoves: '4' }, (p) => p.skillMoves >= 4],
      [{ weakFoot: '4' }, (p) => p.weakFoot >= 4],
      [{ shootingMin: '85' }, (p) => p.stats.sho >= 85],
      [{ passingMin: '80' }, (p) => p.stats.pas >= 80],
      [{ dribblingMin: '85' }, (p) => p.stats.dri >= 85],
      [{ defendingMin: '80' }, (p) => p.stats.def >= 80],
      [{ physicalMin: '85' }, (p) => p.stats.phy >= 85],
    ];
    checks.forEach(([query, predicate]) => {
      const res = handleGetPlayers({ ...query, limit: '100' });
      expect(res.total).toBeGreaterThan(0);
      expect(res.players.every(predicate)).toBe(true);
    });
  });

  test('getPlayers filters by playstyle', () => {
    const style = players.find((p) => p.playStylesPlus && p.playStylesPlus.length)
      .playStylesPlus[0];
    const res = handleGetPlayers({ playstyle: style, limit: '100' });
    expect(res.total).toBeGreaterThan(0);
  });

  test('getPlayers returns an empty page for no matches', () => {
    const res = handleGetPlayers({ q: 'zzzz-no-such-player' });
    expect(res.total).toBe(0);
    expect(res.totalPages).toBe(1);
  });

  test('getFilters returns lists of leagues, nations, clubs and playstyles', () => {
    const f = handleGetFilters();
    ['leagues', 'nations', 'clubs', 'cardTypes', 'positions', 'playStyles'].forEach((k) =>
      expect(f[k].length).toBeGreaterThan(0)
    );
  });

  test('packOpen returns 5 unique players', () => {
    const res = handlePackOpen();
    expect(res.pack).toHaveLength(5);
    expect(new Set(res.pack.map((p) => p.id)).size).toBe(5);
    expect(res.topPlayer.rating).toBe(Math.max(...res.pack.map((p) => p.rating)));
  });

  test('compare resolves ids case-insensitively', () => {
    const id = players[0].id;
    expect(handleCompare(id.toUpperCase())).toHaveLength(1);
    expect(handleCompare('')).toEqual([]);
  });

  test('analyzeSquad validates input and computes averages', () => {
    expect(handleAnalyzeSquad([]).error).toBeDefined();
    expect(handleAnalyzeSquad(['nobody']).error).toBeDefined();
    const ids = players.slice(0, 3).map((p) => p.id);
    const res = handleAnalyzeSquad(ids);
    expect(res.squadCount).toBe(3);
    expect(res.chemistry).toBeLessThanOrEqual(33);
  });
});
