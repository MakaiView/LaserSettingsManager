const { getDb } = require('./schema');

// ── ComMarker reference data from "Omni X 6W Material Settings" PDF ──────────
// All marked is_commarker_reference=1. Speed in mm/s, dwell_time in µs, freq in kHz.
// Image mode rows use dwell_time_us instead of speed_mms.

const CM_REF = [
  // ── Glass/Ceramics ──────────────────────────────────────────────
  { cat: 'Glass/Ceramics', name: '3D Crystal', bt: '3D Subsurface',
    s70:  { speed: 800,  freq: 40, pw: 12, passes: 1 },
    s150: { speed: 800,  freq: 40, pw: 12, passes: 1 } },

  { cat: 'Glass/Ceramics', name: 'Glass', bt: 'Engraving',
    s70:  { speed: 400,  freq: 40, pw: 3, passes: 1, interval: 0.02 },
    s150: { speed: 500,  freq: 40, pw: 3, passes: 1, interval: 0.03 } },

  { cat: 'Glass/Ceramics', name: 'Glass', bt: 'Deep Engraving / Matte',
    s70:  { speed: 1200, freq: 40, pw: 3, passes: 1, interval: 0.02 },
    s150: { speed: 600,  freq: 40, pw: 3, passes: 1, interval: 0.02 } },

  { cat: 'Glass/Ceramics', name: 'Glass', bt: 'Cutting',
    s70:  { speed: 200, freq: 40, pw: 3, passes: 50 },
    s150: { speed: 200, freq: 40, pw: 3, passes: 50 } },

  { cat: 'Glass/Ceramics', name: 'Ceramics', bt: 'Engraving',
    s70:  { speed: 400, freq: 40, pw: 3, passes: 1, interval: 0.02 },
    s150: { speed: 700, freq: 40, pw: 3, passes: 1, interval: 0.03 } },

  // ── Metal ────────────────────────────────────────────────────────
  { cat: 'Metal', name: 'Aluminum', bt: 'Engraving',
    s70:  { speed: 2000, freq: 40, pw: 3,  passes: 1, interval: 0.02 },
    s150: { speed: 690,  freq: 40, pw: 3,  passes: 1, interval: 0.03 } },

  { cat: 'Metal', name: 'Aluminum', bt: 'Photos',
    s70:  { dwell: 100,  freq: 40, pw: 12, passes: 1, dpi: 850, image_mode: 'Halftone', notes: 'Negative image' },
    s150: { dwell: 400,  freq: 40, pw: 22, passes: 1, dpi: 850, image_mode: 'Halftone', notes: 'Negative image' } },

  { cat: 'Metal', name: 'Aluminum', bt: 'Cutting',
    s70:  { speed: 50,   freq: 40, pw: 3,  passes: 12, interval: 0.08 },
    s150: { speed: 50,   freq: 40, pw: 3,  passes: 12, interval: 0.08 } },

  { cat: 'Metal', name: 'Brass', bt: 'Engraving',
    s70:  { speed: 3000, freq: 90, pw: 3,  passes: 3, interval: 0.02 },
    s150: { speed: 560,  freq: 40, pw: 5,  passes: 1, interval: 0.03 } },

  { cat: 'Metal', name: 'Brass', bt: 'Deep Brown',
    s70:  { speed: 800,  freq: 80, pw: 6,  passes: 1, interval: 0.08 },
    s150: null },

  { cat: 'Metal', name: 'Brass', bt: 'Photos',
    s70:  { dwell: 320,  freq: 40, pw: 3,  passes: 1, dpi: 850, image_mode: 'Halftone' },
    s150: { dwell: 400,  freq: 40, pw: 3,  passes: 1, dpi: 850, image_mode: 'Halftone' } },

  { cat: 'Metal', name: 'Stainless Steel', bt: 'Engraving',
    s70:  { speed: 2000, freq: 40, pw: 3,  passes: 1, interval: 0.02 },
    s150: { speed: 6000, freq: 40, pw: 9,  passes: 1, interval: 0.03 } },

  { cat: 'Metal', name: 'Stainless Steel', bt: 'Photos',
    s70:  { dwell: 320,  freq: 40, pw: 6,  passes: 1, dpi: 850, image_mode: 'Halftone', notes: 'Negative image' },
    s150: { dwell: 400,  freq: 40, pw: 9,  passes: 1, dpi: 850, image_mode: 'Halftone', notes: 'Negative image' } },

  { cat: 'Metal', name: 'Stainless Steel', bt: 'Brown Tint',
    s70:  { speed: 500,  freq: 40, pw: 3,  passes: 1, interval: 0.02 },
    s150: { dwell: 500,  freq: 40, pw: 9,  passes: 1, dpi: 850, image_mode: 'Halftone' } },

  { cat: 'Metal', name: 'Stainless Steel', bt: 'Black Oxide',
    s70:  { speed: 30,   freq: 80, pw: 6,  passes: 1, interval: 0.01 },
    s150: { speed: 30,   freq: 80, pw: 9,  passes: 1, interval: 0.001, defocus: 30 } },

  { cat: 'Metal', name: 'Mirror Stainless Steel', bt: 'Engraving',
    s70:  { speed: 400,  freq: 40, pw: 11, passes: 1, dpi: 850, image_mode: 'Halftone', notes: 'Negative image' },
    s150: { speed: 5000, freq: 40, pw: 7,  passes: 1, interval: 0.025 } },

  { cat: 'Metal', name: 'Mirror Stainless Steel', bt: 'Photos',
    s70:  { speed: 200,  freq: 40, pw: 11, passes: 1, dpi: 850, image_mode: 'Halftone', notes: 'Negative image' },
    s150: null },

  { cat: 'Metal', name: 'Painted Metal', bt: 'Engraving',
    s70:  { speed: 2000, freq: 40, pw: 3,  passes: 1, interval: 0.02 },
    s150: { speed: 8000, freq: 40, pw: 6,  passes: 1, interval: 0.03 } },

  { cat: 'Metal', name: 'Painted Metal', bt: 'Photos',
    s70:  { dwell: 400,  freq: 40, pw: 14, passes: 1, dpi: 850 },
    s150: { dwell: 400,  freq: 40, pw: 12, passes: 1, dpi: 850 } },

  // ── Tumblers ─────────────────────────────────────────────────────
  { cat: 'Tumblers', name: 'White Coated Tumbler', bt: 'Remove Coat',
    s70:  { speed: 2000, freq: 40, pw: 3,  passes: 1, interval: 0.02, defocus: 10 },
    s150: { speed: 750,  freq: 40, pw: 3,  passes: 1, interval: 0.031, defocus: 10 } },

  { cat: 'Tumblers', name: 'Black Coated Tumbler', bt: 'Remove Coat',
    s70:  { speed: 2600, freq: 50, pw: 3,  passes: 2, interval: 0.01, defocus: 10 },
    s150: { speed: 250,  freq: 40, pw: 3,  passes: 2, interval: 0.01, defocus: 10 } },

  { cat: 'Tumblers', name: 'Black Coated Tumbler', bt: 'Brown/Gold Tint',
    s70:  { speed: 700,  freq: 80, pw: 3,  passes: 1, interval: 0.02, defocus: 10 },
    s150: { speed: 300,  freq: 80, pw: 3,  passes: 1, interval: 0.02, defocus: 10 } },

  // ── Acrylic ──────────────────────────────────────────────────────
  { cat: 'Acrylic', name: 'Black Acrylic', bt: 'Engraving',
    s70:  { speed: 2000, freq: 40, pw: 3,  passes: 1, interval: 0.02 },
    s150: { speed: 2000, freq: 40, pw: 8,  passes: 1, interval: 0.1  } },

  { cat: 'Acrylic', name: 'Black Acrylic', bt: 'Photos',
    s70:  { dwell: 500,  freq: 40, pw: 14, passes: 1, dpi: 850, notes: 'Negative image' },
    s150: { dwell: 400,  freq: 40, pw: 14, passes: 1, dpi: 850, notes: 'Negative image' } },

  { cat: 'Acrylic', name: 'Black Acrylic', bt: 'Cutting (3mm)',
    s70:  null,
    s150: { speed: 5,    freq: 40, pw: 8,  passes: 6, interval: 1    } },

  { cat: 'Acrylic', name: 'Transparent Acrylic', bt: 'Engraving',
    s70:  { speed: 1500, freq: 40, pw: 3,  passes: 1, interval: 0.02 },
    s150: { speed: 1500, freq: 40, pw: 8,  passes: 1, interval: 0.1  } },

  { cat: 'Acrylic', name: 'Transparent Acrylic', bt: 'Photos',
    s70:  { dwell: 400,  freq: 40, pw: 3,  passes: 1, dpi: 850, image_mode: 'Halftone' },
    s150: { dwell: 800,  freq: 40, pw: 8,  passes: 1, dpi: 850, image_mode: 'Halftone', notes: 'Negative image' } },

  { cat: 'Acrylic', name: 'Transparent Acrylic', bt: 'Lamp Base',
    s70:  { speed: 500,  freq: 30, pw: 3,  passes: 2, interval: 0.02 },
    s150: null },

  { cat: 'Acrylic', name: 'Colorful Acrylic', bt: 'Engraving',
    s70:  { speed: 2000, freq: 40, pw: 3,  passes: 1, interval: 0.02 },
    s150: { speed: 800,  freq: 30, pw: 8,  passes: 1, interval: 0.04 } },

  { cat: 'Acrylic', name: 'Colorful Acrylic', bt: 'Photos',
    s70:  { dwell: 500,  freq: 40, pw: 6,  passes: 1, dpi: 850, image_mode: 'Halftone' },
    s150: { dwell: 500,  freq: 40, pw: 8,  passes: 1, dpi: 850, image_mode: 'Halftone' } },

  { cat: 'Acrylic', name: 'Colorful Acrylic', bt: 'Cutting (4mm)',
    s70:  { speed: 234,  freq: 50, pw: 3,  passes: 15 },
    s150: { speed: 234,  freq: 50, pw: 8,  passes: 10 } },

  // ── Plastic/Silicone ─────────────────────────────────────────────
  { cat: 'Plastic/Silicone', name: 'PC/ABS', bt: 'Engraving',
    s70:  { speed: 2000, freq: 40, pw: 18, passes: 1, interval: 0.02 },
    s150: { speed: 2000, freq: 40, pw: 18, passes: 1, interval: 0.02 } },

  { cat: 'Plastic/Silicone', name: 'PC', bt: 'Engraving',
    s70:  { speed: 4000, freq: 20, pw: 3,  passes: 1, interval: 0.03 },
    s150: null },

  { cat: 'Plastic/Silicone', name: 'PC', bt: 'Cutting (0.5mm)',
    s70:  null,
    s150: { speed: 500,  freq: 40, pw: 8,  passes: 3, interval: 1    } },

  { cat: 'Plastic/Silicone', name: 'TPU', bt: 'Engraving',
    s70:  { speed: 1200, freq: 40, pw: 3,  passes: 1, interval: 0.03 },
    s150: null },

  { cat: 'Plastic/Silicone', name: 'PETG / PET Film', bt: 'Engraving',
    s70:  { speed: 4400, freq: 40, pw: 3,  passes: 1, interval: 0.02 },
    s150: { speed: 1500, freq: 40, pw: 8,  passes: 1, interval: 0.04 } },

  { cat: 'Plastic/Silicone', name: 'PVC', bt: 'Engraving',
    s70:  { speed: 2000, freq: 40, pw: 11, passes: 1, interval: 0.06 },
    s150: { speed: 2000, freq: 40, pw: 10, passes: 2, interval: 0.1  } },

  { cat: 'Plastic/Silicone', name: 'Self-Adhesive Labels', bt: 'Marking',
    s70:  { speed: 2000, freq: 50, pw: 12, passes: 1, interval: 0.06 },
    s150: { speed: 2000, freq: 50, pw: 10, passes: 1, interval: 0.04 } },

  { cat: 'Plastic/Silicone', name: 'Silicone', bt: 'Marking',
    s70:  { speed: 1200, freq: 40, pw: 3,  passes: 1, interval: 0.03 },
    s150: { speed: 960,  freq: 40, pw: 8,  passes: 1, interval: 0.025} },

  { cat: 'Plastic/Silicone', name: 'Rubber', bt: 'Marking',
    s70:  { speed: 1000, freq: 30, pw: 3,  passes: 1, interval: 0.01 },
    s150: { speed: 1000, freq: 30, pw: 3,  passes: 1, interval: 0.03 } },

  // ── Wood ─────────────────────────────────────────────────────────
  { cat: 'Wood', name: 'Wood', bt: 'Engraving',
    s70:  { speed: 2200, freq: 40, pw: 8,  passes: 2, interval: 0.12 },
    s150: { speed: 2000, freq: 40, pw: 8,  passes: 2, interval: 0.04 } },

  { cat: 'Wood', name: 'Wood', bt: 'Photos',
    s70:  { dwell: 300,  freq: 40, pw: 4,  passes: 1, dpi: 1250, image_mode: 'Halftone', notes: 'Negative image' },
    s150: { dwell: 200,  freq: 40, pw: 8,  passes: 1, dpi: 850,  image_mode: 'Halftone', notes: 'Negative image' } },

  { cat: 'Wood', name: 'Wood', bt: 'Dark Color',
    s70:  { speed: 200,  freq: 40, pw: 4,  passes: 1, interval: 0.02 },
    s150: { speed: 100,  freq: 40, pw: 8,  passes: 1, interval: 0.03 } },

  { cat: 'Wood', name: 'Wood', bt: 'Cutting (Plywood 5mm)',
    s70:  { speed: 80,   freq: 40, pw: 3,  passes: 25, interval: 1   },
    s150: { speed: 500,  freq: 40, pw: 8,  passes: 11, interval: 1   } },

  { cat: 'Wood', name: 'Wood', bt: '3D Engraving',
    notes: 'Passes depend on desired depth.',
    s70:  { speed: 80,   freq: 40, pw: 3,  passes: null, interval: 1  },
    s150: { speed: 500,  freq: 40, pw: 8,  passes: null, interval: 1  } },

  { cat: 'Wood', name: 'Walnut', bt: 'Engraving',
    s70:  { speed: 400,  freq: 40, pw: 3,  passes: 1, interval: 0.01 },
    s150: { speed: 300,  freq: 40, pw: 8,  passes: 1, interval: 0.03 } },

  { cat: 'Wood', name: 'Bamboo', bt: 'Engraving',
    s70:  { speed: 1200, freq: 40, pw: 3,  passes: 1, interval: 0.01 },
    s150: { speed: 1200, freq: 40, pw: 8,  passes: 1, interval: 0.03 } },

  { cat: 'Wood', name: 'Cork Coasters', bt: 'Engraving',
    s70:  { speed: 800,  freq: 40, pw: 4,  passes: 1, interval: 0.03 },
    s150: { speed: 600,  freq: 40, pw: 8,  passes: 1, interval: 0.025} },

  { cat: 'Wood', name: 'Cork Coasters', bt: 'Deep Engraving',
    s70:  { speed: 800,  freq: 40, pw: 3,  passes: 1, interval: 0.03 },
    s150: { speed: 600,  freq: 40, pw: 8,  passes: 1, interval: 0.025} },

  { cat: 'Wood', name: 'Cork Coasters', bt: 'Photos',
    s70:  { dwell: 300,  freq: 40, pw: 6,  passes: 1, dpi: 2550, image_mode: 'Halftone', notes: 'Negative image' },
    s150: { dwell: 800,  freq: 40, pw: 8,  passes: 1, dpi: 1250, image_mode: 'Halftone', notes: 'Negative image' } },

  // ── Leather/Fabric ───────────────────────────────────────────────
  { cat: 'Fabric', name: 'Leather', bt: 'Marking',
    s70:  { speed: 2000, freq: 40, pw: 3,  passes: 1, interval: 0.02 },
    s150: { speed: 1000, freq: 40, pw: 8,  passes: 1, interval: 0.03 } },

  { cat: 'Fabric', name: 'Leather', bt: 'Black Marking',
    s70:  { speed: 2000, freq: 40, pw: 3,  passes: 1, interval: 0.02 },
    s150: { speed: 750,  freq: 40, pw: 30, passes: 1, interval: 0.03 } },

  { cat: 'Fabric', name: 'Black Leather', bt: 'White Marking',
    s70:  { speed: 4000, freq: 50, pw: 18, passes: 1, interval: 0.02 },
    s150: { speed: 3000, freq: 50, pw: 30, passes: 1, interval: 0.03 } },

  { cat: 'Fabric', name: 'Silk', bt: 'Marking',
    s70:  { speed: 2000, freq: 40, pw: 3,  passes: 1, interval: 0.02 },
    s150: { speed: 1000, freq: 40, pw: 8,  passes: 1, interval: 0.04 } },

  { cat: 'Fabric', name: 'Denim', bt: 'Marking',
    s70:  { speed: 2000, freq: 40, pw: 8,  passes: 1, interval: 0.02 },
    s150: { speed: 1000, freq: 40, pw: 8,  passes: 1, interval: 0.03 } },

  { cat: 'Fabric', name: 'Towels', bt: 'Marking',
    s70:  { speed: 5000, freq: 30, pw: 20, passes: 1, interval: 0.02 },
    s150: { speed: 3500, freq: 30, pw: 17, passes: 1, interval: 0.03 } },

  { cat: 'Fabric', name: 'Felt', bt: 'Cutting',
    s70:  { speed: 400,  freq: 40, pw: 3,  passes: 3, interval: 1   },
    s150: { speed: 200,  freq: 40, pw: 8,  passes: 3, interval: 1   } },

  { cat: 'Fabric', name: 'Cotton T-Shirt', bt: 'Marking',
    s70:  null,
    s150: { speed: 1000, freq: 40, pw: 7,  passes: 1, interval: 0.025} },

  // ── Electronics ──────────────────────────────────────────────────
  { cat: 'Electronics', name: 'Phone Cases (TPU)', bt: 'Marking',
    s70:  { speed: 4000, freq: 40, pw: 18, passes: 1, interval: 0.02 },
    s150: { speed: 640,  freq: 40, pw: 40, passes: 1, interval: 0.03 } },

  { cat: 'Electronics', name: 'Charger / Adapter', bt: 'Marking',
    s70:  { speed: 2000, freq: 40, pw: 18, passes: 1, interval: 0.02 },
    s150: { speed: 1000, freq: 40, pw: 25, passes: 1, interval: 0.03 } },

  { cat: 'Electronics', name: 'PCB', bt: 'Marking',
    s70:  { speed: 2000, freq: 40, pw: 18, passes: 1, interval: 0.02 },
    s150: { speed: 1000, freq: 40, pw: 25, passes: 1, interval: 0.03 } },

  { cat: 'Electronics', name: 'USB', bt: 'Marking',
    s70:  { speed: 2000, freq: 40, pw: 18, passes: 1, interval: 0.02 },
    s150: { speed: 1000, freq: 40, pw: 25, passes: 1, interval: 0.03 } },

  // ── Food ─────────────────────────────────────────────────────────
  { cat: 'Food', name: 'Apple', bt: 'Marking',
    s70:  { speed: 2400, freq: 40, pw: 3,  passes: 1, interval: 0.02 },
    s150: { speed: 1200, freq: 40, pw: 3,  passes: 1, interval: 0.02 } },

  { cat: 'Food', name: 'Banana', bt: 'Marking',
    s70:  { speed: 2500, freq: 40, pw: 3,  passes: 1, interval: 0.02 },
    s150: { speed: 750,  freq: 40, pw: 3,  passes: 1, interval: 0.03 } },

  { cat: 'Food', name: 'Macarons', bt: 'Marking',
    s70:  { speed: 800,  freq: 40, pw: 3,  passes: 1, interval: 0.02 },
    s150: { speed: 460,  freq: 40, pw: 3,  passes: 1, interval: 0.03 } },

  { cat: 'Food', name: 'Egg', bt: 'Marking',
    s70:  { speed: 2200, freq: 40, pw: 3,  passes: 1, interval: 0.02 },
    s150: { speed: 1000, freq: 40, pw: 3,  passes: 1, interval: 0.04 } },

  { cat: 'Food', name: 'Chocolate', bt: 'Marking',
    s70:  { speed: 3000, freq: 40, pw: 3,  passes: 1, interval: 0.02 },
    s150: { speed: 2500, freq: 30, pw: 5,  passes: 1, interval: 0.03 } },

  { cat: 'Food', name: 'Biscuit', bt: 'Marking',
    s70:  { speed: 2400, freq: 30, pw: 6,  passes: 1, interval: 0.02 },
    s150: { speed: 3000, freq: 30, pw: 10, passes: 1, interval: 0.03 } },

  { cat: 'Food', name: 'Orange', bt: 'Marking',
    s70:  { speed: 2000, freq: 40, pw: 3,  passes: 2, interval: 0.01 },
    s150: { speed: 2000, freq: 40, pw: 3,  passes: 3, interval: 0.03 } },

  // ── Sport Products ───────────────────────────────────────────────
  { cat: 'Sport Products', name: 'Baseball', bt: 'Marking',
    s70:  { speed: 2000, freq: 40, pw: 28, passes: 1, interval: 0.02 },
    s150: { speed: 3000, freq: 30, pw: 18, passes: 1, interval: 0.03 } },

  { cat: 'Sport Products', name: 'Table Tennis Ball', bt: 'Marking',
    s70:  { speed: 3000, freq: 30, pw: 3,  passes: 1, interval: 0.02 },
    s150: { speed: 3500, freq: 30, pw: 8,  passes: 1, interval: 0.03 } },

  { cat: 'Sport Products', name: 'Golf Ball', bt: 'Marking',
    s70:  { speed: 1600, freq: 40, pw: 34, passes: 1, interval: 0.01 },
    s150: { speed: 700,  freq: 40, pw: 40, passes: 1, interval: 0.03 } },

  // ── Stone/Slate ──────────────────────────────────────────────────
  { cat: 'Stone/Slate', name: 'Slate', bt: 'Marking (Gray)',
    s70:  { speed: 100,  freq: 60, pw: 3,  passes: 1, interval: 0.03 },
    s150: { speed: 1000, freq: 40, pw: 8,  passes: 1, interval: 0.03 } },

  { cat: 'Stone/Slate', name: 'Slate', bt: 'Marking (White)',
    s70:  { speed: 200,  freq: 40, pw: 3,  passes: 1, interval: 0.016, defocus: 2 },
    s150: { speed: 500,  freq: 40, pw: 8,  passes: 1, interval: 0.03,  defocus: 10 } },

  { cat: 'Stone/Slate', name: 'Slate', bt: '3D Engraving',
    notes: 'Multi-pass depth engraving. Passes depend on desired depth (~0.3mm/pass).',
    s70:  { speed: 5000, freq: 40, pw: 3,  passes: null, interval: 1 },
    s150: { speed: 400,  freq: 40, pw: 8,  passes: null, interval: 0.025} },

  { cat: 'Stone/Slate', name: 'Stone', bt: 'Marking',
    s70:  { speed: 1000, freq: 40, pw: 3,  passes: 1, interval: 0.12 },
    s150: { speed: 1000, freq: 40, pw: 8,  passes: 1, interval: 0.03 } },

  { cat: 'Stone/Slate', name: 'Stone', bt: 'Deep Engraving',
    notes: 'Passes depend on desired depth.',
    s70:  { speed: 5000, freq: 40, pw: 3,  passes: null, interval: 1 },
    s150: { speed: 400,  freq: 40, pw: 8,  passes: null, interval: 0.025} },

  // ── Paper ────────────────────────────────────────────────────────
  { cat: 'Paper', name: 'Paper', bt: 'Marking',
    s70:  { speed: 2000, freq: 30, pw: 6,  passes: 1, interval: 0.08 },
    s150: { speed: 2000, freq: 30, pw: 8,  passes: 2, interval: 0.08 } },

  { cat: 'Paper', name: 'Paper', bt: 'Cutting',
    s70:  { speed: 200,  freq: 40, pw: 3,  passes: 1 },
    s150: { speed: 200,  freq: 40, pw: 8,  passes: 2 } },

  { cat: 'Paper', name: 'Paper', bt: 'Photos',
    s70:  { dwell: 300,  freq: 40, pw: 6,  passes: 3, dpi: 1250, image_mode: 'Halftone', notes: 'Negative image' },
    s150: { dwell: 800,  freq: 40, pw: 8,  passes: 3, dpi: 850,  image_mode: 'Halftone', notes: 'Negative image' } },

  { cat: 'Paper', name: 'Leaf', bt: 'Photos',
    s70:  { dwell: 100,  freq: 40, pw: 6,  passes: 1, dpi: 850,  notes: 'Negative image' },
    s150: null },

  // ── Others ───────────────────────────────────────────────────────
  { cat: 'Others', name: 'Black Carbon Fiber', bt: 'Marking',
    s70:  { speed: 5000, freq: 40, pw: 18, passes: 1, interval: 0.12, defocus: 15 },
    s150: { speed: 5000, freq: 40, pw: 18, passes: 1, interval: 0.03, defocus: 10 } },

  { cat: 'Others', name: 'Carbon Fiber', bt: 'Cutting (0.5mm)',
    s70:  { speed: 200,  freq: 40, pw: 3,  passes: 4 },
    s150: null },
];

// ── Personal (user) entries — migrated from original seed ─────────────────────
const PERSONAL = [
  {
    name: 'K9 Crystal — Subsurface 3D Portrait', category: 'Glass/Ceramics',
    notes: 'Point cloud STL from Cockpit3D. Load STL in ComMarker Studio. Blank cost ~$1.50 from Alibaba. Proven workflow.',
    settings: [{
      burn_type: '3D Subsurface', lens_mm: 150,
      speed_mms: null, frequency_khz: null, passes: 1, line_interval_mm: 0.08,
      fill_type: null, result_rating: 5, is_favorite: 1,
      result_notes: 'Proven. Crystal blanks from Alibaba ~$1.50 each. Use Cockpit3D for point cloud generation ($10/image — pass through in pricing). 40x40x60mm tested successfully.'
    }]
  },
  {
    name: 'Stainless Steel — Black Oxide Mark', category: 'Metal',
    notes: 'Confirmed black oxide mark recipe. Used on dog tags and urn necklaces successfully. DO NOT use on plated metals — mark looks bad once plating burns through.',
    settings: [{
      burn_type: 'Black Oxide', lens_mm: 150,
      speed_mms: 200, frequency_khz: 80, pulse_width: null, passes: 1, line_interval_mm: 0.05,
      fill_type: 'Fill', result_rating: 5, is_favorite: 1,
      result_notes: 'Clean black oxide mark on polished 304 SS. Tested on dog tags and urn necklace sides. For deeper marking increase passes rather than power.'
    }]
  },
  {
    name: 'Stainless Steel — Dog Tag Surface Mark', category: 'Metal',
    notes: 'Adjust power for different finishes. Matte SS needs different settings.',
    settings: [{
      burn_type: 'Engraving', lens_mm: 150,
      speed_mms: 250, frequency_khz: 80, passes: 1, line_interval_mm: 0.05,
      fill_type: 'Fill', result_rating: 4, is_favorite: 0,
      result_notes: 'Good result on shiny steel dog tag. Tested and working.'
    }]
  },
  {
    name: 'Slate — Surface Engrave', category: 'Stone/Slate',
    notes: 'Very forgiving material. Good contrast. Can go deep with multiple passes — tested to 3mm depth (stopped, not limit).',
    settings: [{
      burn_type: 'Engraving', lens_mm: 150,
      speed_mms: 300, frequency_khz: 40, passes: 1, line_interval_mm: 0.10,
      fill_type: 'Fill', result_rating: 5, is_favorite: 1,
      result_notes: 'Excellent contrast on slate. Multiple passes add depth — tested 3mm without hitting limit. Great for coasters, memorial stones, plaques.'
    }]
  },
  {
    name: 'Slate — Depth Relief', category: 'Stone/Slate',
    notes: 'Multi-pass depth engraving. Time intensive — babysit or test run time first. Stopped at 3mm, not the limit of the material. Use 5–10 passes (more = deeper, ~0.3mm per pass).',
    settings: [{
      burn_type: 'Deep Engraving', lens_mm: 150,
      speed_mms: 200, frequency_khz: 40, passes: 5, line_interval_mm: 0.10,
      fill_type: 'Fill', result_rating: 4, is_favorite: 0,
      result_notes: 'Depth relief possible. Each pass adds approx 0.3mm. Plan job time before starting. Use exhaust — slate dust.'
    }]
  },
  {
    name: 'River Rock — Surface Engrave', category: 'Stone/Slate',
    notes: 'Variable results depending on rock composition. Test on each new batch. Focus critical on curved surface.',
    settings: [{
      burn_type: 'Engraving', lens_mm: 150,
      speed_mms: 250, frequency_khz: 40, passes: 1, line_interval_mm: 0.10,
      fill_type: 'Fill', result_rating: 4, is_favorite: 0,
      result_notes: 'Works well on smooth river stones. Surface variation means focus needs adjustment per stone. Slight depth possible with 2+ passes.'
    }]
  },
  {
    name: 'Jade — Surface Engrave', category: 'Stone/Slate',
    notes: 'UV laser works on jade. Test contrast — green jade varies. Polish workflow: diamond sanding pads + cerium oxide if needed post-engrave.',
    settings: [{
      burn_type: 'Engraving', lens_mm: 150,
      speed_mms: 300, frequency_khz: 40, passes: 1, line_interval_mm: 0.08,
      fill_type: 'Fill', result_rating: 3, is_favorite: 0,
      result_notes: 'Works but contrast depends heavily on specific jade color/composition. Test each new batch. Polish after if needed. NEEDS MORE TESTING — parameters not fully dialed.'
    }]
  },
  {
    name: 'Black Acrylic — Photo Engrave', category: 'Acrylic',
    notes: 'CAST acrylic only. Extruded acrylic has UV blockers — will not work. Identify cast vs extruded: cast has no green edge tint, slightly more optical clarity, often sold as "cell cast".',
    settings: [{
      burn_type: 'Photos', lens_mm: 150,
      speed_mms: 400, frequency_khz: 30, passes: 1, line_interval_mm: 0.10,
      fill_type: 'Grayscale', result_rating: 4, is_favorite: 0,
      result_notes: 'Good photo results on black cast acrylic. Cut out after engraving for product use. DO NOT use extruded acrylic — UV blockers prevent marking.'
    }]
  },
  {
    name: 'Glass Bottle — Surface Etch (Rotary)', category: 'Glass/Ceramics',
    notes: 'Rotary roller setup. Corrected speed settings — see Rotary Reference page. Brown/amber glass needs slightly more power than clear. Soda-lime (green edge tint) = more power needed than K9 crystal.',
    settings: [{
      burn_type: 'Surface Etch', lens_mm: 150,
      speed_mms: 200, frequency_khz: 50, passes: 1, line_interval_mm: 0.08,
      wobble_enabled: 1, wobble_amplitude_mm: 0.15, wobble_frequency_hz: 150,
      fill_type: 'Fill', rotary_enabled: 1, rotary_type: 'Roller',
      result_rating: 3, is_favorite: 0,
      result_notes: 'Working but visible line pattern in fills. Wobble helps blend lines. CORRECTED rotary speeds: Min 125, Max 750, Accel 300-500ms, Return 750 pulses/sec. Steps per rotation: 3200 (NOT 12800 as shown in old manual). Object diameter: measure circumference with tape, divide by pi.'
    }]
  },
  {
    name: 'Powder Coated Metal — Coat Removal', category: 'Metal',
    notes: 'Removes powder coat to reveal base metal underneath. Not tested on rotary yet — settings are surface flat test only.',
    settings: [{
      burn_type: 'Remove Coat', lens_mm: 150,
      speed_mms: 350, frequency_khz: 60, passes: 1, line_interval_mm: 0.10,
      fill_type: 'Fill', result_rating: 3, is_favorite: 0,
      result_notes: 'Removes powder coat cleanly on flat test pieces. Rotary settings TBD. See Rotary Reference page for setup. NEEDS ROTARY TESTING.'
    }]
  },
  {
    name: 'PCB — Isolation + Copper Removal', category: 'Electronics',
    notes: 'Full workflow: isolation routing of traces, then flood copper removal, then spray paint, then laser remove paint from pads. Currently using one of these PCBs personally — settings need re-dialing.',
    settings: [{
      burn_type: 'Full Process', lens_mm: 150,
      speed_mms: null, frequency_khz: null, passes: null, line_interval_mm: 0.08,
      fill_type: 'Fill', result_rating: 4, is_favorite: 0,
      result_notes: 'Proven capable — personally using a PCB made with this process. Settings need to be re-established from scratch. PRIORITY: re-dial and document before offering as product.'
    }]
  },
  {
    name: 'White Plastic — Surface Mark', category: 'Plastic/Silicone',
    notes: 'UV marks white plastic well — darkens/chars surface. Cold laser means no heat damage to electronics.',
    settings: [{
      burn_type: 'Marking', lens_mm: 150,
      speed_mms: 500, frequency_khz: 30, passes: 1, line_interval_mm: 0.10,
      fill_type: 'Fill', result_rating: 4, is_favorite: 0,
      result_notes: 'Good mark on white plastic phone chargers. Adjust power for different plastics — test first. Cold UV laser safe for electronics/temperature sensitive items.'
    }]
  },
  {
    name: 'K9 Crystal — Subsurface 2D Flat', category: 'Glass/Ceramics',
    notes: 'Defocus 2-3mm below surface. LightBurn grayscale mode (not dither). Similar to 3D crystal but single focal plane — photo/image engraving. NOT YET TESTED — parameters estimated from 3D crystal work.',
    settings: [{
      burn_type: '2D Subsurface', lens_mm: 150,
      speed_mms: null, frequency_khz: 50, passes: 1, line_interval_mm: 0.08,
      wobble_enabled: 1, wobble_amplitude_mm: 0.10, wobble_frequency_hz: 100,
      fill_type: 'Grayscale', result_rating: null, is_favorite: 0,
      result_notes: 'NOT YET TESTED. Defocus 2-3mm below surface manually before starting. Start at 55% power, 300mm/s — test on scrap piece first. Build spacer jig for consistent focal depth across jobs.'
    }]
  },
  {
    name: 'Soda-Lime Glass Plate — Subsurface 2D', category: 'Glass/Ceramics',
    notes: '3" x 2" x 1/4" (76mm x 51mm x 6.35mm). Soda-lime (green edge tint) — more power needed than K9 crystal. 6.35mm thickness gives good focal depth range: test 1.5mm, 2mm, 2.5mm, 3mm. Calibration pieces only — use K9 for production.',
    settings: [{
      burn_type: '2D Subsurface', lens_mm: 150,
      speed_mms: null, frequency_khz: 50, passes: 1, line_interval_mm: 0.08,
      wobble_enabled: 1, wobble_amplitude_mm: 0.15, wobble_frequency_hz: null,
      fill_type: 'Grayscale', result_rating: null, is_favorite: 0,
      result_notes: 'NOT YET TESTED. Calibration/test material only. Start at 65% power, 250mm/s. Green edge tint confirms soda-lime composition. Use to establish baseline before moving to K9 flat blanks.'
    }]
  },
];

function seedDb() {
  const db = getDb();

  // Check seed version — only seed if no records exist at all
  const matCount = db.prepare('SELECT COUNT(*) as c FROM materials').get().c;
  if (matCount > 0) return;

  // Insert ComMarker reference entries
  const insertMat = db.prepare(
    `INSERT INTO materials (name, category, notes) VALUES (?, ?, ?)`
  );
  const insertSet = db.prepare(`
    INSERT INTO settings (
      material_id, burn_type, lens_mm,
      speed_mms, dwell_time_us, frequency_khz, pulse_width,
      passes, line_interval_mm, dpi, image_mode, defocus_mm,
      wobble_enabled, fill_type, rotary_enabled,
      is_commarker_reference, result_notes
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  db.transaction(() => {
    // Group CM_REF by category+name to create one material per unique name
    const seen = new Map();

    for (const e of CM_REF) {
      const key = `${e.cat}||${e.name}`;
      let mid = seen.get(key);
      if (mid === undefined) {
        const { lastInsertRowid } = insertMat.run(e.name, e.cat, e.notes || null);
        mid = lastInsertRowid;
        seen.set(key, mid);
      }

      const insert = (sdata, lens) => {
        if (!sdata) return;
        insertSet.run(
          mid, e.bt, lens,
          sdata.speed ?? null, sdata.dwell ?? null, sdata.freq ?? null, sdata.pw ?? null,
          sdata.passes ?? 1, sdata.interval ?? null, sdata.dpi ?? null,
          sdata.image_mode ?? null, sdata.defocus ?? null,
          0, null, 0,
          1,
          sdata.notes ?? null
        );
      };

      insert(e.s70, 70);
      insert(e.s150, 150);
    }

    // Insert personal entries
    for (const m of PERSONAL) {
      const { lastInsertRowid: mid } = insertMat.run(m.name, m.category, m.notes || null);
      for (const s of m.settings) {
        db.prepare(`
          INSERT INTO settings (
            material_id, burn_type, lens_mm,
            speed_mms, frequency_khz, pulse_width, passes, line_interval_mm,
            dpi, wobble_enabled, wobble_amplitude_mm, wobble_frequency_hz,
            fill_type, rotary_enabled, rotary_type,
            is_commarker_reference, result_rating, result_notes, is_favorite
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(
          mid, s.burn_type, s.lens_mm,
          s.speed_mms ?? null, s.frequency_khz ?? null, s.pulse_width ?? null,
          s.passes ?? 1, s.line_interval_mm ?? null,
          s.dpi ?? null, s.wobble_enabled ?? 0,
          s.wobble_amplitude_mm ?? null, s.wobble_frequency_hz ?? null,
          s.fill_type ?? null, s.rotary_enabled ?? 0, s.rotary_type ?? null,
          0, s.result_rating ?? null, s.result_notes ?? null, s.is_favorite ?? 0
        );
      }
    }
  })();

  // Record seed version
  db.prepare(`INSERT OR REPLACE INTO app_settings (key, value) VALUES ('seed_version', '2')`).run();

  const total = db.prepare('SELECT COUNT(*) as c FROM materials').get().c;
  console.log(`Seeded ${total} materials (ComMarker reference + personal entries).`);
}

module.exports = { seedDb };
