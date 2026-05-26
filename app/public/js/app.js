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

// ── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = {
  'Glass':   ['Surface Etch', 'Subsurface 2D', 'Subsurface 3D Crystal', 'Bottle/Curved'],
  'Metal':   ['Stainless Steel', 'Aluminum', 'Brass', 'Copper', 'Coated/Powder Coat', 'Anodized'],
  'Stone':   ['Slate', 'River Rock', 'Jade', 'Marble'],
  'Plastic': ['Cast Acrylic', 'Extruded Acrylic', 'Other Plastic'],
  'Fabric':  ['Cotton', 'Denim', 'Canvas', 'Leather', 'Silicone'],
  'Wood':    ['Hardwood', 'Softwood', 'Plywood', 'Bamboo', 'MDF'],
  'Paper':   ['Cardstock', 'Kraft', 'Laser Paper'],
  'PCB':     ['FR4 Isolation', 'FR4 Full Process'],
  'Other':   ['Custom']
};

const FILL_TYPES = ['Fill', 'Line', 'Grayscale', 'Offset Fill'];

function catClass(cat) {
  const m = { Glass:'glass', Metal:'metal', Stone:'stone', Wood:'wood', Fabric:'fabric',
               PCB:'pcb', Plastic:'plastic', Paper:'paper', Other:'other' };
  return `badge badge-${m[cat] || 'other'}`;
}

function fmt(val, unit = '') {
  if (val === null || val === undefined || val === '') return null;
  return `${val}${unit}`;
}

function emptyEntry() {
  return {
    name: '', category: 'Glass', subcategory: '', notes: '',
    lens_mm: 150, power_percent: '', speed_mms: '', frequency_khz: '',
    passes: 1, line_interval_mm: 0.08, overlap_mm: 0.03,
    wobble_enabled: false, wobble_amplitude_mm: '', wobble_frequency_hz: '',
    fill_type: 'Fill', rotary_enabled: false, rotary_type: 'Roller',
    result_rating: 0, result_notes: '', is_favorite: false
  };
}

function entryToForm(e) {
  return {
    name: e.name || '',
    category: e.category || 'Glass',
    subcategory: e.subcategory || '',
    notes: e.notes || '',
    lens_mm: e.lens_mm || 150,
    power_percent: e.power_percent ?? '',
    speed_mms: e.speed_mms ?? '',
    frequency_khz: e.frequency_khz ?? '',
    passes: e.passes ?? 1,
    line_interval_mm: e.line_interval_mm ?? 0.08,
    overlap_mm: e.overlap_mm ?? 0.03,
    wobble_enabled: !!e.wobble_enabled,
    wobble_amplitude_mm: e.wobble_amplitude_mm ?? '',
    wobble_frequency_hz: e.wobble_frequency_hz ?? '',
    fill_type: e.fill_type || 'Fill',
    rotary_enabled: !!e.rotary_enabled,
    rotary_type: e.rotary_type || 'Roller',
    result_rating: e.result_rating || 0,
    result_notes: e.result_notes || '',
    is_favorite: !!e.is_favorite
  };
}

function formToPayload(f) {
  const n = (v) => (v === '' || v === null || v === undefined) ? null : Number(v);
  return {
    name: f.name, category: f.category,
    subcategory: f.subcategory || null, notes: f.notes || null,
    lens_mm: f.lens_mm || 150,
    power_percent: n(f.power_percent), speed_mms: n(f.speed_mms),
    frequency_khz: n(f.frequency_khz), passes: n(f.passes) || 1,
    line_interval_mm: n(f.line_interval_mm) ?? 0.08,
    overlap_mm: n(f.overlap_mm) ?? 0.03,
    wobble_enabled: f.wobble_enabled ? 1 : 0,
    wobble_amplitude_mm: f.wobble_enabled ? n(f.wobble_amplitude_mm) : null,
    wobble_frequency_hz: f.wobble_enabled ? n(f.wobble_frequency_hz) : null,
    fill_type: f.fill_type || null,
    rotary_enabled: f.rotary_enabled ? 1 : 0,
    rotary_type: f.rotary_enabled ? f.rotary_type : null,
    result_rating: f.result_rating || null,
    result_notes: f.result_notes || null,
    is_favorite: f.is_favorite ? 1 : 0
  };
}

// ── StarRating Component ─────────────────────────────────────────────────────
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

// ── CategoryBadge ────────────────────────────────────────────────────────────
const CategoryBadge = {
  name: 'CategoryBadge',
  props: ['category', 'subcategory'],
  template: `<span :class="catClass(category)">{{ subcategory || category }}</span>`,
  methods: { catClass }
};

// ── MaterialCard ─────────────────────────────────────────────────────────────
const MaterialCard = {
  name: 'MaterialCard',
  components: { StarRating, CategoryBadge },
  props: ['entry'],
  emits: ['click', 'favorite'],
  methods: { fmt },
  template: `
    <div class="material-card" @click="$emit('click', entry)">
      <div class="card-thumb">
        <img v-if="entry.image_path" :src="entry.image_path" :alt="entry.name" loading="lazy">
        <i v-else class="bi bi-image"></i>
      </div>
      <div class="card-body">
        <div class="card-header-row">
          <category-badge :category="entry.category" :subcategory="entry.subcategory" />
          <button class="btn-icon" :class="{ active: entry.is_favorite }"
            @click.stop="$emit('favorite', entry)" title="Toggle favorite">
            <i :class="entry.is_favorite ? 'bi bi-star-fill' : 'bi bi-star'"></i>
          </button>
        </div>
        <div class="card-name">{{ entry.name }}</div>
        <div class="card-params">
          <span v-if="entry.power_percent != null" class="param-chip highlight">{{ entry.power_percent }}%</span>
          <span v-if="entry.speed_mms != null" class="param-chip">{{ entry.speed_mms }} mm/s</span>
          <span v-if="entry.frequency_khz != null" class="param-chip">{{ entry.frequency_khz }} kHz</span>
          <span v-if="entry.rotary_enabled" class="param-chip"><i class="bi bi-arrow-repeat"></i> Rotary</span>
          <span v-if="!entry.power_percent && !entry.speed_mms" class="param-chip" style="color:var(--warning)">Needs dialing</span>
        </div>
        <div class="card-footer-row">
          <star-rating :value="entry.result_rating || 0" :readonly="true" size="sm" />
          <span v-if="entry.passes > 1" style="font-size:11px;color:var(--text-secondary)">{{ entry.passes }}x passes</span>
        </div>
      </div>
    </div>
  `
};

// ── SettingsForm Component ───────────────────────────────────────────────────
const SettingsForm = {
  name: 'SettingsForm',
  components: { StarRating },
  props: { modelValue: Object, isEdit: { default: false }, entryId: { default: null } },
  emits: ['update:modelValue', 'submit', 'cancel'],
  data() {
    return { CATEGORIES, FILL_TYPES, uploadError: '', uploading: false };
  },
  computed: {
    form: {
      get() { return this.modelValue; },
      set(v) { this.$emit('update:modelValue', v); }
    },
    subcats() { return CATEGORIES[this.form.category] || []; }
  },
  methods: {
    update(field, value) {
      this.$emit('update:modelValue', { ...this.form, [field]: value });
    },
    onCategory(e) {
      const cat = e.target.value;
      const subs = CATEGORIES[cat] || [];
      this.$emit('update:modelValue', { ...this.form, category: cat, subcategory: subs[0] || '' });
    },
    async uploadPhoto(e) {
      const file = e.target.files[0];
      if (!file) return;
      this.uploading = true;
      this.uploadError = '';
      try {
        const fd = new FormData();
        fd.append('image', file);
        const res = await fetch(`/api/upload/${this.entryId}`, { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        this.update('image_path', data.image_path);
      } catch (err) {
        this.uploadError = err.message;
      } finally {
        this.uploading = false;
      }
    },
    async removePhoto() {
      try {
        await fetch(`/api/upload/${this.entryId}`, { method: 'DELETE' });
        this.update('image_path', null);
      } catch {}
    }
  },
  template: `
    <form @submit.prevent="$emit('submit')" autocomplete="off">
      <!-- Material -->
      <div class="form-section">
        <h3>Material</h3>
        <div class="form-grid">
          <div class="form-group form-full">
            <label>Material Name *</label>
            <input type="text" :value="form.name" @input="update('name', $event.target.value)"
              placeholder="e.g. Black cast acrylic" required>
          </div>
          <div class="form-group">
            <label>Category *</label>
            <select :value="form.category" @change="onCategory" required>
              <option v-for="cat in Object.keys(CATEGORIES)" :key="cat">{{ cat }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Subcategory</label>
            <select :value="form.subcategory" @change="update('subcategory', $event.target.value)">
              <option value="">— none —</option>
              <option v-for="s in subcats" :key="s">{{ s }}</option>
            </select>
          </div>
          <div class="form-group form-full">
            <label>Process Notes / Setup Tips</label>
            <textarea :value="form.notes" @input="update('notes', $event.target.value)"
              placeholder="Gotchas, workflow notes, warnings..."></textarea>
          </div>
        </div>
      </div>

      <!-- Laser Parameters -->
      <div class="form-section">
        <h3>Laser Parameters</h3>
        <div class="form-grid cols-3">
          <div class="form-group">
            <label>Lens (mm)</label>
            <select :value="form.lens_mm" @change="update('lens_mm', Number($event.target.value))">
              <option value="150">150mm</option>
              <option value="200">200mm</option>
              <option value="110">110mm</option>
            </select>
          </div>
          <div class="form-group">
            <label>Power (%)</label>
            <input type="number" :value="form.power_percent" @input="update('power_percent', $event.target.value)"
              min="0" max="100" step="0.5" placeholder="e.g. 80">
          </div>
          <div class="form-group">
            <label>Speed (mm/s)</label>
            <input type="number" :value="form.speed_mms" @input="update('speed_mms', $event.target.value)"
              min="0" step="5" placeholder="e.g. 200">
          </div>
          <div class="form-group">
            <label>Frequency (kHz)</label>
            <input type="number" :value="form.frequency_khz" @input="update('frequency_khz', $event.target.value)"
              min="0" step="5" placeholder="e.g. 80">
          </div>
          <div class="form-group">
            <label>Passes</label>
            <input type="number" :value="form.passes" @input="update('passes', $event.target.value)"
              min="1" step="1" placeholder="1">
          </div>
          <div class="form-group">
            <label>Line Interval (mm)</label>
            <input type="number" :value="form.line_interval_mm" @input="update('line_interval_mm', $event.target.value)"
              min="0" step="0.01" placeholder="0.08">
          </div>
          <div class="form-group">
            <label>Overlap (mm)</label>
            <input type="number" :value="form.overlap_mm" @input="update('overlap_mm', $event.target.value)"
              min="0" step="0.01" placeholder="0.03">
          </div>
          <div class="form-group">
            <label>Fill Type</label>
            <select :value="form.fill_type" @change="update('fill_type', $event.target.value)">
              <option value="">— none —</option>
              <option v-for="t in FILL_TYPES" :key="t">{{ t }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Wobble -->
      <div class="form-section">
        <h3>Wobble</h3>
        <div class="toggle-row">
          <label for="wobble-toggle">Wobble Enabled</label>
          <label class="toggle">
            <input id="wobble-toggle" type="checkbox" :checked="form.wobble_enabled"
              @change="update('wobble_enabled', $event.target.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div v-if="form.wobble_enabled" class="form-grid" style="margin-top:10px">
          <div class="form-group">
            <label>Wobble Amplitude (mm)</label>
            <input type="number" :value="form.wobble_amplitude_mm" @input="update('wobble_amplitude_mm', $event.target.value)"
              min="0" step="0.01" placeholder="e.g. 0.15">
          </div>
          <div class="form-group">
            <label>Wobble Frequency (Hz)</label>
            <input type="number" :value="form.wobble_frequency_hz" @input="update('wobble_frequency_hz', $event.target.value)"
              min="0" step="10" placeholder="e.g. 150">
          </div>
        </div>
      </div>

      <!-- Rotary -->
      <div class="form-section">
        <h3>Rotary</h3>
        <div class="toggle-row">
          <label for="rotary-toggle">Rotary Enabled</label>
          <label class="toggle">
            <input id="rotary-toggle" type="checkbox" :checked="form.rotary_enabled"
              @change="update('rotary_enabled', $event.target.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div v-if="form.rotary_enabled" class="form-group" style="margin-top:10px">
          <label>Rotary Type</label>
          <select :value="form.rotary_type" @change="update('rotary_type', $event.target.value)">
            <option value="Roller">Roller</option>
            <option value="Chuck">Chuck</option>
          </select>
          <span class="hint">See <router-link to="/rotary">Rotary Reference</router-link> for corrected speed settings</span>
        </div>
      </div>

      <!-- Results -->
      <div class="form-section">
        <h3>Results</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Result Rating</label>
            <star-rating :value="form.result_rating" @update:value="update('result_rating', $event)" />
          </div>
          <div class="form-group form-full">
            <label>Result Notes</label>
            <textarea :value="form.result_notes" @input="update('result_notes', $event.target.value)"
              placeholder="What happened? Quality? What to try next?"></textarea>
          </div>
        </div>

        <div v-if="isEdit && entryId" style="margin-top:14px">
          <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:8px">Result Photo</label>
          <div v-if="form.image_path" style="margin-bottom:8px">
            <img :src="form.image_path" style="max-width:200px;max-height:150px;border-radius:6px;object-fit:cover;border:1px solid var(--border)">
            <br><button type="button" class="btn btn-ghost btn-sm" style="margin-top:6px" @click="removePhoto">
              <i class="bi bi-trash"></i> Remove photo
            </button>
          </div>
          <div v-else class="photo-upload-area" @click="$refs.photoInput.click()">
            <input ref="photoInput" type="file" accept=".jpg,.jpeg,.png,.webp" @change="uploadPhoto">
            <i class="bi bi-camera" style="font-size:24px;color:var(--text-secondary)"></i>
            <p>{{ uploading ? 'Uploading...' : 'Tap to upload photo (JPG/PNG, max 5MB)' }}</p>
          </div>
          <div v-if="uploadError" class="alert alert-error" style="margin-top:8px">{{ uploadError }}</div>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-ghost" @click="$emit('cancel')">
          <i class="bi bi-x"></i> Cancel
        </button>
        <button type="submit" class="btn btn-primary">
          <i class="bi bi-check-lg"></i> {{ isEdit ? 'Save Changes' : 'Add Entry' }}
        </button>
      </div>
    </form>
  `
};

// ── DashboardView ─────────────────────────────────────────────────────────────
const DashboardView = {
  name: 'DashboardView',
  components: { StarRating, CategoryBadge },
  data() {
    return { stats: {}, recent: [], topRated: [], version: {}, updateStatus: null, checking: false, updating: false, updateLog: '' };
  },
  async mounted() {
    await this.load();
  },
  methods: {
    async load() {
      const [all, ver] = await Promise.all([
        api.get('/materials'),
        api.get('/version')
      ]);
      this.version = ver;
      const cats = new Set(all.map(e => e.category));
      this.stats = { total: all.length, categories: cats.size, favorites: all.filter(e => e.is_favorite).length };
      this.recent = [...all].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0,5);
      this.topRated = [...all].filter(e => e.result_rating).sort((a,b) => b.result_rating - a.result_rating).slice(0,5);
    },
    async checkUpdate() {
      this.checking = true;
      this.updateStatus = null;
      try {
        this.updateStatus = await api.get('/update/check');
      } catch (err) {
        this.updateStatus = { error: err.message };
      } finally {
        this.checking = false;
      }
    },
    async runUpdate() {
      if (!confirm('Run update now? The app will restart.')) return;
      this.updating = true;
      this.updateLog = 'Starting update...\n';
      try {
        const token = prompt('Enter update token:');
        if (!token) { this.updating = false; return; }
        const res = await fetch('/api/update/run', { method: 'POST', headers: { 'x-update-token': token } });
        const data = await res.json();
        this.updateLog = data.log || '';
      } catch (err) {
        this.updateLog = 'Error: ' + err.message;
      } finally {
        this.updating = false;
      }
    },
    go(entry) { this.$router.push(`/entry/${entry.id}`); },
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
          <div class="stat-label">Total Entries</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ stats.categories || 0 }}</div>
          <div class="stat-label">Categories</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ stats.favorites || 0 }}</div>
          <div class="stat-label">Favorites</div>
        </div>
        <div class="stat-card">
          <div class="stat-num" style="font-size:16px;padding-top:6px">150mm</div>
          <div class="stat-label">Primary Lens</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;flex-wrap:wrap">
        <div class="dashboard-section">
          <h3><i class="bi bi-clock-history"></i> Recently Added</h3>
          <div v-if="recent.length === 0" class="empty-state"><p>No entries yet</p></div>
          <div v-for="e in recent" :key="e.id" class="list-entry" @click="go(e)">
            <span :class="catClass(e.category)" style="flex-shrink:0">{{ e.category }}</span>
            <span class="entry-name">{{ e.name }}</span>
            <span class="entry-meta">★{{ e.result_rating || '—' }}</span>
          </div>
        </div>

        <div class="dashboard-section">
          <h3><i class="bi bi-trophy"></i> Highest Rated</h3>
          <div v-if="topRated.length === 0" class="empty-state"><p>No rated entries yet</p></div>
          <div v-for="e in topRated" :key="e.id" class="list-entry" @click="go(e)">
            <span :class="catClass(e.category)" style="flex-shrink:0">{{ e.category }}</span>
            <span class="entry-name">{{ e.name }}</span>
            <span class="entry-meta">★{{ e.result_rating }}</span>
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
          <span v-else style="color:var(--success)">
            <i class="bi bi-check-circle"></i> Up to date
          </span>
        </div>
        <div v-if="updateStatus && updateStatus.error" class="alert alert-error" style="margin-top:8px">{{ updateStatus.error }}</div>
        <div v-if="updateLog" class="log-output">{{ updateLog }}</div>
      </div>
    </div>
  `
};

// ── MaterialsView ─────────────────────────────────────────────────────────────
const MaterialsView = {
  name: 'MaterialsView',
  components: { MaterialCard, StarRating, CategoryBadge },
  data() {
    return {
      entries: [], loading: true,
      search: '', category: '', subcategory: '', rating: '', favorite: '', rotary: '', sort: 'date',
      viewMode: 'grid',
      CATEGORIES,
      mobileFiltersOpen: false
    };
  },
  async mounted() {
    const q = this.$route.query;
    if (q.category) this.category = q.category;
    await this.load();
  },
  computed: {
    subcats() { return this.category ? (CATEGORIES[this.category] || []) : []; },
    filtered() {
      let r = this.entries;
      if (this.sort === 'name') r = [...r].sort((a,b) => a.name.localeCompare(b.name));
      else if (this.sort === 'rating') r = [...r].sort((a,b) => (b.result_rating||0) - (a.result_rating||0));
      return r;
    },
    hasFilters() { return !!(this.search || this.category || this.subcategory || this.rating || this.favorite || this.rotary); }
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const p = new URLSearchParams();
        if (this.search) p.set('search', this.search);
        if (this.category) p.set('category', this.category);
        if (this.subcategory) p.set('subcategory', this.subcategory);
        if (this.rating) p.set('rating', this.rating);
        if (this.favorite) p.set('favorite', this.favorite);
        if (this.rotary) p.set('rotary', this.rotary);
        p.set('sort', this.sort);
        this.entries = await api.get('/materials?' + p.toString());
      } finally {
        this.loading = false;
      }
    },
    clearFilters() {
      this.search = ''; this.category = ''; this.subcategory = '';
      this.rating = ''; this.favorite = ''; this.rotary = '';
      this.load();
    },
    onCategoryChange() { this.subcategory = ''; this.load(); },
    go(entry) { this.$router.push(`/entry/${entry.id}`); },
    async toggleFav(entry) {
      await api.post(`/materials/${entry.id}/favorite`);
      await this.load();
    },
    exportCsv() {
      const p = new URLSearchParams();
      if (this.search) p.set('search', this.search);
      if (this.category) p.set('category', this.category);
      if (this.subcategory) p.set('subcategory', this.subcategory);
      if (this.rating) p.set('rating', this.rating);
      if (this.favorite) p.set('favorite', this.favorite);
      if (this.rotary) p.set('rotary', this.rotary);
      window.open('/api/export/csv?' + p.toString());
    },
    catClass
  },
  template: `
    <div class="page-content">
      <div class="page-header">
        <div><h2>Materials</h2><p>{{ filtered.length }} entries</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" @click="exportCsv"><i class="bi bi-download"></i> CSV</button>
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
            <select v-model="category" @change="onCategoryChange">
              <option value="">All Categories</option>
              <option v-for="cat in Object.keys(CATEGORIES)" :key="cat">{{ cat }}</option>
            </select>
          </div>

          <div v-if="subcats.length" class="filter-group">
            <label>Subcategory</label>
            <select v-model="subcategory" @change="load">
              <option value="">All</option>
              <option v-for="s in subcats" :key="s">{{ s }}</option>
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
              <button :class="['view-btn', { active: viewMode === 'grid' }]" @click="viewMode = 'grid'" title="Grid view">
                <i class="bi bi-grid-3x3-gap"></i>
              </button>
              <button :class="['view-btn', { active: viewMode === 'table' }]" @click="viewMode = 'table'" title="Table view">
                <i class="bi bi-table"></i>
              </button>
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
                  <th>Power</th>
                  <th>Speed</th>
                  <th>Freq</th>
                  <th>Passes</th>
                  <th>Rating</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in filtered" :key="e.id" @click="go(e)" style="cursor:pointer">
                  <td style="font-weight:500">{{ e.name }}</td>
                  <td><span :class="catClass(e.category)">{{ e.subcategory || e.category }}</span></td>
                  <td class="mono">{{ e.power_percent != null ? e.power_percent + '%' : '' }}<span v-if="e.power_percent == null" class="na">—</span></td>
                  <td class="mono">{{ e.speed_mms != null ? e.speed_mms + ' mm/s' : '' }}<span v-if="e.speed_mms == null" class="na">—</span></td>
                  <td class="mono">{{ e.frequency_khz != null ? e.frequency_khz + ' kHz' : '' }}<span v-if="e.frequency_khz == null" class="na">—</span></td>
                  <td class="mono">{{ e.passes || 1 }}</td>
                  <td>
                    <span v-if="e.result_rating" style="color:#f9a825">{{ '★'.repeat(e.result_rating) }}</span>
                    <span v-else class="na">—</span>
                  </td>
                  <td @click.stop>
                    <div class="table-actions">
                      <button class="btn-icon" :class="{ active: e.is_favorite }" @click.stop="toggleFav(e)" title="Favorite">
                        <i :class="e.is_favorite ? 'bi bi-star-fill' : 'bi bi-star'"></i>
                      </button>
                      <router-link :to="'/edit/' + e.id" class="btn-icon" title="Edit" @click.stop>
                        <i class="bi bi-pencil"></i>
                      </router-link>
                    </div>
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

// ── AddEntryView ──────────────────────────────────────────────────────────────
const AddEntryView = {
  name: 'AddEntryView',
  components: { SettingsForm },
  data() {
    return { form: emptyEntry(), saving: false, error: '' };
  },
  methods: {
    async submit() {
      if (!this.form.name || !this.form.category) {
        this.error = 'Name and category are required.';
        return;
      }
      this.saving = true;
      this.error = '';
      try {
        const entry = await api.post('/materials', formToPayload(this.form));
        this.$router.push(`/entry/${entry.id}`);
      } catch (err) {
        this.error = err.message;
      } finally {
        this.saving = false;
      }
    }
  },
  template: `
    <div class="page-content">
      <div class="page-header">
        <div>
          <h2>Add Entry</h2>
          <p>New material + laser settings</p>
        </div>
        <router-link to="/materials" class="btn btn-ghost"><i class="bi bi-arrow-left"></i> Back</router-link>
      </div>
      <div v-if="error" class="alert alert-error"><i class="bi bi-exclamation-circle"></i> {{ error }}</div>
      <settings-form v-model="form" @submit="submit" @cancel="$router.push('/materials')" />
    </div>
  `
};

// ── EditEntryView ─────────────────────────────────────────────────────────────
const EditEntryView = {
  name: 'EditEntryView',
  components: { SettingsForm },
  data() {
    return { form: null, entryId: null, saving: false, error: '' };
  },
  async mounted() {
    this.entryId = this.$route.params.id;
    try {
      const e = await api.get(`/materials/${this.entryId}`);
      this.form = entryToForm(e);
    } catch {
      this.$router.push('/materials');
    }
  },
  methods: {
    async submit() {
      this.saving = true;
      this.error = '';
      try {
        await api.put(`/materials/${this.entryId}`, formToPayload(this.form));
        this.$router.push(`/entry/${this.entryId}`);
      } catch (err) {
        this.error = err.message;
      } finally {
        this.saving = false;
      }
    }
  },
  template: `
    <div class="page-content">
      <div class="page-header">
        <div>
          <h2>Edit Entry</h2>
          <p v-if="form">{{ form.name }}</p>
        </div>
        <router-link :to="'/entry/' + entryId" class="btn btn-ghost"><i class="bi bi-arrow-left"></i> Back</router-link>
      </div>
      <div v-if="!form" class="empty-state"><i class="bi bi-hourglass-split"></i><p>Loading...</p></div>
      <div v-else>
        <div v-if="error" class="alert alert-error"><i class="bi bi-exclamation-circle"></i> {{ error }}</div>
        <settings-form v-model="form" :is-edit="true" :entry-id="entryId"
          @submit="submit" @cancel="$router.push('/entry/' + entryId)" />
      </div>
    </div>
  `
};

// ── EntryDetailView ───────────────────────────────────────────────────────────
const EntryDetailView = {
  name: 'EntryDetailView',
  components: { StarRating, CategoryBadge },
  data() {
    return { entry: null, showDeleteModal: false, deleting: false };
  },
  async mounted() {
    await this.load();
  },
  methods: {
    async load() {
      try {
        this.entry = await api.get(`/materials/${this.$route.params.id}`);
      } catch {
        this.$router.push('/materials');
      }
    },
    async toggleFav() {
      await api.post(`/materials/${this.entry.id}/favorite`);
      this.entry.is_favorite = this.entry.is_favorite ? 0 : 1;
    },
    async duplicate() {
      const res = await api.post(`/materials/${this.entry.id}/duplicate`);
      this.$router.push(`/edit/${res.id}`);
    },
    async confirmDelete() {
      this.deleting = true;
      try {
        await api.del(`/materials/${this.entry.id}`);
        this.$router.push('/materials');
      } finally {
        this.deleting = false;
        this.showDeleteModal = false;
      }
    },
    val(v, unit = '') {
      if (v === null || v === undefined || v === '') return null;
      return `${v}${unit}`;
    },
    catClass
  },
  template: `
    <div v-if="!entry" class="page-content"><div class="empty-state"><i class="bi bi-hourglass-split"></i><p>Loading...</p></div></div>
    <div v-else class="page-content">
      <div class="detail-header">
        <div class="detail-title">
          <span :class="catClass(entry.category)" style="margin-bottom:6px;display:inline-block">
            {{ entry.subcategory || entry.category }}
          </span>
          <h2>{{ entry.name }}</h2>
          <div class="subtitle">
            Added {{ new Date(entry.created_at).toLocaleDateString() }}
            &nbsp;·&nbsp; Lens: {{ entry.lens_mm }}mm
          </div>
        </div>
        <div class="detail-actions">
          <button class="btn btn-icon" :class="{ active: entry.is_favorite }" @click="toggleFav" title="Favorite">
            <i :class="entry.is_favorite ? 'bi bi-star-fill' : 'bi bi-star'"></i>
          </button>
          <button class="btn btn-secondary" @click="duplicate"><i class="bi bi-copy"></i> Duplicate</button>
          <router-link :to="'/edit/' + entry.id" class="btn btn-primary"><i class="bi bi-pencil"></i> Edit</router-link>
          <button class="btn btn-danger" @click="showDeleteModal = true"><i class="bi bi-trash"></i></button>
        </div>
      </div>

      <img v-if="entry.image_path" :src="entry.image_path" class="detail-photo" :alt="entry.name">

      <!-- Laser Parameters Grid -->
      <div class="params-grid">
        <div class="param-row">
          <div class="param-label">Power</div>
          <div class="param-value" v-if="val(entry.power_percent)">{{ entry.power_percent }}%</div>
          <div class="param-value na" v-else>— needs dialing</div>
        </div>
        <div class="param-row">
          <div class="param-label">Speed</div>
          <div class="param-value" v-if="val(entry.speed_mms)">{{ entry.speed_mms }} mm/s</div>
          <div class="param-value na" v-else>— needs dialing</div>
        </div>
        <div class="param-row">
          <div class="param-label">Frequency</div>
          <div class="param-value" v-if="val(entry.frequency_khz)">{{ entry.frequency_khz }} kHz</div>
          <div class="param-value na" v-else>—</div>
        </div>
        <div class="param-row">
          <div class="param-label">Passes</div>
          <div class="param-value">{{ entry.passes || 1 }}</div>
        </div>
        <div class="param-row">
          <div class="param-label">Line Interval</div>
          <div class="param-value">{{ entry.line_interval_mm }} mm</div>
        </div>
        <div class="param-row">
          <div class="param-label">Overlap</div>
          <div class="param-value">{{ entry.overlap_mm }} mm</div>
        </div>
        <div class="param-row">
          <div class="param-label">Fill Type</div>
          <div class="param-value" v-if="entry.fill_type">{{ entry.fill_type }}</div>
          <div class="param-value na" v-else>—</div>
        </div>
        <div class="param-row">
          <div class="param-label">Lens</div>
          <div class="param-value">{{ entry.lens_mm }} mm</div>
        </div>
        <div class="param-row">
          <div class="param-label">Wobble</div>
          <div class="param-value" v-if="entry.wobble_enabled">
            {{ entry.wobble_amplitude_mm }}mm @ {{ entry.wobble_frequency_hz }}Hz
          </div>
          <div class="param-value na" v-else>Disabled</div>
        </div>
        <div class="param-row">
          <div class="param-label">Rotary</div>
          <div class="param-value" v-if="entry.rotary_enabled">{{ entry.rotary_type }}</div>
          <div class="param-value na" v-else>Disabled</div>
        </div>
        <div class="param-row full">
          <div class="param-label">Result Rating</div>
          <star-rating :value="entry.result_rating || 0" :readonly="true" />
        </div>
      </div>

      <div v-if="entry.notes" class="notes-block">
        <strong style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary)">Process Notes</strong>
        <div style="margin-top:6px">{{ entry.notes }}</div>
      </div>

      <div v-if="entry.result_notes" class="notes-block" style="border-left-color:var(--success)">
        <strong style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary)">Result Notes</strong>
        <div style="margin-top:6px">{{ entry.result_notes }}</div>
      </div>

      <!-- Delete Modal -->
      <div v-if="showDeleteModal" class="modal-backdrop">
        <div class="modal">
          <h3>Delete Entry?</h3>
          <p>This will permanently delete <strong>{{ entry.name }}</strong> and its photo. This cannot be undone.</p>
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

// ── SettingsView ──────────────────────────────────────────────────────────────
const SettingsView = {
  name: 'SettingsView',
  data() {
    return {
      github_repo: '', saved: false, saving: false,
      importFile: null, importing: false, importResult: '',
      importError: ''
    };
  },
  async mounted() {
    try {
      const s = await api.get('/settings');
      this.github_repo = s.github_repo || '';
    } catch {}
  },
  methods: {
    async saveSettings() {
      this.saving = true;
      try {
        await api.put('/settings', { github_repo: this.github_repo });
        this.saved = true;
        setTimeout(() => this.saved = false, 2500);
      } finally {
        this.saving = false;
      }
    },
    exportJson() {
      window.open('/api/export');
    },
    onImportFile(e) {
      this.importFile = e.target.files[0];
    },
    async runImport() {
      if (!this.importFile) return;
      this.importing = true;
      this.importResult = '';
      this.importError = '';
      try {
        const text = await this.importFile.text();
        const data = JSON.parse(text);
        const result = await api.post('/import', data);
        this.importResult = `Imported ${result.imported} entries.`;
      } catch (err) {
        this.importError = err.message;
      } finally {
        this.importing = false;
      }
    }
  },
  template: `
    <div class="page-content">
      <div class="page-header">
        <div><h2>Settings</h2><p>App configuration and backup</p></div>
      </div>

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
        <h3>Backup &amp; Restore</h3>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">Export all entries as a JSON backup file.</p>
            <button class="btn btn-secondary" @click="exportJson">
              <i class="bi bi-download"></i> Export JSON Backup
            </button>
          </div>
          <hr style="border-color:var(--border)">
          <div>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">Import entries from a JSON backup. Entries are added without removing existing data.</p>
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
          <tr><td>Primary lens</td><td>150mm</td></tr>
          <tr><td>Software</td><td>LightBurn + ComMarker Studio</td></tr>
          <tr><td>Repository</td><td><a :href="'https://github.com/' + (github_repo || 'MakaiView/LaserSettingsManager')" target="_blank">{{ github_repo || 'MakaiView/LaserSettingsManager' }}</a></td></tr>
        </table>
      </div>
    </div>
  `
};

// ── RotaryReferenceView ───────────────────────────────────────────────────────
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
          <tr><td>Min speed</td><td>125 pulses/sec <span style="color:var(--text-secondary);font-family:inherit;font-size:11px">(manual says 500 — 4× too fast)</span></td></tr>
          <tr><td>Max speed</td><td>750 pulses/sec <span style="color:var(--text-secondary);font-family:inherit;font-size:11px">(manual says 3000 — 4× too fast)</span></td></tr>
          <tr><td>Acceleration</td><td>300–500 ms <span style="color:var(--text-secondary);font-family:inherit;font-size:11px">(manual says 100ms — too aggressive)</span></td></tr>
          <tr><td>Return speed</td><td>750 pulses/sec <span style="color:var(--text-secondary);font-family:inherit;font-size:11px">(manual says 3000 — 4× too fast)</span></td></tr>
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
          <p>Within 1mm accuracy is sufficient for most work.</p>
        </div>
      </div>

      <div class="rotary-card">
        <h3><i class="bi bi-grid-1x2"></i> Split / Overlap for Glass</h3>
        <table class="rotary-table">
          <tr><td>Split (line interval)</td><td>0.08 mm</td></tr>
          <tr><td>Overlap</td><td>0.02–0.04 mm</td></tr>
          <tr><td colspan="2" style="font-size:11px;color:var(--text-secondary);padding-top:6px">Default 0.1/0 is conservative — fine for testing. Tighter settings = smoother fills.</td></tr>
        </table>
      </div>
    </div>
  `
};

// ── App Layout ────────────────────────────────────────────────────────────────
const AppLayout = {
  name: 'AppLayout',
  data() { return { sidebarOpen: false }; },
  methods: {
    closeNav() { this.sidebarOpen = false; }
  },
  template: `
    <div class="app-layout">
      <div :class="['sidebar-overlay', { open: sidebarOpen }]" @click="sidebarOpen = false"></div>

      <nav :class="['sidebar', { open: sidebarOpen }]">
        <div class="sidebar-brand">
          <h1>&#9632; Laser Tracker</h1>
          <p>ComMarker Omni XE 6W</p>
        </div>
        <div class="sidebar-nav">
          <router-link to="/" class="nav-item" @click="closeNav">
            <i class="bi bi-house-door"></i> Dashboard
          </router-link>
          <router-link to="/materials" class="nav-item" @click="closeNav">
            <i class="bi bi-collection"></i> Materials
          </router-link>
          <router-link to="/add" class="nav-item" @click="closeNav">
            <i class="bi bi-plus-circle"></i> Add Entry
          </router-link>
          <router-link to="/rotary" class="nav-item" @click="closeNav">
            <i class="bi bi-arrow-repeat"></i> Rotary Reference
          </router-link>
          <router-link to="/settings" class="nav-item" @click="closeNav">
            <i class="bi bi-gear"></i> Settings
          </router-link>
        </div>
        <div class="sidebar-footer">MakaiView &mdash; UV Galvo 355nm</div>
      </nav>

      <main class="main-content">
        <div class="mobile-header">
          <button class="hamburger" @click="sidebarOpen = !sidebarOpen">
            <i class="bi bi-list"></i>
          </button>
          <h1>Laser Tracker</h1>
        </div>
        <router-view />
      </main>
    </div>
  `
};

// ── Router ────────────────────────────────────────────────────────────────────
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

// ── Mount ─────────────────────────────────────────────────────────────────────
const app = Vue.createApp(AppLayout);
app.component('StarRating', StarRating);
app.component('CategoryBadge', CategoryBadge);
app.component('MaterialCard', MaterialCard);
app.use(router);
app.mount('#app');
