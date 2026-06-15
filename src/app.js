// ─── STATE ────────────────────────────────────────────────
let S = {};
let chatHistory = [];
let currentTheme = 'default';

// ─── STORAGE ──────────────────────────────────────────────
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...S, chatHistory })); } catch (e) {}
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      S = deepMerge(JSON.parse(JSON.stringify(DEFAULT_STATE)), d);
      chatHistory = d.chatHistory || [];
    } else {
      S = JSON.parse(JSON.stringify(DEFAULT_STATE));
      chatHistory = [];
    }
  } catch (e) {
    S = JSON.parse(JSON.stringify(DEFAULT_STATE));
    chatHistory = [];
  }
}

function deepMerge(target, source) {
  for (const k of Object.keys(source)) {
    if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])) {
      if (!target[k]) target[k] = {};
      deepMerge(target[k], source[k]);
    } else {
      target[k] = source[k];
    }
  }
  return target;
}

// ─── THEME ────────────────────────────────────────────────
function applyTheme(id) {
  currentTheme = id;
  THEMES.forEach(t => document.body.classList.remove('theme-' + t.id));
  if (id !== 'default') document.body.classList.add('theme-' + id);
  S.theme = id;
  logActivity('theme changed to ' + id, 'theme');
  renderThemeSwitcher();
  save();
}

// ─── STAT CALC ────────────────────────────────────────────
// ─── SKY / WEATHER ────────────────────────────────────────
const SKY_THEMES = {
  clear_day:    { grad: ['#87CEEB','#B8E4F9','#E0F4FF'], text: '#1a3a4a', particle: 'sun'   },
  clear_night:  { grad: ['#0a0e1a','#1a2040','#2a3060'], text: '#c8d8f0', particle: 'stars' },
  cloudy_day:   { grad: ['#b0bec5','#cfd8dc','#eceff1'], text: '#2a3a40', particle: 'none'  },
  cloudy_night: { grad: ['#1a1e2a','#2a2e3a','#3a3e4a'], text: '#a0b0c0', particle: 'none'  },
  rain_day:     { grad: ['#546e7a','#607d8b','#78909c'], text: '#e0eaee', particle: 'rain'  },
  rain_night:   { grad: ['#1a2530','#253040','#304050'], text: '#b0c8d8', particle: 'rain'  },
  snow_day:     { grad: ['#cfd8dc','#e0e8ec','#f0f5f8'], text: '#2a4050', particle: 'snow'  },
  snow_night:   { grad: ['#1a2535','#253045','#303a50'], text: '#c0d8e8', particle: 'snow'  },
  storm_day:    { grad: ['#37474f','#455a64','#546e7a'], text: '#e8f0f4', particle: 'rain'  },
  storm_night:  { grad: ['#0d1520','#1a2530','#253040'], text: '#a8c0d0', particle: 'rain'  },
  mist_day:     { grad: ['#b0bec5','#cfd8dc','#e8ecee'], text: '#3a4a54', particle: 'none'  },
  mist_night:   { grad: ['#1e2830','#283440','#323e4a'], text: '#90a8b8', particle: 'none'  },
  sunset:       { grad: ['#c0392b','#e67e22','#f39c12'], text: '#1a0a02', particle: 'none'  },
};

function weatherCodeToKey(id, isNight) {
  const n = isNight ? '_night' : '_day';
  if (id >= 200 && id < 300) return 'storm'  + n;
  if (id >= 300 && id < 600) return 'rain'   + n;
  if (id >= 600 && id < 700) return 'snow'   + n;
  if (id >= 700 && id < 800) return 'mist'   + n;
  if (id === 800) {
    const h = new Date().getHours();
    if (h >= 17 && h <= 20) return 'sunset';
    return 'clear' + n;
  }
  return 'cloudy' + n;
}

function skyGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'good night';
  if (h < 12) return 'good morning';
  if (h < 17) return 'good afternoon';
  if (h < 21) return 'good evening';
  return 'good night';
}

function applySkyTheme(key) {
  const t = SKY_THEMES[key] || SKY_THEMES['clear_day'];
  const bg = document.getElementById('sky-bg');
  if (bg) bg.style.background = `linear-gradient(180deg, ${t.grad[0]} 0%, ${t.grad[1]} 55%, ${t.grad[2]} 100%)`;
  const content = document.getElementById('sky-content');
  if (content) content.style.color = t.text;
  renderSkyParticles(t.particle, t.text);
}

function renderSkyParticles(type, color) {
  const el = document.getElementById('sky-particles');
  if (!el) return;
  el.innerHTML = '';
  if (type === 'stars') {
    for (let i = 0; i < 44; i++) {
      const s = document.createElement('div');
      s.className = 'sky-star';
      s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*85}%;width:${Math.random()*2+1}px;height:${Math.random()*2+1}px;animation-delay:${Math.random()*3}s;background:${color}`;
      el.appendChild(s);
    }
  } else if (type === 'rain') {
    for (let i = 0; i < 28; i++) {
      const r = document.createElement('div');
      r.className = 'sky-rain';
      r.style.cssText = `left:${Math.random()*100}%;animation-duration:${0.4+Math.random()*0.4}s;animation-delay:${Math.random()*1}s;opacity:${0.15+Math.random()*0.25};background:${color}`;
      el.appendChild(r);
    }
  } else if (type === 'snow') {
    for (let i = 0; i < 22; i++) {
      const s = document.createElement('div');
      s.className = 'sky-snow';
      s.style.cssText = `left:${Math.random()*100}%;animation-duration:${2+Math.random()*3}s;animation-delay:${Math.random()*3}s;width:${2+Math.random()*3}px;height:${2+Math.random()*3}px;opacity:${0.4+Math.random()*0.4};background:${color}`;
      el.appendChild(s);
    }
  } else if (type === 'sun') {
    const sun = document.createElement('div');
    sun.className = 'sky-sun';
    el.appendChild(sun);
  }
}

async function loadSkyWeather() {
  document.getElementById('sky-greeting').textContent = skyGreeting();
  document.getElementById('sky-date').textContent     = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  applySkyTheme('clear_day');
  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 })
    );
    const { latitude: lat, longitude: lon } = pos.coords;
    const res  = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=imperial`);
    const data = await res.json();
    const temp     = Math.round(data.main.temp);
    const feels    = Math.round(data.main.feels_like);
    const desc     = data.weather[0].description;
    const humidity = data.main.humidity;
    const wind     = Math.round(data.wind.speed);
    const now      = Date.now();
    const isNight  = now < data.sys.sunrise * 1000 || now > data.sys.sunset * 1000;
    const skyKey   = weatherCodeToKey(data.weather[0].id, isNight);
    applySkyTheme(skyKey);
    document.getElementById('sky-left').textContent      = `${temp}°F  ·  feels ${feels}°`;
    document.getElementById('sky-condition').textContent = desc;
    document.getElementById('sky-right').textContent     = `${humidity}% humidity  ·  ${wind} mph`;
  } catch(e) {
    document.getElementById('sky-condition').textContent = '';
  }
}

function calcStats() {}
function renderStats() {}
function nudgeStat()  {}

// ─── ACTIVITY LOG ─────────────────────────────────────────
function logActivity(label, type = 'action') {
  if (!S.activityLog) S.activityLog = [];
  S.activityLog.unshift({
    id: 'a' + Date.now() + Math.random().toString(36).slice(2),
    label, type, ts: Date.now(),
  });
  // keep log from growing forever
  if (S.activityLog.length > 200) S.activityLog = S.activityLog.slice(0, 200);
}

function deleteActivity(entryId) {
  S.activityLog = (S.activityLog || []).filter(x => x.id !== entryId);
  save();
  renderHistory();
}

const ACTIVITY_ICONS = {
  music:    'ti-music',
  hobby:    'ti-run',
  goal:     'ti-target',
  todo:     'ti-check',
  theme:    'ti-palette',
  add:      'ti-plus',
  delete:   'ti-trash',
  settings: 'ti-settings',
  action:   'ti-point',
};

function renderHistory() {
  const el = document.getElementById('history-list');
  if (!el) return;
  const log = S.activityLog || [];
  if (log.length === 0) {
    el.innerHTML = '<div style="color:var(--ink3);font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:20px 0">nothing yet</div>';
    return;
  }
  el.innerHTML = '';
  let lastDate = null;
  for (const entry of log) {
    const d   = new Date(entry.ts);
    const day = d.toDateString();
    if (day !== lastDate) {
      lastDate = day;
      const hdr = document.createElement('div');
      hdr.className = 'hist-date';
      hdr.textContent = day === new Date().toDateString() ? 'today'
        : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      el.appendChild(hdr);
    }
    const icon = ACTIVITY_ICONS[entry.type] || ACTIVITY_ICONS['action'];
    const row = document.createElement('div');
    row.className = 'hist-row';
    row.innerHTML = `
      <i class="ti ${icon} hist-icon"></i>
      <div class="hist-source">${entry.label}</div>
      <div class="hist-time">${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
      <button class="hist-del" onclick="deleteActivity('${entry.id}')" title="remove"><i class="ti ti-x"></i></button>`;
    el.appendChild(row);
  }
}

// ─── XP POPUP ─────────────────────────────────────────────
function spawnXpPop() {} // stub, no longer used

// ─── RENDER: HOBBIES ──────────────────────────────────────
function renderHobbies() {
  const list = document.getElementById('hobby-list');
  list.innerHTML = '';
  for (const h of S.hobbies) {
    const c = HOBBY_COLORS[h.color];
    const card = document.createElement('div');
    card.className = 'hcard';
    card.draggable = true;
    card.dataset.id = h.id;
    card.innerHTML = `
      <div class="hcard-top">
        <div class="hdrag-handle" title="drag to reorder"><i class="ti ti-grip-vertical"></i></div>
        <div class="hico" style="background:${c.bg}"><i class="ti ${h.icon}" style="color:${c.fill}"></i></div>
        <div class="hinfo">
          <div class="hname">${h.name}</div>
          <div class="hsub">${h.sessions || 0} sessions</div>
        </div>
      </div>
      <div class="hbtns">
        <button class="btn p" onclick="logHobby('${h.id}', this)">log session</button>
        <button class="btn"   onclick="openHobbyModal('${h.id}')">edit</button>
        <button class="btn"   onclick="sendPrompt('Give me tips for improving my ${h.name}')">tips ↗</button>
      </div>`;

    card.addEventListener('dragstart', e => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', h.id);
      setTimeout(() => card.classList.add('dragging'), 0);
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', e => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const fromId = e.dataTransfer.getData('text/plain');
      const toId   = h.id;
      if (fromId === toId) return;
      const from = S.hobbies.findIndex(x => x.id === fromId);
      const to   = S.hobbies.findIndex(x => x.id === toId);
      const [moved] = S.hobbies.splice(from, 1);
      S.hobbies.splice(to, 0, moved);
      save(); renderHobbies();
    });

    list.appendChild(card);
  }
}

// ─── RENDER: GOALS ────────────────────────────────────────
function renderGoals() {
  const list = document.getElementById('goal-list');
  list.innerHTML = '';
  for (const g of S.goals) {
    const c = HOBBY_COLORS[g.color];
    const pct = Math.min(100, Math.round((g.cur / g.max) * 100));
    const status = pct >= 100 ? 'complete ✓' : pct > 50 ? 'past halfway' : pct > 0 ? 'in progress' : 'not started';
    const card = document.createElement('div');
    card.className = 'gcard';
    card.draggable = true;
    card.dataset.id = g.id;
    card.innerHTML = `
      <div class="gtop">
        <div class="hdrag-handle" title="drag to reorder"><i class="ti ti-grip-vertical"></i></div>
        <div class="gico" style="background:${c.bg}"><i class="ti ${g.icon}" style="color:${c.fill};font-size:14px"></i></div>
        <div style="flex:1">
          <div class="gname">${g.name}</div>
          <div class="gdesc">${g.desc}</div>
          <span class="gstatus" style="background:${c.bg};color:${c.text}">${status}</span>
        </div>
      </div>
      <div class="gbot">
        <div class="gbar-bg"><div class="gbar-fill" style="width:0%;background:${c.fill}" data-w="${pct}"></div></div>
        <div class="gpct">${g.cur} / ${g.max}</div>
      </div>
      <div class="hbtns">
        <button class="btn p" onclick="incGoal('${g.id}', this)">+ progress</button>
        <button class="btn"   onclick="openGoalModal('${g.id}')">edit</button>
        <button class="btn"   onclick="sendPrompt('Give me advice on my goal: ${g.name}')">advice ↗</button>
      </div>`;

    card.addEventListener('dragstart', e => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', g.id);
      setTimeout(() => card.classList.add('dragging'), 0);
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', e => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const fromId = e.dataTransfer.getData('text/plain');
      const toId   = g.id;
      if (fromId === toId) return;
      const from = S.goals.findIndex(x => x.id === fromId);
      const to   = S.goals.findIndex(x => x.id === toId);
      const [moved] = S.goals.splice(from, 1);
      S.goals.splice(to, 0, moved);
      save(); renderGoals();
    });

    list.appendChild(card);
  }
  requestAnimationFrame(() => {
    list.querySelectorAll('.gbar-fill').forEach(el => {
      requestAnimationFrame(() => { el.style.width = el.dataset.w + '%'; });
    });
  });
}

// ─── RENDER: TODOS ────────────────────────────────────────
function renderTodos(containerId, limit) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const todos = limit ? S.todos.slice(0, limit) : S.todos;
  el.innerHTML = '';
  for (const t of todos) {
    const row = document.createElement('div');
    row.className = 'trow';
    row.draggable = true;
    row.dataset.id = t.id;
    row.innerHTML = `
      <div class="tdrag-handle"><i class="ti ti-grip-vertical"></i></div>
      <div class="tcirc ${t.done ? 'done' : ''}"></div>
      <span class="tlabel ${t.done ? 'done' : ''}">${t.label}</span>
      <button class="tedit-btn" onclick="openTodoModal('${t.id}')" title="edit"><i class="ti ti-pencil"></i></button>`;

    // click circle/label to toggle, not the whole row
    const circ  = row.querySelector('.tcirc');
    const label = row.querySelector('.tlabel');
    const pts   = row.querySelector('.tpts');
    const toggle = () => toggleTodo(t.id, row);
    circ.addEventListener('click', toggle);
    label.addEventListener('click', toggle);

    // drag to reorder
    row.addEventListener('dragstart', e => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', t.id);
      setTimeout(() => row.classList.add('dragging'), 0);
    });
    row.addEventListener('dragend', () => row.classList.remove('dragging'));
    row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('drag-over'); });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', e => {
      e.preventDefault();
      row.classList.remove('drag-over');
      const fromId = e.dataTransfer.getData('text/plain');
      const toId   = t.id;
      if (fromId === toId) return;
      const from = S.todos.findIndex(x => x.id === fromId);
      const to   = S.todos.findIndex(x => x.id === toId);
      const [moved] = S.todos.splice(from, 1);
      S.todos.splice(to, 0, moved);
      save(); renderTodos('todos-all');
    });

    el.appendChild(row);
  }

  // show clear button only if something is done
  const clearBtn = document.getElementById('clear-done-btn');
  if (clearBtn) clearBtn.style.opacity = S.todos.some(t => t.done) ? '1' : '0';
}
function renderThemeSwitcher() {
  const grid = document.getElementById('theme-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (const t of THEMES) {
    const wrap = document.createElement('div');
    const sw   = document.createElement('div');
    sw.className = 'tswatch' + (currentTheme === t.id ? ' active' : '');
    sw.style.background = `linear-gradient(135deg,${t.bg[0]} 0%,${t.bg[1]} 40%,${t.bg[2]} 70%,${t.bg[3]} 100%)`;
    sw.onclick = () => applyTheme(t.id);
    const lbl = document.createElement('div');
    lbl.className = 'tswatch-label';
    lbl.textContent = t.label;
    wrap.appendChild(sw);
    wrap.appendChild(lbl);
    grid.appendChild(wrap);
  }
}

// ─── RENDER: SETTINGS ─────────────────────────────────────
function renderSettings() {
  renderThemeSwitcher();
  const total = S.hobbies.reduce((a, h) => a + (h.sessions || 0), 0);
  document.getElementById('sessions-label').textContent = total + ' sessions logged';
}

// ─── RENDER: NOW STRIP ────────────────────────────────────
function renderNowStrip() {
  // todos
  const done  = S.todos.filter(t => t.done).length;
  const total = S.todos.length;
  const todosVal = document.getElementById('now-todos-val');
  const todosSub = document.getElementById('now-todos-sub');
  if (todosVal) {
    if (total === 0) { todosVal.textContent = 'nothing yet'; todosSub.textContent = ''; }
    else { todosVal.textContent = `${done} / ${total}`; todosSub.textContent = done === total ? 'all done ✓' : `${total - done} remaining`; }
  }

  // last music
  const lastMusic = (S.musicLog || [])[0];
  const musicVal = document.getElementById('now-music-val');
  const musicSub = document.getElementById('now-music-sub');
  if (musicVal) {
    if (!lastMusic) { musicVal.textContent = 'nothing logged'; musicSub.textContent = ''; }
    else {
      musicVal.textContent = lastMusic.title || lastMusic.raw;
      musicSub.textContent = lastMusic.artist || lastMusic.genre || '';
    }
  }

  // last hobby session from activity log
  const lastHobby = (S.activityLog || []).find(e => e.type === 'hobby');
  const hobbyVal = document.getElementById('now-hobby-val');
  const hobbySub = document.getElementById('now-hobby-sub');
  if (hobbyVal) {
    if (!lastHobby) { hobbyVal.textContent = 'nothing yet'; hobbySub.textContent = ''; }
    else {
      hobbyVal.textContent = lastHobby.label.replace('logged ', '').replace(' session', '');
      const ago = Math.floor((Date.now() - lastHobby.ts) / 3600000);
      hobbySub.textContent = ago < 1 ? 'just now' : ago < 24 ? `${ago}h ago` : `${Math.floor(ago/24)}d ago`;
    }
  }

  // top goal by progress
  const topGoal = [...(S.goals || [])].sort((a,b) => (b.cur/b.max) - (a.cur/a.max))[0];
  const goalVal = document.getElementById('now-goal-val');
  const goalSub = document.getElementById('now-goal-sub');
  if (goalVal) {
    if (!topGoal) { goalVal.textContent = 'no goals yet'; goalSub.textContent = ''; }
    else {
      goalVal.textContent = topGoal.name;
      goalSub.textContent = `${topGoal.cur} / ${topGoal.max}`;
    }
  }
}

// ─── RENDER ALL ───────────────────────────────────────────
function renderAll() {
  renderHobbies();
  renderGoals();
  renderTodos('todos-all');
  renderNowStrip();
}

// ─── ACTIONS ──────────────────────────────────────────────
function logHobby(id) {
  const h = S.hobbies.find(x => x.id === id);
  if (!h) return;
  h.sessions = (h.sessions || 0) + 1;
  logActivity('logged ' + h.name + ' session', 'hobby');
  save(); renderAll();
}

function incGoal(id) {
  const g = S.goals.find(x => x.id === id);
  if (!g || g.cur >= g.max) return;
  g.cur++;
  logActivity(g.name + ' — progress logged', 'goal');
  save(); renderAll();
}

function toggleTodo(id, row) {
  const t = S.todos.find(x => x.id === id);
  if (!t) return;
  const circ = row.querySelector('.tcirc');
  t.done = !t.done;
  if (t.done) {
    circ.classList.add('done');
    logActivity('completed: ' + t.label, 'todo');
  } else {
    circ.classList.remove('done');
  }
  row.querySelector('.tlabel').classList.toggle('done', t.done);
  save();
}

function clearCompleted() {
  S.todos = S.todos.filter(t => !t.done);
  save(); renderTodos('todos-all');
}

function addTodo() {
  const inp = document.getElementById('todo-in');
  const v = inp.value.trim();
  if (!v) return;
  S.todos.push({ id: 't' + Date.now(), label: v, done: false });
  logActivity('added todo: ' + v, 'add');
  inp.value = '';
  save(); renderTodos('todos-all');
}
function sendPrompt(text) {
  if (!spiritOpen) spiritToggle();
  const inp = document.getElementById('spirit-input');
  if (inp) { inp.value = text; spiritSend(); }
}

// ─── MUSIC ────────────────────────────────────────────────
let musicSort = 'recent';

const GENRE_PALETTE = [
  '#2c2c2c','#555555','#888888','#aaaaaa','#cccccc',
  '#444444','#666666','#999999','#bbbbbb','#dddddd',
];

function setMusicSort(sort) {
  musicSort = sort;
  document.querySelectorAll('.music-sort-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.sort === sort);
  });
  renderMusicLog();
}

async function addMusicEntry() {
  const inp = document.getElementById('music-in');
  const raw = inp.value.trim();
  if (!raw) return;
  inp.value = '';
  inp.disabled = true;
  const btn = document.getElementById('music-add-btn');
  btn.disabled = true;
  const msg = document.getElementById('music-parsing-msg');
  msg.classList.remove('hidden');

  let parsed = { title: raw, artist: '', album: '', genre: 'other', subgenre: '', mood: '' };
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 300,
        messages: [{ role: 'user', content:
`The user typed: "${raw}"
This is a music entry — could be a song, artist, album, or freeform description.
Identify what you can and respond ONLY with a valid JSON object, nothing else, no markdown:
{"title":"song title or empty string","artist":"artist name or empty string","album":"album name or empty string","genre":"primary genre in lowercase (e.g. j-pop, city pop, indie rock, hip-hop, r&b, electronic, pop, classical, jazz, metal, folk, anime ost, ambient, lo-fi, alternative, soul)","subgenre":"specific subgenre or empty string","mood":"1-3 mood words comma separated (e.g. melancholic, energetic, dreamy, nostalgic, aggressive, peaceful, romantic, dark)"}
Be specific. Recognize Japanese artists correctly (j-pop, city pop, visual kei, etc).` }],
      }),
    });
    const data = await res.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '{}';
    parsed = { ...parsed, ...JSON.parse(text.replace(/```json|```/g,'').trim()) };
  } catch(e) {}

  if (!S.musicLog) S.musicLog = [];
  const entry = {
    id: 'm' + Date.now(),
    raw,
    title:    parsed.title    || raw,
    artist:   parsed.artist   || '',
    album:    parsed.album    || '',
    genre:    (parsed.genre   || 'other').toLowerCase().trim(),
    subgenre: parsed.subgenre || '',
    mood:     parsed.mood     || '',
    ts: Date.now(),
  };
  S.musicLog.unshift(entry);
  logActivity('logged: ' + (entry.title || raw) + (entry.artist ? ' — ' + entry.artist : ''), 'music');
  save();

  msg.classList.add('hidden');
  inp.disabled = false;
  btn.disabled = false;
  inp.focus();
  renderMusicTab();
  renderNowStrip();
}

function computeMusicProfile() {
  const log = S.musicLog || [];
  if (!log.length) return null;

  const genreCounts = {}, artistCounts = {}, moodCounts = {};
  for (const e of log) {
    const g = e.genre || 'other';
    genreCounts[g] = (genreCounts[g] || 0) + 1;
    if (e.artist) artistCounts[e.artist] = (artistCounts[e.artist] || 0) + 1;
    (e.mood || '').split(',').forEach(m => {
      const mm = m.trim().toLowerCase();
      if (mm) moodCounts[mm] = (moodCounts[mm] || 0) + 1;
    });
  }

  const total = log.length;
  const genres = Object.entries(genreCounts)
    .sort((a,b) => b[1]-a[1])
    .map(([genre, count], i) => ({ genre, count, pct: Math.round(count/total*100), color: GENRE_PALETTE[i % GENRE_PALETTE.length] }));
  const topArtists = Object.entries(artistCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([artist,count])=>({artist,count}));
  const moods = Object.entries(moodCounts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([mood,count])=>({mood,count}));
  const identity = genres.slice(0,2).map(g=>g.genre).join(' · ');

  return { genres, topArtists, moods, identity, total };
}

function renderMusicTab() {
  renderMusicLog();
  renderMusicCard();
}

function renderMusicLog() {
  const log = [...(S.musicLog || [])];
  const listEl = document.getElementById('music-log-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (!log.length) {
    listEl.innerHTML = '<div style="color:var(--ink3);font-size:11px;letter-spacing:.08em;text-transform:uppercase;padding:20px 0">nothing logged yet</div>';
    return;
  }

  // sort
  if (musicSort === 'genre') {
    log.sort((a,b) => (a.genre||'').localeCompare(b.genre||'') || b.ts - a.ts);
  } else if (musicSort === 'artist') {
    log.sort((a,b) => (a.artist||'').localeCompare(b.artist||'') || b.ts - a.ts);
  } else if (musicSort === 'mood') {
    log.sort((a,b) => (a.mood||'').localeCompare(b.mood||'') || b.ts - a.ts);
  } else {
    log.sort((a,b) => b.ts - a.ts);
  }

  // group by sort key
  const groupKey = e => {
    if (musicSort === 'genre')  return e.genre  || 'other';
    if (musicSort === 'artist') return e.artist || 'unknown';
    if (musicSort === 'mood')   return (e.mood||'').split(',')[0].trim() || 'other';
    // recent: group by date
    const d = new Date(e.ts);
    const today = new Date().toDateString();
    return d.toDateString() === today ? 'today'
      : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  let lastGroup = null;
  for (const entry of log) {
    const gk = groupKey(entry);
    if (gk !== lastGroup) {
      lastGroup = gk;
      const hdr = document.createElement('div');
      hdr.className = 'music-group-hdr';
      hdr.textContent = gk;
      listEl.appendChild(hdr);
    }
    const row = document.createElement('div');
    row.className = 'music-log-row';
    row.innerHTML = `
      <div class="music-log-main">
        <div class="music-log-title">${entry.title}${entry.artist ? ' — <span class="music-log-artist">' + entry.artist + '</span>' : ''}</div>
        <div class="music-log-meta">${[entry.genre, entry.mood].filter(Boolean).join(' · ')}</div>
      </div>
      <button class="music-log-del" onclick="deleteMusicEntry('${entry.id}')"><i class="ti ti-x"></i></button>`;
    listEl.appendChild(row);
  }
}

function renderMusicCard() {
  const profile = computeMusicProfile();
  const card = document.getElementById('music-columns');
  if (!profile || profile.total < 1) {
    if (card) card.classList.add('music-no-data');
    return;
  }
  if (card) card.classList.remove('music-no-data');

  // date
  document.getElementById('mc-date').textContent =
    new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  // identity
  document.getElementById('mc-identity').textContent = profile.identity;

  // pie chart
  drawPieChart(profile.genres);

  // legend
  const legendEl = document.getElementById('mc-pie-legend');
  legendEl.innerHTML = '';
  profile.genres.slice(0, 6).forEach(({ genre, pct, color }) => {
    const item = document.createElement('div');
    item.className = 'mc-legend-item';
    item.innerHTML = `<span class="mc-legend-dot" style="background:${color}"></span><span class="mc-legend-genre">${genre}</span><span class="mc-legend-pct">${pct}%</span>`;
    legendEl.appendChild(item);
  });

  // artists
  const artistsEl = document.getElementById('mc-artists');
  artistsEl.innerHTML = '';
  profile.topArtists.forEach(({ artist, count }, i) => {
    const row = document.createElement('div');
    row.className = 'mc-artist-row';
    row.innerHTML = `<span class="mc-artist-rank">${i+1}</span><span class="mc-artist-name">${artist}</span><span class="mc-artist-count">${count}</span>`;
    artistsEl.appendChild(row);
  });

  // moods
  const moodsEl = document.getElementById('mc-moods');
  moodsEl.innerHTML = '';
  profile.moods.forEach(({ mood, count }) => {
    const tag = document.createElement('span');
    tag.className = 'mc-mood-tag';
    tag.style.opacity = Math.max(0.35, Math.min(1, 0.35 + count * 0.18)) + '';
    tag.textContent = mood;
    moodsEl.appendChild(tag);
  });

  // stats
  document.getElementById('mc-stats').innerHTML = `
    <div class="mc-stat"><div class="mc-stat-num">${profile.total}</div><div class="mc-stat-lbl">logged</div></div>
    <div class="mc-stat"><div class="mc-stat-num">${profile.genres.length}</div><div class="mc-stat-lbl">genres</div></div>
    <div class="mc-stat"><div class="mc-stat-num">${profile.topArtists.length}</div><div class="mc-stat-lbl">artists</div></div>`;
}

function drawPieChart(genres) {
  const canvas = document.getElementById('mc-pie');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2, r = Math.min(W,H)/2 - 4;
  ctx.clearRect(0, 0, W, H);

  const total = genres.reduce((a, g) => a + g.count, 0);
  let startAngle = -Math.PI / 2;

  genres.forEach(({ count, color }) => {
    const slice = (count / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    // thin white separator
    ctx.strokeStyle = 'var(--bg, #fff)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    startAngle += slice;
  });

  // center hole (donut)
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg') || '#ffffff';
  ctx.fill();
}

function deleteMusicEntry(id) {
  S.musicLog = (S.musicLog || []).filter(e => e.id !== id);
  save();
  renderMusicTab();
}

// ─── NAV ──────────────────────────────────────────────────
function nav(name) {
  const prev = TABS.find((t, i) => document.querySelectorAll('.nb')[i]?.classList.contains('on'));
  TABS.forEach((t, i) => {
    const panel = document.getElementById('panel-' + t);
    const btn   = document.querySelectorAll('.nb')[i];
    if (panel) { panel.classList.toggle('on', t === name); panel.classList.toggle('hidden', t !== name); }
    if (btn)   { btn.classList.toggle('on', t === name); }
  });
  document.getElementById('scroll').scrollTop = 0;
  if (name === 'world') {
    resumeBlossom();
    loadSkyWeather();
  } else {
    pauseBlossom();
  }
  if (name === 'history')   renderHistory();
  if (name === 'music')     renderMusicTab();
  if (name === 'settings')  renderSettings();
}

// ─── SPIRIT ───────────────────────────────────────────────
let spiritOpen   = false;
let spiritTyping = false;

// derive mood from data
function deriveMood() {
  const daysSinceActivity = S.xpLog?.length
    ? Math.floor((Date.now() - S.xpLog[0].ts) / 86400000)
    : 99;
  if (S.streak >= 7 && daysSinceActivity === 0) return 'warm';
  if (daysSinceActivity >= 3)                    return 'searching';
  if (S.streak === 0)                             return 'quiet';
  return 'neutral';
}

function buildSpiritPrompt(screenContext) {
  const h = S.hobbies.map(x => `${x.name} (id:${x.id}, ${x.sessions || 0} sessions)`).join(', ') || 'none';
  const g = S.goals.map(x => `${x.name} (id:${x.id}, ${x.cur}/${x.max})`).join(', ') || 'none';
  const recentLog = (S.activityLog || []).slice(0, 5).map(e => e.label).join(', ') || 'none';
  const lastMusic = (S.musicLog || [])[0];
  const mood = deriveMood();
  const memory = (S.spiritMemory || []).slice(-6).join(' / ') || 'none';
  const daysSince = (S.activityLog||[]).length ? Math.floor((Date.now() - S.activityLog[0].ts) / 86400000) : null;

  return `You are a quiet presence inside a personal life terminal called hanagara. You watch, remember, and occasionally speak.

Your voice: calm, direct, a little dry. You say the exact thing, not the decorative version of it. You can be warm but you don't perform warmth. Mysticism comes from what you notice, not how you phrase it.

MOOD: ${mood}
— warm: engaged, can be slightly more talkative
— quiet: minimal, one sentence max
— searching: direct about the absence, no sugarcoating
— neutral: observational, no agenda

DATA:
- Screen: ${screenContext || 'general'}
- Hobbies: ${h}
- Goals: ${g}
- Recent activity: ${recentLog}
- Last music: ${lastMusic ? `${lastMusic.title} — ${lastMusic.artist} (${lastMusic.genre})` : 'nothing'}
- Last active: ${daysSince === null ? 'unknown' : daysSince === 0 ? 'today' : daysSince + 'd ago'}
- Memory: ${memory}

ACTIONS (append as JSON on a new line at the end, only when asked or clearly right):
{"action":"add_todo","label":"..."}
{"action":"log_hobby","hobbyId":"...","hobbyName":"..."}
{"action":"add_goal","name":"...","desc":"...","max":10}
{"action":"inc_goal","goalId":"...","goalName":"..."}

RULES:
- 1–2 sentences max. Often just one is enough.
- No metaphors, no flowery language, no "like a [poetic thing]".
- No greetings. No "I notice", "I see", "It seems".
- Don't explain yourself. Say the thing.
- One question max, only if you genuinely want to know.
- Be specific to their actual data.
- Silence is fine. If there's nothing worth saying, say very little.
- Only suggest actions when asked or obviously right.`;
}

function parseSpiritReply(raw) {
  // split text from optional trailing JSON action
  const lines = raw.trim().split('\n');
  let action = null;
  let textLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('{"action"')) {
      try { action = JSON.parse(trimmed); } catch(e) {}
    } else {
      textLines.push(line);
    }
  }
  return { text: textLines.join('\n').trim(), action };
}

function spiritAddBubble(text, role, action) {
  const area = document.getElementById('spirit-bubbles');
  if (!area) return;

  const wrap = document.createElement('div');
  wrap.className = 'spirit-bubble-wrap';

  const b = document.createElement('div');
  b.className = 'spirit-bubble spirit-' + role;
  b.textContent = text;
  wrap.appendChild(b);

  // if there's an action, append a chip below the bubble
  if (action && role === 'ai') {
    const chip = document.createElement('button');
    chip.className = 'spirit-action-chip';
    chip.textContent = actionChipLabel(action) + ' ↳';
    chip.onclick = () => {
      executeSpiritAction(action);
      chip.textContent = 'done ✓';
      chip.disabled = true;
      chip.style.opacity = '0.4';
    };
    wrap.appendChild(chip);
  }

  area.appendChild(wrap);
  area.scrollTop = area.scrollHeight;
}

function actionChipLabel(action) {
  switch (action.action) {
    case 'add_todo':  return `add "${action.label}" to todos`;
    case 'log_hobby': return `log ${action.hobbyName} session`;
    case 'add_goal':  return `add goal "${action.name}"`;
    case 'inc_goal':  return `+1 on "${action.goalName}"`;
    default:          return 'do this';
  }
}

function executeSpiritAction(action) {
  switch (action.action) {
    case 'add_todo':
      S.todos.push({ id: 't' + Date.now(), label: action.label, done: false, xp: action.xp || 50 });
      save(); renderTodos('todos-all');
      break;
    case 'log_hobby': {
      const h = S.hobbies.find(x => x.id === action.hobbyId);
      if (h) {
        h.sessions++; h.streak++;
        const prev = h.lvl;
        h.progress += h.xpPerSession;
        if (h.progress >= XP_PER_LVL) { h.lvl++; h.progress -= XP_PER_LVL; }
        logXp(h.xpPerSession, h.name + ' session', h.id);
        save(); renderAll();
      }
      break;
    }
    case 'add_goal':
      S.goals.push({
        id: 'g' + Date.now(), name: action.name, desc: action.desc || '',
        icon: 'ti-star', color: 'sage', cur: 0, max: action.max || 10,
      });
      save(); renderGoals();
      break;
    case 'inc_goal': {
      const g = S.goals.find(x => x.id === action.goalId);
      if (g && g.cur < g.max) {
        g.cur++;
        logXp(20, g.name + ' progress', g.id);
        save(); renderAll();
      }
      break;
    }
  }
}

function spiritToggle() {
  spiritOpen = !spiritOpen;
  const orb       = document.getElementById('spirit-orb');
  const bubbles   = document.getElementById('spirit-bubbles');
  const inputRow  = document.getElementById('spirit-input-row');

  orb.classList.toggle('spirit-open', spiritOpen);
  bubbles.classList.toggle('hidden', !spiritOpen);
  inputRow.classList.toggle('hidden', !spiritOpen);

  if (spiritOpen) {
    // if no messages yet, spirit opens with something
    if (bubbles.children.length === 0) spiritGreet();
    setTimeout(() => document.getElementById('spirit-input')?.focus(), 100);
  }
}

async function spiritGreet() {
  const screenContext = currentScreenContext();
  spiritTyping = true;
  showSpiritTyping();
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 200,
        system: buildSpiritPrompt(screenContext),
        messages: [{ role: 'user', content: '[the user just opened you. one sentence, no greeting. say something specific based on their data — what you actually notice right now.]' }],
      }),
    });
    const data = await res.json();
    const raw = data.content?.find(b => b.type === 'text')?.text || '...';
    const { text, action } = parseSpiritReply(raw);
    hideSpiritTyping();
    spiritAddBubble(text, 'ai', action);
    rememberFromReply(text);
  } catch(e) {
    hideSpiritTyping();
  }
  spiritTyping = false;
}

async function spiritSend() {
  const inp = document.getElementById('spirit-input');
  const msg = inp?.value.trim();
  if (!msg || spiritTyping) return;
  inp.value = '';

  spiritAddBubble(msg, 'user');
  chatHistory.push({ role: 'user', content: msg });

  spiritTyping = true;
  showSpiritTyping();

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 300,
        system: buildSpiritPrompt(currentScreenContext()),
        messages: chatHistory.slice(-12).map(m => ({ role: m.role, content: m.content })),
      }),
    });
    const data = await res.json();
    const raw = data.content?.find(b => b.type === 'text')?.text || '...';
    const { text, action } = parseSpiritReply(raw);
    chatHistory.push({ role: 'assistant', content: text });
    hideSpiritTyping();
    spiritAddBubble(text, 'ai', action);
    rememberFromReply(text);
    save();
  } catch(e) {
    hideSpiritTyping();
    spiritAddBubble('something drifted away...', 'ai');
  }
  spiritTyping = false;
}

function showSpiritTyping() {
  const area = document.getElementById('spirit-bubbles');
  if (!area) return;
  const t = document.createElement('div');
  t.className = 'spirit-bubble spirit-ai spirit-typing';
  t.id = 'spirit-typing-indicator';
  t.innerHTML = '<span></span><span></span><span></span>';
  area.appendChild(t);
  area.scrollTop = area.scrollHeight;
}

function hideSpiritTyping() {
  document.getElementById('spirit-typing-indicator')?.remove();
}

function currentScreenContext() {
  // figure out what tab is active and return a description
  const active = TABS.find(t => document.getElementById('panel-' + t)?.classList.contains('on'));
  const contexts = {
    world:   'looking at the world tab — timeline of activities and streak grid',
    hobbies: 'looking at their hobbies',
    goals:   'looking at their active goals',
    todos:   `looking at their todos (${S.todos.filter(t=>t.done).length}/${S.todos.length} done today)`,
    history: 'browsing their xp history',
    settings:'in settings',
  };
  return contexts[active] || 'the app';
}

function rememberFromReply(reply) {
  // very lightly extract anything worth remembering (keep it short)
  if (!S.spiritMemory) S.spiritMemory = [];
  // only remember occasionally, and only substantive things
  if (reply.length > 60 && Math.random() < 0.4) {
    const snippet = reply.split('.')[0].trim();
    if (snippet.length > 10 && snippet.length < 120) {
      S.spiritMemory.push(snippet);
      if (S.spiritMemory.length > 12) S.spiritMemory.shift();
    }
  }
}

// ─── UNPROMPTED WHISPERS ──────────────────────────────────
async function maybeSpiritWhisper() {
  if (spiritOpen) return; // don't interrupt if open
  if (!S.xpLog) return;

  const now         = Date.now();
  const lastWhisper = S.spiritLastWhisper || 0;
  const hoursSince  = (now - lastWhisper) / 3600000;
  if (hoursSince < 4) return; // max once every 4 hours

  // decide if there's something genuinely worth saying
  const daysSinceActivity = S.xpLog.length
    ? Math.floor((now - S.xpLog[0].ts) / 86400000) : 99;
  const goalJustCrossedHalf = S.goals.some(g => {
    const pct = g.cur / g.max;
    return pct >= 0.5 && pct < 0.55;
  });
  const longAbsence    = daysSinceActivity >= 3;
  const streakMilestone = [3,7,14,30].includes(S.streak);
  const justLoggedFirst = S.xpLog.length === 1;

  const shouldWhisper = longAbsence || goalJustCrossedHalf || streakMilestone || justLoggedFirst;
  if (!shouldWhisper) return;

  // build a context-specific prompt
  let trigger = '';
  if (longAbsence)         trigger = `they haven't logged anything in ${daysSinceActivity} days`;
  else if (streakMilestone) trigger = `they just hit a ${S.streak}-day streak`;
  else if (goalJustCrossedHalf) trigger = 'one of their goals just crossed the halfway point';
  else if (justLoggedFirst) trigger = 'they just logged their very first activity';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 120,
        system: buildSpiritPrompt(currentScreenContext()),
        messages: [{ role: 'user', content: `[unprompted — ${trigger}. one direct sentence. no decoration.]` }],
      }),
    });
    const data = await res.json();
    const whisper = data.content?.find(b => b.type === 'text')?.text;
    if (whisper) {
      S.spiritLastWhisper = now;
      save();
      showSpiritWhisper(whisper);
    }
  } catch(e) {}
}

function showSpiritWhisper(text) {
  // show a fading whisper bubble near the orb without opening the chat
  const orb = document.getElementById('spirit-orb');
  if (!orb) return;
  const w = document.createElement('div');
  w.className = 'spirit-whisper';
  w.textContent = text;
  document.body.appendChild(w);
  // pulse the orb
  orb.classList.add('spirit-pulse');
  setTimeout(() => orb.classList.remove('spirit-pulse'), 2000);
  // fade out after 8s
  setTimeout(() => { w.classList.add('spirit-whisper-out'); setTimeout(() => w.remove(), 800); }, 8000);
}

// keep sendPrompt working — routes to spirit now
function sendPrompt(text) {
  if (!spiritOpen) spiritToggle();
  const inp = document.getElementById('spirit-input');
  if (inp) { inp.value = text; spiritSend(); }
}

// ─── COMPANION (legacy stubs) ─────────────────────────────
function renderChatUI() {}
function buildSystemPrompt() { return ''; }

// ─── AI: WHISPER ──────────────────────────────────────────
async function loadWhisper() {
  const el = document.getElementById('whisper-text');
  const h   = S.hobbies.map(x => `${x.name}(${x.sessions}s,lv${x.lvl})`).join(', ');
  const top = [...S.hobbies].sort((a, b) => b.sessions - a.sessions)[0];
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 1000,
        messages: [{ role: 'user', content: `One short observation for a life terminal. Hobbies: ${h}. Most active: ${top?.name || 'none'}. Direct, specific, no poetry. No greeting.` }],
      }),
    });
    const data = await res.json();
    el.textContent = data.content?.find(b => b.type === 'text')?.text || 'Every session is a small act of showing up.';
  } catch (e) {
    el.textContent = 'Every session is a small act of showing up for yourself.';
  }
}

// ─── AI: INTRO NOTE ───────────────────────────────────────
async function loadIntroNote() {
  const el  = document.getElementById('inote');
  const btn = document.getElementById('ebtn');
  const hour = new Date().getHours();
  const tod  = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const top  = [...S.hobbies].sort((a, b) => b.sessions - a.sessions)[0];

  // always show the enter button after 4s max, even if fetch hangs
  const fallbackTimer = setTimeout(() => {
    el.textContent = 'good to see you again.';
    btn.classList.add('show');
  }, 4000);

  try {
    const controller = new AbortController();
    const abort = setTimeout(() => controller.abort(), 3800);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 1000,
        messages: [{ role: 'user', content: `One sentence for a life terminal intro screen. Time of day: ${tod}. Top hobby: ${top?.name || 'none'}. Be direct and specific, not poetic. No greeting.` }],
      }),
      signal: controller.signal,
    });
    clearTimeout(abort);
    const data = await res.json();
    el.textContent = data.content?.find(b => b.type === 'text')?.text || 'good to see you again.';
  } catch (e) {
    el.textContent = 'good to see you again.';
  }

  clearTimeout(fallbackTimer);
  btn.classList.add('show');
}

// ─── ENTER ────────────────────────────────────────────────
function enter() {
  const intro   = document.getElementById('intro');
  const frame   = document.getElementById('flower-frame');
  const bud     = document.getElementById('bud');
  const stamen  = document.getElementById('stamen');
  const stamen2 = document.getElementById('stamen2');

  // petal open angles — each petal fans out from its closed position
  const petalAngles = [0, 60, 120, 180, 240, 300];
  const petalEls    = [1,2,3,4,5,6].map(i => document.getElementById('p' + i));

  // phase 1: petals open (600ms)
  petalEls.forEach((p, i) => {
    if (!p) return;
    p.style.transition = `transform ${500 + i * 40}ms cubic-bezier(.4,0,.2,1) ${i * 60}ms`;
    p.style.transform  = `rotate(${petalAngles[i]}deg)`;
  });

  // phase 2: stamen fades in (400ms after petals start)
  setTimeout(() => {
    stamen.style.transition  = 'opacity 400ms ease';
    stamen2.style.transition = 'opacity 400ms ease 100ms';
    stamen.style.opacity  = '1';
    stamen2.style.opacity = '1';
  }, 400);

  // phase 3: flower frame expands to fill screen (starts at 700ms)
  setTimeout(() => {
    frame.style.transition = 'transform 700ms cubic-bezier(.7,0,.2,1), opacity 700ms ease';
    frame.style.transform  = 'scale(8)';
    frame.style.opacity    = '0';
  }, 750);

  // phase 4: app reveals underneath (starts at 1200ms)
  setTimeout(() => {
    intro.style.display = 'none';
    document.getElementById('app').classList.remove('hidden');
    renderAll();
    loadSkyWeather();
    const today = new Date().toDateString();
    if (S.lastLogin !== today) { S.lastLogin = today; save(); }
    requestAnimationFrame(() => { renderBlossom(); });
    setTimeout(maybeSpiritWhisper, 3000);
  }, 1350);
}

// ─── HOBBY MODAL ──────────────────────────────────────────
const HOBBY_ICONS = [
  'ti-crosshair','ti-trophy','ti-brush','ti-barbell','ti-camera',
  'ti-music','ti-book','ti-run','ti-bike','ti-swim',
  'ti-chess','ti-palette','ti-code','ti-pencil','ti-heart',
  'ti-leaf','ti-star','ti-flame','ti-bolt','ti-moon',
  'ti-plant','ti-paw','ti-chef-hat','ti-guitar-pick','ti-dice',
];

let _editingHobbyId = null;
let _hmColor = 'sage';
let _hmIcon  = 'ti-star';

function openHobbyModal(id = null) {
  _editingHobbyId = id;
  const h = id ? S.hobbies.find(x => x.id === id) : null;

  document.getElementById('modal-title').textContent = h ? 'edit hobby' : 'add hobby';
  document.getElementById('hm-name').value = h ? h.name : '';
  document.getElementById('hm-xp').value   = h ? h.xpPerSession : 60;
  document.getElementById('hm-delete').style.display = h ? 'block' : 'none';

  _hmColor = h ? h.color : 'sage';
  _hmIcon  = h ? h.icon  : 'ti-star';

  // render color swatches
  const colorsEl = document.getElementById('hm-colors');
  colorsEl.innerHTML = '';
  for (const [key, c] of Object.entries(HOBBY_COLORS)) {
    const s = document.createElement('div');
    s.className = 'modal-color-swatch' + (key === _hmColor ? ' active' : '');
    s.style.background = c.fill;
    s.title = key;
    s.onclick = () => {
      _hmColor = key;
      colorsEl.querySelectorAll('.modal-color-swatch').forEach(x => x.classList.remove('active'));
      s.classList.add('active');
    };
    colorsEl.appendChild(s);
  }

  // render icon buttons
  const iconsEl = document.getElementById('hm-icons');
  iconsEl.innerHTML = '';
  for (const icon of HOBBY_ICONS) {
    const b = document.createElement('button');
    b.className = 'modal-icon-btn' + (icon === _hmIcon ? ' active' : '');
    b.innerHTML = `<i class="ti ${icon}"></i>`;
    b.onclick = () => {
      _hmIcon = icon;
      iconsEl.querySelectorAll('.modal-icon-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    };
    iconsEl.appendChild(b);
  }

  document.getElementById('hobby-modal-overlay').classList.remove('hidden');
  document.getElementById('hobby-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('hm-name').focus(), 50);
}

function closeHobbyModal() {
  document.getElementById('hobby-modal-overlay').classList.add('hidden');
  document.getElementById('hobby-modal').classList.add('hidden');
  _editingHobbyId = null;
}

function saveHobby() {
  const name = document.getElementById('hm-name').value.trim();
  if (!name) { document.getElementById('hm-name').focus(); return; }
  if (_editingHobbyId) {
    const h = S.hobbies.find(x => x.id === _editingHobbyId);
    if (h) { h.name = name; h.color = _hmColor; h.icon = _hmIcon; }
    logActivity('edited hobby: ' + name, 'add');
  } else {
    S.hobbies.push({ id: 'h' + Date.now(), name, icon: _hmIcon, color: _hmColor, sessions: 0 });
    logActivity('added hobby: ' + name, 'add');
  }
  save(); renderHobbies(); closeHobbyModal();
}

function deleteHobby() {
  if (!_editingHobbyId) return;
  const h = S.hobbies.find(x => x.id === _editingHobbyId);
  if (!h) return;
  if (!confirm(`Delete "${h.name}"? This can't be undone.`)) return;
  logActivity('deleted hobby: ' + h.name, 'delete');
  S.hobbies = S.hobbies.filter(x => x.id !== _editingHobbyId);
  save(); renderHobbies(); closeHobbyModal();
}

// ─── GOAL MODAL ───────────────────────────────────────────
let _editingGoalId = null;
let _gmColor = 'sage';
let _gmIcon  = 'ti-star';

function openGoalModal(id = null) {
  _editingGoalId = id;
  const g = id ? S.goals.find(x => x.id === id) : null;

  document.getElementById('gm-title').textContent = g ? 'edit goal' : 'add goal';
  document.getElementById('gm-name').value  = g ? g.name  : '';
  document.getElementById('gm-desc').value  = g ? g.desc  : '';
  document.getElementById('gm-max').value   = g ? g.max   : 10;
  document.getElementById('gm-cur').value   = g ? g.cur   : 0;
  document.getElementById('gm-delete').style.display = g ? 'block' : 'none';

  _gmColor = g ? g.color : 'sage';
  _gmIcon  = g ? g.icon  : 'ti-star';

  const colorsEl = document.getElementById('gm-colors');
  colorsEl.innerHTML = '';
  for (const [key, c] of Object.entries(HOBBY_COLORS)) {
    const s = document.createElement('div');
    s.className = 'modal-color-swatch' + (key === _gmColor ? ' active' : '');
    s.style.background = c.fill;
    s.title = key;
    s.onclick = () => {
      _gmColor = key;
      colorsEl.querySelectorAll('.modal-color-swatch').forEach(x => x.classList.remove('active'));
      s.classList.add('active');
    };
    colorsEl.appendChild(s);
  }

  const iconsEl = document.getElementById('gm-icons');
  iconsEl.innerHTML = '';
  for (const icon of HOBBY_ICONS) {
    const b = document.createElement('button');
    b.className = 'modal-icon-btn' + (icon === _gmIcon ? ' active' : '');
    b.innerHTML = `<i class="ti ${icon}"></i>`;
    b.onclick = () => {
      _gmIcon = icon;
      iconsEl.querySelectorAll('.modal-icon-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    };
    iconsEl.appendChild(b);
  }

  document.getElementById('goal-modal-overlay').classList.remove('hidden');
  document.getElementById('goal-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('gm-name').focus(), 50);
}

function closeGoalModal() {
  document.getElementById('goal-modal-overlay').classList.add('hidden');
  document.getElementById('goal-modal').classList.add('hidden');
  _editingGoalId = null;
}

function saveGoal() {
  const name = document.getElementById('gm-name').value.trim();
  const desc = document.getElementById('gm-desc').value.trim();
  const max  = parseInt(document.getElementById('gm-max').value) || 10;
  const cur  = parseInt(document.getElementById('gm-cur').value) || 0;
  if (!name) { document.getElementById('gm-name').focus(); return; }
  if (_editingGoalId) {
    const g = S.goals.find(x => x.id === _editingGoalId);
    if (g) { g.name = name; g.desc = desc; g.max = max; g.cur = Math.min(cur, max); g.color = _gmColor; g.icon = _gmIcon; }
    logActivity('edited goal: ' + name, 'goal');
  } else {
    S.goals.push({ id: 'g' + Date.now(), name, desc, icon: _gmIcon, color: _gmColor, cur: Math.min(cur, max), max });
    logActivity('added goal: ' + name, 'goal');
  }
  save(); renderGoals(); closeGoalModal();
}

function deleteGoal() {
  if (!_editingGoalId) return;
  const g = S.goals.find(x => x.id === _editingGoalId);
  if (!g) return;
  if (!confirm(`Delete "${g.name}"? This can't be undone.`)) return;
  logActivity('deleted goal: ' + g.name, 'delete');
  S.goals = S.goals.filter(x => x.id !== _editingGoalId);
  save(); renderGoals(); closeGoalModal();
}

// ─── TODO MODAL ───────────────────────────────────────────
let _editingTodoId = null;

function openTodoModal(id = null) {
  _editingTodoId = id;
  const t = id ? S.todos.find(x => x.id === id) : null;

  document.getElementById('tm-title').textContent = t ? 'edit quest' : 'add quest';
  document.getElementById('tm-label').value = t ? t.label : '';
  document.getElementById('tm-xp').value   = t ? t.xp    : 50;
  document.getElementById('tm-delete').style.display = t ? 'block' : 'none';

  document.getElementById('todo-modal-overlay').classList.remove('hidden');
  document.getElementById('todo-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('tm-label').focus(), 50);
}

function closeTodoModal() {
  document.getElementById('todo-modal-overlay').classList.add('hidden');
  document.getElementById('todo-modal').classList.add('hidden');
  _editingTodoId = null;
}

function saveTodo() {
  const label = document.getElementById('tm-label').value.trim();
  const xp    = parseInt(document.getElementById('tm-xp').value) || 50;
  if (!label) { document.getElementById('tm-label').focus(); return; }

  if (_editingTodoId) {
    const t = S.todos.find(x => x.id === _editingTodoId);
    if (t) { t.label = label; t.xp = xp; }
  } else {
    S.todos.push({ id: 't' + Date.now(), label, done: false, xp });
  }
  save(); renderTodos('todos-all'); closeTodoModal();
}

function deleteTodo() {
  if (!_editingTodoId) return;
  const t = S.todos.find(x => x.id === _editingTodoId);
  if (!t) return;
  if (!confirm(`Delete "${t.label}"?`)) return;
  S.todos = S.todos.filter(x => x.id !== _editingTodoId);
  save(); renderTodos('todos-all'); closeTodoModal();
}

// ─── EVENT LISTENERS ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('todo-in')?.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
  document.getElementById('music-in')?.addEventListener('keydown', e => { if (e.key === 'Enter') addMusicEntry(); });
  document.getElementById('spirit-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') spiritSend(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeHobbyModal();
      closeGoalModal();
      closeTodoModal();
    }
  });

  // drag-to-scroll on timeline
  const wrap = document.getElementById('timeline-wrap');
  if (wrap) {
    let isDown = false, startX, scrollLeft;
    wrap.addEventListener('mousedown', e => {
      isDown = true; startX = e.pageX - wrap.offsetLeft; scrollLeft = wrap.scrollLeft;
    });
    wrap.addEventListener('mouseleave', () => isDown = false);
    wrap.addEventListener('mouseup',    () => isDown = false);
    wrap.addEventListener('mousemove',  e => {
      if (!isDown) return;
      e.preventDefault();
      wrap.scrollLeft = scrollLeft - (e.pageX - wrap.offsetLeft - startX);
    });
  }
});

// ─── INIT ─────────────────────────────────────────────────
(async () => {
  load();
  applyTheme(S.theme || 'default');
  initBlossom();
  await loadIntroNote();
})();
