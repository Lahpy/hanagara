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
  renderThemeSwitcher();
  save();
}

// ─── STAT CALC ────────────────────────────────────────────
function calcStats() {
  const h = S.hobbies;
  const total = h.reduce((a, x) => a + x.sessions, 0) || 1;
  const creative  = h.filter(x => ['draw',  'photo'].includes(x.id)).reduce((a, x) => a + x.sessions, 0);
  const physical  = h.filter(x => ['gym',   'aim'  ].includes(x.id)).reduce((a, x) => a + x.sessions, 0);
  const comp      = h.filter(x => ['rank',  'aim'  ].includes(x.id)).reduce((a, x) => a + x.sessions, 0);
  S.stats.consistency = Math.min(99, Math.round((S.streak / 30) * 100 + total));
  S.stats.creativity  = Math.min(99, Math.round((creative / total) * 100 + creative * 3));
  S.stats.discipline  = Math.min(99, Math.round((physical / total) * 80  + S.streak * 2));
  S.stats.energy      = Math.min(99, Math.round((comp     / total) * 80  + comp * 4));
}

// ─── XP POPUP ─────────────────────────────────────────────
function spawnXpPop(el, amt) {
  const rect = el.getBoundingClientRect();
  const pop = document.createElement('div');
  pop.className = 'xp-pop';
  pop.textContent = '+' + amt + 'xp';
  pop.style.left = (rect.left + rect.width / 2 - 20) + 'px';
  pop.style.top  = (rect.top - 10) + 'px';
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 950);
}

// ─── RENDER: STATS ────────────────────────────────────────
function renderStats() {
  calcStats();
  const grid = document.getElementById('stat-grid');
  grid.innerHTML = '';
  for (const [k, m] of Object.entries(STAT_META)) {
    const v = S.stats[k];
    const el = document.createElement('div');
    el.className = 'stat-card';
    el.innerHTML = `
      <div class="s-name">${m.label}</div>
      <div class="s-val">${v}</div>
      <div class="s-bar"><div class="s-fill" style="width:0%;background:${m.bar}" data-w="${v}"></div></div>
      <div class="s-tip">${m.tip}</div>`;
    grid.appendChild(el);
  }
  requestAnimationFrame(() => {
    grid.querySelectorAll('.s-fill').forEach(el => {
      requestAnimationFrame(() => { el.style.width = el.dataset.w + '%'; });
    });
  });
}

// ─── RENDER: HOBBIES ──────────────────────────────────────
function renderHobbies() {
  const list = document.getElementById('hobby-list');
  list.innerHTML = '';
  for (const h of S.hobbies) {
    const c = HOBBY_COLORS[h.color];
    const pct = Math.round((h.progress / XP_PER_LVL) * 100);
    const card = document.createElement('div');
    card.className = 'hcard';
    card.innerHTML = `
      <div class="hcard-top">
        <div class="hico" style="background:${c.bg}"><i class="ti ${h.icon}" style="color:${c.fill}"></i></div>
        <div class="hinfo">
          <div class="hname">${h.name}</div>
          <div class="hsub">lv ${h.lvl} · ${h.sessions} sessions · ${h.streak}d streak</div>
        </div>
        <div class="hbadge" style="background:${c.bg};color:${c.text};border:1px solid ${c.border}">+${h.xpPerSession}xp</div>
      </div>
      <div class="bar-bg"><div class="bar-fill" style="width:0%;background:${c.fill}" data-w="${pct}"></div></div>
      <div class="hbtns">
        <button class="btn p" onclick="logHobby('${h.id}', this)">log session</button>
        <button class="btn"   onclick="sendPrompt('Give me tips for improving my ${h.name}')">tips ↗</button>
      </div>`;
    list.appendChild(card);
  }
  requestAnimationFrame(() => {
    list.querySelectorAll('.bar-fill').forEach(el => {
      requestAnimationFrame(() => { el.style.width = el.dataset.w + '%'; });
    });
  });
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
    card.innerHTML = `
      <div class="gtop">
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
        <button class="btn"   onclick="sendPrompt('Give me advice on my goal: ${g.name}')">advice ↗</button>
      </div>`;
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
    row.onclick = () => toggleTodo(t.id, row);
    row.innerHTML = `
      <div class="tcirc ${t.done ? 'done' : ''}"></div>
      <span class="tlabel ${t.done ? 'done' : ''}">${t.label}</span>
      <span class="tpts">${t.done ? '✓' : '+' + t.xp + 'xp'}</span>`;
    el.appendChild(row);
  }
}

// ─── RENDER: THEME SWITCHER ───────────────────────────────
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
  const total = S.hobbies.reduce((a, h) => a + h.sessions, 0);
  document.getElementById('total-xp-label').textContent  = S.xp.toLocaleString() + ' xp';
  document.getElementById('sessions-label').textContent  = total + ' sessions logged';
  document.getElementById('streak-label').textContent    = S.streak + ' day streak';
}

// ─── RENDER ALL ───────────────────────────────────────────
function renderAll() {
  calcStats();
  renderStats();
  renderHobbies();
  renderGoals();
  renderTodos('home-todos', 3);
  renderTodos('todos-all');
  document.getElementById('xval').textContent = S.xp.toLocaleString();
  document.getElementById('sval').textContent = S.streak;
}

// ─── ACTIONS ──────────────────────────────────────────────
function logHobby(id, btn) {
  const h = S.hobbies.find(x => x.id === id);
  if (!h) return;
  h.sessions++; h.streak++;
  const prevLvl = h.lvl;
  h.progress += h.xpPerSession;
  if (h.progress >= XP_PER_LVL) { h.lvl++; h.progress -= XP_PER_LVL; }
  S.xp += h.xpPerSession;
  spawnXpPop(btn, h.xpPerSession);
  if (h.lvl > prevLvl) {
    const ico = btn.closest('.hcard')?.querySelector('.hico');
    if (ico) { ico.classList.add('lvlup-anim'); setTimeout(() => ico.classList.remove('lvlup-anim'), 600); }
  }
  save(); renderAll();
}

function incGoal(id, btn) {
  const g = S.goals.find(x => x.id === id);
  if (!g || g.cur >= g.max) return;
  g.cur++; S.xp += 20;
  spawnXpPop(btn, 20);
  save(); renderAll();
}

function toggleTodo(id, row) {
  const t = S.todos.find(x => x.id === id);
  if (!t) return;
  const circ = row.querySelector('.tcirc');
  if (!t.done) {
    t.done = true; S.xp += t.xp; S.streak++;
    circ.classList.add('done');
    spawnXpPop(circ, t.xp);
  } else {
    t.done = false; S.xp = Math.max(0, S.xp - t.xp);
    circ.classList.remove('done');
  }
  row.querySelector('.tlabel').classList.toggle('done', t.done);
  row.querySelector('.tpts').textContent = t.done ? '✓' : '+' + t.xp + 'xp';
  document.getElementById('xval').textContent = S.xp.toLocaleString();
  save();
}

function addTodo() {
  const inp = document.getElementById('todo-in');
  const v = inp.value.trim();
  if (!v) return;
  S.todos.push({ id: 't' + Date.now(), label: v, done: false, xp: 50 });
  inp.value = '';
  save(); renderTodos('todos-all'); renderTodos('home-todos', 3);
}

// ─── NAV ──────────────────────────────────────────────────
function nav(name) {
  TABS.forEach((t, i) => {
    const panel = document.getElementById('panel-' + t);
    const btn   = document.querySelectorAll('.nb')[i];
    if (panel) { panel.classList.toggle('on', t === name); panel.classList.toggle('hidden', t !== name); }
    if (btn)   { btn.classList.toggle('on', t === name); }
  });
  document.getElementById('scroll').scrollTop = 0;
  if (name === 'companion') renderChatUI();
  if (name === 'settings')  renderSettings();
}

// ─── COMPANION ────────────────────────────────────────────
function renderChatUI() {
  const area = document.getElementById('chat-area');
  area.innerHTML = '';
  const messages = chatHistory.length === 0
    ? [{ role: 'assistant', content: "Hello. I've been keeping an eye on your world. What's on your mind today?" }]
    : chatHistory;
  for (const msg of messages) {
    const m = document.createElement('div');
    m.className = 'msg ' + (msg.role === 'user' ? 'user' : 'ai');
    m.textContent = msg.content;
    area.appendChild(m);
  }
  area.scrollTop = area.scrollHeight;
}

function buildSystemPrompt() {
  const h = S.hobbies.map(x => `${x.name} (lv${x.lvl}, ${x.sessions} sessions)`).join(', ');
  const g = S.goals.map(x => `${x.name} (${x.cur}/${x.max})`).join(', ');
  return `You are a gentle, poetic life companion inside a personal terminal called "my world" (project: hanagara).
Warm, intimate, literary — like a close friend who notices small things.
2–3 sentences max. No bullet points. Soft natural language. One question per reply max.
User hobbies: ${h}. Goals: ${g}. XP: ${S.xp}. Streak: ${S.streak}d.
Stats — consistency:${S.stats.consistency}, creativity:${S.stats.creativity}, discipline:${S.stats.discipline}, energy:${S.stats.energy}.`;
}

async function sendChat() {
  const inp = document.getElementById('chat-in');
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';
  chatHistory.push({ role: 'user', content: msg });

  const area = document.getElementById('chat-area');
  const ub = document.createElement('div'); ub.className = 'msg user'; ub.textContent = msg; area.appendChild(ub);
  const lb = document.createElement('div'); lb.className = 'msg ai';   lb.textContent = '...'; area.appendChild(lb);
  area.scrollTop = area.scrollHeight;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 1000,
        system: buildSystemPrompt(),
        messages: chatHistory.map(m => ({ role: m.role, content: m.content })),
      }),
    });
    const data = await res.json();
    const reply = data.content?.find(b => b.type === 'text')?.text || '...';
    chatHistory.push({ role: 'assistant', content: reply });
    lb.textContent = reply;
  } catch (e) {
    lb.textContent = 'something drifted away... try again.';
  }
  area.scrollTop = area.scrollHeight;
  save();
}

// ─── AI: WHISPER ──────────────────────────────────────────
async function loadWhisper() {
  const el = document.getElementById('whisper-text');
  const h   = S.hobbies.map(x => `${x.name}(${x.sessions}s,lv${x.lvl})`).join(', ');
  const top = [...S.hobbies].sort((a, b) => b.sessions - a.sessions)[0];
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 1000,
        messages: [{ role: 'user', content: `Write a single 2-sentence poetic observation for a life terminal home screen. Hobbies: ${h}. Most active: ${top.name}. Streak: ${S.streak}d. XP: ${S.xp}. Warm, personal, like a quiet morning journal entry. No greeting, no quotes.` }],
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
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 1000,
        messages: [{ role: 'user', content: `1–2 sentence warm welcome for a personal life terminal opening screen. Time: ${tod}. Top hobby: ${top.name}. Streak: ${S.streak}d. XP: ${S.xp}. Poetic, personal, glad to see them. No opening word like "hello" or "welcome".` }],
      }),
    });
    const data = await res.json();
    el.textContent = data.content?.find(b => b.type === 'text')?.text || 'good to see you again.';
  } catch (e) {
    el.textContent = 'good to see you again.';
  }
  btn.classList.add('show');
}

// ─── ENTER ────────────────────────────────────────────────
// Handled by blossom.js — exitBlossom() opens the app.

// ─── EVENT LISTENERS ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('todo-in')?.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
  document.getElementById('chat-in')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });
});

// ─── INIT ─────────────────────────────────────────────────
(async () => {
  load();
  applyTheme(S.theme || 'default');
  initBlossom();
  await loadIntroNote();
})();
