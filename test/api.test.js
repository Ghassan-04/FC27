// test/api.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  handleHealthCheck,
  handleGetPlayers,
  handleGetFilters,
  handlePackOpen,
  handleCompare,
  handleAnalyzeSquad,
  players
} = require('../server.js');

console.log('🧪 Starting FC 27 Ratings Search Engine Test Suite...\n');

// Test 1: Player database count
console.log('Test 1: Player database has loaded');
assert(players.length >= 70, `Expected at least 70 players, got ${players.length}`);
console.log(`✅ Loaded ${players.length} players.`);

// Test 2: Search by query (Mbappé)
console.log('\nTest 2: Search for "Mbappe"');
const mbappeResults = handleGetPlayers({ q: 'Mbappe' });
assert(mbappeResults.players.length >= 1, 'Should find at least 1 Mbappe card');
assert(mbappeResults.players[0].commonName.includes('Mbappé'), 'Result should be Mbappe');
console.log(`✅ Found ${mbappeResults.players.length} matching card(s).`);

// Test 3: Filter by Position (ST)
console.log('\nTest 3: Filter by Position "ST"');
const stResults = handleGetPlayers({ position: 'ST' });
assert(stResults.players.length > 0, 'Should find strikers');
assert(stResults.players.every(p => p.position === 'ST' || (p.altPositions && p.altPositions.includes('ST'))), 'All results must match ST');
console.log(`✅ Found ${stResults.total} strikers.`);

// Test 4: Filter by Minimum Rating (90+)
console.log('\nTest 4: Filter by Rating (90 - 99)');
const eliteResults = handleGetPlayers({ ratingMin: '90' });
assert(eliteResults.players.length > 0, 'Should find 90+ rated players');
assert(eliteResults.players.every(p => p.rating >= 90), 'All results must have rating >= 90');
console.log(`✅ Found ${eliteResults.total} players with 90+ OVR.`);

// Test 5: Filter by Pace (94+ Pace)
console.log('\nTest 5: Filter by Pace (94+ PAC)');
const speedResults = handleGetPlayers({ paceMin: '94' });
assert(speedResults.players.length > 0, 'Should find speed demons');
assert(speedResults.players.every(p => p.stats.pac >= 94), 'All results must have pace >= 94');
console.log(`✅ Found ${speedResults.total} players with 94+ pace.`);

// Test 6: Sort by Shooting Descending
console.log('\nTest 6: Sort by Shooting Descending');
const shootSorted = handleGetPlayers({ sortBy: 'sho', sortOrder: 'desc' });
for (let i = 0; i < shootSorted.players.length - 1; i++) {
  assert(shootSorted.players[i].stats.sho >= shootSorted.players[i + 1].stats.sho, 'Shooting should be descending');
}
console.log(`✅ Sorted correctly. Top shooter: ${shootSorted.players[0].commonName} (${shootSorted.players[0].stats.sho} SHO)`);

// Test 7: Filters list endpoint
console.log('\nTest 7: Filters extraction');
const filters = handleGetFilters();
assert(filters.leagues.length > 0, 'Must have leagues');
assert(filters.nations.length > 0, 'Must have nations');
assert(filters.cardTypes.length > 0, 'Must have card types');
assert(filters.playStyles.length > 0, 'Must have playstyles');
console.log(`✅ Filters summary: ${filters.leagues.length} leagues, ${filters.nations.length} nations, ${filters.cardTypes.length} card rarities, ${filters.playStyles.length} playstyles.`);

// Test 8: Pack Opening Simulation
console.log('\nTest 8: FC 27 Pack Opener simulation');
const pack = handlePackOpen();
assert.strictEqual(pack.pack.length, 5, 'Pack should contain exactly 5 players');
assert(pack.topPlayer !== null, 'Pack must designate a top player');
console.log(`✅ Pack opened: Top player was ${pack.topPlayer.commonName} (${pack.topPlayer.rating} OVR). Walkout: ${pack.isWalkout}`);

// Test 9: Player Comparison
console.log('\nTest 9: Player comparison');
const compared = handleCompare('kylian-mbappe,erling-haaland');
assert.strictEqual(compared.length, 2, 'Should return 2 players for comparison');
console.log(`✅ Compared ${compared[0].commonName} vs ${compared[1].commonName}`);

// Test 10: Squad Chemistry Analysis
console.log('\nTest 10: Squad chemistry & ratings analyzer');
const squadAnalysis = handleAnalyzeSquad(['kylian-mbappe', 'jude-bellingham', 'rodri', 'william-saliba']);
assert(squadAnalysis.avgRating >= 85, 'Average rating should be computed');
assert(squadAnalysis.chemistry > 0, 'Chemistry should be computed');
assert(squadAnalysis.totalValue > 0, 'Total squad value should be computed');
console.log(`✅ Squad analysis: Rating ${squadAnalysis.avgRating}, Chemistry ${squadAnalysis.chemistry}/33, Value: ${squadAnalysis.totalValue.toLocaleString()} coins.`);

// Test 11: Static files verification
console.log('\nTest 11: Static files exist');
const indexPath = path.join(__dirname, '..', 'public', 'index.html');
const cssPath = path.join(__dirname, '..', 'public', 'css', 'style.css');
const jsPath = path.join(__dirname, '..', 'public', 'js', 'app.js');

assert(fs.existsSync(indexPath) && fs.statSync(indexPath).size > 1000, 'index.html should exist');
assert(fs.existsSync(cssPath) && fs.statSync(cssPath).size > 1000, 'style.css should exist');
assert(fs.existsSync(jsPath) && fs.statSync(jsPath).size > 1000, 'app.js should exist');
console.log(`✅ All frontend assets verified (HTML: ${fs.statSync(indexPath).size}B, CSS: ${fs.statSync(cssPath).size}B, JS: ${fs.statSync(jsPath).size}B).`);

// Test 12: Health check endpoint
console.log('\nTest 12: Health check endpoint');
const health = handleHealthCheck();
assert.strictEqual(health.status, 'ok', 'Status should be ok');
assert(typeof health.uptime === 'number' && health.uptime >= 0, 'Uptime should be a number >= 0');
assert(health.playersLoaded >= 70, 'Players loaded should be at least 70');
assert.strictEqual(health.service, 'fc27-player-ratings', 'Service name should match');
console.log(`✅ Health check verified: status=${health.status}, uptime=${health.uptime.toFixed(2)}s, playersLoaded=${health.playersLoaded}.`);

console.log('\n🎉 ALL 12 TESTS PASSED SUCCESSFULLY! 🚀');
