const { getDb } = require('./schema');

const SEED_ENTRIES = [
  {
    name: 'K9 Crystal — Subsurface 3D Portrait',
    category: 'Glass',
    subcategory: 'Subsurface 3D Crystal',
    notes: 'Point cloud STL from Cockpit3D. Load STL in ComMarker Studio. Blank cost ~$1.50 from Alibaba. Proven workflow.',
    lens_mm: 150, power_percent: null, speed_mms: null, frequency_khz: null,
    passes: 1, line_interval_mm: 0.08, overlap_mm: 0.03,
    wobble_enabled: 0, wobble_amplitude_mm: null, wobble_frequency_hz: null,
    fill_type: null, rotary_enabled: 0, rotary_type: null,
    result_rating: 5, is_favorite: 1,
    result_notes: 'Proven. Crystal blanks from Alibaba ~$1.50 each. Use Cockpit3D for point cloud generation ($10/image — pass through in pricing). 40x40x60mm tested successfully.'
  },
  {
    name: 'Stainless Steel — Black Oxide Mark',
    category: 'Metal',
    subcategory: 'Stainless Steel',
    notes: 'Confirmed black oxide mark recipe. Used on dog tags and urn necklaces successfully. DO NOT use on plated metals — mark looks bad once plating burns through.',
    lens_mm: 150, power_percent: 80, speed_mms: 200, frequency_khz: 80,
    passes: 1, line_interval_mm: 0.05, overlap_mm: 0,
    wobble_enabled: 0, wobble_amplitude_mm: null, wobble_frequency_hz: null,
    fill_type: 'Fill', rotary_enabled: 0, rotary_type: null,
    result_rating: 5, is_favorite: 1,
    result_notes: 'Clean black oxide mark on polished 304 SS. Tested on dog tags and urn necklace sides. For deeper marking increase passes rather than power.'
  },
  {
    name: 'Stainless Steel — Dog Tag Surface Mark',
    category: 'Metal',
    subcategory: 'Stainless Steel',
    notes: 'Adjust power for different finishes. Matte SS needs different settings.',
    lens_mm: 150, power_percent: 75, speed_mms: 250, frequency_khz: 80,
    passes: 1, line_interval_mm: 0.05, overlap_mm: 0.03,
    wobble_enabled: 0, wobble_amplitude_mm: null, wobble_frequency_hz: null,
    fill_type: 'Fill', rotary_enabled: 0, rotary_type: null,
    result_rating: 4, is_favorite: 0,
    result_notes: 'Good result on shiny steel dog tag. Tested and working.'
  },
  {
    name: 'Slate — Surface Engrave',
    category: 'Stone',
    subcategory: 'Slate',
    notes: 'Very forgiving material. Good contrast. Can go deep with multiple passes — tested to 3mm depth (stopped, not limit).',
    lens_mm: 150, power_percent: 70, speed_mms: 300, frequency_khz: 40,
    passes: 1, line_interval_mm: 0.10, overlap_mm: 0.03,
    wobble_enabled: 0, wobble_amplitude_mm: null, wobble_frequency_hz: null,
    fill_type: 'Fill', rotary_enabled: 0, rotary_type: null,
    result_rating: 5, is_favorite: 1,
    result_notes: 'Excellent contrast on slate. Multiple passes add depth — tested 3mm without hitting limit. Great for coasters, memorial stones, plaques.'
  },
  {
    name: 'Slate — Depth Relief',
    category: 'Stone',
    subcategory: 'Slate',
    notes: 'Multi-pass depth engraving. Time intensive — babysit or test run time first. Stopped at 3mm, not the limit of the material. Use 5–10 passes (more = deeper, ~0.3mm per pass).',
    lens_mm: 150, power_percent: 80, speed_mms: 200, frequency_khz: 40,
    passes: 5, line_interval_mm: 0.10, overlap_mm: 0.03,
    wobble_enabled: 0, wobble_amplitude_mm: null, wobble_frequency_hz: null,
    fill_type: 'Fill', rotary_enabled: 0, rotary_type: null,
    result_rating: 4, is_favorite: 0,
    result_notes: 'Depth relief possible. Each pass adds approx 0.3mm. Plan job time before starting. Use exhaust — slate dust.'
  },
  {
    name: 'River Rock — Surface Engrave',
    category: 'Stone',
    subcategory: 'River Rock',
    notes: 'Variable results depending on rock composition. Test on each new batch. Focus critical on curved surface.',
    lens_mm: 150, power_percent: 75, speed_mms: 250, frequency_khz: 40,
    passes: 1, line_interval_mm: 0.10, overlap_mm: 0.03,
    wobble_enabled: 0, wobble_amplitude_mm: null, wobble_frequency_hz: null,
    fill_type: 'Fill', rotary_enabled: 0, rotary_type: null,
    result_rating: 4, is_favorite: 0,
    result_notes: 'Works well on smooth river stones. Surface variation means focus needs adjustment per stone. Slight depth possible with 2+ passes.'
  },
  {
    name: 'Jade — Surface Engrave',
    category: 'Stone',
    subcategory: 'Jade',
    notes: 'UV laser works on jade. Test contrast — green jade varies. Polish workflow: diamond sanding pads + cerium oxide if needed post-engrave.',
    lens_mm: 150, power_percent: 70, speed_mms: 300, frequency_khz: 40,
    passes: 1, line_interval_mm: 0.08, overlap_mm: 0.03,
    wobble_enabled: 0, wobble_amplitude_mm: null, wobble_frequency_hz: null,
    fill_type: 'Fill', rotary_enabled: 0, rotary_type: null,
    result_rating: 3, is_favorite: 0,
    result_notes: 'Works but contrast depends heavily on specific jade color/composition. Test each new batch. Polish after if needed. NEEDS MORE TESTING — parameters not fully dialed.'
  },
  {
    name: 'Black Acrylic — Photo Engrave',
    category: 'Plastic',
    subcategory: 'Cast Acrylic',
    notes: 'CAST acrylic only. Extruded acrylic has UV blockers — will not work. Identify cast vs extruded: cast has no green edge tint, slightly more optical clarity, often sold as "cell cast".',
    lens_mm: 150, power_percent: 55, speed_mms: 400, frequency_khz: 30,
    passes: 1, line_interval_mm: 0.10, overlap_mm: 0.03,
    wobble_enabled: 0, wobble_amplitude_mm: null, wobble_frequency_hz: null,
    fill_type: 'Grayscale', rotary_enabled: 0, rotary_type: null,
    result_rating: 4, is_favorite: 0,
    result_notes: 'Good photo results on black cast acrylic. Cut out after engraving for product use. DO NOT use extruded acrylic — UV blockers prevent marking.'
  },
  {
    name: 'Glass Bottle — Surface Etch (Rotary)',
    category: 'Glass',
    subcategory: 'Bottle/Curved',
    notes: 'Rotary roller setup. Corrected speed settings — see Rotary Reference page. Brown/amber glass needs slightly more power than clear. Soda-lime (green edge tint) = more power needed than K9 crystal.',
    lens_mm: 150, power_percent: 75, speed_mms: 200, frequency_khz: 50,
    passes: 1, line_interval_mm: 0.08, overlap_mm: 0.03,
    wobble_enabled: 1, wobble_amplitude_mm: 0.15, wobble_frequency_hz: 150,
    fill_type: 'Fill', rotary_enabled: 1, rotary_type: 'Roller',
    result_rating: 3, is_favorite: 0,
    result_notes: 'Working but visible line pattern in fills. Wobble helps blend lines. CORRECTED rotary speeds: Min 125, Max 750, Accel 300-500ms, Return 750 pulses/sec. Steps per rotation: 3200 (NOT 12800 as shown in old manual). Object diameter: measure circumference with tape, divide by pi.'
  },
  {
    name: 'Powder Coated Metal — Coat Removal',
    category: 'Metal',
    subcategory: 'Coated/Powder Coat',
    notes: 'Removes powder coat to reveal base metal underneath. Not tested on rotary yet — settings are surface flat test only. Rotary setup needed for cylindrical items (Hydro Flask, tumblers).',
    lens_mm: 150, power_percent: 65, speed_mms: 350, frequency_khz: 60,
    passes: 1, line_interval_mm: 0.10, overlap_mm: 0.03,
    wobble_enabled: 0, wobble_amplitude_mm: null, wobble_frequency_hz: null,
    fill_type: 'Fill', rotary_enabled: 0, rotary_type: null,
    result_rating: 3, is_favorite: 0,
    result_notes: 'Removes powder coat cleanly on flat test pieces. Rotary settings TBD. See Rotary Reference page for setup. NEEDS ROTARY TESTING.'
  },
  {
    name: 'PCB — Isolation + Copper Removal',
    category: 'PCB',
    subcategory: 'FR4 Full Process',
    notes: 'Full workflow: isolation routing of traces, then flood copper removal, then spray paint, then laser remove paint from pads. Currently using one of these PCBs personally — settings need re-dialing. Candy/shiny finish paint options TBD.',
    lens_mm: 150, power_percent: null, speed_mms: null, frequency_khz: null,
    passes: null, line_interval_mm: 0.08, overlap_mm: 0.03,
    wobble_enabled: 0, wobble_amplitude_mm: null, wobble_frequency_hz: null,
    fill_type: 'Fill', rotary_enabled: 0, rotary_type: null,
    result_rating: 4, is_favorite: 0,
    result_notes: 'Proven capable — personally using a PCB made with this process. Settings need to be re-established from scratch. PRIORITY: re-dial and document before offering as product.'
  },
  {
    name: 'White Plastic — Surface Mark',
    category: 'Plastic',
    subcategory: 'Other Plastic',
    notes: 'UV marks white plastic well — darkens/chars surface. Cold laser means no heat damage to electronics.',
    lens_mm: 150, power_percent: 45, speed_mms: 500, frequency_khz: 30,
    passes: 1, line_interval_mm: 0.10, overlap_mm: 0.03,
    wobble_enabled: 0, wobble_amplitude_mm: null, wobble_frequency_hz: null,
    fill_type: 'Fill', rotary_enabled: 0, rotary_type: null,
    result_rating: 4, is_favorite: 0,
    result_notes: 'Good mark on white plastic phone chargers. Adjust power for different plastics — test first. Cold UV laser safe for electronics/temperature sensitive items.'
  },
  {
    name: 'K9 Crystal — Subsurface 2D Flat',
    category: 'Glass',
    subcategory: 'Subsurface 2D',
    notes: 'Defocus 2-3mm below surface. LightBurn grayscale mode (not dither). Similar to 3D crystal but single focal plane — photo/image engraving. NOT YET TESTED — parameters estimated from 3D crystal work.',
    lens_mm: 150, power_percent: null, speed_mms: null, frequency_khz: 50,
    passes: 1, line_interval_mm: 0.08, overlap_mm: 0.03,
    wobble_enabled: 1, wobble_amplitude_mm: 0.10, wobble_frequency_hz: 100,
    fill_type: 'Grayscale', rotary_enabled: 0, rotary_type: null,
    result_rating: null, is_favorite: 0,
    result_notes: 'NOT YET TESTED. Defocus 2-3mm below surface manually before starting. Start at 55% power, 300mm/s — test on scrap piece first. Build spacer jig for consistent focal depth across jobs.'
  },
  {
    name: 'Soda-Lime Glass Plate — Subsurface 2D',
    category: 'Glass',
    subcategory: 'Subsurface 2D',
    notes: '3" x 2" x 1/4" (76mm x 51mm x 6.35mm). Soda-lime (green edge tint) — more power needed than K9 crystal. 6.35mm thickness gives good focal depth range: test 1.5mm, 2mm, 2.5mm, 3mm. Calibration pieces only — use K9 for production.',
    lens_mm: 150, power_percent: null, speed_mms: null, frequency_khz: 50,
    passes: 1, line_interval_mm: 0.08, overlap_mm: 0.03,
    wobble_enabled: 1, wobble_amplitude_mm: 0.15, wobble_frequency_hz: null,
    fill_type: 'Grayscale', rotary_enabled: 0, rotary_type: null,
    result_rating: null, is_favorite: 0,
    result_notes: 'NOT YET TESTED. Calibration/test material only. Start at 65% power, 250mm/s. Green edge tint confirms soda-lime composition. Use to establish baseline before moving to K9 flat blanks.'
  }
];

function seedDb() {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM materials').get().c;
  if (count > 0) return;

  const insertMat = db.prepare(
    `INSERT INTO materials (name, category, subcategory, notes) VALUES (?, ?, ?, ?)`
  );
  const insertSet = db.prepare(`
    INSERT INTO settings (
      material_id, lens_mm, power_percent, speed_mms, frequency_khz,
      passes, line_interval_mm, overlap_mm, wobble_enabled, wobble_amplitude_mm,
      wobble_frequency_hz, fill_type, rotary_enabled, rotary_type,
      result_rating, result_notes, is_favorite
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const e of SEED_ENTRIES) {
      const { lastInsertRowid: mid } = insertMat.run(e.name, e.category, e.subcategory, e.notes);
      insertSet.run(
        mid, e.lens_mm, e.power_percent, e.speed_mms, e.frequency_khz,
        e.passes, e.line_interval_mm, e.overlap_mm, e.wobble_enabled,
        e.wobble_amplitude_mm, e.wobble_frequency_hz, e.fill_type,
        e.rotary_enabled, e.rotary_type, e.result_rating, e.result_notes, e.is_favorite
      );
    }
  })();

  console.log(`Seeded ${SEED_ENTRIES.length} entries.`);
}

module.exports = { seedDb };
