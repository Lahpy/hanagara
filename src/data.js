// ─── CONSTANTS ────────────────────────────────────────────
const XP_PER_LVL = 300;
const STORAGE_KEY = 'hanagara-v1';

const TABS = ['home', 'hobbies', 'goals', 'todos', 'companion', 'settings'];

const THEMES = [
  { id: 'default', label: 'garden', bg: ['#faf7f1', '#f3ede2', '#c8d9c1', '#8fa887'] },
  { id: 'dusk',    label: 'dusk',   bg: ['#1a1620', '#2a2535', '#6b5fa0', '#9b8fc4'] },
  { id: 'ember',   label: 'ember',  bg: ['#1c1410', '#2e2016', '#9a5820', '#c4783a'] },
  { id: 'bloom',   label: 'bloom',  bg: ['#fff8fc', '#fceef5', '#e0a0b8', '#c46888'] },
  { id: 'slate',   label: 'slate',  bg: ['#0d1117', '#161b22', '#1f6feb', '#388bfd'] },
];

const HOBBY_COLORS = {
  sage:   { bg: '#eaf2e6', border: '#c8d9c1', text: '#3d5a37', fill: '#8fa887' },
  amber:  { bg: '#f5e8d4', border: '#e8c990', text: '#7a4e18', fill: '#c47e3a' },
  blush:  { bg: '#f5e0e0', border: '#e8b8b8', text: '#7a3030', fill: '#c47a7a' },
  sky:    { bg: '#ddeef7', border: '#aacfe8', text: '#1e4d6b', fill: '#6a9ab8' },
  violet: { bg: '#eae6f5', border: '#c8bfe8', text: '#3d2e6b', fill: '#8a7ab8' },
};

const STAT_META = {
  consistency: { bar: '#8fa887', label: 'consistency', tip: 'daily streaks' },
  creativity:  { bar: '#9b8fc4', label: 'creativity',  tip: 'drawing · photo' },
  discipline:  { bar: '#c4783a', label: 'discipline',  tip: 'gym · aim' },
  energy:      { bar: '#c47a7a', label: 'energy',      tip: 'competitive' },
};

// ─── DEFAULT STATE ────────────────────────────────────────
const DEFAULT_STATE = {
  xp: 0,
  streak: 0,
  lastLogin: null,
  theme: 'default',
  hobbies: [
    { id: 'aim',   name: 'aim training',  icon: 'ti-crosshair', color: 'blush',  xpPerSession: 80,  lvl: 1, progress: 0, sessions: 0, streak: 0 },
    { id: 'rank',  name: 'ranking up',    icon: 'ti-trophy',    color: 'amber',  xpPerSession: 100, lvl: 1, progress: 0, sessions: 0, streak: 0 },
    { id: 'draw',  name: 'drawing',       icon: 'ti-brush',     color: 'violet', xpPerSession: 70,  lvl: 1, progress: 0, sessions: 0, streak: 0 },
    { id: 'gym',   name: 'working out',   icon: 'ti-barbell',   color: 'sage',   xpPerSession: 90,  lvl: 1, progress: 0, sessions: 0, streak: 0 },
    { id: 'photo', name: 'photography',   icon: 'ti-camera',    color: 'sky',    xpPerSession: 75,  lvl: 1, progress: 0, sessions: 0, streak: 0 },
  ],
  goals: [
    { id: 'g1', name: 'hit platinum',           desc: 'rank up in competitive',             icon: 'ti-medal',    color: 'amber',  cur: 0, max: 100 },
    { id: 'g2', name: 'fill a sketchbook',       desc: 'complete 48 pages of drawings',      icon: 'ti-notebook', color: 'violet', cur: 0, max: 48  },
    { id: 'g3', name: '180 gym days',            desc: 'get consistent workouts this year',  icon: 'ti-flame',    color: 'sage',   cur: 0, max: 180 },
    { id: 'g4', name: 'build a photo portfolio', desc: 'shoot 30 portfolio-worthy shots',    icon: 'ti-camera',   color: 'sky',    cur: 0, max: 30  },
  ],
  todos: [
    { id: 't1', label: 'aim training session', done: false, xp: 80 },
    { id: 't2', label: 'draw for 30 mins',     done: false, xp: 70 },
    { id: 't3', label: 'gym session',          done: false, xp: 90 },
  ],
  stats: { consistency: 0, creativity: 0, discipline: 0, energy: 0 },
};
