// server.js - EA Sports FC 27 Player Ratings Web Server
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { checkDb } = require('./db');
const { handleAccountRoutes } = require('./accounts');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const PLAYERS_FILE = path.join(__dirname, 'data', 'players.json');

// In-memory player database
let players = [];
try {
  const data = fs.readFileSync(PLAYERS_FILE, 'utf8');
  players = JSON.parse(data);
  console.log(`Loaded ${players.length} FC 27 players from database.`);
} catch (err) {
  console.error('Error loading players.json:', err);
  players = [];
}

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// Helper: send JSON response
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

// Helper: parse request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100 * 1024) {
        req.destroy(); // refuse oversized bodies
        resolve({});
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// Helper: Position categorization
const POSITION_GROUPS = {
  ATT: ['ST', 'CF', 'LW', 'RW'],
  MID: ['CAM', 'CM', 'CDM', 'LM', 'RM'],
  DEF: ['CB', 'LB', 'RB', 'LWB', 'RWB'],
  GK: ['GK'],
};

// Helper: normalize diacritics and special characters for search
function normalizeText(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[ø]/g, 'o')
    .replace(/[æ]/g, 'ae')
    .trim();
}

// API Handler: /health
function handleHealthCheck() {
  return {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'fc27-player-ratings',
    playersLoaded: players.length,
    version: '1.0.0',
  };
}

// API Handler: /api/players
function handleGetPlayers(query) {
  let filtered = [...players];

  // Text search (name, commonName, club, league, nation)
  if (query.q) {
    const q = normalizeText(query.q);
    filtered = filtered.filter(
      (p) =>
        normalizeText(p.name).includes(q) ||
        normalizeText(p.commonName).includes(q) ||
        normalizeText(p.club).includes(q) ||
        normalizeText(p.league).includes(q) ||
        normalizeText(p.nation).includes(q)
    );
  }

  // Position filter
  if (query.position && query.position !== 'ALL') {
    const pos = query.position.toUpperCase();
    if (POSITION_GROUPS[pos]) {
      // Group match (ATT, MID, DEF, GK)
      filtered = filtered.filter(
        (p) =>
          POSITION_GROUPS[pos].includes(p.position) ||
          (p.altPositions && p.altPositions.some((ap) => POSITION_GROUPS[pos].includes(ap)))
      );
    } else {
      // Exact position match
      filtered = filtered.filter(
        (p) => p.position === pos || (p.altPositions && p.altPositions.includes(pos))
      );
    }
  }

  // Rating range filter
  const ratingMin = parseInt(query.ratingMin, 10);
  const ratingMax = parseInt(query.ratingMax, 10);
  if (!isNaN(ratingMin)) filtered = filtered.filter((p) => p.rating >= ratingMin);
  if (!isNaN(ratingMax)) filtered = filtered.filter((p) => p.rating <= ratingMax);

  // Face Stat filters
  const paceMin = parseInt(query.paceMin, 10);
  const shootingMin = parseInt(query.shootingMin, 10);
  const passingMin = parseInt(query.passingMin, 10);
  const dribblingMin = parseInt(query.dribblingMin, 10);
  const defendingMin = parseInt(query.defendingMin, 10);
  const physicalMin = parseInt(query.physicalMin, 10);

  if (!isNaN(paceMin)) filtered = filtered.filter((p) => p.stats && p.stats.pac >= paceMin);
  if (!isNaN(shootingMin)) filtered = filtered.filter((p) => p.stats && p.stats.sho >= shootingMin);
  if (!isNaN(passingMin)) filtered = filtered.filter((p) => p.stats && p.stats.pas >= passingMin);
  if (!isNaN(dribblingMin))
    filtered = filtered.filter((p) => p.stats && p.stats.dri >= dribblingMin);
  if (!isNaN(defendingMin))
    filtered = filtered.filter((p) => p.stats && p.stats.def >= defendingMin);
  if (!isNaN(physicalMin)) filtered = filtered.filter((p) => p.stats && p.stats.phy >= physicalMin);

  // League filter
  if (query.league && query.league !== 'ALL') {
    filtered = filtered.filter((p) => p.league === query.league);
  }

  // Nation filter
  if (query.nation && query.nation !== 'ALL') {
    filtered = filtered.filter((p) => p.nation === query.nation);
  }

  // Club filter
  if (query.club && query.club !== 'ALL') {
    filtered = filtered.filter((p) => p.club === query.club);
  }

  // Card Type filter
  if (query.cardType && query.cardType !== 'ALL') {
    filtered = filtered.filter((p) => p.cardType === query.cardType);
  }

  // Gender filter
  if (query.gender && query.gender !== 'ALL') {
    filtered = filtered.filter((p) => p.gender === query.gender);
  }

  // Foot filter
  if (query.foot && query.foot !== 'ALL') {
    filtered = filtered.filter((p) => p.foot === query.foot);
  }

  // Skill moves min
  const skillMin = parseInt(query.skillMoves, 10);
  if (!isNaN(skillMin)) filtered = filtered.filter((p) => p.skillMoves >= skillMin);

  // Weak foot min
  const weakFootMin = parseInt(query.weakFoot, 10);
  if (!isNaN(weakFootMin)) filtered = filtered.filter((p) => p.weakFoot >= weakFootMin);

  // PlayStyle filter
  if (query.playstyle && query.playstyle !== 'ALL') {
    const ps = query.playstyle.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        (p.playStylesPlus && p.playStylesPlus.some((psp) => psp.toLowerCase().includes(ps))) ||
        (p.playStyles && p.playStyles.some((pst) => pst.toLowerCase().includes(ps)))
    );
  }

  // Sorting
  const sortBy = query.sortBy || 'rating';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  filtered.sort((a, b) => {
    if (sortBy === 'name') {
      return sortOrder * a.commonName.localeCompare(b.commonName);
    }
    if (sortBy === 'age') {
      return sortOrder * (a.age - b.age);
    }
    if (sortBy === 'price') {
      return sortOrder * ((a.priceEstimate || 0) - (b.priceEstimate || 0));
    }
    if (['pac', 'sho', 'pas', 'dri', 'def', 'phy'].includes(sortBy)) {
      const statA = a.stats ? a.stats[sortBy] || 0 : 0;
      const statB = b.stats ? b.stats[sortBy] || 0 : 0;
      return sortOrder * (statA - statB);
    }
    // Default: rating
    if (b.rating !== a.rating) {
      return sortOrder * (a.rating - b.rating);
    }
    // Secondary sort: pace
    return sortOrder * ((a.stats?.pac || 0) - (b.stats?.pac || 0));
  });

  // Pagination
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 24));
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedPlayers = filtered.slice(startIndex, startIndex + limit);

  return {
    total,
    page,
    limit,
    totalPages,
    players: paginatedPlayers,
  };
}

// API Handler: /api/filters
function handleGetFilters() {
  const leagues = new Map();
  const nations = new Map();
  const clubs = new Map();
  const cardTypes = new Map();
  const positions = new Map();
  const playStyles = new Set();

  players.forEach((p) => {
    leagues.set(p.league, (leagues.get(p.league) || 0) + 1);
    nations.set(p.nation, (nations.get(p.nation) || 0) + 1);
    clubs.set(p.club, (clubs.get(p.club) || 0) + 1);
    cardTypes.set(p.cardType, (cardTypes.get(p.cardType) || 0) + 1);
    positions.set(p.position, (positions.get(p.position) || 0) + 1);

    if (p.playStylesPlus) p.playStylesPlus.forEach((ps) => playStyles.add(ps));
    if (p.playStyles) p.playStyles.forEach((ps) => playStyles.add(ps));
  });

  return {
    leagues: Array.from(leagues.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    nations: Array.from(nations.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    clubs: Array.from(clubs.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    cardTypes: Array.from(cardTypes.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    positions: Array.from(positions.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    playStyles: Array.from(playStyles).sort(),
  };
}

// API Handler: /api/pack/open
function handlePackOpen() {
  // Select 5 random unique players from the database
  const shuffled = [...players].sort(() => 0.5 - Math.random());
  const pack = shuffled.slice(0, 5);

  // Highest rated player in pack
  const topPlayer = pack.reduce((prev, current) => (prev.rating > current.rating ? prev : current));
  const isWalkout = topPlayer.rating >= 88;
  const isBoard = topPlayer.rating >= 84 && topPlayer.rating < 88;

  return {
    pack,
    topPlayer,
    isWalkout,
    isBoard,
    openedAt: new Date().toISOString(),
  };
}

// API Handler: /api/compare
function handleCompare(idsString) {
  if (!idsString) return [];
  const ids = idsString.split(',').map((s) => s.trim().toLowerCase());
  return players.filter((p) => ids.includes(p.id.toLowerCase()));
}

// API Handler: /api/squad/analyze
function handleAnalyzeSquad(playerIds) {
  if (!Array.isArray(playerIds) || playerIds.length === 0) {
    return { error: 'No players provided' };
  }
  const squad = players.filter((p) => playerIds.includes(p.id));
  if (squad.length === 0) return { error: 'Players not found' };

  const avgRating = Math.round(squad.reduce((sum, p) => sum + p.rating, 0) / squad.length);
  const avgPace = Math.round(squad.reduce((sum, p) => sum + (p.stats?.pac || 0), 0) / squad.length);
  const avgShooting = Math.round(
    squad.reduce((sum, p) => sum + (p.stats?.sho || 0), 0) / squad.length
  );
  const avgPassing = Math.round(
    squad.reduce((sum, p) => sum + (p.stats?.pas || 0), 0) / squad.length
  );
  const avgDefending = Math.round(
    squad.reduce((sum, p) => sum + (p.stats?.def || 0), 0) / squad.length
  );
  const avgPhysical = Math.round(
    squad.reduce((sum, p) => sum + (p.stats?.phy || 0), 0) / squad.length
  );
  const totalValue = squad.reduce((sum, p) => sum + (p.priceEstimate || 0), 0);

  // Calculate chemistry preview based on club, nation, league matches
  const nationCounts = {};
  const leagueCounts = {};
  const clubCounts = {};

  squad.forEach((p) => {
    nationCounts[p.nation] = (nationCounts[p.nation] || 0) + 1;
    leagueCounts[p.league] = (leagueCounts[p.league] || 0) + 1;
    clubCounts[p.club] = (clubCounts[p.club] || 0) + 1;
  });

  let chemPoints = 0;
  Object.values(nationCounts).forEach((c) => {
    if (c >= 2) chemPoints += c;
  });
  Object.values(leagueCounts).forEach((c) => {
    if (c >= 3) chemPoints += c * 1.2;
  });
  Object.values(clubCounts).forEach((c) => {
    if (c >= 2) chemPoints += c * 1.5;
  });

  const chemistry = Math.min(33, Math.round((chemPoints / (squad.length * 2)) * 33)) || 18;

  return {
    squadCount: squad.length,
    avgRating,
    avgPace,
    avgShooting,
    avgPassing,
    avgDefending,
    avgPhysical,
    totalValue,
    chemistry,
    squad,
  };
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Basic security headers on every response
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // Accounts & per-user squad (login required, needs the database)
  if (await handleAccountRoutes(req, res, pathname)) return;

  // API Routes
  if (pathname === '/health' || pathname === '/api/health') {
    const result = handleHealthCheck();
    return sendJSON(res, 200, result);
  }

  if (pathname === '/api/health/db') {
    const ok = await checkDb();
    return sendJSON(res, ok ? 200 : 503, { database: ok ? 'up' : 'down' });
  }

  if (pathname === '/api/players') {
    const result = handleGetPlayers(parsedUrl.query);
    return sendJSON(res, 200, result);
  }

  if (pathname.startsWith('/api/players/')) {
    const playerId = pathname.replace('/api/players/', '').trim();
    const player = players.find((p) => p.id.toLowerCase() === playerId.toLowerCase());
    if (!player) {
      return sendJSON(res, 404, { error: 'Player not found' });
    }
    // Find similar players (same position, close rating)
    const similarPlayers = players
      .filter(
        (p) =>
          p.id !== player.id &&
          (p.position === player.position || Math.abs(p.rating - player.rating) <= 2)
      )
      .slice(0, 4);

    return sendJSON(res, 200, { player, similarPlayers });
  }

  if (pathname === '/api/filters') {
    const result = handleGetFilters();
    return sendJSON(res, 200, result);
  }

  if (pathname === '/api/pack/open') {
    const result = handlePackOpen();
    return sendJSON(res, 200, result);
  }

  if (pathname === '/api/compare') {
    const result = handleCompare(parsedUrl.query.ids);
    return sendJSON(res, 200, result);
  }

  if (pathname === '/api/squad/analyze' && method === 'POST') {
    const body = await parseBody(req);
    const result = handleAnalyzeSquad(body.playerIds);
    return sendJSON(res, 200, result);
  }

  if (pathname === '/api/stats/overview') {
    const highestRated = [...players].sort((a, b) => b.rating - a.rating)[0];
    const fastest = [...players].sort((a, b) => (b.stats?.pac || 0) - (a.stats?.pac || 0))[0];
    const bestShooter = [...players].sort((a, b) => (b.stats?.sho || 0) - (a.stats?.sho || 0))[0];
    const bestDribbler = [...players].sort((a, b) => (b.stats?.dri || 0) - (a.stats?.dri || 0))[0];
    const bestPasser = [...players].sort((a, b) => (b.stats?.pas || 0) - (a.stats?.pas || 0))[0];

    return sendJSON(res, 200, {
      totalPlayers: players.length,
      highestRated,
      fastest,
      bestShooter,
      bestDribbler,
      bestPasser,
    });
  }

  // Static File Serving
  let filePath =
    pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);

  // Security: prevent path traversal
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(normalizedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If file not found, try serving index.html for SPA fallback or 404
      const fallbackPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(fallbackPath, (fallbackErr, data) => {
        if (fallbackErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          return res.end('404 Not Found');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      });
      return;
    }

    const ext = path.extname(normalizedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });

    const stream = fs.createReadStream(normalizedPath);
    stream.pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`⚡ EA SPORTS FC 27 Player Ratings Search Engine`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`===============================================`);
  });
}

module.exports = {
  server,
  handleHealthCheck,
  handleGetPlayers,
  handleGetFilters,
  handlePackOpen,
  handleCompare,
  handleAnalyzeSquad,
  players,
};
