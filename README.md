# EA SPORTS FC 27 - Official Player Ratings Database & Search Engine

A modern, high-performance Node.js web application for searching, filtering, and comparing **EA SPORTS FC 27** Ultimate Team player ratings, in-game detailed attributes, PlayStyles+, prices, and squads.

Built with **Node.js (zero external runtime dependencies)**, vanilla HTML5, CSS3 with authentic FUT 27 card styling, and interactive JavaScript.

---

## ⚡ Key Features

1. **Futuristic EA SPORTS FC 27 Aesthetic**
   - Authentic Ultimate Team card shields with geometric foil, metallic borders, and dynamic holographic shimmer effects on hover.
   - Dedicated card themes: **Gold Rare**, **TOTY (Team of the Year)**, **Icons**, **Heroes**, **Future Stars**, and **Centurions**.
   - Custom SVG player avatars styled with matching club kit colors, nationality flags, and player monograms.

2. **Advanced Multi-Dimensional Player Search & Filters**
   - **Accent-Insensitive Live Search**: Instant debounced search for player names, common names, clubs, nations, and leagues (e.g. typing `mbappe`, `pele`, `guler`, `alvarez`).
   - **Position Filtering**: Filter by broad category (`ALL`, `ATT`, `MID`, `DEF`, `GK`) or exact position (`ST`, `CAM`, `CM`, `CDM`, `CB`, `LB`, `RB`, `LW`, `RW`).
   - **Range Sliders**: Interactive sliders for Overall Rating (`75 - 99`), Pace (`PAC`), Shooting (`SHO`), Dribbling (`DRI`), Defending (`DEF`), and Physicality (`PHY`).
   - **Granular Dropdowns**: Dynamic filters for League, Nationality, Club, Card Rarity, and PlayStyle/PlayStyle+.
   - **One-Click Presets**: Quick meta filter pills (e.g., *🔥 90+ OVR Club*, *⚡ Speed (92+ PAC)*, *⭐ 5★ Skillers*, *🎯 5★ Weak Foot*, *✨ Future Stars*, *🏆 TOTY & Icons*).

3. **In-Depth Player Details Modal**
   - Full-size 3D card render with estimated Ultimate Team market coin value.
   - Complete breakdown of **29 in-game detailed sub-stats** (Sprint Speed, Acceleration, Finishing, Shot Power, Vision, Agility, Composure, Interceptions, Strength, Jumping, etc.) with color-coded progression bars (90+ Volt Green, 80-89 Cyan, 70-79 Amber, <70 Grey).
   - PlayStyles+ (signature golden crown abilities like *Quick Step+*, *Finesse Shot+*, *Technical+*) and regular PlayStyles with descriptions.
   - Bio analysis and similar players carousel.

4. **Head-to-Head Comparison Mode**
   - Floating compare tray to pin up to 3 players simultaneously.
   - Side-by-side comparison matrix with winner/loser badges (green highlight and star for top stat).

5. **FC 27 Dream Squad (Ultimate XI) Analyzer**
   - Add/remove players to your personal starting XI (stored in `localStorage`).
   - Real-time squad analytics: Average Rating, Chemistry points (`/33`), Squad Pace, Attack Power, and Total Squad Market Value.

6. **Interactive FC 27 Pack Opener Simulation**
   - Simulates opening a Mega Pack of 5 random cards.
   - **Dramatic Walkout Sequence**: For any 88+ rated walkout, triggers a full-screen tunnel light show with rating tease and card explosion before revealing the full pack!

7. **Dual View Modes**
   - **FUT Card Grid View**: Visual cards with stats, price, and actions.
   - **Table Spreadsheet View**: Dense, sortable column view with stat pills.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.0 or higher recommended, tested on v26+)

### Starting the Server
Run either of the following commands from the project root:

```bash
npm start
```
or
```bash
node server.js
```

Then open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Running Automated Tests

A comprehensive 11-point test suite is included:

```bash
npm test
```

This verifies:
- Database integrity (75+ players loaded)
- Accent-insensitive search matching
- Position and category filters
- Min/Max rating range queries
- Stat-specific thresholds (e.g. 94+ pace)
- Multi-field sorting
- Dynamic filter extraction
- Pack opening logic & walkout thresholds
- Comparison and Squad chemistry calculations
- Frontend static asset availability

---

## 📁 Project Structure

```text
├── data/
│   ├── generate-players.js    # Data generator for 75+ FC 27 stars & icons
│   └── players.json           # In-memory database of FC 27 players
├── public/
│   ├── css/
│   │   └── style.css          # Authentic EA SPORTS FC 27 dark & neon design
│   ├── js/
│   │   └── app.js             # Client state, SVG avatar engine & interactivity
│   └── index.html             # Main responsive single-page application
├── test/
│   └── api.test.js            # Automated test suite (11 test cases)
├── package.json               # Project manifest and scripts
├── server.js                  # Pure Node.js HTTP server & REST API
└── README.md                  # Documentation
```

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/players` | Query players by `q`, `position`, `ratingMin`, `ratingMax`, `paceMin`, `league`, `nation`, `club`, `cardType`, `sortBy`, `sortOrder`, `page`, `limit` |
| `GET` | `/api/players/:id` | Get detailed profile, in-game stats, PlayStyles, and similar players |
| `GET` | `/api/filters` | Get unique lists and counts of leagues, nations, clubs, positions, and card types |
| `GET` | `/api/stats/overview` | Get leaders for Top Rated, Fastest, Best Shooter, and Best Dribbler |
| `GET` | `/api/pack/open` | Open a simulated FC 27 pack (returns 5 random cards + walkout detection) |
| `GET` | `/api/compare?ids=id1,id2,id3` | Get multiple players for side-by-side comparison |
| `POST`| `/api/squad/analyze` | Calculate squad chemistry, average rating, attack/defense score for array of player IDs |

---

## 🎮 Keyboard Shortcuts
- `/` : Focus search input
- `Esc` : Close any open modal (Player Detail, Compare, Squad, Pack Opener)

---

## 🔐 Accounts & Database (PostgreSQL)

Users can register / log in and their **Dream XI is stored per user** in PostgreSQL.
Without a database (`DATABASE_URL` unset) the app still works; the login button just reports that accounts are unavailable and the squad stays in `localStorage`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Create account `{username, password}` and log in |
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/logout` | Log out (deletes the session) |
| `GET` | `/api/auth/me` | Current user or `null` |
| `GET` / `PUT` | `/api/squad` | Read / replace the logged-in user's squad `{playerIds: [...]}` (max 11) |
| `GET` | `/api/health/db` | Database reachability |

**Security design:** passwords hashed with scrypt + per-user salt; random 256-bit session tokens stored only as SHA-256 hashes; `HttpOnly` + `SameSite=Lax` cookie (add `COOKIE_SECURE=true` behind HTTPS); same-origin + JSON-only checks on writes; login rate limiting; parameterised SQL only; the app connects with a limited DB user (no DDL, read-only on `players`); the DB port is never published.

**Run locally:** `cp .env.example .env`, set strong passwords, then `docker compose up -d --build`.
**Schema:** `db/init/02-schema.sql` (runs once on an empty volume). Regenerate the player seed with `node scripts/generate-seed.js`.
**Pipeline secrets:** `DEV_/QA_/PROD_DB_ADMIN_PASSWORD` and `DEV_/QA_/PROD_DB_APP_PASSWORD` (use `openssl rand -hex 24`).
