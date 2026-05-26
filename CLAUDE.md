# Laser Settings Tracker — CLAUDE.md

## What This Is

A self-hosted web app for tracking laser engraving parameters by material.
Runs in a Proxmox LXC container. Used on mobile at the laser while engraving.

**Machine:** ComMarker Omni XE 6W UV Galvo (355nm), 150mm lens (primary)
**Software:** LightBurn + ComMarker Studio
**Owner:** Makai View Media — Salt Lake City, UT

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20.x + Express |
| Database | SQLite (single file, no external DB) |
| Frontend | Vue 3 via CDN — **no build step** |
| Process manager | PM2 |
| Reverse proxy | Nginx |
| Hosting | Proxmox LXC (Ubuntu 22.04) |

---

## Repository Structure

```
laser-settings-tracker/
├── install/
│   ├── create_lxc.sh        # Runs on Proxmox HOST
│   └── install.sh           # Runs INSIDE the LXC
├── app/
│   ├── server.js
│   ├── package.json
│   ├── ecosystem.config.js
│   ├── routes/
│   │   ├── materials.js
│   │   ├── upload.js
│   │   └── system.js
│   ├── db/
│   │   ├── schema.js
│   │   └── seed.js
│   └── public/
│       ├── index.html
│       ├── css/
│       └── js/
├── .env.example
├── .gitignore
├── README.md
└── update.sh
```

---

## File Paths (Production)

```
/opt/laser-tracker/          — app root
/opt/laser-tracker/app/      — Node.js application
/opt/laser-tracker/data/     — SQLite database + uploads
/opt/laser-tracker/data/settings.db
/opt/laser-tracker/data/uploads/
/opt/laser-tracker/.env
```

---

## Environment Variables

```
PORT=3000
DB_PATH=/opt/laser-tracker/data/settings.db
UPLOAD_PATH=/opt/laser-tracker/data/uploads
GITHUB_REPO=MakaiView/LaserSettingsManager
UPDATE_TOKEN=changeme_set_a_real_token_here
```

---

## Data Model

### materials table
```sql
CREATE TABLE materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### settings table
```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  lens_mm INTEGER DEFAULT 150,
  power_percent REAL,
  speed_mms REAL,
  frequency_khz REAL,
  passes INTEGER DEFAULT 1,
  line_interval_mm REAL DEFAULT 0.08,
  overlap_mm REAL DEFAULT 0.03,
  wobble_enabled BOOLEAN DEFAULT 0,
  wobble_amplitude_mm REAL,
  wobble_frequency_hz REAL,
  fill_type TEXT,
  rotary_enabled BOOLEAN DEFAULT 0,
  rotary_type TEXT,
  result_rating INTEGER CHECK(result_rating BETWEEN 1 AND 5),
  result_notes TEXT,
  image_path TEXT,
  is_favorite BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES materials(id)
);
```

---

## API Endpoints

```
GET    /api/materials                   List all (supports ?search= &category= &rating= &favorite=)
POST   /api/materials                   Create new entry (with settings)
GET    /api/materials/:id               Get single entry with settings
PUT    /api/materials/:id               Update entry
DELETE /api/materials/:id               Delete entry
POST   /api/materials/:id/duplicate     Clone entry, return new id
POST   /api/materials/:id/favorite      Toggle favorite
POST   /api/upload/:id                  Upload result photo (multipart/form-data)
GET    /api/categories                  List all categories
GET    /api/export                      Download full JSON backup
POST   /api/import                      Restore from JSON
GET    /api/version                     Current git tag + commit hash
GET    /api/update/check                Compare local tag vs GitHub latest tag
POST   /api/update/run                  git pull + npm install + pm2 restart (token protected)
```

---

## UI Design

### Theme (dark only — no light mode)
- Background: `#0f1117`, Surface: `#1a1d27`
- Accent: `#00bcd4` (hover `#00e5ff`)
- Text primary: `#e8eaf0`, secondary: `#8892a4`
- Borders: `#2a2d3a`
- Success: `#4caf50`, Warning: `#ff9800`, Error: `#f44336`

### Typography
- UI: Inter or DM Sans (Google Fonts CDN)
- Parameter values: JetBrains Mono or Fira Code (monospace) — must be visually distinct at a laser workstation

### Layout
- Mobile first — used on phone at the laser
- Sidebar nav (collapsible on mobile)
- Card grid: 2 col mobile, 3 col tablet, 4 col desktop
- Table view toggle option

### Category Badge Colors
Glass=blue, Metal=silver, Stone=brown, Wood=amber, Fabric=purple, PCB=green, Plastic=orange, Paper=yellow, Other=gray

### Pages
1. **Dashboard** — search, recently added (last 5), highest rated (top 5), stats, version + update button
2. **Materials** — browser with filter sidebar, card/table toggle
3. **Add Entry** — full form
4. **Entry Detail** — read view with edit/duplicate/delete
5. **Edit Entry** — form pre-populated
6. **Settings** — app config, backup/restore, about

---

## Build Constraints

- All code complete and functional — no placeholders or TODOs in production code
- No build step — Vue 3 via CDN only
- SQLite only — no external database
- Installer scripts must match community-scripts.org style (color-coded msg_info / msg_ok / msg_error)
- Seed data must be pre-populated on first install (14 entries defined in spec)
- One-liner install must work on fresh Proxmox 8.x host

---

## Key Non-Obvious Facts

- The ComMarker R5 Rotary manual shows 12800 steps/rotation but hardware was updated to 3200. Running at manual speeds causes 4x overspeed. Corrected speeds: Min 125, Max 750, Accel 300-500ms, Return 750 pulses/sec.
- Extruded acrylic has UV blockers and will NOT mark — only cast acrylic works.
- Soda-lime glass (green edge tint) needs more power than K9 crystal for subsurface work.
- The rotary reference data should be stored as a pinned note/help page in the app, not as a settings entry.

---

## Pending Change Requests (in-progress — do not lose these)

These were requested after the initial build. Implement in order; check off as done.

- [x] **1. Burn types as subcategories** — `burn_type` field on settings rows. Structure: Category > Material > Burn Type.
- [x] **2. Attempt history** — `attempts` table + collapsible section on detail page. Log worked/partial/fail.
- [x] **3. Favorites shortcut on dashboard** — Favorites grid on Dashboard + clickable stat card.
- [x] **4. Lenses 70mm and 150mm only** — All forms and filters constrained to 70 / 150.
- [x] **5. Lens tabs within material** — Detail page shows 70mm / 150mm tabs, each listing burn type settings rows.
- [x] **6. Seed data protection on update** — `seed_version` in app_settings + `is_commarker_reference` flag. Seed only runs on empty DB.
- [x] **7. PDF-based ComMarker default database** — 156 reference settings from PDF seeded, `is_commarker_reference=1`, shown in collapsible "ComMarker Reference" section on detail page.
- [x] **8. *(this item)* — Document requests in CLAUDE.md** ✓

### Data model changes required
- `settings` table: add `burn_type TEXT`, `pulse_width INTEGER`, `dwell_time_us REAL`, `dpi INTEGER`, `image_mode TEXT`, `defocus_mm REAL`, `is_commarker_reference BOOLEAN DEFAULT 0`
- New `attempts` table: `id, material_id, burn_type, lens_mm, speed_mms, dwell_time_us, frequency_khz, pulse_width, passes, line_interval_mm, dpi, worked INTEGER (0=fail/1=partial/2=success), notes, created_at`
- Lenses: only 70 and 150 throughout codebase

### PDF source file
`~/Downloads/Laser/Omni X 6W Material Settings.pdf`
Pages 1–2: 70mm lens settings. Pages 3–4: 150mm lens settings.
Categories: Glass/Ceramics, Metal, Tumblers, Acrylic, Plastic/Silicone, Wood, Fabric, Electronics, Food, Sport, Stone/Slate, Paper, Others.

---

## Future Features (GitHub issues only — do not build now)
Side-by-side comparison, tag system, print PDF, LightBurn file import, cost tracker, job timer, QR codes, multiple laser profiles, bulk CSV import.
