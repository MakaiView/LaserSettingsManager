// ── API ──────────────────────────────────────────────────────────────────────
const api = {
  async req(method, path, data) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (data !== undefined) opts.body = JSON.stringify(data);
    const res = await fetch(`/api${path}`, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  },
  get: (p) => api.req('GET', p),
  post: (p, d) => api.req('POST', p, d),
  put: (p, d) => api.req('PUT', p, d),
  del: (p) => api.req('DELETE', p),
};

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'Glass/Ceramics', 'Metal', 'Tumblers', 'Acrylic', 'Plastic/Silicone',
  'Wood', 'Fabric', 'Electronics', 'Food', 'Sport Products',
  'Stone/Slate', 'Paper', 'Others'
];

const BURN_TYPES = [
  'Engraving', 'Deep Engraving', 'Photos', 'Marking', 'Cutting',
  'Surface Etch', 'Black Oxide', 'Remove Coat', 'Brown Tint',
  '3D Engraving', '3D Subsurface', '2D Subsurface',
  'Full Process', 'Lamp Base', 'Dark Color', 'Isolation'
];

const FILL_TYPES = ['Fill', 'Line', 'Grayscale', 'Offset Fill'];
const LENSES = [70, 150];

const WORKED_LABELS = ['Failed', 'Partial', 'Success'];
const WORKED_COLORS = ['var(--error)', 'var(--warning)', 'var(--success)'];

function catClass(cat) {
  const m = {
    'Glass/Ceramics': 'glass', 'Metal': 'metal', 'Stone/Slate': 'stone',
    'Wood': 'wood', 'Fabric': 'fabric', 'Electronics': 'pcb',
    'Acrylic': 'plastic', 'Plastic/Silicone': 'plastic',
    'Paper': 'paper', 'Tumblers': 'metal', 'Food': 'other',
    'Sport Products': 'other', 'Others': 'other'
  };
  return `badge badge-${m[cat] || 'other'}`;
}

function fmt(val, unit = '') {
  if (val === null || val === undefined || val === '') return null;
  return `${val}${unit}`;
}

function emptySettings() {
  return {
    burn_type: 'Engraving', lens_mm: 150,
    speed_mms: '', dwell_time_us: '', frequency_khz: '', pulse_width: '',
    passes: 1, line_interval_mm: '', dpi: '', image_mode: '', defocus_mm: '',
    wobble_enabled: false, wobble_amplitude_mm: '', wobble_frequency_hz: '',
    fill_type: 'Fill', rotary_enabled: false, rotary_type: 'Roller',
    result_rating: 0, result_notes: '', is_favorite: false
  };
}

function settingsToForm(s) {
  if (!s) return emptySettings();
  return {
    burn_type: s.burn_type || 'Engraving',
    lens_mm: s.lens_mm || 150,
    speed_mms: s.speed_mms ?? '',
    dwell_time_us: s.dwell_time_us ?? '',
    frequency_khz: s.frequency_khz ?? '',
    pulse_width: s.pulse_width ?? '',
    passes: s.passes ?? 1,
    line_interval_mm: s.line_interval_mm ?? '',
    dpi: s.dpi ?? '',
    image_mode: s.image_mode ?? '',
    defocus_mm: s.defocus_mm ?? '',
    wobble_enabled: !!s.wobble_enabled,
    wobble_amplitude_mm: s.wobble_amplitude_mm ?? '',
    wobble_frequency_hz: s.wobble_frequency_hz ?? '',
    fill_type: s.fill_type || 'Fill',
    rotary_enabled: !!s.rotary_enabled,
    rotary_type: s.rotary_type || 'Roller',
    result_rating: s.result_rating || 0,
    result_notes: s.result_notes || '',
    is_favorite: !!s.is_favorite,
  };
}

function settingsToPayload(f) {
  const n = (v) => (v === '' || v === null || v === undefined) ? null : Number(v);
  return {
    burn_type: f.burn_type,
    lens_mm: Number(f.lens_mm) || 150,
    speed_mms: n(f.speed_mms),
    dwell_time_us: n(f.dwell_time_us),
    frequency_khz: n(f.frequency_khz),
    pulse_width: n(f.pulse_width),
    passes: n(f.passes) || 1,
    line_interval_mm: n(f.line_interval_mm),
    dpi: n(f.dpi),
    image_mode: f.image_mode || null,
    defocus_mm: n(f.defocus_mm),
    wobble_enabled: f.wobble_enabled ? 1 : 0,
    wobble_amplitude_mm: f.wobble_enabled ? n(f.wobble_amplitude_mm) : null,
    wobble_frequency_hz: f.wobble_enabled ? n(f.wobble_frequency_hz) : null,
    fill_type: f.fill_type || null,
    rotary_enabled: f.rotary_enabled ? 1 : 0,
    rotary_type: f.rotary_enabled ? f.rotary_type : null,
    result_rating: n(f.result_rating) || null,
    result_notes: f.result_notes || null,
    is_favorite: f.is_favorite ? 1 : 0,
  };
}

// Best setting for card display (highest rated, or first)
function bestSetting(settings) {
  if (!settings || !settings.length) return null;
  return settings.reduce((best, s) =>
    (s.result_rating || 0) > (best.result_rating || 0) ? s : best, settings[0]);
}

// ── StarRating ─────────────────────────────────────────────────────────────────
const StarRating = {
  name: 'StarRating',
  props: { value: { default: 0 }, readonly: { default: false }, size: { default: '' } },
  emits: ['update:value'],
  template: `
    <div :class="['star-rating', size]">
      <span v-for="n in 5" :key="n"
        :class="['star', n <= value ? 'filled' : '', readonly ? 'readonly' : '']"
        @click="!readonly && $emit('update:value', n === value ? 0 : n)">&#9733;</span>
      <span v-if="!readonly && !value" style="font-size:11px;color:var(--text-secondary);margin-left:4px">unrated</span>
    </div>
  `
};

// ── CategoryBadge ──────────────────────────────────────────────────────────────
const CategoryBadge = {
  name: 'CategoryBadge',
  props: ['category'],
  template: `<span :class="catClass(category)">{{ category }}</span>`,
  methods: { catClass }
};

// ── MaterialCard ───────────────────────────────────────────────────────────────
const MaterialCard = {
  name: 'MaterialCard',
  components: { StarRating, CategoryBadge },
  props: ['entry'],
  emits: ['click', 'favorite'],
  computed: {
    best() { return bestSetting(this.entry.settings); },
    hasFav() { return this.entry.settings.some(s => s.is_favorite); },
    burnTypes() {
      const user = this.entry.settings.filter(s => !s.is_commarker_reference);
      const ref  = this.entry.settings.filter(s =>  s.is_commarker_reference);
      return [...new Set([...user, ...ref].map(s => s.burn_type))].slice(0,3);
    },
    lenses() {
      return [...new Set(this.entry.settings.map(s => s.lens_mm))].sort();
    }
  },
  methods: { fmt },
  template: `
    <div class="material-card" @click="$emit('click', entry)">
      <div class="card-thumb">
        <img v-if="best && best.image_path" :src="best.image_path" :alt="entry.name" loading="lazy">
        <i v-else class="bi bi-image"></i>
      </div>
      <div class="card-body">
        <div class="card-header-row">
          <category-badge :category="entry.category" />
          <button class="btn-icon" :class="{ active: hasFav }"
            @click.stop="$emit('favorite', entry)" title="Toggle favorite">
            <i :class="hasFav ? 'bi bi-star-fill' : 'bi bi-star'"></i>
          </button>
        </div>
        <div class="card-name">{{ entry.name }}</div>
        <div class="card-burn-types">
          <span v-for="bt in burnTypes" :key="bt" class="burn-chip">{{ bt }}</span>
          <span v-if="entry.settings.length > 3" class="burn-chip muted">+{{ entry.settings.length - 3 }}</span>
        </div>
        <div class="card-params" v-if="best">
          <span v-if="best.speed_mms != null" class="param-chip mono-bold">{{ best.speed_mms }} mm/s</span>
          <span v-else-if="best.dwell_time_us != null" class="param-chip mono-bold">{{ best.dwell_time_us }}µs</span>
          <span v-if="best.frequency_khz != null" class="param-chip">{{ best.frequency_khz }} kHz</span>
          <span v-for="l in lenses" :key="l" class="param-chip lens">{{ l }}mm</span>
        </div>
        <div class="card-footer-row">
          <star-rating :value="(best && best.result_rating) || 0" :readonly="true" size="sm" />
          <span v-if="entry.settings.length > 1" style="font-size:11px;color:var(--text-secondary)">
            {{ entry.settings.filter(s=>!s.is_commarker_reference).length }} personal
          </span>
        </div>
      </div>
    </div>
  `
};

// ── SettingsRowForm ────────────────────────────────────────────────────────────
// Used for adding/editing a single settings row (burn_type + all params)
const SettingsRowForm = {
  name: 'SettingsRowForm',
  components: { StarRating },
  props: {
    modelValue: Object,
    entryId: { default: null },
    settingsId: { default: null },
    isRef: { default: false }
  },
  emits: ['update:modelValue', 'submit', 'cancel'],
  data() {
    return { BURN_TYPES, FILL_TYPES, LENSES, uploadError: '', uploading: false };
  },
  computed: {
    form: {
      get() { return this.modelValue; },
      set(v) { this.$emit('update:modelValue', v); }
    }
  },
  methods: {
    u(field, value) {
      this.$emit('update:modelValue', { ...this.form, [field]: value });
    },
    async uploadPhoto(e) {
      const file = e.target.files[0];
      if (!file || !this.settingsId) return;
      this.uploading = true;
      this.uploadError = '';
      try {
        const fd = new FormData();
        fd.append('image', file);
        const res = await fetch(`/api/upload/${this.entryId}/${this.settingsId}`, { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        this.u('image_path', data.image_path);
      } catch (err) {
        this.uploadError = err.message;
      } finally {
        this.uploading = false;
      }
    },
    async removePhoto() {
      try {
        await fetch(`/api/upload/${this.entryId}/${this.settingsId}`, { method: 'DELETE' });
        this.u('image_path', null);
      } catch {}
    }
  },
  template: `
    <form @submit.prevent="$emit('submit')" autocomplete="off" class="settings-row-form">

      <div class="form-grid cols-2" style="margin-bottom:14px">
        <div class="form-group">
          <label>Burn Type *</label>
          <input list="burn-type-list" :value="form.burn_type"
            @input="u('burn_type', $event.target.value)" placeholder="e.g. Engraving" required>
          <datalist id="burn-type-list">
            <option v-for="bt in BURN_TYPES" :key="bt" :value="bt">{{ bt }}</option>
          </datalist>
        </div>
        <div class="form-group">
          <label>Lens</label>
          <select :value="form.lens_mm" @change="u('lens_mm', Number($event.target.value))">
            <option v-for="l in LENSES" :key="l" :value="l">{{ l }}mm</option>
          </select>
        </div>
      </div>

      <div class="form-grid cols-3">
        <div class="form-group">
          <label>Speed (mm/s)</label>
          <input type="number" :value="form.speed_mms"
            @input="u('speed_mms', $event.target.value)" min="0" step="1" placeholder="mm/s">
        </div>
        <div class="form-group">
          <label>Dwell Time (µs)</label>
          <input type="number" :value="form.dwell_time_us"
            @input="u('dwell_time_us', $event.target.value)" min="0" step="1" placeholder="µs">
        </div>
        <div class="form-group">
          <label>Frequency (kHz)</label>
          <input type="number" :value="form.frequency_khz"
            @input="u('frequency_khz', $event.target.value)" min="0" step="1" placeholder="kHz">
        </div>
        <div class="form-group">
          <label>Qpulse</label>
          <input type="number" :value="form.pulse_width"
            @input="u('pulse_width', $event.target.value)" min="1" step="1" placeholder="e.g. 3">
        </div>
        <div class="form-group">
          <label>Passes</label>
          <input type="number" :value="form.passes"
            @input="u('passes', $event.target.value)" min="1" step="1" placeholder="1">
        </div>
        <div class="form-group">
          <label>Line Interval (mm)</label>
          <input type="number" :value="form.line_interval_mm"
            @input="u('line_interval_mm', $event.target.value)" min="0" step="0.005" placeholder="0.08">
        </div>
        <div class="form-group">
          <label>Fill Type</label>
          <select :value="form.fill_type" @change="u('fill_type', $event.target.value)">
            <option value="">— none —</option>
            <option v-for="t in FILL_TYPES" :key="t">{{ t }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>DPI</label>
          <input type="number" :value="form.dpi"
            @input="u('dpi', $event.target.value)" min="0" step="50" placeholder="e.g. 850">
        </div>
        <div class="form-group">
          <label>Image Mode</label>
          <select :value="form.image_mode" @change="u('image_mode', $event.target.value)">
            <option value="">— none —</option>
            <option>Halftone</option>
            <option>Grayscale</option>
            <option>Dither</option>
          </select>
        </div>
        <div class="form-group">
          <label>Defocus (mm)</label>
          <input type="number" :value="form.defocus_mm"
            @input="u('defocus_mm', $event.target.value)" step="0.5" placeholder="0 = none">
        </div>
      </div>

      <div class="toggle-row" style="margin-top:12px">
        <label>Wobble</label>
        <label class="toggle">
          <input type="checkbox" :checked="form.wobble_enabled" @change="u('wobble_enabled', $event.target.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div v-if="form.wobble_enabled" class="form-grid" style="margin-top:8px">
        <div class="form-group">
          <label>Wobble Amplitude (mm)</label>
          <input type="number" :value="form.wobble_amplitude_mm"
            @input="u('wobble_amplitude_mm', $event.target.value)" min="0" step="0.01">
        </div>
        <div class="form-group">
          <label>Wobble Frequency (Hz)</label>
          <input type="number" :value="form.wobble_frequency_hz"
            @input="u('wobble_frequency_hz', $event.target.value)" min="0" step="10">
        </div>
      </div>

      <div class="toggle-row" style="margin-top:8px">
        <label>Rotary</label>
        <label class="toggle">
          <input type="checkbox" :checked="form.rotary_enabled" @change="u('rotary_enabled', $event.target.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div v-if="form.rotary_enabled" class="form-group" style="margin-top:8px">
        <label>Rotary Type</label>
        <select :value="form.rotary_type" @change="u('rotary_type', $event.target.value)">
          <option value="Roller">Roller</option>
          <option value="Chuck">Chuck</option>
        </select>
        <span class="hint">See <router-link to="/rotary">Rotary Reference</router-link> for corrected speed settings</span>
      </div>

      <div class="form-section" style="margin-top:16px">
        <h3>Results</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Result Rating</label>
            <star-rating :value="form.result_rating" @update:value="u('result_rating', $event)" />
          </div>
          <div class="form-group form-full">
            <label>Result Notes</label>
            <textarea :value="form.result_notes" @input="u('result_notes', $event.target.value)"
              placeholder="What happened? Quality? What to try next?" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px">
              <input type="checkbox" :checked="form.is_favorite" @change="u('is_favorite', $event.target.checked)">
              Mark as favorite
            </label>
          </div>
        </div>

        <div v-if="settingsId" style="margin-top:10px">
          <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:8px">Result Photo</label>
          <div v-if="form.image_path" style="margin-bottom:8px">
            <img :src="form.image_path" style="max-width:200px;max-height:150px;border-radius:6px;object-fit:cover;border:1px solid var(--border)">
            <br><button type="button" class="btn btn-ghost btn-sm" style="margin-top:6px" @click="removePhoto">
              <i class="bi bi-trash"></i> Remove
            </button>
          </div>
          <div v-else class="photo-upload-area" @click="$refs.photoInput.click()">
            <input ref="photoInput" type="file" accept=".jpg,.jpeg,.png,.webp" @change="uploadPhoto">
            <i class="bi bi-camera" style="font-size:24px;color:var(--text-secondary)"></i>
            <p>{{ uploading ? 'Uploading...' : 'Tap to upload photo' }}</p>
          </div>
          <div v-if="uploadError" class="alert alert-error" style="margin-top:6px">{{ uploadError }}</div>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-ghost" @click="$emit('cancel')">
          <i class="bi bi-x"></i> Cancel
        </button>
        <button type="submit" class="btn btn-primary">
          <i class="bi bi-check-lg"></i> Save
        </button>
      </div>
    </form>
  `
};

// ── SettingsRowDisplay ─────────────────────────────────────────────────────────
// Read-only display of one settings row (used in detail view)
const SettingsRowDisplay = {
  name: 'SettingsRowDisplay',
  components: { StarRating },
  props: ['s', 'materialId', 'canEdit'],
  emits: ['edit', 'delete', 'favorite'],
  methods: { fmt },
  template: `
    <div :class="['settings-row-card', s.is_commarker_reference ? 'ref-card' : '', s.is_favorite ? 'fav-card' : '']">
      <div class="src-header">
        <div class="src-burn-type">
          <span class="burn-label">{{ s.burn_type }}</span>
          <span class="lens-badge">{{ s.lens_mm }}mm</span>
          <span v-if="s.is_commarker_reference" class="ref-badge">ComMarker Ref</span>
        </div>
        <div class="src-actions" v-if="canEdit && !s.is_commarker_reference">
          <button class="btn-icon" :class="{active: s.is_favorite}" @click="$emit('favorite', s)" title="Favorite">
            <i :class="s.is_favorite ? 'bi bi-star-fill' : 'bi bi-star'"></i>
          </button>
          <button class="btn-icon" @click="$emit('edit', s)" title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn-icon danger" @click="$emit('delete', s)" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
      <div class="src-params-grid">
        <div v-if="s.speed_mms != null" class="src-param-item primary">
          <span class="src-param-label">Speed</span>
          <span class="src-param-val">{{ s.speed_mms }}<small> mm/s</small></span>
        </div>
        <div v-else-if="s.dwell_time_us != null" class="src-param-item primary">
          <span class="src-param-label">Dwell</span>
          <span class="src-param-val">{{ s.dwell_time_us }}<small> µs</small></span>
        </div>
        <div v-if="s.frequency_khz != null" class="src-param-item">
          <span class="src-param-label">Freq</span>
          <span class="src-param-val">{{ s.frequency_khz }}<small> kHz</small></span>
        </div>
        <div v-if="s.pulse_width != null" class="src-param-item">
          <span class="src-param-label">Qpulse</span>
          <span class="src-param-val">{{ s.pulse_width }}</span>
        </div>
        <div v-if="s.passes != null && s.passes > 1" class="src-param-item">
          <span class="src-param-label">Passes</span>
          <span class="src-param-val">{{ s.passes }}</span>
        </div>
        <div v-if="s.line_interval_mm != null" class="src-param-item">
          <span class="src-param-label">Line Int</span>
          <span class="src-param-val">{{ s.line_interval_mm }}<small> mm</small></span>
        </div>
        <div v-if="s.dpi != null" class="src-param-item">
          <span class="src-param-label">DPI</span>
          <span class="src-param-val">{{ s.dpi }}</span>
        </div>
        <div v-if="s.fill_type" class="src-param-item">
          <span class="src-param-label">Fill</span>
          <span class="src-param-val">{{ s.fill_type }}</span>
        </div>
        <div v-if="s.defocus_mm" class="src-param-item">
          <span class="src-param-label">Defocus</span>
          <span class="src-param-val">{{ s.defocus_mm }}<small> mm</small></span>
        </div>
        <div v-if="s.image_mode" class="src-param-item">
          <span class="src-param-label">Mode</span>
          <span class="src-param-val">{{ s.image_mode }}</span>
        </div>
        <div v-if="s.wobble_enabled" class="src-param-item">
          <span class="src-param-label">Wobble</span>
          <span class="src-param-val">{{ s.wobble_amplitude_mm || '—' }}<small>mm</small></span>
        </div>
        <div v-if="s.rotary_enabled" class="src-param-item">
          <span class="src-param-label">Rotary</span>
          <span class="src-param-val">{{ s.rotary_type }}</span>
        </div>
        <div v-if="!s.speed_mms && !s.dwell_time_us" class="src-param-item primary">
          <span class="src-param-label">Status</span>
          <span class="src-param-val" style="color:var(--warning)">needs dialing</span>
        </div>
      </div>
      <div v-if="s.result_rating || s.result_notes" class="src-result">
        <star-rating v-if="s.result_rating" :value="s.result_rating" :readonly="true" size="sm" />
        <span v-if="s.result_notes" class="src-notes">{{ s.result_notes }}</span>
      </div>
      <div v-if="s.image_path" style="margin-top:8px">
        <img :src="s.image_path" style="max-width:180px;max-height:130px;border-radius:6px;object-fit:cover;border:1px solid var(--border)">
      </div>
    </div>
  `
};

// ── DashboardView ──────────────────────────────────────────────────────────────
const DashboardView = {
  name: 'DashboardView',
  components: { StarRating, CategoryBadge },
  data() {
    return { stats: {}, recent: [], topRated: [], favorites: [], version: {}, updateStatus: null, checking: false, updating: false, updateLog: '' };
  },
  async mounted() { await this.load(); },
  methods: {
    async load() {
      const [all, ver] = await Promise.all([api.get('/materials'), api.get('/version')]);
      this.version = ver;
      const cats = new Set(all.map(e => e.category));
      const favs = all.filter(e => e.settings.some(s => s.is_favorite));
      this.stats = { total: all.length, categories: cats.size, favorites: favs.length };
      this.recent = [...all].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0,5);
      this.topRated = [...all].filter(e => e.settings.some(s => s.result_rating))
        .sort((a,b) => {
          const ra = Math.max(...a.settings.map(s => s.result_rating||0));
          const rb = Math.max(...b.settings.map(s => s.result_rating||0));
          return rb - ra;
        }).slice(0,5);
      this.favorites = favs.slice(0,6);
    },
    async checkUpdate() {
      this.checking = true; this.updateStatus = null;
      try { this.updateStatus = await api.get('/update/check'); }
      catch (err) { this.updateStatus = { error: err.message }; }
      finally { this.checking = false; }
    },
    async runUpdate() {
      if (!confirm('Run update now? The app will restart.')) return;
      this.updating = true; this.updateLog = 'Starting update...\n';
      try {
        const token = prompt('Enter update token:');
        if (!token) { this.updating = false; return; }
        const res = await fetch('/api/update/run', { method: 'POST', headers: { 'x-update-token': token } });
        const data = await res.json();
        this.updateLog = data.log || '';
      } catch (err) { this.updateLog = 'Error: ' + err.message; }
      finally { this.updating = false; }
    },
    go(entry) { this.$router.push(`/entry/${entry.id}`); },
    topRating(e) { return Math.max(...e.settings.map(s => s.result_rating||0)); },
    catClass
  },
  template: `
    <div class="page-content">
      <div class="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>ComMarker Omni XE 6W UV Galvo &mdash; 355nm</p>
        </div>
        <router-link to="/add" class="btn btn-primary"><i class="bi bi-plus-lg"></i> Add Entry</router-link>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-num">{{ stats.total || 0 }}</div>
          <div class="stat-label">Materials</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ stats.categories || 0 }}</div>
          <div class="stat-label">Categories</div>
        </div>
        <div class="stat-card clickable" @click="$router.push('/materials?favorite=1')">
          <div class="stat-num" style="color:var(--warning)">{{ stats.favorites || 0 }}</div>
          <div class="stat-label"><i class="bi bi-star-fill" style="color:var(--warning)"></i> Favorites</div>
        </div>
        <div class="stat-card">
          <div class="stat-num" style="font-size:16px;padding-top:6px">70 / 150</div>
          <div class="stat-label">Lenses (mm)</div>
        </div>
      </div>

      <div v-if="favorites.length" class="dashboard-section" style="margin-bottom:20px">
        <h3 style="display:flex;justify-content:space-between;align-items:center">
          <span><i class="bi bi-star-fill" style="color:var(--warning)"></i> Favorites</span>
          <router-link to="/materials?favorite=1" class="btn btn-ghost btn-sm">View all</router-link>
        </h3>
        <div class="fav-grid">
          <div v-for="e in favorites" :key="e.id" class="fav-card" @click="go(e)">
            <span :class="catClass(e.category)" style="font-size:11px">{{ e.category }}</span>
            <div class="fav-name">{{ e.name }}</div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="dashboard-section">
          <h3><i class="bi bi-clock-history"></i> Recently Added</h3>
          <div v-if="recent.length === 0" class="empty-state"><p>No entries yet</p></div>
          <div v-for="e in recent" :key="e.id" class="list-entry" @click="go(e)">
            <span :class="catClass(e.category)" style="flex-shrink:0">{{ e.category.split('/')[0] }}</span>
            <span class="entry-name">{{ e.name }}</span>
            <span class="entry-meta">★{{ topRating(e) || '—' }}</span>
          </div>
        </div>

        <div class="dashboard-section">
          <h3><i class="bi bi-trophy"></i> Highest Rated</h3>
          <div v-if="topRated.length === 0" class="empty-state"><p>No rated entries yet</p></div>
          <div v-for="e in topRated" :key="e.id" class="list-entry" @click="go(e)">
            <span :class="catClass(e.category)" style="flex-shrink:0">{{ e.category.split('/')[0] }}</span>
            <span class="entry-name">{{ e.name }}</span>
            <span class="entry-meta">★{{ topRating(e) }}</span>
          </div>
        </div>
      </div>

      <div class="dashboard-section" style="margin-top:20px">
        <h3><i class="bi bi-arrow-up-circle"></i> App Version</h3>
        <div class="version-card">
          <div class="version-info">
            <div class="ver">{{ version.version || '—' }}</div>
            <div class="commit">commit {{ version.commit || '—' }}</div>
          </div>
          <button class="btn btn-secondary" @click="checkUpdate" :disabled="checking">
            <i class="bi bi-arrow-repeat"></i> {{ checking ? 'Checking...' : 'Check for Updates' }}
          </button>
          <button v-if="updateStatus && updateStatus.update_available" class="btn btn-primary" @click="runUpdate" :disabled="updating">
            <i class="bi bi-download"></i> {{ updating ? 'Updating...' : 'Update to ' + updateStatus.latest }}
          </button>
        </div>
        <div v-if="updateStatus && !updateStatus.error" style="margin-top:8px;font-size:13px;color:var(--text-secondary)">
          <span v-if="updateStatus.update_available" style="color:var(--accent)">
            <i class="bi bi-info-circle"></i> Update available: {{ updateStatus.latest }}
          </span>
          <span v-else style="color:var(--success)"><i class="bi bi-check-circle"></i> Up to date</span>
        </div>
        <div v-if="updateStatus && updateStatus.error" class="alert alert-error" style="margin-top:8px">{{ updateStatus.error }}</div>
        <div v-if="updateLog" class="log-output">{{ updateLog }}</div>
      </div>
    </div>
  `
};

// ── MaterialsView ──────────────────────────────────────────────────────────────
const MaterialsView = {
  name: 'MaterialsView',
  components: { MaterialCard },
  data() {
    return {
      entries: [], loading: true,
      search: '', category: '', rating: '', favorite: '', rotary: '', lens: '', sort: 'date',
      viewMode: 'grid', CATEGORIES, mobileFiltersOpen: false
    };
  },
  async mounted() {
    const q = this.$route.query;
    if (q.category) this.category = q.category;
    if (q.favorite) this.favorite = q.favorite;
    await this.load();
  },
  computed: {
    filtered() {
      let r = this.entries;
      if (this.sort === 'name') r = [...r].sort((a,b) => a.name.localeCompare(b.name));
      else if (this.sort === 'rating') {
        r = [...r].sort((a,b) => {
          const ra = Math.max(0, ...a.settings.map(s => s.result_rating||0));
          const rb = Math.max(0, ...b.settings.map(s => s.result_rating||0));
          return rb - ra;
        });
      }
      return r;
    },
    hasFilters() { return !!(this.search || this.category || this.rating || this.favorite || this.rotary || this.lens); }
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const p = new URLSearchParams();
        if (this.search)   p.set('search', this.search);
        if (this.category) p.set('category', this.category);
        if (this.lens)     p.set('lens', this.lens);
        if (this.rating)   p.set('rating', this.rating);
        if (this.favorite) p.set('favorite', this.favorite);
        if (this.rotary)   p.set('rotary', this.rotary);
        p.set('sort', this.sort);
        this.entries = await api.get('/materials?' + p.toString());
      } finally { this.loading = false; }
    },
    clearFilters() {
      this.search = ''; this.category = ''; this.lens = '';
      this.rating = ''; this.favorite = ''; this.rotary = '';
      this.load();
    },
    go(entry) { this.$router.push(`/entry/${entry.id}`); },
    async toggleFav(entry) {
      await api.post(`/materials/${entry.id}/favorite`);
      await this.load();
    },
    catClass, bestSetting,
    topRating(e) { return Math.max(0, ...e.settings.map(s => s.result_rating||0)); }
  },
  template: `
    <div class="page-content">
      <div class="page-header">
        <div><h2>Materials</h2><p>{{ filtered.length }} entries</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" @click="window.open('/api/export/csv')"><i class="bi bi-download"></i> CSV</button>
          <router-link to="/add" class="btn btn-primary btn-sm"><i class="bi bi-plus-lg"></i> Add Entry</router-link>
        </div>
      </div>

      <div class="search-bar">
        <input class="search-input" v-model="search" @input="load" placeholder="&#xe9c2; Search by name or notes..." type="search">
      </div>

      <button class="mobile-filters-toggle" @click="mobileFiltersOpen = !mobileFiltersOpen">
        <i class="bi bi-funnel"></i> Filters {{ hasFilters ? '(active)' : '' }}
        <i :class="mobileFiltersOpen ? 'bi bi-chevron-up' : 'bi bi-chevron-down'" style="margin-left:auto"></i>
      </button>

      <div class="browser-layout">
        <div :class="['filter-panel', { 'mobile-open': mobileFiltersOpen }]">
          <h3><i class="bi bi-funnel"></i> Filters</h3>

          <div class="filter-group">
            <label>Category</label>
            <select v-model="category" @change="load">
              <option value="">All Categories</option>
              <option v-for="cat in CATEGORIES" :key="cat">{{ cat }}</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Lens</label>
            <select v-model="lens" @change="load">
              <option value="">Any</option>
              <option value="70">70mm</option>
              <option value="150">150mm</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Min Rating</label>
            <select v-model="rating" @change="load">
              <option value="">Any</option>
              <option value="5">★★★★★ 5</option>
              <option value="4">★★★★ 4+</option>
              <option value="3">★★★ 3+</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Rotary</label>
            <select v-model="rotary" @change="load">
              <option value="">All</option>
              <option value="1">Rotary only</option>
              <option value="0">No rotary</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Favorites</label>
            <select v-model="favorite" @change="load">
              <option value="">All</option>
              <option value="1">Favorites only</option>
            </select>
          </div>

          <button v-if="hasFilters" class="btn btn-ghost btn-sm" style="width:100%;margin-top:4px" @click="clearFilters">
            <i class="bi bi-x-circle"></i> Clear Filters
          </button>
        </div>

        <div class="browser-main">
          <div class="toolbar">
            <div class="toolbar-left">
              <select class="sort-select" v-model="sort" @change="load">
                <option value="date">Newest First</option>
                <option value="rating">Highest Rated</option>
                <option value="name">Name A–Z</option>
              </select>
              <span class="results-count">{{ filtered.length }} results</span>
            </div>
            <div class="view-toggle">
              <button :class="['view-btn', { active: viewMode === 'grid' }]" @click="viewMode = 'grid'"><i class="bi bi-grid-3x3-gap"></i></button>
              <button :class="['view-btn', { active: viewMode === 'table' }]" @click="viewMode = 'table'"><i class="bi bi-table"></i></button>
            </div>
          </div>

          <div v-if="loading" class="empty-state"><i class="bi bi-hourglass-split"></i><p>Loading...</p></div>

          <div v-else-if="filtered.length === 0" class="empty-state">
            <i class="bi bi-search"></i>
            <p>No entries found{{ hasFilters ? ' — try clearing filters' : '' }}</p>
            <router-link to="/add" class="btn btn-primary" style="margin-top:12px"><i class="bi bi-plus-lg"></i> Add Entry</router-link>
          </div>

          <div v-else-if="viewMode === 'grid'" class="cards-grid">
            <material-card v-for="e in filtered" :key="e.id" :entry="e"
              @click="go" @favorite="toggleFav" />
          </div>

          <div v-else class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Burn Types</th>
                  <th>Lenses</th>
                  <th>Rating</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in filtered" :key="e.id" @click="go(e)" style="cursor:pointer">
                  <td style="font-weight:500">{{ e.name }}</td>
                  <td><span :class="catClass(e.category)">{{ e.category }}</span></td>
                  <td style="font-size:12px;color:var(--text-secondary)">
                    {{ [...new Set(e.settings.map(s=>s.burn_type))].slice(0,3).join(', ') }}
                    <span v-if="e.settings.length > 3" style="color:var(--text-secondary)">+{{ e.settings.length - 3 }}</span>
                  </td>
                  <td class="mono">{{ [...new Set(e.settings.map(s=>s.lens_mm))].sort().join(' / ') }}</td>
                  <td>
                    <span v-if="topRating(e)" style="color:#f9a825">{{ '★'.repeat(topRating(e)) }}</span>
                    <span v-else class="na">—</span>
                  </td>
                  <td @click.stop>
                    <button class="btn-icon" :class="{active:e.settings.some(s=>s.is_favorite)}" @click.stop="toggleFav(e)">
                      <i :class="e.settings.some(s=>s.is_favorite) ? 'bi bi-star-fill' : 'bi bi-star'"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `
};

// ── AddEntryView ───────────────────────────────────────────────────────────────
const AddEntryView = {
  name: 'AddEntryView',
  components: { SettingsRowForm },
  data() {
    return {
      mat: { name: '', category: 'Glass/Ceramics', notes: '' },
      sett: emptySettings(),
      CATEGORIES,
      saving: false, error: ''
    };
  },
  methods: {
    async submit() {
      if (!this.mat.name || !this.mat.category) {
        this.error = 'Name and category are required.'; return;
      }
      this.saving = true; this.error = '';
      try {
        const material = await api.post('/materials', this.mat);
        await api.post(`/materials/${material.id}/settings`, settingsToPayload(this.sett));
        this.$router.push(`/entry/${material.id}`);
      } catch (err) {
        this.error = err.message;
      } finally { this.saving = false; }
    }
  },
  template: `
    <div class="page-content">
      <div class="page-header">
        <div><h2>Add Entry</h2><p>New material + laser settings</p></div>
        <router-link to="/materials" class="btn btn-ghost"><i class="bi bi-arrow-left"></i> Back</router-link>
      </div>
      <div v-if="error" class="alert alert-error"><i class="bi bi-exclamation-circle"></i> {{ error }}</div>

      <div class="form-section">
        <h3>Material</h3>
        <div class="form-grid">
          <div class="form-group form-full">
            <label>Material Name *</label>
            <input type="text" v-model="mat.name" placeholder="e.g. Slate" required>
          </div>
          <div class="form-group">
            <label>Category *</label>
            <select v-model="mat.category">
              <option v-for="c in CATEGORIES" :key="c">{{ c }}</option>
            </select>
          </div>
          <div class="form-group form-full">
            <label>Process Notes</label>
            <textarea v-model="mat.notes" placeholder="Gotchas, warnings, setup tips..." rows="2"></textarea>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3>Initial Settings</h3>
        <settings-row-form v-model="sett" @submit="submit" @cancel="$router.push('/materials')" />
      </div>
    </div>
  `
};

// ── EntryDetailView ────────────────────────────────────────────────────────────
const EntryDetailView = {
  name: 'EntryDetailView',
  components: { StarRating, CategoryBadge, SettingsRowForm, SettingsRowDisplay },
  data() {
    return {
      entry: null,
      activeLens: 150,
      showDeleteModal: false,
      deleting: false,
      editingSettings: null,
      editForm: null,
      showAddSettings: false,
      addForm: null,
      settingsError: '',
      showRefSection: false,
      attempts: [],
      showAttempts: false,
      showAddAttempt: false,
      attemptForm: { burn_type: '', lens_mm: 150, speed_mms: '', dwell_time_us: '', frequency_khz: '', pulse_width: '', passes: 1, line_interval_mm: '', dpi: '', worked: 2, notes: '' },
      attemptError: '',
      BURN_TYPES, LENSES,
    };
  },
  async mounted() { await this.load(); },
  computed: {
    userSettings() {
      if (!this.entry) return [];
      return this.entry.settings.filter(s => !s.is_commarker_reference);
    },
    refSettings() {
      if (!this.entry) return [];
      return this.entry.settings.filter(s => s.is_commarker_reference);
    },
    lensesWithData() {
      if (!this.entry) return [150];
      const ls = [...new Set(this.entry.settings.map(s => s.lens_mm))].sort();
      return ls.length ? ls : [150];
    },
    userByLens() {
      return this.userSettings.filter(s => s.lens_mm === this.activeLens);
    },
    refByLens() {
      return this.refSettings.filter(s => s.lens_mm === this.activeLens);
    }
  },
  methods: {
    async load() {
      try {
        this.entry = await api.get(`/materials/${this.$route.params.id}`);
        if (this.lensesWithData.includes(150)) this.activeLens = 150;
        else this.activeLens = this.lensesWithData[0];
      } catch { this.$router.push('/materials'); }
    },
    async loadAttempts() {
      this.attempts = await api.get(`/materials/${this.entry.id}/attempts`);
    },
    async toggleAttempts() {
      this.showAttempts = !this.showAttempts;
      if (this.showAttempts && !this.attempts.length) await this.loadAttempts();
    },
    startEdit(s) {
      this.editingSettings = s;
      this.editForm = settingsToForm(s);
      this.settingsError = '';
    },
    cancelEdit() { this.editingSettings = null; this.editForm = null; },
    async saveEdit() {
      try {
        this.entry = await api.put(
          `/materials/${this.entry.id}/settings/${this.editingSettings.id}`,
          settingsToPayload(this.editForm)
        );
        this.editingSettings = null; this.editForm = null;
      } catch (err) { this.settingsError = err.message; }
    },
    async deleteSettings(s) {
      if (!confirm(`Delete ${s.burn_type} ${s.lens_mm}mm settings?`)) return;
      this.entry = await api.del(`/materials/${this.entry.id}/settings/${s.id}`);
    },
    async toggleFavSettings(s) {
      await api.post(`/materials/${this.entry.id}/settings/${s.id}/favorite`);
      await this.load();
    },
    startAdd() {
      this.addForm = { ...emptySettings(), lens_mm: this.activeLens };
      this.showAddSettings = true;
      this.settingsError = '';
    },
    cancelAdd() { this.showAddSettings = false; this.addForm = null; },
    async saveAdd() {
      try {
        this.entry = await api.post(`/materials/${this.entry.id}/settings`, settingsToPayload(this.addForm));
        this.showAddSettings = false; this.addForm = null;
      } catch (err) { this.settingsError = err.message; }
    },
    async duplicate() {
      const res = await api.post(`/materials/${this.entry.id}/duplicate`);
      this.$router.push(`/entry/${res.id}`);
    },
    async confirmDelete() {
      this.deleting = true;
      try {
        await api.del(`/materials/${this.entry.id}`);
        this.$router.push('/materials');
      } finally { this.deleting = false; this.showDeleteModal = false; }
    },
    async addAttempt() {
      this.attemptError = '';
      const a = this.attemptForm;
      const n = v => (v === '' || v === null) ? null : Number(v);
      try {
        await api.post(`/materials/${this.entry.id}/attempts`, {
          burn_type: a.burn_type || 'Engraving',
          lens_mm: Number(a.lens_mm) || 150,
          speed_mms: n(a.speed_mms), dwell_time_us: n(a.dwell_time_us),
          frequency_khz: n(a.frequency_khz), pulse_width: n(a.pulse_width),
          passes: n(a.passes) || 1, line_interval_mm: n(a.line_interval_mm),
          dpi: n(a.dpi), worked: Number(a.worked), notes: a.notes || null
        });
        await this.loadAttempts();
        this.showAddAttempt = false;
        this.attemptForm = { burn_type: '', lens_mm: 150, speed_mms: '', dwell_time_us: '', frequency_khz: '', pulse_width: '', passes: 1, line_interval_mm: '', dpi: '', worked: 2, notes: '' };
      } catch (err) { this.attemptError = err.message; }
    },
    async deleteAttempt(a) {
      if (!confirm('Delete this attempt?')) return;
      await api.del(`/materials/${this.entry.id}/attempts/${a.id}`);
      await this.loadAttempts();
    },
    catClass,
    workedLabel(w) { return WORKED_LABELS[w] || 'Unknown'; },
    workedColor(w) { return WORKED_COLORS[w] || 'var(--text-secondary)'; },
  },
  template: `
    <div v-if="!entry" class="page-content"><div class="empty-state"><i class="bi bi-hourglass-split"></i><p>Loading...</p></div></div>
    <div v-else class="page-content">

      <!-- Header -->
      <div class="detail-header">
        <div class="detail-title">
          <span :class="catClass(entry.category)" style="margin-bottom:6px;display:inline-block">{{ entry.category }}</span>
          <h2>{{ entry.name }}</h2>
          <div class="subtitle">Added {{ new Date(entry.created_at).toLocaleDateString() }}</div>
        </div>
        <div class="detail-actions">
          <button class="btn btn-secondary" @click="duplicate"><i class="bi bi-copy"></i> Duplicate</button>
          <router-link :to="'/edit/' + entry.id" class="btn btn-secondary"><i class="bi bi-pencil"></i> Edit Info</router-link>
          <button class="btn btn-danger" @click="showDeleteModal = true"><i class="bi bi-trash"></i></button>
        </div>
      </div>

      <div v-if="entry.notes" class="notes-block" style="margin-bottom:20px">
        <strong style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary)">Process Notes</strong>
        <div style="margin-top:6px">{{ entry.notes }}</div>
      </div>

      <!-- Settings error -->
      <div v-if="settingsError" class="alert alert-error" style="margin-bottom:12px">{{ settingsError }}</div>

      <!-- Lens tabs -->
      <div class="lens-tabs" v-if="lensesWithData.length > 1">
        <button v-for="l in lensesWithData" :key="l"
          :class="['lens-tab', { active: activeLens === l }]"
          @click="activeLens = l">
          {{ l }}mm
        </button>
      </div>
      <div v-else style="margin-bottom:12px">
        <span class="lens-tab active">{{ activeLens }}mm</span>
      </div>

      <!-- User settings for this lens -->
      <div class="section-header">
        <h3>Your Settings — {{ activeLens }}mm</h3>
        <button class="btn btn-primary btn-sm" @click="startAdd"><i class="bi bi-plus"></i> Add</button>
      </div>

      <div v-if="showAddSettings" class="settings-add-panel">
        <div class="panel-title">Add Settings Row</div>
        <settings-row-form v-model="addForm" @submit="saveAdd" @cancel="cancelAdd" />
      </div>

      <div v-if="editingSettings" class="settings-add-panel">
        <div class="panel-title">Edit: {{ editingSettings.burn_type }}</div>
        <settings-row-form v-model="editForm"
          :entry-id="entry.id" :settings-id="editingSettings.id"
          @submit="saveEdit" @cancel="cancelEdit" />
      </div>

      <div v-if="userByLens.length === 0 && !showAddSettings" class="empty-state" style="padding:24px 0">
        <i class="bi bi-plus-circle"></i>
        <p>No {{ activeLens }}mm settings yet</p>
        <button class="btn btn-primary btn-sm" style="margin-top:10px" @click="startAdd">Add Settings</button>
      </div>
      <div v-else class="settings-rows">
        <settings-row-display v-for="s in userByLens" :key="s.id"
          :s="s" :material-id="entry.id" :can-edit="true"
          @edit="startEdit" @delete="deleteSettings" @favorite="toggleFavSettings" />
      </div>

      <!-- ComMarker Reference (collapsible) -->
      <div v-if="refByLens.length" class="collapsible-section">
        <button class="collapse-toggle" @click="showRefSection = !showRefSection">
          <i :class="showRefSection ? 'bi bi-chevron-down' : 'bi bi-chevron-right'"></i>
          ComMarker Reference — {{ activeLens }}mm
          <span class="count-badge">{{ refByLens.length }}</span>
        </button>
        <div v-if="showRefSection" class="settings-rows ref-rows">
          <settings-row-display v-for="s in refByLens" :key="s.id"
            :s="s" :material-id="entry.id" :can-edit="false" />
        </div>
      </div>

      <!-- Attempt History (collapsible) -->
      <div class="collapsible-section">
        <button class="collapse-toggle" @click="toggleAttempts">
          <i :class="showAttempts ? 'bi bi-chevron-down' : 'bi bi-chevron-right'"></i>
          Attempt History
          <span v-if="attempts.length" class="count-badge">{{ attempts.length }}</span>
        </button>
        <div v-if="showAttempts">
          <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
            <button class="btn btn-primary btn-sm" @click="showAddAttempt = !showAddAttempt">
              <i class="bi bi-plus"></i> Log Attempt
            </button>
          </div>

          <div v-if="showAddAttempt" class="settings-add-panel" style="margin-bottom:14px">
            <div class="panel-title">Log Attempt</div>
            <div class="form-grid cols-2">
              <div class="form-group">
                <label>Burn Type</label>
                <input list="at-burn-types" v-model="attemptForm.burn_type" placeholder="e.g. Engraving">
                <datalist id="at-burn-types">
                  <option v-for="bt in BURN_TYPES" :key="bt" :value="bt">{{ bt }}</option>
                </datalist>
              </div>
              <div class="form-group">
                <label>Lens</label>
                <select v-model="attemptForm.lens_mm">
                  <option v-for="l in LENSES" :key="l" :value="l">{{ l }}mm</option>
                </select>
              </div>
              <div class="form-group">
                <label>Speed (mm/s)</label>
                <input type="number" v-model="attemptForm.speed_mms" min="0" step="1">
              </div>
              <div class="form-group">
                <label>Frequency (kHz)</label>
                <input type="number" v-model="attemptForm.frequency_khz" min="0" step="1">
              </div>
              <div class="form-group">
                <label>Pulse Width</label>
                <input type="number" v-model="attemptForm.pulse_width" min="1" step="1">
              </div>
              <div class="form-group">
                <label>Passes</label>
                <input type="number" v-model="attemptForm.passes" min="1" step="1">
              </div>
              <div class="form-group form-full">
                <label>Result</label>
                <select v-model.number="attemptForm.worked">
                  <option :value="0">Failed</option>
                  <option :value="1">Partial</option>
                  <option :value="2">Success</option>
                </select>
              </div>
              <div class="form-group form-full">
                <label>Notes</label>
                <textarea v-model="attemptForm.notes" placeholder="What happened, what to try next..." rows="2"></textarea>
              </div>
            </div>
            <div v-if="attemptError" class="alert alert-error" style="margin-bottom:8px">{{ attemptError }}</div>
            <div class="form-actions">
              <button class="btn btn-ghost" @click="showAddAttempt = false">Cancel</button>
              <button class="btn btn-primary" @click="addAttempt">Save Attempt</button>
            </div>
          </div>

          <div v-if="attempts.length === 0" class="empty-state" style="padding:16px 0">
            <p>No attempts logged yet</p>
          </div>
          <div v-for="a in attempts" :key="a.id" class="attempt-row">
            <div class="attempt-header">
              <span class="burn-label">{{ a.burn_type }} {{ a.lens_mm }}mm</span>
              <span :style="{color: workedColor(a.worked), fontWeight:'600', fontSize:'12px'}">{{ workedLabel(a.worked) }}</span>
              <span style="font-size:11px;color:var(--text-secondary);margin-left:auto">{{ new Date(a.created_at).toLocaleDateString() }}</span>
              <button class="btn-icon danger" @click="deleteAttempt(a)"><i class="bi bi-trash"></i></button>
            </div>
            <div class="attempt-params">
              <span v-if="a.speed_mms" class="param-chip">{{ a.speed_mms }} mm/s</span>
              <span v-if="a.frequency_khz" class="param-chip">{{ a.frequency_khz }} kHz</span>
              <span v-if="a.pulse_width" class="param-chip">Qpulse {{ a.pulse_width }}</span>
              <span v-if="a.passes > 1" class="param-chip">{{ a.passes }}x</span>
            </div>
            <div v-if="a.notes" class="attempt-notes">{{ a.notes }}</div>
          </div>
        </div>
      </div>

      <!-- Delete Modal -->
      <div v-if="showDeleteModal" class="modal-backdrop">
        <div class="modal">
          <h3>Delete Entry?</h3>
          <p>This permanently deletes <strong>{{ entry.name }}</strong> and all its settings. Cannot be undone.</p>
          <div class="modal-actions">
            <button class="btn btn-ghost" @click="showDeleteModal = false">Cancel</button>
            <button class="btn btn-danger" @click="confirmDelete" :disabled="deleting">
              <i class="bi bi-trash"></i> {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
};

// ── EditEntryView (material meta only — settings managed on detail page) ────────
const EditEntryView = {
  name: 'EditEntryView',
  data() {
    return { form: null, entryId: null, saving: false, error: '', CATEGORIES };
  },
  async mounted() {
    this.entryId = this.$route.params.id;
    try {
      const e = await api.get(`/materials/${this.entryId}`);
      this.form = { name: e.name, category: e.category, notes: e.notes || '' };
    } catch { this.$router.push('/materials'); }
  },
  methods: {
    async submit() {
      this.saving = true; this.error = '';
      try {
        await api.put(`/materials/${this.entryId}`, this.form);
        this.$router.push(`/entry/${this.entryId}`);
      } catch (err) { this.error = err.message; }
      finally { this.saving = false; }
    }
  },
  template: `
    <div class="page-content">
      <div class="page-header">
        <div><h2>Edit Material</h2><p v-if="form">{{ form.name }}</p></div>
        <router-link :to="'/entry/' + entryId" class="btn btn-ghost"><i class="bi bi-arrow-left"></i> Back</router-link>
      </div>
      <div v-if="!form" class="empty-state"><i class="bi bi-hourglass-split"></i><p>Loading...</p></div>
      <div v-else>
        <div v-if="error" class="alert alert-error"><i class="bi bi-exclamation-circle"></i> {{ error }}</div>
        <div class="form-section">
          <h3>Material Info</h3>
          <div class="form-grid">
            <div class="form-group form-full">
              <label>Name *</label>
              <input type="text" v-model="form.name" required>
            </div>
            <div class="form-group">
              <label>Category *</label>
              <select v-model="form.category">
                <option v-for="c in CATEGORIES" :key="c">{{ c }}</option>
              </select>
            </div>
            <div class="form-group form-full">
              <label>Process Notes</label>
              <textarea v-model="form.notes" rows="3" placeholder="Gotchas, warnings, setup tips..."></textarea>
            </div>
          </div>
        </div>
        <div class="form-actions">
          <router-link :to="'/entry/' + entryId" class="btn btn-ghost"><i class="bi bi-x"></i> Cancel</router-link>
          <button class="btn btn-primary" @click="submit" :disabled="saving">
            <i class="bi bi-check-lg"></i> {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  `
};

// ── SettingsView ───────────────────────────────────────────────────────────────
const SettingsView = {
  name: 'SettingsView',
  data() {
    return {
      github_repo: '', saved: false, saving: false,
      importFile: null, importing: false, importResult: '', importError: '',
      updateStatus: null, checking: false, updating: false, updateLog: ''
    };
  },
  async mounted() {
    try { const s = await api.get('/settings'); this.github_repo = s.github_repo || ''; } catch {}
    this.checkUpdate();
  },
  methods: {
    async saveSettings() {
      this.saving = true;
      try {
        await api.put('/settings', { github_repo: this.github_repo });
        this.saved = true; setTimeout(() => this.saved = false, 2500);
      } finally { this.saving = false; }
    },
    async checkUpdate() {
      this.checking = true; this.updateStatus = null;
      try { this.updateStatus = await api.get('/update/check'); }
      catch (err) { this.updateStatus = { error: err.message }; }
      finally { this.checking = false; }
    },
    async runUpdate() {
      if (!confirm('Run update now? The app will restart.')) return;
      this.updating = true; this.updateLog = 'Starting update...\n';
      try {
        const token = prompt('Enter update token (from /opt/laser-tracker/.env):');
        if (!token) { this.updating = false; return; }
        const res = await fetch('/api/update/run', { method: 'POST', headers: { 'x-update-token': token } });
        const data = await res.json();
        this.updateLog = data.log || '';
      } catch (err) { this.updateLog = 'Error: ' + err.message; }
      finally { this.updating = false; }
    },
    exportJson() { window.open('/api/export'); },
    onImportFile(e) { this.importFile = e.target.files[0]; },
    async runImport() {
      if (!this.importFile) return;
      this.importing = true; this.importResult = ''; this.importError = '';
      try {
        const text = await this.importFile.text();
        const data = JSON.parse(text);
        const result = await api.post('/import', data);
        this.importResult = `Imported ${result.imported} materials.`;
      } catch (err) { this.importError = err.message; }
      finally { this.importing = false; }
    }
  },
  template: `
    <div class="page-content">
      <div class="page-header"><div><h2>Settings</h2><p>App configuration and backup</p></div></div>

      <div class="settings-section">
        <h3>App Configuration</h3>
        <div class="form-group" style="margin-bottom:12px">
          <label>GitHub Repository</label>
          <input v-model="github_repo" type="text" placeholder="MakaiView/LaserSettingsManager">
          <span class="hint">Used for update checks. Format: username/repo</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <button class="btn btn-primary" @click="saveSettings" :disabled="saving">
            <i class="bi bi-check-lg"></i> {{ saving ? 'Saving...' : 'Save' }}
          </button>
          <span v-if="saved" style="color:var(--success);font-size:13px"><i class="bi bi-check-circle"></i> Saved</span>
        </div>
      </div>

      <div class="settings-section">
        <h3>Software Update</h3>
        <div class="update-status-row">
          <div v-if="checking" style="color:var(--text-secondary);font-size:13px">
            <i class="bi bi-arrow-repeat spin"></i> Checking for updates...
          </div>
          <template v-else-if="updateStatus && !updateStatus.error">
            <div v-if="!updateStatus.update_available" class="update-ok">
              <i class="bi bi-check-circle-fill"></i>
              <span>Up to date <span class="version-tag">{{ updateStatus.current }}</span></span>
            </div>
            <div v-else class="update-available">
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                <span><i class="bi bi-arrow-up-circle-fill"></i> Update available: <strong>{{ updateStatus.latest }}</strong> (current: {{ updateStatus.current }})</span>
                <button class="btn btn-primary btn-sm" @click="runUpdate" :disabled="updating">
                  <i class="bi bi-download"></i> {{ updating ? 'Updating...' : 'Update Now' }}
                </button>
              </div>
              <div v-if="updateLog" class="log-output" style="margin-top:10px">{{ updateLog }}</div>
            </div>
          </template>
          <div v-else-if="updateStatus && updateStatus.error" style="font-size:13px;color:var(--text-secondary)">
            <i class="bi bi-exclamation-circle"></i> Could not check: {{ updateStatus.error }}
          </div>
          <button class="btn btn-ghost btn-sm" @click="checkUpdate" :disabled="checking" style="margin-left:auto">
            <i class="bi bi-arrow-repeat"></i> Recheck
          </button>
        </div>
      </div>

      <div class="settings-section">
        <h3>Backup &amp; Restore</h3>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">Export all entries as JSON.</p>
            <button class="btn btn-secondary" @click="exportJson"><i class="bi bi-download"></i> Export JSON Backup</button>
          </div>
          <hr style="border-color:var(--border)">
          <div>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">Import from a v2.0 JSON backup. Adds entries without removing existing data.</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <input type="file" accept=".json" @change="onImportFile" style="font-size:13px;color:var(--text-secondary)">
              <button class="btn btn-secondary" @click="runImport" :disabled="!importFile || importing">
                <i class="bi bi-upload"></i> {{ importing ? 'Importing...' : 'Import' }}
              </button>
            </div>
            <div v-if="importResult" class="alert alert-success" style="margin-top:8px">{{ importResult }}</div>
            <div v-if="importError" class="alert alert-error" style="margin-top:8px">{{ importError }}</div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3>About</h3>
        <table class="rotary-table" style="font-size:13px">
          <tr><td>Machine</td><td>ComMarker Omni XE 6W UV Galvo</td></tr>
          <tr><td>Wavelength</td><td>355nm UV</td></tr>
          <tr><td>Lenses</td><td>70mm / 150mm</td></tr>
          <tr><td>Software</td><td>LightBurn + ComMarker Studio</td></tr>
          <tr><td>Repository</td><td><a :href="'https://github.com/' + (github_repo || 'MakaiView/LaserSettingsManager')" target="_blank">{{ github_repo || 'MakaiView/LaserSettingsManager' }}</a></td></tr>
        </table>
      </div>
    </div>
  `
};

// ── RotaryReferenceView ────────────────────────────────────────────────────────
const RotaryReferenceView = {
  name: 'RotaryReferenceView',
  template: `
    <div class="page-content">
      <div class="page-header">
        <div><h2>Rotary Reference</h2><p>ComMarker R5 &mdash; corrected settings</p></div>
      </div>
      <div class="warning-box">
        <i class="bi bi-exclamation-triangle-fill" style="font-size:18px;flex-shrink:0"></i>
        <div>
          <strong>IMPORTANT:</strong> The R5 manual shows 12800 steps/rotation, but the hardware was updated to 3200.
          Running at manual speeds causes 4x overspeed — results in jumping and step loss.
          Always use the corrected values below.
        </div>
      </div>
      <div class="rotary-card">
        <h3><i class="bi bi-speedometer2"></i> Corrected Motor Speeds</h3>
        <table class="rotary-table">
          <tr><td>Steps per rotation</td><td>3200 (NOT 12800)</td></tr>
          <tr><td>Min speed</td><td>125 pulses/sec</td></tr>
          <tr><td>Max speed</td><td>750 pulses/sec</td></tr>
          <tr><td>Acceleration</td><td>300–500 ms</td></tr>
          <tr><td>Return speed</td><td>750 pulses/sec</td></tr>
        </table>
      </div>
      <div class="rotary-card">
        <h3><i class="bi bi-tools"></i> Setup</h3>
        <table class="rotary-table">
          <tr><td>Motor orientation</td><td>Motor toward BACK of laser base, tail support toward FRONT</td></tr>
          <tr><td>Axis in LightBurn</td><td>X Axis</td></tr>
        </table>
      </div>
      <div class="rotary-card">
        <h3><i class="bi bi-arrows-angle-expand"></i> Chuck vs Roller</h3>
        <div style="font-size:13px;line-height:1.7;color:var(--text-secondary)">
          <p><strong style="color:var(--text-primary)">Chuck:</strong> Short/stubby objects, rings, coins, small cups. Always use tail support on anything over ~100mm long.</p>
          <p style="margin-top:8px"><strong style="color:var(--text-primary)">Roller:</strong> Long cylinders, bottles, tumblers, Hydro Flasks.</p>
        </div>
      </div>
      <div class="rotary-card">
        <h3><i class="bi bi-rulers"></i> Measuring Diameter</h3>
        <div style="font-size:13px;line-height:1.7;color:var(--text-secondary)">
          <p>Use a circumference tape at the <strong style="color:var(--text-primary)">engraving zone</strong> (not the widest point).</p>
          <p style="margin:6px 0">
            <code style="font-family:var(--font-mono);background:var(--bg-primary);padding:4px 8px;border-radius:4px;color:var(--accent)">
              Diameter = Circumference ÷ 3.14159
            </code>
          </p>
        </div>
      </div>
    </div>
  `
};

// ── App Layout ─────────────────────────────────────────────────────────────────
const AppLayout = {
  name: 'AppLayout',
  data() { return { sidebarOpen: false }; },
  methods: { closeNav() { this.sidebarOpen = false; } },
  template: `
    <div class="app-layout">
      <div :class="['sidebar-overlay', { open: sidebarOpen }]" @click="sidebarOpen = false"></div>
      <nav :class="['sidebar', { open: sidebarOpen }]">
        <router-link to="/" class="sidebar-brand-link" @click="closeNav">
          <div class="sidebar-brand">
            <svg class="logo-mark" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="2" width="16" height="10" rx="2.5" fill="currentColor"/>
              <polygon points="11,13 21,13 18.5,24 13.5,24" fill="currentColor" opacity="0.6"/>
              <circle cx="16" cy="27" r="3" fill="currentColor"/>
              <circle cx="16" cy="27" r="5.5" fill="currentColor" opacity="0.15"/>
            </svg>
            <div>
              <h1>Laser Tracker</h1>
              <p>ComMarker Omni XE 6W</p>
            </div>
          </div>
        </router-link>
        <div class="sidebar-nav">
          <router-link to="/" class="nav-item" @click="closeNav"><i class="bi bi-house-door"></i> Dashboard</router-link>
          <router-link to="/materials" class="nav-item" @click="closeNav"><i class="bi bi-collection"></i> Materials</router-link>
          <router-link to="/add" class="nav-item" @click="closeNav"><i class="bi bi-plus-circle"></i> Add Entry</router-link>
          <router-link to="/rotary" class="nav-item" @click="closeNav"><i class="bi bi-arrow-repeat"></i> Rotary Reference</router-link>
          <router-link to="/settings" class="nav-item" @click="closeNav"><i class="bi bi-gear"></i> Settings</router-link>
        </div>
        <div class="sidebar-footer">MakaiView &mdash; UV Galvo 355nm</div>
      </nav>
      <main class="main-content">
        <div class="mobile-header">
          <button class="hamburger" @click="sidebarOpen = !sidebarOpen"><i class="bi bi-list"></i></button>
          <router-link to="/" style="text-decoration:none"><h1>Laser Tracker</h1></router-link>
        </div>
        <router-view />
      </main>
    </div>
  `
};

// ── Router ─────────────────────────────────────────────────────────────────────
const router = VueRouter.createRouter({
  history: VueRouter.createWebHistory(),
  routes: [
    { path: '/',           component: DashboardView },
    { path: '/materials',  component: MaterialsView },
    { path: '/add',        component: AddEntryView },
    { path: '/entry/:id',  component: EntryDetailView },
    { path: '/edit/:id',   component: EditEntryView },
    { path: '/settings',   component: SettingsView },
    { path: '/rotary',     component: RotaryReferenceView },
    { path: '/:catchAll(.*)', redirect: '/' }
  ],
  scrollBehavior() { return { top: 0 }; }
});

// ── Mount ──────────────────────────────────────────────────────────────────────
const app = Vue.createApp(AppLayout);
app.component('StarRating', StarRating);
app.component('CategoryBadge', CategoryBadge);
app.component('MaterialCard', MaterialCard);
app.component('SettingsRowForm', SettingsRowForm);
app.component('SettingsRowDisplay', SettingsRowDisplay);
app.use(router);
app.mount('#app');
