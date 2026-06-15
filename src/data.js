// ─── CONSTANTS ────────────────────────────────────────────
const STORAGE_KEY = 'hanagara-v1';

const TABS = ['world', 'hobbies', 'goals', 'todos', 'music', 'history', 'settings'];

const THEMES = [
  { id: 'default', label: 'white',  bg: ['#ffffff', '#f8f8f8', '#cccccc', '#111111'] },
  { id: 'warm',    label: 'warm',   bg: ['#faf8f5', '#f3f0eb', '#c8c0b4', '#1a1714'] },
  { id: 'dark',    label: 'dark',   bg: ['#0f0f0f', '#181818', '#444444', '#f0f0f0'] },
  { id: 'dusk',    label: 'dusk',   bg: ['#13111a', '#1b1924', '#5a5478', '#e8e4f4'] },
  { id: 'teal',    label: 'teal',   bg: ['#0e1a1c', '#142022', '#446860', '#d8eeea'] },
  { id: 'stone',   label: 'stone',  bg: ['#f2f0ee', '#eae8e4', '#aaa8a4', '#1c1a18'] },
];

const HOBBY_COLORS = {
  sage:   { bg: 'rgba(106,154,112,.12)', border: 'rgba(106,154,112,.25)', text: 'var(--sage)',   fill: 'var(--sage)'   },
  amber:  { bg: 'rgba(188,122, 56,.10)', border: 'rgba(188,122, 56,.22)', text: 'var(--amber)',  fill: 'var(--amber)'  },
  blush:  { bg: 'rgba(200, 96,106,.10)', border: 'rgba(200, 96,106,.22)', text: 'var(--rose)',   fill: 'var(--rose)'   },
  sky:    { bg: 'rgba( 88,144,184,.10)', border: 'rgba( 88,144,184,.22)', text: 'var(--sky-c)',  fill: 'var(--sky-c)'  },
  violet: { bg: 'rgba(136,120,184,.10)', border: 'rgba(136,120,184,.22)', text: 'var(--violet)', fill: 'var(--violet)' },
};

// ─── DEFAULT STATE ────────────────────────────────────────
const DEFAULT_STATE = {
  lastLogin:     null,
  theme:         'default',
  activityLog:   [],          // { id, source, ts, note }
  spiritMemory:  [],
  spiritLastWhisper: 0,
  spiritMood:    'neutral',
  hobbies: [],
  goals:   [],
  todos:   [],
  musicLog: [], // { id, raw, title, artist, album, genre, subgenre, mood, ts }
};
