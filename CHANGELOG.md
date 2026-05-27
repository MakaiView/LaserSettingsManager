# Changelog

## v0.1 — 2026-05-27

Initial public release.

### Features
- Material database with Category → Material → Burn Type hierarchy
- Settings rows with full laser parameter set: Speed, Dwell, Frequency, Qpulse, Passes, Line Interval, DPI, Image Mode, Defocus, Wobble, Rotary, Fill Type
- Lens tabs (70mm / 150mm) on each material detail page
- 156 ComMarker Omni 6W factory reference settings seeded from PDF (read-only, collapsible)
- Attempt history per material (Failed / Partial / Success) with notes
- Favorites — star individual settings rows; surfaced on Dashboard
- Search, filter (category, lens, rating, rotary, favorites), card/table view toggle
- Result photo upload per settings row
- JSON export (full backup) and import from Settings page
- CSV export from Materials page
- Dashboard: recently added, highest rated, favorites grid, stats
- In-app update check: Settings page auto-checks GitHub releases on load; shows green checkmark or Update Now button
- Rotary Reference page with corrected ComMarker R5 speed values
- One-liner Proxmox LXC install via MakaiView/ProxmoxScripts
- Seed version protection — reference data only seeds on empty database

### Infrastructure
- Node.js 22 with built-in `node:sqlite` (no better-sqlite3 dependency on Node 22)
- Nginx reverse proxy with `default_server` on port 80
- systemd service (`laser-tracker.service`)
- Install completion message in terminal showing IP and access URL

### UI
- Dark theme (no light mode)
- Mobile-first layout — sidebar collapses on phone
- SVG laser logo in sidebar, clickable to Dashboard
- Parameter display as labeled spec-sheet grid (not chips)
- Monospace font (JetBrains Mono) for all parameter values
- Category color badges: Glass=blue, Metal=silver, Stone=brown, Wood=amber, Fabric=purple, Electronics=green, Acrylic/Plastic=orange, Paper=yellow

### Known limitations
- No image in the sidebar brand (logo is a placeholder SVG — to be replaced)
- No side-by-side comparison view
- No LightBurn file import
- No bulk CSV import
- Single laser profile only
