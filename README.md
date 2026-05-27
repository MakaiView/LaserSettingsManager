# Laser Settings Tracker

A self-hosted web app for storing and managing laser engraver parameters by material. Built for use on a phone at the laser — dark-themed, mobile-first, fast.

**Machine:** ComMarker Omni XE 6W UV Galvo (355nm), 70mm and 150mm lenses  
**By:** Makai View Media — Salt Lake City, UT

---

## Install

Run this one-liner on a **Proxmox 8.x host shell**:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/MakaiView/ProxmoxScripts/master/ct/laser-tracker.sh)"
```

This creates an Ubuntu 22.04 LXC container with Node.js 22, nginx, and the app fully configured. After install, the terminal shows the container IP.

**Access:** `http://<container-ip>` (port 80, no port number needed)

---

## Features

- **Material database** — entries organized as Category → Material → Burn Type
- **Lens tabs** — 70mm and 150mm settings on each material page, side by side
- **ComMarker reference data** — 156 factory settings from the official PDF, read-only, collapsible
- **Attempt history** — log Failed / Partial / Success attempts per material with notes
- **Favorites** — star any settings row; favorites surface on the Dashboard
- **Search and filter** — by category, lens, min rating, rotary, favorites
- **Card and table views** — grid for browsing, table for scanning
- **Result photos** — attach an engraving photo to any settings row
- **JSON export/import** — full backup and restore from Settings
- **In-app update** — Settings page auto-checks GitHub for new releases and shows an update button
- **Rotary reference** — corrected ComMarker R5 speed values (manual is wrong; see below)

---

## Laser Parameters

Each settings row stores:

| Field | Description |
|---|---|
| **Burn Type** | Operation: Engraving, Photos, Cutting, Black Oxide, Remove Coat, etc. |
| **Lens** | 70mm or 150mm |
| **Speed (mm/s)** | Galvo scan speed. Used for engraving/cutting. Leave blank if using Dwell. |
| **Dwell Time (µs)** | Point dwell for photo/halftone modes. Leave blank if using Speed. |
| **Frequency (kHz)** | Pulse repetition rate. Typical: 20–90 kHz. |
| **Qpulse** | Pulse width index (as shown in ComMarker Studio). Higher = more energy per pulse. |
| **Passes** | How many traversals of the same path. |
| **Line Interval (mm)** | Spacing between scan lines. Smaller = finer fill, slower job. |
| **DPI** | For photo/halftone modes. Typical: 850–1250. |
| **Image Mode** | Halftone or Grayscale — used with Dwell for photos. |
| **Defocus (mm)** | Intentional defocus. Used for coat removal on tumblers, some glass ops. |
| **Fill Type** | Fill, Line, Grayscale, or Offset Fill. |
| **Wobble** | Lateral beam oscillation. Helps blend scan lines on glass and metal. |
| **Rotary** | Enable for R5 rotary jobs. See the Rotary Reference page. |

---

## Updating

The Settings page auto-checks for new releases on load. If an update is available, click **Update Now** and enter the update token from `/opt/laser-tracker/.env`.

To update manually over SSH:

```bash
cd /opt/laser-tracker
git pull origin master
npm install --production --prefix app
systemctl restart laser-tracker
```

The database is never touched during an update.

---

## Production File Paths

```
/opt/laser-tracker/           App root
/opt/laser-tracker/app/       Node.js application
/opt/laser-tracker/data/      SQLite database + uploaded photos
/opt/laser-tracker/.env       Environment config (PORT, DB_PATH, UPDATE_TOKEN)
```

Key service commands:

```bash
systemctl status laser-tracker
systemctl restart laser-tracker
journalctl -u laser-tracker -n 50
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 22 + Express |
| Database | SQLite (built-in `node:sqlite` on Node 22) |
| Frontend | Vue 3 via CDN — no build step |
| Reverse proxy | Nginx |
| Process manager | systemd |
| Hosting | Proxmox LXC (Ubuntu 22.04) |

---

## API

```
GET    /api/materials                   List all (search, category, rating, favorite, lens, rotary filters)
POST   /api/materials                   Create new material
GET    /api/materials/:id               Get material with all settings and attempts
PUT    /api/materials/:id               Update material info
DELETE /api/materials/:id               Delete material (cascades to settings + attempts)
POST   /api/materials/:id/duplicate     Clone entry

POST   /api/materials/:id/settings             Add settings row
PUT    /api/materials/:id/settings/:sid        Update settings row
DELETE /api/materials/:id/settings/:sid        Delete settings row
POST   /api/materials/:id/settings/:sid/favorite  Toggle favorite

GET    /api/materials/:id/attempts      List attempt history
POST   /api/materials/:id/attempts      Log new attempt
DELETE /api/materials/:id/attempts/:aid Delete attempt

POST   /api/upload/:id/:sid             Upload result photo (multipart)
DELETE /api/upload/:id/:sid             Remove result photo

GET    /api/categories                  List all categories
GET    /api/export                      Full JSON backup download
GET    /api/export/csv                  CSV export
POST   /api/import                      Restore from JSON backup

GET    /api/version                     Current git tag + commit hash
GET    /api/update/check                Compare local tag vs GitHub latest release
POST   /api/update/run                  Pull + install + restart (requires x-update-token header)

GET    /api/settings                    Get app config (github_repo)
PUT    /api/settings                    Update app config
```

---

## Rotary Note

The ComMarker R5 manual lists **12800 steps/rotation** but the hardware ships at **3200**. Running at manual values causes 4× overspeed — the workpiece jumps and loses registration. Correct values:

| Setting | Correct | Manual (wrong) |
|---|---|---|
| Steps / rotation | 3200 | 12800 |
| Min speed | 125 pulses/sec | 500 |
| Max speed | 750 pulses/sec | 3000 |
| Acceleration | 300–500 ms | 100 ms |
| Return speed | 750 pulses/sec | 3000 |

The Rotary Reference page in the app sidebar covers the full setup.

---

## Install Infrastructure

The LXC installer lives in a separate repo: [MakaiView/ProxmoxScripts](https://github.com/MakaiView/ProxmoxScripts)

---

## License

MIT — © 2024–2026 Makai View Media (Steve Robinson)
