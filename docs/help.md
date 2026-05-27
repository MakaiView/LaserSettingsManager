# Laser Settings Tracker — Help & Reference

**Machine:** ComMarker Omni XE 6W UV Galvo (355nm)
**Lenses:** 70mm / 150mm
**Software:** LightBurn + ComMarker Studio

---

## Contents

1. [How the App is Organized](#1-how-the-app-is-organized)
2. [Adding a Material Entry](#2-adding-a-material-entry)
3. [Material Detail Page](#3-material-detail-page)
4. [Laser Parameter Reference](#4-laser-parameter-reference)
5. [ComMarker Reference Data](#5-commarker-reference-data)
6. [Logging Attempts](#6-logging-attempts)
7. [Favorites](#7-favorites)
8. [Rotary Setup](#8-rotary-setup)
9. [Backup and Restore](#9-backup-and-restore)
10. [Updating the App](#10-updating-the-app)
11. [Material Gotchas and Known Issues](#11-material-gotchas-and-known-issues)
12. [Common Errors](#12-common-errors)

---

## 1. How the App is Organized

Entries follow a three-level hierarchy:

```
Category  →  Material  →  Burn Type
Glass/Ceramics → Glass → Engraving
                       → Deep Engraving / Matte
                       → Cutting
               → 3D Crystal → 3D Subsurface
```

- **Category** — the broad material group (Glass/Ceramics, Metal, Wood, etc.)
- **Material** — the specific material within that group (Glass, Aluminum, Slate, etc.)
- **Burn Type** — the operation being performed (Engraving, Photos, Cutting, Black Oxide, etc.)

Each material can have **multiple settings rows** — one per Burn Type + Lens combination. A single material entry for "Stainless Steel" might have rows for Engraving (70mm), Engraving (150mm), Photos (150mm), and Black Oxide (150mm), all on one page.

---

## 2. Adding a Material Entry

**Add Entry** (sidebar or + button on Dashboard) opens a two-section form:

### Material section
| Field | Notes |
|---|---|
| **Name** | Just the material, not the operation. Use "Glass" not "Glass Engraving." |
| **Category** | Pick the closest match from the list. |
| **Process Notes** | Setup tips, warnings, gotchas. These apply to the material overall, not a specific run. |

### Initial Settings section
This creates your first settings row. You can add more later from the detail page.

| Field | Notes |
|---|---|
| **Burn Type** | Free-text with suggestions. Describes the operation: Engraving, Photos, Cutting, Black Oxide, Remove Coat, etc. |
| **Lens** | 70mm or 150mm only. |
| **Speed (mm/s)** | Used for engraving/marking/cutting. Leave blank for photo/dwell modes. |
| **Dwell Time (µs)** | Used for photo/halftone modes instead of speed. Leave blank for standard engraving. |
| **Frequency (kHz)** | Pulse repetition rate. Higher = more pulses per second. |
| **Pulse Width** | Pulse duration. Higher values = more energy per pulse. Affects depth vs. burn. |
| **Passes** | Number of times the laser traverses the same path. |
| **Line Interval (mm)** | Spacing between scan lines. Smaller = finer fill, slower. Typical: 0.02–0.1mm. |
| **DPI** | For photo/halftone modes. Typical: 850–1250. |
| **Image Mode** | Halftone or Grayscale. Used with dwell time for photos. |
| **Defocus (mm)** | Distance to intentionally defocus the beam. Used for coat removal, some glass ops. |
| **Fill Type** | Fill, Line, Grayscale, or Offset Fill. Set in LightBurn. |
| **Wobble** | Adds a lateral oscillation to the beam path. Helps blend scan lines on glass and metal. |
| **Rotary** | Enable if using the R5 rotary. See [Rotary Setup](#8-rotary-setup). |

---

## 3. Material Detail Page

### Lens Tabs (70mm / 150mm)
The detail page splits settings by lens. Tap the lens tab to switch between them. If you only have 150mm data, only that tab is shown.

### Your Settings
Settings rows you created. These can be edited, deleted, favorited, and have result photos attached. Each row shows all the parameters you entered plus your rating and result notes.

### ComMarker Reference (collapsible)
Factory reference settings from the ComMarker "Omni X 6W Material Settings" PDF, shown under the same lens tab. These are read-only. Use them as a starting point and log your own results alongside them.

### Attempt History (collapsible)
A running log of what you tried and how it went. See [Logging Attempts](#6-logging-attempts).

---

## 4. Laser Parameter Reference

### Speed vs. Dwell Time
These are mutually exclusive modes:

- **Speed (mm/s)** — the galvo scan speed. Used for engraving, marking, cutting. Higher = less energy per area = lighter mark.
- **Dwell Time (µs)** — how long the laser dwells on each point. Used for photo/halftone modes in ComMarker Studio. Lower = lighter.

For photo work in ComMarker Studio, you set dwell time + DPI instead of speed. Fill the dwell time field and leave speed blank, or vice versa.

### Frequency and Pulse Width
These work together and both affect energy delivery:

- **Frequency (kHz)** — how many pulses per second. Typical range: 20–90 kHz.
- **Pulse Width** — duration of each pulse (nanoseconds, set as an integer index in ComMarker Studio, not a raw time value). Higher = more energy per pulse = deeper/darker mark.

Common starting combos:
| Operation | Frequency | Pulse Width |
|---|---|---|
| Standard engraving | 40 kHz | 3–8 |
| Black oxide on SS | 80 kHz | 6–9 |
| Photo/halftone metal | 40 kHz | 9–22 |
| Glass deep / matte | 40 kHz | 3 |

### Line Interval
Controls fill density. Smaller interval = more overlap = heavier, slower fill.

| Interval | Use case |
|---|---|
| 0.01–0.02 mm | Fine detail, solid black fills |
| 0.03–0.05 mm | Standard metal engraving |
| 0.08–0.12 mm | Wood, stone, fast fills |
| 1.0 mm | Cutting passes |

### Defocus
Intentionally moving the focal plane to widen the beam spot:

- **Coat removal (Tumblers):** ~10mm defocus. The wider spot removes coating without engraving the base metal.
- **Slate white marking:** 2–10mm defocus lightens the mark color.
- **Black carbon fiber:** ~10–15mm defocus to avoid cutting through.
- **Subsurface glass:** defocus is set below the surface, not above it.

---

## 5. ComMarker Reference Data

The app ships with factory reference settings extracted from the official ComMarker "OMNI 6W PARAMETER" PDF for both 70mm and 150mm lenses. These cover most material categories: Glass/Ceramics, Metal, Tumblers, Acrylic, Plastic/Silicone, Wood, Fabric, Electronics, Food, Sport, Stone/Slate, Paper, and Others.

Reference entries are marked with a **ComMarker Ref** tag and displayed in a collapsible section on each material's detail page. They are read-only.

**Important:** ComMarker's published parameters are a starting point. Results vary based on focus accuracy, material variation, surface finish, ambient temperature, and lens condition. Always test on scrap before running a job.

The 150mm lens settings in the PDF generally use lower speeds than the 70mm lens for equivalent results, because the 150mm lens produces a larger spot size.

---

## 6. Logging Attempts

The Attempt History section on a material's detail page lets you keep a running log of what you tried. This is separate from saving a finalized settings row — use it for tracking experiments while dialing in parameters.

Each attempt records:
- **Burn Type + Lens** — what you were trying to do
- **Key parameters** — speed, frequency, pulse width, passes
- **Result** — Failed / Partial / Success
- **Notes** — what happened, what to try next

Attempts are shown newest-first. They never get deleted when you update your settings rows, so you have a permanent history of what worked and what didn't.

**Suggested workflow:**
1. Try the ComMarker reference settings on scrap
2. Log the attempt (result + notes)
3. Adjust and try again, logging each iteration
4. Once happy, save a proper settings row with your final values and a result rating

---

## 7. Favorites

Star any settings row to mark it as a favorite. Favorited entries appear in the **Favorites** section on the Dashboard for quick access.

- **Star icon** on a settings row = favorite that specific row
- **Dashboard favorites grid** = up to 6 of your favorited materials, tap to go straight to the detail page
- **Favorites filter** in the Materials view = show only materials with at least one favorited row

Use favorites for your proven, production-ready recipes — the ones you reach for at the laser every time.

---

## 8. Rotary Setup

See the **Rotary Reference** page in the app sidebar for the full setup guide. Key points:

### Corrected Motor Speeds
The ComMarker R5 manual lists 12800 steps/rotation, but the hardware ships at **3200 steps/rotation**. Using the manual values causes 4× overspeed — the workpiece jumps and loses registration.

| Setting | Correct value | Manual (wrong) |
|---|---|---|
| Steps / rotation | 3200 | 12800 |
| Min speed | 125 pulses/sec | 500 |
| Max speed | 750 pulses/sec | 3000 |
| Acceleration | 300–500 ms | 100 ms |
| Return speed | 750 pulses/sec | 3000 |

### Chuck vs. Roller
- **Chuck:** rings, coins, small cups, short objects. Use the tail support on anything over ~100mm.
- **Roller:** bottles, tumblers, Hydro Flasks, long cylinders.

### Measuring Diameter
Measure the circumference at the engraving zone with a flexible tape, then:

```
Diameter = Circumference ÷ π (3.14159)
```

Within 1mm is accurate enough for most work. Do not measure at the widest point — measure where the laser will actually hit.

### Axis
Set to **X Axis** in LightBurn.

---

## 9. Backup and Restore

Go to **Settings → Backup & Restore**.

- **Export JSON** — downloads a full backup of all your materials, settings rows, and attempt history. Save this before any update or if moving to a new server.
- **Import JSON** — restores from a v2.0 backup file. Entries are *added* without removing existing data. If you import the same backup twice, you will get duplicates — there is no deduplication.

**Back up before updating.** The update mechanism pulls new code but never touches your database. However, having a JSON backup is good insurance regardless.

The ComMarker reference entries (`is_commarker_reference = 1`) are seeded by the app and do not need to be backed up — they will be re-seeded on a fresh install. Only your personal entries need backing up.

---

## 10. Updating the App

From the **Dashboard**, click **Check for Updates**. If a newer version is available on GitHub, an **Update** button appears.

Clicking Update will:
1. Prompt for your update token (set in `/opt/laser-tracker/.env` as `UPDATE_TOKEN`)
2. Run `git pull origin master`
3. Run `npm install --production`
4. Restart the app via PM2

Your database is never touched during an update.

**SSH alternative:**
```bash
cd /opt/laser-tracker
git pull origin master
npm install --production --prefix app
pm2 restart laser-tracker
```

---

## 11. Material Gotchas and Known Issues

### Acrylic — Extruded vs. Cast
**Extruded acrylic will NOT mark with a UV laser.** Extruded acrylic contains UV stabilizers that block the 355nm beam.

- **Cast acrylic:** works. No green edge tint. Slightly more optical clarity. Often sold as "cell cast" or "cast sheet."
- **Extruded acrylic:** will not mark. Green edge tint under a bright light. Usually cheaper.

If your acrylic isn't marking at all, this is almost certainly the reason.

### Glass — Soda-Lime vs. K9 Crystal
Glass composition affects how much power you need:

- **K9 optical crystal** (clear edges) — cleanest subsurface results, lower power needed
- **Soda-lime glass** (green edge tint) — requires more power for equivalent results
- **Brown/amber glass bottles** — more power than clear glass of the same type

When dialing in glass settings, identify the glass type first. K9 crystal settings will under-power soda-lime glass.

### Stainless Steel — Photos Need Negative Image
When engraving photos on stainless steel or aluminum, the laser removes the oxide layer where it fires. This means the mark is **lighter** where the source image is **darker**. You must enable **negative image** in ComMarker Studio or the image will appear inverted.

This applies to: Stainless Steel Photos, Aluminum Photos, Mirror Stainless Steel Photos.

### Black Oxide on Stainless Steel
Black oxide (the high-contrast black mark on polished steel) is achieved with high frequency and low speed:
- High frequency (80 kHz) with a short burst oxidizes the surface
- Speed controls darkness: faster = lighter gray, slower = black
- Too slow or too many passes = the mark burns through to a dull gray or ablates off entirely
- Works on bare 304/316 stainless. **Does NOT work on plated metals** — the plating burns through first, leaving a discolored mark

### Tumblers — Defocus is Required
Powder coat removal on tumblers requires ~10mm of defocus to widen the beam spot. Without defocus, the narrow focused beam engraves the base metal instead of lifting the coating.

### Wood — Grain Variation
Wood parameters are suggestions only. Grain density, resin content, and surface finish vary even within the same board. Dark-grain hardwoods (walnut, cherry) generally need less power than light softwoods. Always test in a corner or scrap piece.

### Food Items
UV laser engraving on food is generally considered safe for surface marking since the 355nm UV does not penetrate deeply and leaves no chemical residue. However:
- Engrave the skin/shell only, not cut surfaces
- Don't engrave food that will be eaten without washing (raw egg, unwashed fruit)
- Humidity affects mark quality on fruit — slightly underripe fruit marks more cleanly

---

## 12. Common Errors

### No mark at all

| Possible cause | Fix |
|---|---|
| Extruded acrylic | Replace with cast acrylic. See [Acrylic gotcha](#acrylic--extruded-vs-cast). |
| Wrong focal distance | Re-focus. On galvo lasers focus is critical — even 0.5mm off reduces power significantly. |
| Lens contamination | Clean the lens with lens paper + IPA. UV lenses are sensitive to fingerprints. |
| Power too low | Increase power % or reduce speed. Check the ComMarker reference values for a baseline. |
| Frequency too high | At very high frequencies with low pulse width, average power drops. Try 40 kHz as a baseline. |

### Mark is too light / not deep enough

| Possible cause | Fix |
|---|---|
| Speed too fast | Reduce speed or increase passes. |
| Pulse width too low | Increase pulse width by 2–3 increments and test. |
| Frequency mismatch | For deep marking, lower frequency (40 kHz) with higher pulse width concentrates more energy per pulse. |
| Dirty material surface | Clean with IPA. Oils and coatings absorb or scatter the beam. |

### Mark is too dark / burning

| Possible cause | Fix |
|---|---|
| Speed too slow | Increase speed. |
| Too many passes | Reduce to 1 pass and adjust power instead. |
| Pulse width too high | Reduce pulse width. |
| Power too high | Reduce power %. |

### Photos/halftones look grainy or have banding

| Possible cause | Fix |
|---|---|
| DPI too low | Try 850 or 1250 DPI. Lower DPI = coarser dots. |
| Wrong image mode | Use Halftone for metal, Grayscale for wood/stone/acrylic. |
| Dwell time too high | Reduce. Each dot is over-exposing. |
| Image not inverted | Stainless/aluminum need negative image. See [Photos note](#stainless-steel--photos-need-negative-image). |
| Vibration | Check that the workpiece is secure and not vibrating during the job. |

### Rotary — workpiece jumping or misregistering

Almost always caused by incorrect step count. Set steps/rotation to **3200**, not 12800. Set max speed to **750**, not 3000. See [Rotary Setup](#8-rotary-setup).

### Rotary — image is stretched or compressed

The diameter entered in LightBurn does not match the actual diameter at the engraving zone. Remeasure using a flexible tape at the exact point where the laser hits, then divide by π.

### Glass cracking during engraving

| Possible cause | Fix |
|---|---|
| Power too high | Reduce by 10–15% and test. |
| Speed too slow | Faster passes deposit less heat per area. |
| Thermal shock | Cold glass brought indoors — let it reach room temperature first. |
| Cheap soda-lime glass | Soda-lime cracks more readily than borosilicate or K9. Switch material or reduce power further. |
| Subsurface work too close to surface | Defocus at least 1–2mm below the surface. Too close creates surface stress. |

### Coat not lifting on tumblers

| Possible cause | Fix |
|---|---|
| Not enough defocus | Try 10mm defocus. The spot must be wider than focused. |
| Speed too fast | Slow down — the coat needs dwell time to release. |
| Wrong type of coat | Some powder coats are harder. Try 2 passes. Cerakote often needs different settings than standard powder coat. |

### App won't load after update

SSH in and check PM2:
```bash
pm2 logs laser-tracker --lines 50
```
If there's a startup error, check that the `.env` file still exists and `DB_PATH` is pointing to your database file. Restart manually:
```bash
pm2 restart laser-tracker
```

### Update token rejected

The update token in the UI must exactly match `UPDATE_TOKEN` in `/opt/laser-tracker/.env`. The token is case-sensitive. You can view or change it with:
```bash
cat /opt/laser-tracker/.env
nano /opt/laser-tracker/.env
```
After changing the token, restart the app:
```bash
pm2 restart laser-tracker
```
