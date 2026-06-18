// ─── CONSTANTS ────────────────────────────────────────────
const STORAGE_KEY = 'hanagara-v1';

const TABS = ['world', 'hobbies', 'goals', 'todos', 'music', 'journal', 'notes', 'history', 'settings'];

const THEMES = [
  { id: 'default',   label: 'paper',      bg: ['#fefefe',  '#f7f6f4', '#a8a498', '#18170f'] },
  { id: 'cream',     label: 'cream',      bg: ['#fffcf5',  '#f8f3e8', '#8c8070', '#0e0c06'] },
  { id: 'warm',      label: 'parchment',  bg: ['#faf4e8',  '#f3ead8', '#b8a888', '#1e1a0e'] },
  { id: 'blossom',   label: 'blossom',    bg: ['#fdf0f2',  '#f5e4e8', '#c098a8', '#1e0c10'] },
  { id: 'ember',     label: 'ember',      bg: ['#f7ece6',  '#f0e0d8', '#c8a898', '#1e1208'] },
  { id: 'rose',      label: 'rose',       bg: ['#faf0f0',  '#f2e6e6', '#c8a0a0', '#1e1010'] },
  { id: 'sage',      label: 'sage',       bg: ['#f2f8f0',  '#e6f2e2', '#88a880', '#0c180a'] },
  { id: 'stone',     label: 'stone',      bg: ['#f0f0ef',  '#e6e6e4', '#a0a0a0', '#141414'] },
  { id: 'slate',     label: 'slate',      bg: ['#f0f3f8',  '#e4eaf2', '#8898b0', '#0e1420'] },
  { id: 'lavender',  label: 'lavender',   bg: ['#f4f0f8',  '#ebe4f4', '#a890c8', '#140c20'] },
  { id: 'cobalt',    label: 'cobalt',     bg: ['#e8f0fc',  '#d4e4f8', '#4870b0', '#040d24'] },
  { id: 'denim',     label: 'denim',      bg: ['#2c3a4e',  '#364656', '#507090', '#d8e8f8'] },
  { id: 'dark',      label: 'charcoal',   bg: ['#111110',  '#1a1a19', '#606058', '#f2f0ec'] },
  { id: 'oled',      label: 'oled',       bg: ['#000000',  '#0a0a0a', '#666666', '#ffffff'] },
  { id: 'ink',       label: 'ink',        bg: ['#090910',  '#0e0e18', '#404060', '#e0e0f0'] },
  { id: 'dusk',      label: 'midnight',   bg: ['#080c14',  '#0e1420', '#3a4e6a', '#d8e4f8'] },
  { id: 'copper',    label: 'copper',     bg: ['#1e1408',  '#281c0e', '#785838', '#f8e8d0'] },
  { id: 'grape',     label: 'grape',      bg: ['#1e1828',  '#261e32', '#584870', '#e8e0f8'] },
  { id: 'plum',      label: 'plum',       bg: ['#120e18',  '#1a1422', '#483860', '#f0e8f8'] },
  { id: 'teal',      label: 'matcha',     bg: ['#2a3228',  '#323c30', '#607858', '#e8f0e0'] },
  { id: 'forest',    label: 'forest',     bg: ['#0a1a0e',  '#102018', '#386848', '#d0f0d8'] },
];

const HOBBY_COLORS = {
  sage:   { bg: 'rgba(94,150,100,.12)',  border: 'rgba(94,150,100,.25)',  text: 'var(--sage)',   fill: 'var(--sage)'   },
  amber:  { bg: 'rgba(184,112, 48,.10)', border: 'rgba(184,112, 48,.22)', text: 'var(--amber)',  fill: 'var(--amber)'  },
  blush:  { bg: 'rgba(200, 92,106,.10)', border: 'rgba(200, 92,106,.22)', text: 'var(--rose)',   fill: 'var(--rose)'   },
  sky:    { bg: 'rgba( 78,136,180,.10)', border: 'rgba( 78,136,180,.22)', text: 'var(--sky-c)',  fill: 'var(--sky-c)'  },
  violet: { bg: 'rgba(128,112,176,.10)', border: 'rgba(128,112,176,.22)', text: 'var(--violet)', fill: 'var(--violet)' },
};

const STAT_META = {
  consistency: { bar: 'var(--sage)',   label: 'consistency', tip: 'daily streaks'     },
  creativity:  { bar: 'var(--violet)', label: 'creativity',  tip: 'creative sessions' },
  discipline:  { bar: 'var(--amber)',  label: 'discipline',  tip: 'physical sessions' },
  energy:      { bar: 'var(--rose)',   label: 'energy',      tip: 'competitive'       },
};

// ─── INTEREST TYPES ───────────────────────────────────────
const INTEREST_TYPES = [
  { id: 'generic', label: 'general',  icon: 'ti-sparkles',             mode: 'specific'   },
  { id: 'alcohol', label: 'alcohol',  icon: 'ti-glass-cocktail',       mode: 'categorical' },
  { id: 'anime',   label: 'anime',    icon: 'ti-movie',                mode: 'specific'   },
  { id: 'games',   label: 'games',    icon: 'ti-device-gamepad-2',     mode: 'specific'   },
  { id: 'book',    label: 'books',    icon: 'ti-book',                 mode: 'specific'   },
  { id: 'fitness', label: 'fitness',  icon: 'ti-run',                  mode: 'specific'   },
];

const ANIME_STATUSES   = ['watching', 'completed', 'planned', 'dropped'];
const BOOK_STATUSES    = ['reading', 'completed', 'want to read', 'dropped'];
const FITNESS_TYPES    = ['run', 'lift', 'cycle', 'swim', 'walk', 'yoga', 'sport', 'other'];
const GAME_SUBTYPES    = ['gacha', 'rpg', 'fps', 'moba', 'strategy', 'puzzle', 'platformer', 'fighting', 'sandbox', 'other'];
const ANIME_TIERS = ['S', 'A', 'B', 'C', 'D'];
const TIER_COLORS = { S: 'var(--rose)', A: 'var(--amber)', B: 'var(--sage)', C: 'var(--sky-c)', D: 'var(--ink3)' };
const BOOK_STATUS_COLORS = { 'reading': 'var(--amber)', 'completed': 'var(--sage)', 'want to read': 'var(--sky-c)', 'dropped': 'var(--ink3)' };

const REMINDER_RECURRENCE = ['daily', 'weekly', 'once'];

// ─── DEFAULT STATE ────────────────────────────────────────
const DEFAULT_STATE = {
  lastLogin:         null,
  theme:             'default',
  activityLog:       [],
  musicLog:          [],
  spiritMemory:      [],
  spiritLastWhisper: 0,
  spiritMood:        'neutral',
  lastRecap:         0,
  hobbies:           [],
  goals:             [],
  todos:             [],
  journal:           {}, // { 'YYYY-MM-DD': { text, ts, mood } }
  notes:             [], // { id, text, pinned, color, createdAt, updatedAt }
  savedLocation:     null, // { lat, lon, label } — set in settings to skip the GPS prompt
};
