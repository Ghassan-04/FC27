// public/js/app.js - EA SPORTS FC 27 Ratings Search Engine
document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    q: '',
    position: 'ALL',
    ratingMin: 75,
    ratingMax: 99,
    paceMin: 0,
    shootingMin: 0,
    passingMin: 0,
    dribblingMin: 0,
    defendingMin: 0,
    physicalMin: 0,
    league: 'ALL',
    nation: 'ALL',
    club: 'ALL',
    cardType: 'ALL',
    gender: 'ALL',
    foot: 'ALL',
    skillMoves: 0,
    weakFoot: 0,
    playstyle: 'ALL',
    sortBy: 'rating',
    sortOrder: 'desc',
    page: 1,
    limit: 24,
    view: 'grid' // 'grid' | 'table'
  };

  // Compare & Squad List
  let compareIds = [];
  let squadIds = JSON.parse(localStorage.getItem('fc27_squad') || '[]');

  let currentUser = null; // { username } when logged in; the squad then lives on the server


  // Cached data
  let allFilters = null;
  let currentResults = null;

  // DOM Elements
  const searchInput = document.getElementById('search-input');
  const navSearchInput = document.getElementById('nav-search-input');
  const playerGrid = document.getElementById('player-grid');
  const playerTableBody = document.getElementById('player-table-body');
  const playerTableContainer = document.getElementById('player-table-container');
  const resultsCount = document.getElementById('results-count');
  const paginationContainer = document.getElementById('pagination-container');
  const activeTagsBar = document.getElementById('active-tags-bar');
  const sortSelect = document.getElementById('sort-select');
  const sortOrderBtn = document.getElementById('sort-order-btn');
  const viewGridBtn = document.getElementById('view-grid-btn');
  const viewTableBtn = document.getElementById('view-table-btn');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  const compareTray = document.getElementById('compare-tray');
  const compareSlotsContainer = document.getElementById('compare-slots');
  const openCompareModalBtn = document.getElementById('open-compare-modal-btn');
  const squadNavBtn = document.getElementById('squad-nav-btn');
  const squadCountBadge = document.getElementById('squad-count-badge');
  const packNavBtn = document.getElementById('pack-nav-btn');

  // Modals
  const detailModal = document.getElementById('detail-modal');
  const compareModal = document.getElementById('compare-modal');
  const squadModal = document.getElementById('squad-modal');
  const packModal = document.getElementById('pack-modal');

  // Sliders & inputs
  const ratingMinSlider = document.getElementById('rating-min-slider');
  const ratingMaxSlider = document.getElementById('rating-max-slider');
  const paceMinSlider = document.getElementById('pace-min-slider');
  const shootingMinSlider = document.getElementById('shooting-min-slider');
  const dribblingMinSlider = document.getElementById('dribbling-min-slider');
  const defendingMinSlider = document.getElementById('defending-min-slider');
  const physicalMinSlider = document.getElementById('physical-min-slider');

  // Badges for sliders
  const ratingValBadge = document.getElementById('rating-val-badge');
  const paceValBadge = document.getElementById('pace-val-badge');
  const shootingValBadge = document.getElementById('shooting-val-badge');
  const dribblingValBadge = document.getElementById('dribbling-val-badge');
  const defendingValBadge = document.getElementById('defending-val-badge');
  const physicalValBadge = document.getElementById('physical-val-badge');

  // Select dropdowns
  const leagueSelect = document.getElementById('league-select');
  const nationSelect = document.getElementById('nation-select');
  const clubSelect = document.getElementById('club-select');
  const cardTypeSelect = document.getElementById('card-type-select');
  const playstyleSelect = document.getElementById('playstyle-select');

  // -------------------------------------------------------------
  // Dynamic Player SVG Silhouette Generator
  // -------------------------------------------------------------
  function getPlayerAvatarSVG(player) {
    const kitColor = player.avatarColor || '#00ff85';
    const isGold = player.cardType === 'Gold Rare';
    const isToty = player.cardType === 'TOTY';
    const isIcon = player.cardType === 'Icon';
    const isHero = player.cardType === 'Hero';
    const isFuture = player.cardType === 'Future Stars';

    let strokeColor = '#00ff85';
    if (isToty) strokeColor = '#00f0ff';
    if (isIcon) strokeColor = '#ffd700';
    if (isFuture) strokeColor = '#c440ff';
    if (isHero) strokeColor = '#ff0077';
    if (isGold) strokeColor = '#f4c430';

    // Unique initials
    const initials = player.commonName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return `
      <svg class="fut-player-avatar-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="kitGrad-${player.id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${kitColor}" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#0e1422" stop-opacity="0.95"/>
          </linearGradient>
          <linearGradient id="haloGrad-${player.id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0"/>
          </linearGradient>
          <filter id="glow-${player.id}" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Aura glow circle -->
        <circle cx="70" cy="65" r="46" fill="url(#haloGrad-${player.id})" filter="url(#glow-${player.id})" />

        <!-- Futuristic athlete silhouette -->
        <!-- Torso / Jersey -->
        <path d="M40 120 C40 98, 52 84, 70 84 C88 84, 100 98, 100 120 Z" fill="url(#kitGrad-${player.id})" stroke="${strokeColor}" stroke-width="1.5" />
        
        <!-- Jersey Collar V -->
        <path d="M60 84 L70 98 L80 84" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" fill="none" />

        <!-- Neck -->
        <rect x="64" y="68" width="12" height="18" rx="3" fill="#e0ac69" />

        <!-- Head / Face -->
        <path d="M52 50 C52 32, 88 32, 88 50 C88 64, 78 72, 70 72 C62 72, 52 64, 52 50 Z" fill="#e0ac69" />

        <!-- Hair / Head Contour styling -->
        <path d="M50 46 C50 30, 60 22, 70 22 C80 22, 90 30, 90 46 C84 38, 76 36, 70 36 C64 36, 56 38, 50 46 Z" fill="#222" />

        <!-- Dynamic energetic geometric visor/accent -->
        <path d="M56 46 L84 46" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" opacity="0.85" />
        <circle cx="70" cy="46" r="2.5" fill="#fff" />

        <!-- Player Monogram Badge -->
        <rect x="58" y="104" width="24" height="15" rx="4" fill="rgba(0,0,0,0.6)" stroke="${strokeColor}" stroke-width="1" />
        <text x="70" y="115" text-anchor="middle" fill="#fff" font-size="9" font-weight="900" font-family="'Rajdhani', sans-serif">${initials}</text>
      </svg>
    `;
  }

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  async function fetchFilters() {
    try {
      const res = await fetch('/api/filters');
      allFilters = await res.json();
      populateDropdowns();
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  }

  async function fetchOverviewStats() {
    try {
      const res = await fetch('/api/stats/overview');
      const data = await res.json();
      renderStatsBanner(data);
    } catch (err) {
      console.error('Failed to load stats overview:', err);
    }
  }

  async function fetchPlayers() {
    try {
      // Build query string
      const params = new URLSearchParams();
      if (state.q) params.set('q', state.q);
      if (state.position !== 'ALL') params.set('position', state.position);
      if (state.ratingMin > 75) params.set('ratingMin', state.ratingMin);
      if (state.ratingMax < 99) params.set('ratingMax', state.ratingMax);
      if (state.paceMin > 0) params.set('paceMin', state.paceMin);
      if (state.shootingMin > 0) params.set('shootingMin', state.shootingMin);
      if (state.dribblingMin > 0) params.set('dribblingMin', state.dribblingMin);
      if (state.defendingMin > 0) params.set('defendingMin', state.defendingMin);
      if (state.physicalMin > 0) params.set('physicalMin', state.physicalMin);
      if (state.league !== 'ALL') params.set('league', state.league);
      if (state.nation !== 'ALL') params.set('nation', state.nation);
      if (state.club !== 'ALL') params.set('club', state.club);
      if (state.cardType !== 'ALL') params.set('cardType', state.cardType);
      if (state.gender !== 'ALL') params.set('gender', state.gender);
      if (state.foot !== 'ALL') params.set('foot', state.foot);
      if (state.skillMoves > 0) params.set('skillMoves', state.skillMoves);
      if (state.weakFoot > 0) params.set('weakFoot', state.weakFoot);
      if (state.playstyle !== 'ALL') params.set('playstyle', state.playstyle);

      params.set('sortBy', state.sortBy);
      params.set('sortOrder', state.sortOrder);
      params.set('page', state.page);
      params.set('limit', state.limit);

      const res = await fetch(`/api/players?${params.toString()}`);
      currentResults = await res.json();

      renderResults();
      renderPagination();
      renderActiveTags();
      updateCompareTray();
    } catch (err) {
      console.error('Error fetching players:', err);
    }
  }

  // -------------------------------------------------------------
  // Rendering Helpers
  // -------------------------------------------------------------
  function populateDropdowns() {
    if (!allFilters) return;

    // Leagues
    leagueSelect.innerHTML = '<option value="ALL">All Leagues</option>';
    allFilters.leagues.forEach(l => {
      leagueSelect.innerHTML += `<option value="${l.name}">${l.name} (${l.count})</option>`;
    });

    // Nations
    nationSelect.innerHTML = '<option value="ALL">All Nations</option>';
    allFilters.nations.forEach(n => {
      nationSelect.innerHTML += `<option value="${n.name}">${n.name} (${n.count})</option>`;
    });

    // Clubs
    clubSelect.innerHTML = '<option value="ALL">All Clubs</option>';
    allFilters.clubs.forEach(c => {
      clubSelect.innerHTML += `<option value="${c.name}">${c.name} (${c.count})</option>`;
    });

    // Card Types
    cardTypeSelect.innerHTML = '<option value="ALL">All Card Types</option>';
    allFilters.cardTypes.forEach(ct => {
      cardTypeSelect.innerHTML += `<option value="${ct.name}">${ct.name} (${ct.count})</option>`;
    });

    // PlayStyles
    playstyleSelect.innerHTML = '<option value="ALL">All PlayStyles</option>';
    allFilters.playStyles.forEach(ps => {
      playstyleSelect.innerHTML += `<option value="${ps}">${ps}</option>`;
    });
  }

  function renderStatsBanner(data) {
    const banner = document.getElementById('stats-banner');
    if (!banner || !data) return;

    banner.innerHTML = `
      <div class="stat-leader-card" data-id="${data.highestRated.id}">
        <div class="stat-leader-badge">
          <span class="score">${data.highestRated.rating}</span>
          <span class="label">OVR</span>
        </div>
        <div class="stat-leader-info">
          <span class="stat-leader-type">Top Rated Star</span>
          <span class="stat-leader-name">${data.highestRated.commonName}</span>
          <span class="stat-leader-club">${data.highestRated.club}</span>
        </div>
      </div>

      <div class="stat-leader-card" data-id="${data.fastest.id}">
        <div class="stat-leader-badge" style="color: #00f0ff; border-color: rgba(0, 240, 255, 0.4);">
          <span class="score">${data.fastest.stats.pac}</span>
          <span class="label">PAC</span>
        </div>
        <div class="stat-leader-info">
          <span class="stat-leader-type">Speed Demon</span>
          <span class="stat-leader-name">${data.fastest.commonName}</span>
          <span class="stat-leader-club">${data.fastest.club}</span>
        </div>
      </div>

      <div class="stat-leader-card" data-id="${data.bestShooter.id}">
        <div class="stat-leader-badge" style="color: #ffd700; border-color: rgba(255, 215, 0, 0.4);">
          <span class="score">${data.bestShooter.stats.sho}</span>
          <span class="label">SHO</span>
        </div>
        <div class="stat-leader-info">
          <span class="stat-leader-type">Golden Boot</span>
          <span class="stat-leader-name">${data.bestShooter.commonName}</span>
          <span class="stat-leader-club">${data.bestShooter.club}</span>
        </div>
      </div>

      <div class="stat-leader-card" data-id="${data.bestDribbler.id}">
        <div class="stat-leader-badge" style="color: #c440ff; border-color: rgba(196, 64, 255, 0.4);">
          <span class="score">${data.bestDribbler.stats.dri}</span>
          <span class="label">DRI</span>
        </div>
        <div class="stat-leader-info">
          <span class="stat-leader-type">Dribble Wizard</span>
          <span class="stat-leader-name">${data.bestDribbler.commonName}</span>
          <span class="stat-leader-club">${data.bestDribbler.club}</span>
        </div>
      </div>
    `;

    banner.querySelectorAll('.stat-leader-card').forEach(card => {
      card.addEventListener('click', () => {
        openPlayerDetail(card.getAttribute('data-id'));
      });
    });
  }

  function getCardThemeClass(cardType) {
    switch (cardType) {
      case 'TOTY': return 'theme-toty';
      case 'Icon': return 'theme-icon';
      case 'Hero': return 'theme-hero';
      case 'Future Stars': return 'theme-future-stars';
      case 'Centurions': return 'theme-centurions';
      default: return 'theme-gold-rare';
    }
  }

  function formatPrice(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return Math.round(num / 1000) + 'K';
    return num.toLocaleString();
  }

  function renderResults() {
    if (!currentResults) return;

    resultsCount.innerHTML = `Showing <span>${currentResults.players.length}</span> of <span>${currentResults.total}</span> players`;

    if (currentResults.players.length === 0) {
      playerGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚽</div>
          <h3 class="empty-title">No Players Match Your Search</h3>
          <p class="empty-desc">Try loosening your rating or stat filters, or search with a different keyword.</p>
          <button class="filter-reset-btn" id="empty-reset-btn" style="padding: 0.6rem 1.25rem; font-size: 0.9rem;">Reset All Filters</button>
        </div>
      `;
      document.getElementById('empty-reset-btn')?.addEventListener('click', resetAllFilters);
      playerTableBody.innerHTML = '';
      return;
    }

    if (state.view === 'grid') {
      playerGrid.style.display = 'grid';
      playerTableContainer.style.display = 'none';
      renderCardGrid(currentResults.players);
    } else {
      playerGrid.style.display = 'none';
      playerTableContainer.style.display = 'block';
      renderTableView(currentResults.players);
    }
  }

  function renderCardGrid(players) {
    playerGrid.innerHTML = '';

    players.forEach(p => {
      const isComparing = compareIds.includes(p.id);
      const isSquad = squadIds.includes(p.id);
      const themeClass = getCardThemeClass(p.cardType);

      const cardWrapper = document.createElement('div');
      cardWrapper.className = 'fut-card-wrapper';

      const playstylePlusBadge = (p.playStylesPlus && p.playStylesPlus.length > 0)
        ? `<div class="fut-card-playstyle-plus"><span>★</span> ${p.playStylesPlus[0]}</div>`
        : '';

      const stats = p.stats || { pac: 0, sho: 0, pas: 0, dri: 0, def: 0, phy: 0 };

      cardWrapper.innerHTML = `
        <div class="fut-card ${themeClass}" data-player-id="${p.id}">
          <div class="fut-card-bg-pattern"></div>
          
          <div class="fut-card-header">
            <div class="fut-card-badge-col">
              <span class="fut-card-rating">${p.rating}</span>
              <span class="fut-card-position">${p.position}</span>
              <span class="fut-card-flag" title="${p.nation}">${p.flag || '🏳️'}</span>
            </div>
            ${playstylePlusBadge}
          </div>

          <div class="fut-card-player-art">
            ${getPlayerAvatarSVG(p)}
          </div>

          <div class="fut-card-name-bar">
            <div class="fut-card-name">${p.commonName}</div>
            <div class="fut-card-fullname">${p.club}</div>
          </div>

          <div class="fut-card-stats-grid">
            <div class="fut-stat-item">
              <span class="fut-stat-value">${stats.pac}</span>
              <span class="fut-stat-label">${p.position === 'GK' ? 'DIV' : 'PAC'}</span>
            </div>
            <div class="fut-stat-item">
              <span class="fut-stat-value">${stats.sho}</span>
              <span class="fut-stat-label">${p.position === 'GK' ? 'HAN' : 'SHO'}</span>
            </div>
            <div class="fut-stat-item">
              <span class="fut-stat-value">${stats.pas}</span>
              <span class="fut-stat-label">${p.position === 'GK' ? 'KIC' : 'PAS'}</span>
            </div>
            <div class="fut-stat-item">
              <span class="fut-stat-value">${stats.dri}</span>
              <span class="fut-stat-label">${p.position === 'GK' ? 'REF' : 'DRI'}</span>
            </div>
            <div class="fut-stat-item">
              <span class="fut-stat-value">${stats.def}</span>
              <span class="fut-stat-label">${p.position === 'GK' ? 'SPD' : 'DEF'}</span>
            </div>
            <div class="fut-stat-item">
              <span class="fut-stat-value">${stats.phy}</span>
              <span class="fut-stat-label">${p.position === 'GK' ? 'POS' : 'PHY'}</span>
            </div>
          </div>

          <div class="fut-card-bottom-meta">
            <div class="fut-card-stars">
              <span title="Skill Moves">SM: ${p.skillMoves}★</span>
              <span>•</span>
              <span title="Weak Foot">WF: ${p.weakFoot}★</span>
            </div>
            <div class="fut-card-price" title="Estimated Market Value">
              🪙 ${formatPrice(p.priceEstimate)}
            </div>
          </div>
        </div>

        <div class="fut-card-actions">
          <button class="card-action-btn view-stats-btn" data-id="${p.id}">
            🔍 Stats
          </button>
          <button class="card-action-btn compare-btn ${isComparing ? 'active' : ''}" data-id="${p.id}">
            ⚖️ ${isComparing ? 'Comparing' : 'Compare'}
          </button>
          <button class="card-action-btn squad-btn ${isSquad ? 'active' : ''}" data-id="${p.id}">
            ${isSquad ? '★ In Squad' : '+ Squad'}
          </button>
        </div>
      `;

      // Event listeners on card
      cardWrapper.querySelector('.fut-card').addEventListener('click', () => {
        openPlayerDetail(p.id);
      });
      cardWrapper.querySelector('.view-stats-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openPlayerDetail(p.id);
      });
      cardWrapper.querySelector('.compare-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCompare(p);
      });
      cardWrapper.querySelector('.squad-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSquad(p);
      });

      playerGrid.appendChild(cardWrapper);
    });
  }

  function renderTableView(players) {
    playerTableBody.innerHTML = '';

    players.forEach(p => {
      const isComparing = compareIds.includes(p.id);
      const isSquad = squadIds.includes(p.id);
      const stats = p.stats || { pac: 0, sho: 0, pas: 0, dri: 0, def: 0, phy: 0 };
      const ratingClass = p.rating >= 90 ? 'rating-high' : 'rating-mid';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="table-rating-pill ${ratingClass}">${p.rating}</span></td>
        <td>
          <div class="table-player-cell">
            <div class="table-player-avatar">${p.flag}</div>
            <div>
              <div style="font-weight: 800; color: #fff;">${p.commonName}</div>
              <div style="font-size: 0.72rem; color: var(--text-dim);">${p.name}</div>
            </div>
          </div>
        </td>
        <td><strong>${p.position}</strong></td>
        <td>${p.club}</td>
        <td>${p.league}</td>
        <td><span class="stat-pill ${stats.pac >= 85 ? 'high' : 'mid'}">${stats.pac}</span></td>
        <td><span class="stat-pill ${stats.sho >= 85 ? 'high' : 'mid'}">${stats.sho}</span></td>
        <td><span class="stat-pill ${stats.pas >= 85 ? 'high' : 'mid'}">${stats.pas}</span></td>
        <td><span class="stat-pill ${stats.dri >= 85 ? 'high' : 'mid'}">${stats.dri}</span></td>
        <td><span class="stat-pill ${stats.def >= 80 ? 'high' : 'mid'}">${stats.def}</span></td>
        <td><span class="stat-pill ${stats.phy >= 80 ? 'high' : 'mid'}">${stats.phy}</span></td>
        <td>${p.skillMoves}★ / ${p.weakFoot}★</td>
        <td style="color: #ffd700; font-weight: 800;">🪙 ${formatPrice(p.priceEstimate)}</td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="nav-btn btn-sm compare-btn ${isComparing ? 'active' : ''}" data-id="${p.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
              ⚖️
            </button>
            <button class="nav-btn btn-sm squad-btn ${isSquad ? 'active' : ''}" data-id="${p.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
              ${isSquad ? '★' : '+'}
            </button>
          </div>
        </td>
      `;

      tr.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          openPlayerDetail(p.id);
        }
      });

      tr.querySelector('.compare-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCompare(p);
      });
      tr.querySelector('.squad-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSquad(p);
      });

      playerTableBody.appendChild(tr);
    });
  }

  function renderPagination() {
    if (!currentResults || currentResults.totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    const { page, totalPages } = currentResults;
    let html = `
      <button class="page-btn" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">◀ Prev</button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
        html += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
      } else if (i === page - 3 || i === page + 3) {
        html += `<span style="color: var(--text-dim);">...</span>`;
      }
    }

    html += `
      <button class="page-btn" ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}">Next ▶</button>
    `;

    paginationContainer.innerHTML = html;

    paginationContainer.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.getAttribute('data-page'), 10);
        if (p && p !== state.page) {
          state.page = p;
          fetchPlayers();
          window.scrollTo({ top: 380, behavior: 'smooth' });
        }
      });
    });
  }

  function renderActiveTags() {
    activeTagsBar.innerHTML = '';
    const tags = [];

    if (state.q) tags.push({ label: `Search: "${state.q}"`, clear: () => { state.q = ''; searchInput.value = ''; navSearchInput.value = ''; } });
    if (state.position !== 'ALL') tags.push({ label: `Position: ${state.position}`, clear: () => setPosition('ALL') });
    if (state.ratingMin > 75) tags.push({ label: `Min OVR: ${state.ratingMin}`, clear: () => { state.ratingMin = 75; ratingMinSlider.value = 75; ratingValBadge.innerText = '75 - 99'; } });
    if (state.ratingMax < 99) tags.push({ label: `Max OVR: ${state.ratingMax}`, clear: () => { state.ratingMax = 99; ratingMaxSlider.value = 99; ratingValBadge.innerText = '75 - 99'; } });
    if (state.paceMin > 0) tags.push({ label: `Min Pace: ${state.paceMin}`, clear: () => { state.paceMin = 0; paceMinSlider.value = 0; paceValBadge.innerText = '0+'; } });
    if (state.shootingMin > 0) tags.push({ label: `Min Shooting: ${state.shootingMin}`, clear: () => { state.shootingMin = 0; shootingMinSlider.value = 0; shootingValBadge.innerText = '0+'; } });
    if (state.dribblingMin > 0) tags.push({ label: `Min Dribbling: ${state.dribblingMin}`, clear: () => { state.dribblingMin = 0; dribblingMinSlider.value = 0; dribblingValBadge.innerText = '0+'; } });
    if (state.league !== 'ALL') tags.push({ label: `League: ${state.league}`, clear: () => { state.league = 'ALL'; leagueSelect.value = 'ALL'; } });
    if (state.nation !== 'ALL') tags.push({ label: `Nation: ${state.nation}`, clear: () => { state.nation = 'ALL'; nationSelect.value = 'ALL'; } });
    if (state.club !== 'ALL') tags.push({ label: `Club: ${state.club}`, clear: () => { state.club = 'ALL'; clubSelect.value = 'ALL'; } });
    if (state.cardType !== 'ALL') tags.push({ label: `Card: ${state.cardType}`, clear: () => { state.cardType = 'ALL'; cardTypeSelect.value = 'ALL'; } });
    if (state.playstyle !== 'ALL') tags.push({ label: `PlayStyle: ${state.playstyle}`, clear: () => { state.playstyle = 'ALL'; playstyleSelect.value = 'ALL'; } });

    tags.forEach(t => {
      const tagEl = document.createElement('div');
      tagEl.className = 'tag-item';
      tagEl.innerHTML = `<span>${t.label}</span> <span class="tag-close">×</span>`;
      tagEl.querySelector('.tag-close').addEventListener('click', () => {
        t.clear();
        state.page = 1;
        fetchPlayers();
      });
      activeTagsBar.appendChild(tagEl);
    });
  }

  // -------------------------------------------------------------
  // Filter Handlers
  // -------------------------------------------------------------
  function setPosition(pos) {
    state.position = pos;
    state.page = 1;
    document.querySelectorAll('.pos-pill').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-pos') === pos);
    });
    fetchPlayers();
  }

  function resetAllFilters() {
    state.q = '';
    state.position = 'ALL';
    state.ratingMin = 75;
    state.ratingMax = 99;
    state.paceMin = 0;
    state.shootingMin = 0;
    state.passingMin = 0;
    state.dribblingMin = 0;
    state.defendingMin = 0;
    state.physicalMin = 0;
    state.league = 'ALL';
    state.nation = 'ALL';
    state.club = 'ALL';
    state.cardType = 'ALL';
    state.gender = 'ALL';
    state.foot = 'ALL';
    state.skillMoves = 0;
    state.weakFoot = 0;
    state.playstyle = 'ALL';
    state.sortBy = 'rating';
    state.sortOrder = 'desc';
    state.page = 1;

    // Reset UI Inputs
    searchInput.value = '';
    navSearchInput.value = '';
    ratingMinSlider.value = 75;
    ratingMaxSlider.value = 99;
    paceMinSlider.value = 0;
    shootingMinSlider.value = 0;
    dribblingMinSlider.value = 0;
    defendingMinSlider.value = 0;
    physicalMinSlider.value = 0;

    ratingValBadge.innerText = '75 - 99';
    paceValBadge.innerText = '0+';
    shootingValBadge.innerText = '0+';
    dribblingValBadge.innerText = '0+';
    defendingValBadge.innerText = '0+';
    physicalValBadge.innerText = '0+';

    leagueSelect.value = 'ALL';
    nationSelect.value = 'ALL';
    clubSelect.value = 'ALL';
    cardTypeSelect.value = 'ALL';
    playstyleSelect.value = 'ALL';
    sortSelect.value = 'rating';

    document.querySelectorAll('.pos-pill').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-pos') === 'ALL');
    });
    document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));

    fetchPlayers();
  }

  // -------------------------------------------------------------
  // Player Details Modal
  // -------------------------------------------------------------
  async function openPlayerDetail(playerId) {
    try {
      const res = await fetch(`/api/players/${playerId}`);
      if (!res.ok) return;
      const { player, similarPlayers } = await res.json();

      const modalContent = document.getElementById('detail-modal-body');
      const themeClass = getCardThemeClass(player.cardType);
      const isComparing = compareIds.includes(player.id);
      const isSquad = squadIds.includes(player.id);

      modalContent.innerHTML = `
        <div class="player-detail-grid">
          <div class="player-detail-card-col">
            <div class="fut-card ${themeClass}" style="max-width: 280px; pointer-events: none;">
              <div class="fut-card-bg-pattern"></div>
              <div class="fut-card-header">
                <div class="fut-card-badge-col">
                  <span class="fut-card-rating">${player.rating}</span>
                  <span class="fut-card-position">${player.position}</span>
                  <span class="fut-card-flag">${player.flag || '🏳️'}</span>
                </div>
                ${(player.playStylesPlus && player.playStylesPlus.length > 0) ? `<div class="fut-card-playstyle-plus">★ ${player.playStylesPlus[0]}</div>` : ''}
              </div>
              <div class="fut-card-player-art">
                ${getPlayerAvatarSVG(player)}
              </div>
              <div class="fut-card-name-bar">
                <div class="fut-card-name">${player.commonName}</div>
                <div class="fut-card-fullname">${player.club}</div>
              </div>
              <div class="fut-card-stats-grid">
                <div class="fut-stat-item"><span class="fut-stat-value">${player.stats.pac}</span><span class="fut-stat-label">PAC</span></div>
                <div class="fut-stat-item"><span class="fut-stat-value">${player.stats.sho}</span><span class="fut-stat-label">SHO</span></div>
                <div class="fut-stat-item"><span class="fut-stat-value">${player.stats.pas}</span><span class="fut-stat-label">PAS</span></div>
                <div class="fut-stat-item"><span class="fut-stat-value">${player.stats.dri}</span><span class="fut-stat-label">DRI</span></div>
                <div class="fut-stat-item"><span class="fut-stat-value">${player.stats.def}</span><span class="fut-stat-label">DEF</span></div>
                <div class="fut-stat-item"><span class="fut-stat-value">${player.stats.phy}</span><span class="fut-stat-label">PHY</span></div>
              </div>
            </div>

            <div style="display: flex; gap: 0.5rem; width: 100%; max-width: 280px;">
              <button class="nav-btn modal-compare-btn ${isComparing ? 'active' : ''}" style="flex: 1; justify-content: center;">
                ⚖️ ${isComparing ? 'Comparing' : 'Compare'}
              </button>
              <button class="nav-btn modal-squad-btn ${isSquad ? 'active' : ''}" style="flex: 1; justify-content: center;">
                ${isSquad ? '★ In Squad' : '+ Add to Squad'}
              </button>
            </div>
          </div>

          <div class="player-detail-info-col">
            <div class="detail-header">
              <h2 class="detail-name">${player.name}</h2>
              <div class="detail-meta-tags">
                <span class="meta-pill" style="border-color: var(--fc-volt); color: var(--fc-volt);">${player.cardType}</span>
                <span class="meta-pill">🏟️ ${player.club}</span>
                <span class="meta-pill">🏆 ${player.league}</span>
                <span class="meta-pill">🌍 ${player.nation}</span>
                <span class="meta-pill">🎂 ${player.age} yrs</span>
                <span class="meta-pill">📏 ${player.height} cm / ${player.weight} kg</span>
                <span class="meta-pill">👟 ${player.foot} Foot</span>
                <span class="meta-pill">⭐ ${player.skillMoves}★ Skills / ${player.weakFoot}★ WF</span>
                <span class="meta-pill">⚡ Work Rates: ${player.workRateAtt}/${player.workRateDef}</span>
                <span class="meta-pill" style="color: #ffd700;">🪙 Est. Value: ${formatPrice(player.priceEstimate)} coins</span>
              </div>
              <p class="detail-bio">${player.bio || ''}</p>
            </div>

            <!-- In-Game Detailed Sub-Stats Breakdown -->
            <div class="stats-breakdown-section">
              <h3 style="font-size: 1.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem;">
                📊 Detailed In-Game Attributes
              </h3>
              ${renderDetailedSubStats(player)}
            </div>

            <!-- PlayStyles Section -->
            <div class="playstyles-detail-section">
              <h3 style="font-size: 1rem; font-weight: 800;">✨ PlayStyles & PlayStyles+</h3>
              <div class="playstyles-list">
                ${(player.playStylesPlus || []).map(ps => `
                  <div class="playstyle-badge plus" title="PlayStyle+ Signature Ability">
                    <span style="font-size: 1rem;">👑</span>
                    <strong>${ps}</strong>
                  </div>
                `).join('')}
                ${(player.playStyles || []).map(ps => `
                  <div class="playstyle-badge">
                    <span>⚡</span>
                    <span>${ps}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Similar Players Carousel -->
            ${similarPlayers && similarPlayers.length > 0 ? `
              <div style="margin-top: 1rem;">
                <h4 style="font-size: 0.85rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.75rem;">
                  Similar Players
                </h4>
                <div style="display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.5rem;">
                  ${similarPlayers.map(sp => `
                    <div class="similar-player-pill" data-id="${sp.id}" style="display: flex; align-items: center; gap: 0.5rem; background: var(--bg-surface-elevated); border: 1px solid var(--border-color); padding: 0.4rem 0.75rem; border-radius: 8px; cursor: pointer;">
                      <span style="font-weight: 900; color: var(--fc-volt);">${sp.rating}</span>
                      <span style="font-weight: 700;">${sp.commonName}</span>
                      <span style="font-size: 0.75rem; color: var(--text-dim);">${sp.position}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      // Modal action listeners
      modalContent.querySelector('.modal-compare-btn').addEventListener('click', () => {
        toggleCompare(player);
        openPlayerDetail(player.id);
      });
      modalContent.querySelector('.modal-squad-btn').addEventListener('click', () => {
        toggleSquad(player);
        openPlayerDetail(player.id);
      });
      modalContent.querySelectorAll('.similar-player-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          openPlayerDetail(pill.getAttribute('data-id'));
        });
      });

      detailModal.classList.add('active');
    } catch (err) {
      console.error('Failed to open player detail:', err);
    }
  }

  function getStatColor(val) {
    if (val >= 90) return 'var(--stat-super)';
    if (val >= 80) return 'var(--stat-great)';
    if (val >= 70) return 'var(--stat-good)';
    if (val >= 60) return 'var(--stat-average)';
    return 'var(--stat-poor)';
  }

  function renderDetailedSubStats(player) {
    const ds = player.detailedStats;
    if (!ds) return '<p style="color: var(--text-dim);">Detailed stats not available.</p>';

    const categories = [
      { key: 'pace', title: 'Pace', stats: ds.pace },
      { key: 'shooting', title: 'Shooting', stats: ds.shooting },
      { key: 'passing', title: 'Passing', stats: ds.passing },
      { key: 'dribbling', title: 'Dribbling', stats: ds.dribbling },
      { key: 'defending', title: 'Defending', stats: ds.defending },
      { key: 'physicality', title: 'Physicality', stats: ds.physicality },
      { key: 'goalkeeping', title: 'Goalkeeping', stats: ds.goalkeeping }
    ].filter(cat => !!cat.stats);

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
        ${categories.map(cat => `
          <div class="stats-category-block">
            <div class="stats-category-title">
              <span>${cat.title}</span>
              <span style="color: var(--fc-volt); font-size: 1rem;">${player.stats[cat.key.slice(0, 3)] || ''}</span>
            </div>
            ${Object.entries(cat.stats).map(([statName, val]) => {
              const formattedName = statName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              const color = getStatColor(val);
              return `
                <div class="substat-row">
                  <span style="color: var(--text-muted);">${formattedName}</span>
                  <div class="substat-bar-container">
                    <div class="substat-bar-fill" style="width: ${val}%; background-color: ${color};"></div>
                  </div>
                  <span class="substat-val" style="color: ${color};">${val}</span>
                </div>
              `;
            }).join('')}
          </div>
        `).join('')}
      </div>
    `;
  }

  // -------------------------------------------------------------
  // Compare Tray & Modal
  // -------------------------------------------------------------
  function toggleCompare(player) {
    const idx = compareIds.indexOf(player.id);
    if (idx > -1) {
      compareIds.splice(idx, 1);
    } else {
      if (compareIds.length >= 3) {
        alert('You can compare up to 3 players at a time. Remove one first!');
        return;
      }
      compareIds.push(player.id);
    }
    updateCompareTray();
    renderResults();
  }

  async function updateCompareTray() {
    if (compareIds.length === 0) {
      compareTray.classList.remove('visible');
      return;
    }

    compareTray.classList.add('visible');

    // Fetch players in compare list
    try {
      const res = await fetch(`/api/compare?ids=${compareIds.join(',')}`);
      const players = await res.json();

      let html = '';
      for (let i = 0; i < 3; i++) {
        const p = players[i];
        if (p) {
          html += `
            <div class="compare-thumb-slot filled" title="${p.commonName}">
              <span>${p.rating}</span>
              <div class="compare-remove-btn" data-remove-id="${p.id}">×</div>
            </div>
          `;
        } else {
          html += `
            <div class="compare-thumb-slot">
              <span>+ Slot</span>
            </div>
          `;
        }
      }

      compareSlotsContainer.innerHTML = html;

      compareSlotsContainer.querySelectorAll('.compare-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-remove-id');
          compareIds = compareIds.filter(cid => cid !== id);
          updateCompareTray();
          renderResults();
        });
      });
    } catch (err) {
      console.error('Failed to update compare tray:', err);
    }
  }

  async function openCompareModal() {
    if (compareIds.length < 2) {
      alert('Select at least 2 players to open side-by-side comparison!');
      return;
    }

    try {
      const res = await fetch(`/api/compare?ids=${compareIds.join(',')}`);
      const players = await res.json();

      const modalBody = document.getElementById('compare-modal-body');

      const metrics = [
        { label: 'Rating (OVR)', get: p => p.rating },
        { label: 'Pace (PAC)', get: p => p.stats.pac },
        { label: 'Shooting (SHO)', get: p => p.stats.sho },
        { label: 'Passing (PAS)', get: p => p.stats.pas },
        { label: 'Dribbling (DRI)', get: p => p.stats.dri },
        { label: 'Defending (DEF)', get: p => p.stats.def },
        { label: 'Physicality (PHY)', get: p => p.stats.phy },
        { label: 'Skill Moves', get: p => `${p.skillMoves}★` },
        { label: 'Weak Foot', get: p => `${p.weakFoot}★` },
        { label: 'Preferred Foot', get: p => p.foot },
        { label: 'Height / Weight', get: p => `${p.height}cm / ${p.weight}kg` },
        { label: 'Est. Price', get: p => `🪙 ${formatPrice(p.priceEstimate)}` }
      ];

      modalBody.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h2 style="font-size: 1.5rem; font-weight: 900;">⚖️ Head-to-Head Comparison</h2>
          <button class="nav-btn" id="clear-all-compare-btn" style="color: var(--fc-danger); border-color: var(--fc-danger);">Clear Comparison</button>
        </div>

        <div class="compare-modal-matrix">
          <div class="compare-metric-row">
            <div class="compare-metric-label">Player</div>
            ${players.map(p => `
              <div style="text-align: center; padding-bottom: 1rem; border-bottom: 2px solid var(--fc-volt);">
                <div style="font-size: 1.5rem; font-weight: 900; color: var(--fc-volt);">${p.rating}</div>
                <div style="font-size: 1.1rem; font-weight: 800;">${p.commonName}</div>
                <div style="font-size: 0.75rem; color: var(--text-dim);">${p.club} • ${p.position}</div>
              </div>
            `).join('')}
          </div>

          ${metrics.map(m => {
            // Find max value if numerical
            let maxVal = -1;
            players.forEach(p => {
              const v = m.get(p);
              if (typeof v === 'number' && v > maxVal) maxVal = v;
            });

            return `
              <div class="compare-metric-row">
                <div class="compare-metric-label">${m.label}</div>
                ${players.map(p => {
                  const val = m.get(p);
                  const isWinner = typeof val === 'number' && val === maxVal && players.length > 1;
                  return `
                    <div class="compare-metric-val ${isWinner ? 'winner' : ''}">
                      ${val} ${isWinner ? '★' : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          }).join('')}
        </div>
      `;

      document.getElementById('clear-all-compare-btn')?.addEventListener('click', () => {
        compareIds = [];
        updateCompareTray();
        renderResults();
        compareModal.classList.remove('active');
      });

      compareModal.classList.add('active');
    } catch (err) {
      console.error('Failed to open compare modal:', err);
    }
  }

  // -------------------------------------------------------------
  // Dream Squad Manager
  // -------------------------------------------------------------
  function toggleSquad(player) {
    const idx = squadIds.indexOf(player.id);
    if (idx > -1) {
      squadIds.splice(idx, 1);
    } else {
      if (squadIds.length >= 11) {
        alert('Your starting 11 is full! Remove a player to add another.');
        return;
      }
      squadIds.push(player.id);
    }

    persistSquad();
    updateSquadBadge();
    renderResults();
  }

  function updateSquadBadge() {
    if (squadCountBadge) {
      squadCountBadge.innerText = squadIds.length;
    }
  }

  async function openSquadModal() {
    if (squadIds.length === 0) {
      alert('Your FC 27 Squad is empty! Click "+ Squad" on any card to add players.');
      return;
    }

    try {
      const res = await fetch('/api/squad/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: squadIds })
      });
      const data = await res.json();

      const modalBody = document.getElementById('squad-modal-body');
      modalBody.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.6rem; font-weight: 900;">⭐ My FC 27 Ultimate XI</h2>
            <p style="color: var(--text-muted); font-size: 0.85rem;">Squad Analysis & Chemistry Calculator</p>
          </div>
          <button class="nav-btn" id="clear-squad-btn" style="color: var(--fc-danger); border-color: var(--fc-danger);">Clear Squad</button>
        </div>

        <!-- Squad Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: 12px; text-align: center; border: 1px solid var(--border-color);">
            <div style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Team Rating</div>
            <div style="font-size: 2rem; font-weight: 900; color: var(--fc-volt);">${data.avgRating}</div>
          </div>
          <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: 12px; text-align: center; border: 1px solid var(--border-color);">
            <div style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Chemistry</div>
            <div style="font-size: 2rem; font-weight: 900; color: #00f0ff;">${data.chemistry}/33</div>
          </div>
          <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: 12px; text-align: center; border: 1px solid var(--border-color);">
            <div style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Squad Pace</div>
            <div style="font-size: 2rem; font-weight: 900; color: #fff;">${data.avgPace}</div>
          </div>
          <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: 12px; text-align: center; border: 1px solid var(--border-color);">
            <div style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Attack Power</div>
            <div style="font-size: 2rem; font-weight: 900; color: #ffd700;">${data.avgShooting}</div>
          </div>
          <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: 12px; text-align: center; border: 1px solid var(--border-color);">
            <div style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Squad Value</div>
            <div style="font-size: 1.3rem; font-weight: 900; color: #ffd700; margin-top: 0.4rem;">🪙 ${formatPrice(data.totalValue)}</div>
          </div>
        </div>

        <!-- Squad Roster List -->
        <h3 style="font-size: 1rem; font-weight: 800; margin-bottom: 0.75rem;">Squad Roster (${data.squad.length}/11)</h3>
        <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 340px; overflow-y: auto;">
          ${data.squad.map(p => `
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface-elevated); padding: 0.65rem 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-weight: 900; color: var(--fc-volt); font-size: 1.1rem; min-width: 28px;">${p.rating}</span>
                <span style="font-weight: 800; min-width: 35px; color: var(--text-muted);">${p.position}</span>
                <span style="font-weight: 800; color: #fff;">${p.commonName}</span>
                <span style="font-size: 0.75rem; color: var(--text-dim);">${p.club} • ${p.nation}</span>
              </div>
              <button class="nav-btn remove-squad-item-btn" data-id="${p.id}" style="color: var(--fc-danger); border: none; padding: 0.2rem 0.5rem;">
                Remove
              </button>
            </div>
          `).join('')}
        </div>
      `;

      modalBody.querySelectorAll('.remove-squad-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          squadIds = squadIds.filter(sid => sid !== id);

          persistSquad();
          updateSquadBadge();
          renderResults();
          openSquadModal();
        });
      });

      document.getElementById('clear-squad-btn')?.addEventListener('click', () => {
        squadIds = [];

        persistSquad();
        updateSquadBadge();
        renderResults();
        squadModal.classList.remove('active');
      });

      squadModal.classList.add('active');
    } catch (err) {
      console.error('Failed to open squad modal:', err);
    }
  }

  // -------------------------------------------------------------
  // Pack Opener Simulation
  // -------------------------------------------------------------
  const walkoutOverlay = document.getElementById('walkout-overlay');

  async function openPackSimulation() {
    try {
      const res = await fetch('/api/pack/open');
      const data = await res.json();
      const top = data.topPlayer;

      packModal.classList.remove('active');

      if (data.isWalkout) {
        // Dramatic Walkout Sequence!
        walkoutOverlay.classList.add('active');
        const themeClass = getCardThemeClass(top.cardType);

        walkoutOverlay.innerHTML = `
          <div class="walkout-lights"></div>
          <div style="position: relative; z-index: 10; text-align: center; margin-bottom: 1.5rem;">
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--fc-volt); letter-spacing: 0.2em; text-transform: uppercase;">
              ⚡ WALKOUT! ⚡
            </div>
            <div style="font-size: 3rem; font-weight: 900; color: #fff; text-shadow: 0 0 20px rgba(0, 255, 133, 0.8);">
              ${top.rating} ${top.position}
            </div>
            <div style="font-size: 1.3rem; color: #ffd700;">${top.flag} ${top.nation} • ${top.club}</div>
          </div>

          <div class="walkout-card-reveal">
            <div class="fut-card ${themeClass}" style="width: 280px; box-shadow: 0 0 60px rgba(0, 255, 133, 0.5);">
              <div class="fut-card-bg-pattern"></div>
              <div class="fut-card-header">
                <div class="fut-card-badge-col">
                  <span class="fut-card-rating">${top.rating}</span>
                  <span class="fut-card-position">${top.position}</span>
                  <span class="fut-card-flag">${top.flag || '🏳️'}</span>
                </div>
              </div>
              <div class="fut-card-player-art">${getPlayerAvatarSVG(top)}</div>
              <div class="fut-card-name-bar">
                <div class="fut-card-name">${top.commonName}</div>
                <div class="fut-card-fullname">${top.club}</div>
              </div>
              <div class="fut-card-stats-grid">
                <div class="fut-stat-item"><span class="fut-stat-value">${top.stats.pac}</span><span class="fut-stat-label">PAC</span></div>
                <div class="fut-stat-item"><span class="fut-stat-value">${top.stats.sho}</span><span class="fut-stat-label">SHO</span></div>
                <div class="fut-stat-item"><span class="fut-stat-value">${top.stats.pas}</span><span class="fut-stat-label">PAS</span></div>
                <div class="fut-stat-item"><span class="fut-stat-value">${top.stats.dri}</span><span class="fut-stat-label">DRI</span></div>
                <div class="fut-stat-item"><span class="fut-stat-value">${top.stats.def}</span><span class="fut-stat-label">DEF</span></div>
                <div class="fut-stat-item"><span class="fut-stat-value">${top.stats.phy}</span><span class="fut-stat-label">PHY</span></div>
              </div>
            </div>
          </div>

          <button class="nav-btn nav-btn-highlight" id="walkout-dismiss-btn" style="position: relative; z-index: 10; margin-top: 2rem; padding: 0.75rem 2rem; font-size: 1rem;">
            Reveal Full Pack ▶
          </button>
        `;

        document.getElementById('walkout-dismiss-btn')?.addEventListener('click', () => {
          walkoutOverlay.classList.remove('active');
          showPackResults(data);
        });
      } else {
        showPackResults(data);
      }
    } catch (err) {
      console.error('Failed to open pack:', err);
    }
  }

  function showPackResults(data) {
    const modalBody = document.getElementById('pack-modal-body');
    modalBody.innerHTML = `
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <h2 style="font-size: 1.6rem; font-weight: 900;">🎁 FC 27 Rare Players Pack Results</h2>
        <p style="color: var(--text-muted); font-size: 0.85rem;">Top player: ${data.topPlayer.commonName} (${data.topPlayer.rating})</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        ${data.pack.map(p => {
          const themeClass = getCardThemeClass(p.cardType);
          return `
            <div class="fut-card ${themeClass}" style="cursor: pointer;" data-pack-player-id="${p.id}">
              <div class="fut-card-bg-pattern"></div>
              <div class="fut-card-header">
                <div class="fut-card-badge-col">
                  <span class="fut-card-rating" style="font-size: 1.5rem;">${p.rating}</span>
                  <span class="fut-card-position" style="font-size: 0.8rem;">${p.position}</span>
                  <span class="fut-card-flag" style="font-size: 1rem;">${p.flag || '🏳️'}</span>
                </div>
              </div>
              <div class="fut-card-player-art" style="margin-top: -1rem;">
                <div style="transform: scale(0.8);">${getPlayerAvatarSVG(p)}</div>
              </div>
              <div class="fut-card-name-bar">
                <div class="fut-card-name" style="font-size: 0.95rem;">${p.commonName}</div>
                <div class="fut-card-fullname" style="font-size: 0.6rem;">${p.club}</div>
              </div>
              <div class="fut-card-bottom-meta" style="justify-content: center; color: #ffd700;">
                🪙 ${formatPrice(p.priceEstimate)}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="display: flex; justify-content: center; gap: 1rem;">
        <button class="nav-btn nav-btn-highlight" id="open-another-pack-btn" style="padding: 0.75rem 1.5rem; font-size: 0.95rem;">
          ⚡ Open Another Pack
        </button>
      </div>
    `;

    modalBody.querySelectorAll('[data-pack-player-id]').forEach(card => {
      card.addEventListener('click', () => {
        openPlayerDetail(card.getAttribute('data-pack-player-id'));
      });
    });

    document.getElementById('open-another-pack-btn')?.addEventListener('click', () => {
      openPackSimulation();
    });

    packModal.classList.add('active');
  }

  // -------------------------------------------------------------
  // Event Bindings
  // -------------------------------------------------------------
  // Live search debouncing
  let searchTimer = null;
  function handleSearchInput(val) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = val.trim();
      state.page = 1;
      fetchPlayers();
    }, 250);
  }

  searchInput.addEventListener('input', (e) => handleSearchInput(e.target.value));
  navSearchInput.addEventListener('input', (e) => {
    searchInput.value = e.target.value;
    handleSearchInput(e.target.value);
  });

  // Position pills
  document.querySelectorAll('.pos-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      setPosition(btn.getAttribute('data-pos'));
    });
  });

  // Preset chips
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const preset = chip.getAttribute('data-preset');
      const wasActive = chip.classList.contains('active');
      document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));

      if (wasActive) {
        resetAllFilters();
        return;
      }

      chip.classList.add('active');

      switch (preset) {
        case '90plus':
          resetAllFilters();
          chip.classList.add('active');
          state.ratingMin = 90;
          ratingMinSlider.value = 90;
          ratingValBadge.innerText = '90 - 99';
          break;
        case 'speed':
          resetAllFilters();
          chip.classList.add('active');
          state.paceMin = 92;
          paceMinSlider.value = 92;
          paceValBadge.innerText = '92+';
          break;
        case 'skills5':
          resetAllFilters();
          chip.classList.add('active');
          state.skillMoves = 5;
          break;
        case 'wf5':
          resetAllFilters();
          chip.classList.add('active');
          state.weakFoot = 5;
          break;
        case 'toty_icons':
          resetAllFilters();
          chip.classList.add('active');
          state.ratingMin = 90;
          ratingMinSlider.value = 90;
          ratingValBadge.innerText = '90 - 99';
          break;
        case 'wonderkids':
          resetAllFilters();
          chip.classList.add('active');
          state.cardType = 'Future Stars';
          cardTypeSelect.value = 'Future Stars';
          break;
      }
      fetchPlayers();
    });
  });

  // Range Slider Listeners
  ratingMinSlider.addEventListener('input', (e) => {
    state.ratingMin = parseInt(e.target.value, 10);
    ratingValBadge.innerText = `${state.ratingMin} - ${state.ratingMax}`;
  });
  ratingMinSlider.addEventListener('change', () => { state.page = 1; fetchPlayers(); });

  ratingMaxSlider.addEventListener('input', (e) => {
    state.ratingMax = parseInt(e.target.value, 10);
    ratingValBadge.innerText = `${state.ratingMin} - ${state.ratingMax}`;
  });
  ratingMaxSlider.addEventListener('change', () => { state.page = 1; fetchPlayers(); });

  paceMinSlider.addEventListener('input', (e) => {
    state.paceMin = parseInt(e.target.value, 10);
    paceValBadge.innerText = `${state.paceMin}+`;
  });
  paceMinSlider.addEventListener('change', () => { state.page = 1; fetchPlayers(); });

  shootingMinSlider.addEventListener('input', (e) => {
    state.shootingMin = parseInt(e.target.value, 10);
    shootingValBadge.innerText = `${state.shootingMin}+`;
  });
  shootingMinSlider.addEventListener('change', () => { state.page = 1; fetchPlayers(); });

  dribblingMinSlider.addEventListener('input', (e) => {
    state.dribblingMin = parseInt(e.target.value, 10);
    dribblingValBadge.innerText = `${state.dribblingMin}+`;
  });
  dribblingMinSlider.addEventListener('change', () => { state.page = 1; fetchPlayers(); });

  defendingMinSlider.addEventListener('input', (e) => {
    state.defendingMin = parseInt(e.target.value, 10);
    defendingValBadge.innerText = `${state.defendingMin}+`;
  });
  defendingMinSlider.addEventListener('change', () => { state.page = 1; fetchPlayers(); });

  physicalMinSlider.addEventListener('input', (e) => {
    state.physicalMin = parseInt(e.target.value, 10);
    physicalValBadge.innerText = `${state.physicalMin}+`;
  });
  physicalMinSlider.addEventListener('change', () => { state.page = 1; fetchPlayers(); });

  // Select Dropdowns
  leagueSelect.addEventListener('change', (e) => {
    state.league = e.target.value;
    state.page = 1;
    fetchPlayers();
  });
  nationSelect.addEventListener('change', (e) => {
    state.nation = e.target.value;
    state.page = 1;
    fetchPlayers();
  });
  clubSelect.addEventListener('change', (e) => {
    state.club = e.target.value;
    state.page = 1;
    fetchPlayers();
  });
  cardTypeSelect.addEventListener('change', (e) => {
    state.cardType = e.target.value;
    state.page = 1;
    fetchPlayers();
  });
  playstyleSelect.addEventListener('change', (e) => {
    state.playstyle = e.target.value;
    state.page = 1;
    fetchPlayers();
  });

  // Sort Controls
  sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    fetchPlayers();
  });
  sortOrderBtn.addEventListener('click', () => {
    state.sortOrder = state.sortOrder === 'desc' ? 'asc' : 'desc';
    sortOrderBtn.innerText = state.sortOrder === 'desc' ? '↓' : '↑';
    fetchPlayers();
  });

  // View Mode
  viewGridBtn.addEventListener('click', () => {
    state.view = 'grid';
    viewGridBtn.classList.add('active');
    viewTableBtn.classList.remove('active');
    renderResults();
  });
  viewTableBtn.addEventListener('click', () => {
    state.view = 'table';
    viewTableBtn.classList.add('active');
    viewGridBtn.classList.remove('active');
    renderResults();
  });

  // Reset Filters
  resetFiltersBtn.addEventListener('click', resetAllFilters);

  // Compare & Squad Nav Buttons
  openCompareModalBtn.addEventListener('click', openCompareModal);
  squadNavBtn.addEventListener('click', openSquadModal);
  packNavBtn.addEventListener('click', () => {
    const modalBody = document.getElementById('pack-modal-body');
    modalBody.innerHTML = `
      <div class="pack-opener-container">
        <h2 style="font-size: 1.8rem; font-weight: 900; letter-spacing: -0.02em;">
          ⚡ FC 27 ULTIMATE TEAM PACK
        </h2>
        <p style="color: var(--text-muted); max-width: 400px; font-size: 0.9rem;">
          Open an authentic FC 27 Mega Pack! Guaranteed 84+ board player, with full 88+ walkout animation!
        </p>

        <div class="pack-box-card" id="interactive-pack-card">
          <div style="font-size: 3rem; margin-bottom: 0.5rem;">✨</div>
          <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 900; color: #fff;">FC 27</div>
          <div style="font-size: 0.75rem; font-weight: 800; color: var(--fc-volt); letter-spacing: 0.15em;">MEGA PACK</div>
        </div>

        <button class="nav-btn nav-btn-highlight" id="trigger-pack-open-btn" style="padding: 0.75rem 2rem; font-size: 1rem;">
          ⚡ Open Pack (Free)
        </button>
      </div>
    `;

    document.getElementById('interactive-pack-card')?.addEventListener('click', openPackSimulation);
    document.getElementById('trigger-pack-open-btn')?.addEventListener('click', openPackSimulation);

    packModal.classList.add('active');
  });


  // -------------------------------------------------------------
  // ACCOUNTS: login / register / per-user squad stored on the server
  // -------------------------------------------------------------
  const authModal = document.getElementById('auth-modal');
  const authNavBtn = document.getElementById('auth-nav-btn');
  const authNavLabel = document.getElementById('auth-nav-label');
  let saveChain = Promise.resolve(); // keeps squad saves in order

  async function apiJson(url, method, body) {
    const res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    let data = {};
    try { data = await res.json(); } catch { /* empty body */ }
    return { ok: res.ok, status: res.status, data };
  }

  // Anonymous visitors keep the squad in localStorage; logged-in users save it to their account.
  function persistSquad() {
    if (!currentUser) {
      localStorage.setItem('fc27_squad', JSON.stringify(squadIds));
      return;
    }
    saveChain = saveChain
      .then(() => apiJson('/api/squad', 'PUT', { playerIds: [...squadIds] }))
      .then((r) => {
        if (r.status === 401) {
          currentUser = null;
          localStorage.setItem('fc27_squad', JSON.stringify(squadIds));
          updateAuthUI();
          alert('Your session expired. Please log in again to keep saving your squad.');
        } else if (!r.ok) {
          alert('Could not save your squad: ' + (r.data.error || 'server error'));
        }
      })
      .catch(() => alert('Could not reach the server to save your squad.'));
  }

  function updateAuthUI() {
    authNavLabel.textContent = currentUser ? '👤 ' + currentUser.username : '👤 Log in';
  }

  // After login/register: load the account's squad (or upload the anonymous one if the account has none yet)
  async function afterLogin(user) {
    currentUser = user;
    updateAuthUI();
    const local = JSON.parse(localStorage.getItem('fc27_squad') || '[]');
    const r = await apiJson('/api/squad', 'GET');
    if (r.ok) {
      if (r.data.playerIds.length === 0 && local.length > 0) {
        squadIds = local.slice(0, 11);
        persistSquad();
      } else {
        squadIds = r.data.playerIds;
      }
    }
    localStorage.removeItem('fc27_squad');
    updateSquadBadge();
    renderResults();
  }

  async function loadSession() {
    try {
      const r = await apiJson('/api/auth/me', 'GET');
      if (r.ok && r.data.user) await afterLogin(r.data.user);
    } catch { /* accounts unavailable: stay anonymous */ }
  }

  function openAuthModal(mode) {
    const body = document.getElementById('auth-modal-body');

    if (currentUser) {
      body.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 900; margin-bottom: 0.5rem;">Your account</h2>
        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Logged in as <strong id="auth-username"></strong>. Your Dream XI is saved to your account.</p>
        <button class="auth-submit" id="auth-logout-btn">Log out</button>`;
      document.getElementById('auth-username').textContent = currentUser.username;
      document.getElementById('auth-logout-btn').addEventListener('click', async () => {
        await apiJson('/api/auth/logout', 'POST', {});
        currentUser = null;
        squadIds = []; // do not leave the previous user's squad on a shared computer
        localStorage.removeItem('fc27_squad');
        updateAuthUI();
        updateSquadBadge();
        renderResults();
        authModal.classList.remove('active');
      });
      authModal.classList.add('active');
      return;
    }

    const isRegister = mode === 'register';
    body.innerHTML = `
      <div class="auth-tabs">
        <button type="button" class="auth-tab ${isRegister ? '' : 'active'}" data-mode="login">Log in</button>
        <button type="button" class="auth-tab ${isRegister ? 'active' : ''}" data-mode="register">Register</button>
      </div>
      <form id="auth-form" novalidate>
        <label class="auth-field"><span>Username</span>
          <input id="auth-username-input" type="text" autocomplete="username" maxlength="30" required>
          ${isRegister ? '<div class="auth-hint">3-30 characters: letters, numbers, underscore</div>' : ''}
        </label>
        <label class="auth-field"><span>Password</span>
          <input id="auth-password-input" type="password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" maxlength="128" required>
          ${isRegister ? '<div class="auth-hint">At least 10 characters</div>' : ''}
        </label>
        <div class="auth-error" id="auth-error" role="alert"></div>
        <button class="auth-submit" type="submit" id="auth-submit-btn">${isRegister ? 'Create account' : 'Log in'}</button>
      </form>`;

    body.querySelectorAll('.auth-tab').forEach((tab) =>
      tab.addEventListener('click', () => openAuthModal(tab.getAttribute('data-mode')))
    );

    document.getElementById('auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('auth-error');
      const submitBtn = document.getElementById('auth-submit-btn');
      errorEl.textContent = '';
      submitBtn.disabled = true;
      try {
        const r = await apiJson(isRegister ? '/api/auth/register' : '/api/auth/login', 'POST', {
          username: document.getElementById('auth-username-input').value.trim(),
          password: document.getElementById('auth-password-input').value
        });
        if (r.ok) {
          authModal.classList.remove('active');
          await afterLogin(r.data.user);
        } else {
          errorEl.textContent = r.data.error || 'Something went wrong.';
        }
      } catch {
        errorEl.textContent = 'Could not reach the server.';
      } finally {
        submitBtn.disabled = false;
      }
    });

    authModal.classList.add('active');
    document.getElementById('auth-username-input').focus();
  }

  authNavBtn.addEventListener('click', () => openAuthModal('login'));

  // Modal Close buttons & backdrop clicks
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      detailModal.classList.remove('active');
      compareModal.classList.remove('active');
      squadModal.classList.remove('active');
      packModal.classList.remove('active');

      authModal.classList.remove('active');
    });
  });

  [detailModal, compareModal, squadModal, packModal, authModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  // Keyboard shortcut support
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      detailModal.classList.remove('active');
      compareModal.classList.remove('active');
      squadModal.classList.remove('active');
      packModal.classList.remove('active');
      authModal.classList.remove('active');
    }
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // Brand click resets to top
  document.querySelector('.brand').addEventListener('click', () => {
    resetAllFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Initialize
  updateSquadBadge();
  fetchFilters();
  fetchOverviewStats();
  fetchPlayers();

  loadSession();
});
