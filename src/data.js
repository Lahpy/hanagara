// ─── CONSTANTS ────────────────────────────────────────────
const XP_PER_LVL = 300;
const STORAGE_KEY = 'hanagara-v1';

const TABS = ['world', 'hobbies', 'goals', 'todos', 'history', 'settings'];

const THEMES = [
  { id: 'default', label: 'white',  bg: ['#ffffff', '#f8f8f8', '#cccccc', '#111111'] },
  { id: 'warm',    label: 'warm',   bg: ['#faf8f5', '#f3f0eb', '#c8c0b4', '#1a1714'] },
  { id: 'dark',    label: 'dark',   bg: ['#0f0f0f', '#181818', '#444444', '#f0f0f0'] },
  { id: 'dusk',    label: 'dusk',   bg: ['#13111a', '#1b1924', '#5a5478', '#e8e4f4'] },
  { id: 'teal',    label: 'teal',   bg: ['#0e1a1c', '#142022', '#446860', '#d8eeea'] },
  { id: 'stone',   label: 'stone',  bg: ['#f2f0ee', '#eae8e4', '#aaa8a4', '#1c1a18'] },
];

const HOBBY_COLORS = {
  sage:   { bg: '#edf2ea', border: '#ccdec6', text: '#3a5838', fill: '#7daa78' },
  amber:  { bg: '#f4ece0', border: '#e2c898', text: '#6e4818', fill: '#bc7a38' },
  blush:  { bg: '#f5e8ec', border: '#e4bcc8', text: '#6e3048', fill: '#c47888' },
  sky:    { bg: '#e4eef6', border: '#a8cce0', text: '#1e4868', fill: '#6098b8' },
  violet: { bg: '#ece8f4', border: '#c8bce6', text: '#3c2e68', fill: '#8878b8' },
};

const STAT_META = {
  consistency: { bar: 'var(--ink2)', label: 'consistency', tip: 'daily streaks' },
  creativity:  { bar: 'var(--ink2)', label: 'creativity',  tip: 'creative sessions' },
  discipline:  { bar: 'var(--ink2)', label: 'discipline',  tip: 'physical sessions' },
  energy:      { bar: 'var(--ink2)', label: 'energy',      tip: 'competitive play' },
};

// ─── DEFAULT STATE ────────────────────────────────────────
const DEFAULT_STATE = {
  xp: 0,
  streak: 0,
  streakDate: null,
  lastLogin: null,
  theme: 'default',
  xpLog: [],
  statOffsets: { consistency: 0, creativity: 0, discipline: 0, energy: 0 },
  spiritMemory: [],       // key things the spirit remembers across sessions
  spiritLastWhisper: 0,   // timestamp of last unprompted whisper
  spiritMood: 'neutral',  // warm | quiet | searching | neutral
  hobbies: [],
  goals: [],
  todos: [],
  stats: { consistency: 0, creativity: 0, discipline: 0, energy: 0 },
};
