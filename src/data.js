// ─── CONSTANTS ────────────────────────────────────────────
const STORAGE_KEY = 'hanagara-v1';

const TABS = ['world', 'hobbies', 'goals', 'todos', 'music', 'journal', 'notes', 'history', 'settings'];

const THEMES = [
  { id: 'default', label: 'white',  bg: ['#fdfcfa', '#f5f2ed', '#c8c4be', '#1c1a16'] },
  { id: 'warm',    label: 'warm',   bg: ['#faf7f3', '#f2eeea', '#c8c0b4', '#1c1a14'] },
  { id: 'dark',    label: 'dark',   bg: ['#0e0d0b', '#171613', '#444440', '#f0ece4'] },
  { id: 'dusk',    label: 'dusk',   bg: ['#111018', '#191822', '#5a5278', '#e8e4f6'] },
  { id: 'teal',    label: 'teal',   bg: ['#0c181c', '#121e22', '#406460', '#d8eee8'] },
  { id: 'stone',   label: 'stone',  bg: ['#f0eee9', '#e8e5de', '#aaa89e', '#1c1a16'] },
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
];

const ANIME_STATUSES = ['watching', 'completed', 'planned', 'dropped'];
const ANIME_TIERS = ['S', 'A', 'B', 'C', 'D'];
const TIER_COLORS = { S: 'var(--rose)', A: 'var(--amber)', B: 'var(--sage)', C: 'var(--sky-c)', D: 'var(--ink3)' };

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
