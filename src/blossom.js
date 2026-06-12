// ─── WORLD TIMELINE ───────────────────────────────────────

let tlFocused = null; // id of currently focused entry

// ─── SKETCHES ─────────────────────────────────────────────
const SKETCHES = [
  // 0 flower / sakura
  `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
    <line x1="60" y1="110" x2="60" y2="58"/>
    <path d="M60 58 Q52 42 60 26 Q68 42 60 58"/>
    <path d="M60 52 Q44 46 36 34 Q52 36 60 52"/>
    <path d="M60 52 Q76 46 84 34 Q68 36 60 52"/>
    <circle cx="60" cy="50" r="5"/><circle cx="60" cy="26" r="3"/>
    <circle cx="36" cy="34" r="3"/><circle cx="84" cy="34" r="3"/>
  </svg>`,
  // 1 mountain / fuji
  `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
    <line x1="10" y1="90" x2="110" y2="90"/>
    <polyline points="10,90 40,50 55,62 60,55 65,62 80,50 110,90"/>
    <polyline points="52,58 60,44 68,58"/>
    <path d="M52 58 Q60 52 68 58" stroke-dasharray="2 2"/>
  </svg>`,
  // 2 rice field
  `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
    <line x1="10" y1="70" x2="110" y2="70"/><line x1="10" y1="80" x2="110" y2="80"/>
    <line x1="10" y1="90" x2="110" y2="90"/>
    <line x1="30" y1="70" x2="30" y2="90"/><line x1="55" y1="70" x2="55" y2="90"/>
    <line x1="80" y1="70" x2="80" y2="90"/><line x1="100" y1="70" x2="100" y2="90"/>
    <path d="M10 65 Q35 55 60 62 Q85 55 110 60"/>
    <line x1="20" y1="45" x2="20" y2="65"/><line x1="22" y1="50" x2="18" y2="54"/>
    <line x1="22" y1="56" x2="18" y2="60"/><line x1="45" y1="40" x2="45" y2="62"/>
    <line x1="47" y1="46" x2="43" y2="50"/><line x1="47" y1="54" x2="43" y2="58"/>
  </svg>`,
  // 3 lake / reflection
  `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 60 Q35 54 60 60 Q85 66 110 60"/>
    <path d="M10 68 Q35 62 60 68 Q85 74 110 68" opacity="0.5"/>
    <path d="M10 76 Q35 70 60 76 Q85 82 110 76" opacity="0.25"/>
    <path d="M25 58 Q30 40 40 35 Q50 30 55 38 Q50 45 40 48 Q30 52 25 58"/>
    <path d="M25 62 Q30 80 40 85 Q50 90 55 82 Q50 75 40 72 Q30 68 25 62" opacity="0.3"/>
    <line x1="60" y1="30" x2="60" y2="58"/>
    <path d="M54 38 Q60 30 66 38"/>
  </svg>`,
  // 4 torii gate
  `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
    <line x1="35" y1="100" x2="35" y2="42"/><line x1="85" y1="100" x2="85" y2="42"/>
    <line x1="28" y1="55" x2="92" y2="55"/>
    <path d="M22 42 Q60 36 98 42"/>
    <line x1="22" y1="42" x2="98" y2="42"/>
    <line x1="50" y1="100" x2="50" y2="55"/><line x1="70" y1="100" x2="70" y2="55"/>
  </svg>`,
  // 5 bamboo
  `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
    <line x1="45" y1="110" x2="45" y2="20"/><line x1="60" y1="110" x2="60" y2="15"/>
    <line x1="75" y1="110" x2="75" y2="22"/>
    <line x1="45" y1="40" x2="45" y2="42"/><line x1="45" y1="58" x2="45" y2="60"/>
    <line x1="45" y1="76" x2="45" y2="78"/><line x1="45" y1="94" x2="45" y2="96"/>
    <line x1="60" y1="34" x2="60" y2="36"/><line x1="60" y1="52" x2="60" y2="54"/>
    <line x1="60" y1="70" x2="60" y2="72"/><line x1="60" y1="88" x2="60" y2="90"/>
    <line x1="75" y1="42" x2="75" y2="44"/><line x1="75" y1="60" x2="75" y2="62"/>
    <line x1="75" y1="78" x2="75" y2="80"/><line x1="75" y1="96" x2="75" y2="98"/>
    <path d="M45 40 Q35 32 28 26"/><path d="M60 52 Q72 44 80 36"/>
    <path d="M45 76 Q33 70 26 62"/><path d="M75 60 Q86 52 92 44"/>
  </svg>`,
  // 6 crane
  `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
    <path d="M60 55 Q45 48 30 52 Q42 44 60 48"/>
    <path d="M60 55 Q75 48 90 52 Q78 44 60 48"/>
    <path d="M60 55 Q58 70 55 85 Q60 78 65 85 Q62 70 60 55"/>
    <ellipse cx="60" cy="48" rx="8" ry="10"/>
    <path d="M60 40 Q64 36 68 38"/>
    <line x1="55" y1="85" x2="50" y2="95"/><line x1="65" y1="85" x2="70" y2="95"/>
    <line x1="50" y1="95" x2="45" y2="95"/><line x1="70" y1="95" x2="75" y2="95"/>
  </svg>`,
  // 7 rain
  `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
    <path d="M40 30 Q40 50 33 58 Q26 66 33 74 Q40 80 40 80"/>
    <path d="M60 20 Q60 45 52 55 Q44 65 52 75 Q60 83 60 83"/>
    <path d="M80 28 Q80 50 73 58 Q66 66 73 74 Q80 80 80 80"/>
    <line x1="20" y1="95" x2="100" y2="95"/>
    <path d="M20 95 Q35 92 50 95 Q65 98 80 95 Q95 92 100 95" opacity="0.4"/>
  </svg>`,
];

function sketchForEntry(entry) {
  const idx = Math.abs(entry.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % SKETCHES.length;
  return SKETCHES[idx];
}

function formatRelTime(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs  < 24) return `${hrs}h ago`;
  if (days < 7)  return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ─── 3: STREAK GRID ───────────────────────────────────────
function renderStreakGrid() {
  const grid = document.getElementById('streak-grid');
  if (!grid) return;

  // build set of days that had any activity
  const activeDays = new Set((S.xpLog || []).filter(e => e.amount > 0).map(e => dayKey(e.ts)));

  grid.innerHTML = '';
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dayKey(d.getTime());
    const active = activeDays.has(key);

    const sq = document.createElement('div');
    sq.className = 'sg-sq' + (active ? ' sg-active' : '');
    sq.title = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + (active ? ' · active' : '');
    grid.appendChild(sq);
  }
}

// ─── 6: GROUP BY DAY + DAY MARKERS ────────────────────────
function groupByDay(log) {
  // returns array of { dateLabel, entries[] } oldest-first
  const groups = [];
  let lastKey = null;
  for (const entry of log) {
    const k = dayKey(entry.ts);
    if (k !== lastKey) {
      const d = new Date(entry.ts);
      const isToday = k === dayKey(Date.now());
      const label = isToday ? 'today' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      groups.push({ dateLabel: label, entries: [] });
      lastKey = k;
    }
    groups[groups.length - 1].entries.push(entry);
  }
  return groups;
}

// ─── RENDER TIMELINE ──────────────────────────────────────
function renderTimeline() {
  const track  = document.getElementById('timeline-track');
  const detail = document.getElementById('tl-detail');
  if (!track) return;

  renderStreakGrid();

  const log = (S.xpLog || []).filter(e => e.amount > 0).slice().reverse(); // oldest→newest

  track.innerHTML = '';
  tlFocused = null;
  if (detail) detail.classList.add('hidden');

  if (log.length === 0) {
    // empty state — torii gate with quiet prompt
    track.innerHTML = `
      <div class="tl-empty">
        <div class="tl-empty-sketch">${SKETCHES[4]}</div>
        <div class="tl-empty-text">your story begins here</div>
      </div>`;
    return;
  }

  const groups = groupByDay(log);

  groups.forEach((group, gi) => {
    // 6: day marker
    const marker = document.createElement('div');
    marker.className = 'tl-day-marker';
    marker.innerHTML = `<div class="tl-day-tick"></div><div class="tl-day-label">${group.dateLabel}</div>`;
    track.appendChild(marker);

    // frames for this day
    group.entries.forEach(entry => {
      const frame = document.createElement('div');
      frame.className = 'tl-frame';
      frame.dataset.id = entry.id;

      const sketch = document.createElement('div');
      sketch.className = 'tl-sketch';
      sketch.innerHTML = sketchForEntry(entry);

      const dot = document.createElement('div');
      dot.className = 'tl-dot';

      const label = document.createElement('div');
      label.className = 'tl-label';
      label.textContent = new Date(entry.ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

      // note indicator dot
      if (entry.note) {
        const noteDot = document.createElement('div');
        noteDot.className = 'tl-note-dot';
        noteDot.title = entry.note;
        frame.appendChild(noteDot);
      }

      frame.appendChild(sketch);
      frame.appendChild(dot);
      frame.appendChild(label);
      frame.addEventListener('click', () => focusEntry(entry, frame));
      track.appendChild(frame);
    });
  });

  // scroll to right end (newest)
  setTimeout(() => {
    const wrap = document.getElementById('timeline-wrap');
    if (wrap) wrap.scrollLeft = wrap.scrollWidth;
  }, 50);
}

// ─── FOCUS ENTRY ──────────────────────────────────────────
function focusEntry(entry, frameEl) {
  const detail = document.getElementById('tl-detail');

  document.querySelectorAll('.tl-frame').forEach(f => f.classList.remove('tl-active'));

  if (tlFocused === entry.id) {
    tlFocused = null;
    detail.classList.add('hidden');
    return;
  }

  tlFocused = entry.id;
  frameEl.classList.add('tl-active');

  // scroll frame toward center
  const wrap  = document.getElementById('timeline-wrap');
  const wrapW = wrap.offsetWidth;
  wrap.scrollTo({ left: frameEl.offsetLeft - wrapW / 2 + frameEl.offsetWidth / 2, behavior: 'smooth' });

  // fill detail
  document.getElementById('tl-detail-sketch').innerHTML = sketchForEntry(entry);
  document.getElementById('tl-detail-source').textContent = entry.source;
  document.getElementById('tl-detail-time').textContent =
    new Date(entry.ts).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  document.getElementById('tl-detail-xp').textContent = '+' + entry.amount + ' xp';

  // 1: populate note field
  const noteEl = document.getElementById('tl-detail-note');
  if (noteEl) noteEl.value = entry.note || '';

  detail.classList.remove('hidden');
}

// ─── 1: SAVE NOTE ─────────────────────────────────────────
function saveTlNote() {
  if (!tlFocused) return;
  const entry = (S.xpLog || []).find(e => e.id === tlFocused);
  if (!entry) return;
  const noteEl = document.getElementById('tl-detail-note');
  entry.note = noteEl ? noteEl.value.trim() : '';
  save();
  // refresh note dot on the frame
  const frame = document.querySelector(`.tl-frame[data-id="${tlFocused}"]`);
  if (frame) {
    const existing = frame.querySelector('.tl-note-dot');
    if (entry.note && !existing) {
      const dot = document.createElement('div');
      dot.className = 'tl-note-dot';
      frame.appendChild(dot);
    } else if (!entry.note && existing) {
      existing.remove();
    }
  }
  // brief visual confirmation
  const btn = document.querySelector('.tl-note-save');
  if (btn) { btn.textContent = 'saved'; setTimeout(() => { btn.textContent = 'save'; }, 1200); }
}

// ─── STUBS ────────────────────────────────────────────────
function initBlossom()   {}
function pauseBlossom()  {}
function resumeBlossom() { renderTimeline(); }
function renderBlossom() { renderTimeline(); }
