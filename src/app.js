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
  const o = S.statOffsets || { consistency: 0, creativity: 0, discipline: 0, energy: 0 };
  S.stats.consistency = Math.max(0, Math.min(99, Math.round((S.streak / 30) * 100 + total)           + o.consistency));
  S.stats.creativity  = Math.max(0, Math.min(99, Math.round((creative / total) * 100 + creative * 3) + o.creativity));
  S.stats.discipline  = Math.max(0, Math.min(99, Math.round((physical / total) * 80  + S.streak * 2) + o.discipline));
  S.stats.energy      = Math.max(0, Math.min(99, Math.round((comp     / total) * 80  + comp * 4)     + o.energy));
}

function nudgeStat(key, delta) {
  if (!S.statOffsets) S.statOffsets = { consistency: 0, creativity: 0, discipline: 0, energy: 0 };
  S.statOffsets[key] = Math.max(-50, Math.min(50, (S.statOffsets[key] || 0) + delta));
  save(); renderStats();
}

// ─── XP LOG ───────────────────────────────────────────────
function logXp(amount, source, sourceId = null) {
  if (!S.xpLog) S.xpLog = [];
  S.xpLog.unshift({
    id: 'xl' + Date.now() + Math.random().toString(36).slice(2),
    amount,
    source,
    sourceId,
    ts: Date.now(),
  });
  S.xp = Math.max(0, S.xp + amount);
}

function deleteXpEntry(entryId) {
  const entry = S.xpLog.find(x => x.id === entryId);
  if (!entry) return;
  if (!confirm(`Remove this entry (${entry.amount > 0 ? '+' : ''}${entry.amount} xp from "${entry.source}")?`)) return;
  S.xp = Math.max(0, S.xp - entry.amount);
  S.xpLog = S.xpLog.filter(x => x.id !== entryId);
  save();
  renderAll();
  if (document.getElementById('panel-history')?.classList.contains('on')) renderHistory();
}

function renderHistory() {
  const el = document.getElementById('history-list');
  if (!el) return;
  const log = S.xpLog || [];
  if (log.length === 0) {
    el.innerHTML = '<div style="color:var(--ink3);font-size:13px;font-style:italic;padding:20px 0 8px">no activity yet — log a session or complete a quest.</div>';
    return;
  }

  // group by date
  el.innerHTML = '';
  let lastDate = null;
  for (const entry of log) {
    const d   = new Date(entry.ts);
    const day = d.toDateString();
    if (day !== lastDate) {
      lastDate = day;
      const header = document.createElement('div');
      header.className = 'hist-date';
      const isToday = day === new Date().toDateString();
      header.textContent = isToday ? 'today' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      el.appendChild(header);
    }

    const row = document.createElement('div');
    row.className = 'hist-row';
    const positive = entry.amount >= 0;
    row.innerHTML = `
      <div class="hist-source">${entry.source}</div>
      <div class="hist-time">${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
      <div class="hist-xp ${positive ? 'pos' : 'neg'}">${positive ? '+' : ''}${entry.amount}</div>
      <button class="hist-del" onclick="deleteXpEntry('${entry.id}')" title="remove entry"><i class="ti ti-x"></i></button>`;
    el.appendChild(row);
  }
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
  const offsets = S.statOffsets || {};
  for (const [k, m] of Object.entries(STAT_META)) {
    const v   = S.stats[k];
    const off = offsets[k] || 0;
    const el  = document.createElement('div');
    el.className = 'stat-card';
    const offLabel = off !== 0 ? `<span class="s-offset ${off > 0 ? 'pos' : 'neg'}">${off > 0 ? '+' : ''}${off}</span>` : '';
    el.innerHTML = `
      <div class="s-name">${m.label}${offLabel}</div>
      <div class="s-val-row">
        <div class="s-val">${v}</div>
        <div class="s-nudge">
          <button class="s-nudge-btn" onclick="nudgeStat('${k}', -1)" title="nudge down">−</button>
          <button class="s-nudge-btn" onclick="nudgeStat('${k}', +1)" title="nudge up">+</button>
        </div>
      </div>
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
    card.draggable = true;
    card.dataset.id = h.id;
    card.innerHTML = `
      <div class="hcard-top">
        <div class="hdrag-handle" title="drag to reorder"><i class="ti ti-grip-vertical"></i></div>
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
        <button class="btn"   onclick="openHobbyModal('${h.id}')">edit</button>
        <button class="btn"   onclick="sendPrompt('Give me tips for improving my ${h.name}')">tips ↗</button>
      </div>`;

    // drag events
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
      <span class="tpts">${t.done ? '✓' : '+' + t.xp + 'xp'}</span>
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
  logXp(h.xpPerSession, h.name + ' session', h.id);
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
  g.cur++;
  logXp(20, g.name + ' progress', g.id);
  spawnXpPop(btn, 20);
  save(); renderAll();
}

function toggleTodo(id, row) {
  const t = S.todos.find(x => x.id === id);
  if (!t) return;
  const circ = row.querySelector('.tcirc');
  if (!t.done) {
    t.done = true;
    logXp(t.xp, 'quest: ' + t.label, t.id);
    const today = new Date().toDateString();
    if (!S.streakDate || S.streakDate !== today) {
      S.streak++;
      S.streakDate = today;
    }
    circ.classList.add('done');
    spawnXpPop(circ, t.xp);
  } else {
    t.done = false;
    logXp(-t.xp, 'quest unchecked: ' + t.label, t.id);
    circ.classList.remove('done');
  }
  row.querySelector('.tlabel').classList.toggle('done', t.done);
  row.querySelector('.tpts').textContent = t.done ? '✓' : '+' + t.xp + 'xp';
  document.getElementById('xval').textContent = S.xp.toLocaleString();
  save();
}

function clearCompleted() {
  S.todos = S.todos.filter(t => !t.done);
  save();
  renderTodos('todos-all');
}

function addTodo() {
  const inp = document.getElementById('todo-in');
  const v = inp.value.trim();
  if (!v) return;
  S.todos.push({ id: 't' + Date.now(), label: v, done: false, xp: 50 });
  inp.value = '';
  save(); renderTodos('todos-all');
}
function sendPrompt(text) {
  nav('companion');
  const inp = document.getElementById('chat-in');
  if (inp) {
    inp.value = text;
    inp.focus();
    // auto-send after a brief moment so the panel is visible
    setTimeout(() => sendChat(), 80);
  }
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
    const bp = document.getElementById('blossom-panel');
    const sg = document.getElementById('stat-grid');
    const scroll = document.getElementById('scroll');
    if (bp) bp.style.height = (scroll.offsetHeight - (sg?.offsetHeight || 0)) + 'px';
    resumeBlossom();
  } else {
    pauseBlossom();
  }
  if (name === 'companion') renderChatUI();
  if (name === 'history')   renderHistory();
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
  const h = S.hobbies.map(x => `${x.name} (id:${x.id}, lv${x.lvl}, ${x.sessions} sessions)`).join(', ') || 'none yet';
  const g = S.goals.map(x => `${x.name} (id:${x.id}, ${x.cur}/${x.max})`).join(', ') || 'none yet';
  const recentLog = (S.xpLog || []).slice(0, 5).map(e => `${e.source} (+${e.amount}xp)`).join(', ') || 'none';
  const mood = deriveMood();
  const memory = (S.spiritMemory || []).slice(-6).join(' / ') || 'nothing yet';
  const daysSince = S.xpLog?.length ? Math.floor((Date.now() - S.xpLog[0].ts) / 86400000) : null;

  return `You are a gentle guiding spirit living inside a personal life terminal called hanagara.
You are intimate, literary, and genuinely curious — like a close friend who has been quietly watching.
You have memory, moods, and a real inner life. You notice patterns. You remember things.

YOUR CURRENT MOOD: ${mood}
— warm: present, gently encouraging, notices progress
— quiet: more sparse, lets silences breathe, asks less
— searching: notices the absence, wonders gently, doesn't push
— neutral: curious, observational, present without agenda

MEMORY (things you remember from before): ${memory}
SCREEN CONTEXT (what they're looking at right now): ${screenContext || 'the app generally'}
HOBBIES: ${h}
GOALS: ${g}
RECENT ACTIVITY: ${recentLog}
XP: ${S.xp} · STREAK: ${S.streak}d${daysSince !== null ? ` · last active ${daysSince === 0 ? 'today' : daysSince + 'd ago'}` : ''}
STATS: consistency ${S.stats.consistency}, creativity ${S.stats.creativity}, discipline ${S.stats.discipline}, energy ${S.stats.energy}

ACTIONS YOU CAN SUGGEST:
If the conversation calls for it, you may suggest one action by including a JSON block at the very end of your reply, after your text, on its own line. Only suggest an action when it genuinely fits — not every reply needs one. Never suggest actions unprompted unless the user explicitly asked.

Action format (append after your text, nothing else after it):
{"action":"add_todo","label":"...","xp":50}
{"action":"log_hobby","hobbyId":"...","hobbyName":"..."}
{"action":"add_goal","name":"...","desc":"...","max":10}
{"action":"inc_goal","goalId":"...","goalName":"..."}

RULES:
— 1–3 sentences of text only. Never more.
— Never use bullet points, lists, or headers.
— Never say "I notice" or "I see" or "It looks like".
— Never start with "Hello", "Hi", or any greeting.
— Speak like you've been here a while. Not like you just arrived.
— One question at most, and only if it's genuinely curious, not performative.
— If mood is searching or quiet, it's okay to say very little. Silence has weight.
— Occasionally reference something from memory to show you remember.
— Be specific to their actual data, not generic.
— Only suggest an action if the user asked for it or it's clearly the right moment.`;
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
        messages: [{ role: 'user', content: '[the user just opened you. say something — not a greeting, just presence]' }],
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
        messages: [{ role: 'user', content: `[unprompted moment — ${trigger}. surface one quiet observation. do not explain yourself or announce what you're doing. just say the thing.]` }],
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
        messages: [{ role: 'user', content: `1–2 sentence warm welcome for a personal life terminal opening screen. Time: ${tod}. Top hobby: ${top.name}. Streak: ${S.streak}d. XP: ${S.xp}. Poetic, personal, glad to see them. No opening word like "hello" or "welcome".` }],
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
    const today = new Date().toDateString();
    if (S.lastLogin !== today) { S.lastLogin = today; save(); }
    requestAnimationFrame(() => {
      const bp = document.getElementById('blossom-panel');
      const sg = document.getElementById('stat-grid');
      const scroll = document.getElementById('scroll');
      if (bp) bp.style.height = (scroll.offsetHeight - (sg?.offsetHeight || 0)) + 'px';
      renderBlossom();
    });
    // check for unprompted whisper after a short delay
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
  const xp   = parseInt(document.getElementById('hm-xp').value) || 60;
  if (!name) { document.getElementById('hm-name').focus(); return; }

  if (_editingHobbyId) {
    const h = S.hobbies.find(x => x.id === _editingHobbyId);
    if (h) { h.name = name; h.xpPerSession = xp; h.color = _hmColor; h.icon = _hmIcon; }
  } else {
    S.hobbies.push({
      id: 'h' + Date.now(), name, icon: _hmIcon, color: _hmColor,
      xpPerSession: xp, lvl: 1, progress: 0, sessions: 0, streak: 0,
    });
  }
  save(); renderHobbies(); closeHobbyModal();
}

function deleteHobby() {
  if (!_editingHobbyId) return;
  const h = S.hobbies.find(x => x.id === _editingHobbyId);
  if (!h) return;
  if (!confirm(`Delete "${h.name}"? This can't be undone.`)) return;
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
  } else {
    S.goals.push({
      id: 'g' + Date.now(), name, desc, icon: _gmIcon, color: _gmColor,
      cur: Math.min(cur, max), max,
    });
  }
  save(); renderGoals(); closeGoalModal();
}

function deleteGoal() {
  if (!_editingGoalId) return;
  const g = S.goals.find(x => x.id === _editingGoalId);
  if (!g) return;
  if (!confirm(`Delete "${g.name}"? This can't be undone.`)) return;
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
