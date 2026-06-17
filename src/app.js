// ─── STATE ────────────────────────────────────────────────
let S = {};
let currentTheme = 'default';
let chatHistory  = [];

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); }

function deepMerge(target, source) {
  const out = { ...source };
  for (const k of Object.keys(target)) {
    if (!(k in source)) out[k] = target[k];
    else if (Array.isArray(target[k])) out[k] = source[k];
    else if (typeof target[k] === 'object' && target[k] !== null && typeof source[k] === 'object') out[k] = deepMerge(target[k], source[k]);
    else out[k] = source[k];
  }
  return out;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    S = raw ? deepMerge(DEFAULT_STATE, JSON.parse(raw)) : { ...DEFAULT_STATE };
  } catch(e) { S = { ...DEFAULT_STATE }; }
  applyTheme(S.theme || 'default', true);
}
load();

// ─── THEME ────────────────────────────────────────────────
function applyTheme(id, silent = false) {
  currentTheme = id;
  THEMES.forEach(t => document.body.classList.remove('theme-' + t.id));
  if (id !== 'default') document.body.classList.add('theme-' + id);
  S.theme = id;
  if (!silent) { logActivity('theme changed to ' + id, 'theme'); renderThemeSwitcher(); save(); }
}

function renderThemeSwitcher() {
  const grid = document.getElementById('theme-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (const t of THEMES) {
    const wrap = document.createElement('div');
    const sw   = document.createElement('div');
    sw.className = 'tswatch' + (currentTheme === t.id ? ' active' : '');
    sw.style.background = `linear-gradient(135deg, ${t.bg[0]} 0%, ${t.bg[1]} 50%, ${t.bg[2]} 100%)`;
    sw.onclick = () => applyTheme(t.id);
    const lbl = document.createElement('div');
    lbl.className = 'tswatch-label';
    lbl.textContent = t.label;
    wrap.appendChild(sw); wrap.appendChild(lbl);
    grid.appendChild(wrap);
  }
}

// ─── SKY / WEATHER ────────────────────────────────────────
// Time-of-day sky phases — keyed by hour (0-23)
// Each phase: top color, mid color, horizon color, text color, particle type
const SKY_PHASES = [
  // 00:00 — deep night
  { h: 0,    top: '#020408', mid: '#070d18', hor: '#0d1628', text: '#c0d0e8', p: 'stars' },
  // 04:30 — pre-dawn, dark teal hint
  { h: 4.5,  top: '#05080f', mid: '#0d1525', hor: '#1a2540', text: '#b0c0d8', p: 'stars' },
  // 05:00 — nautical dawn, deep indigo lifting
  { h: 5,    top: '#0a0d18', mid: '#1a1e35', hor: '#2d2848', text: '#c0c8e8', p: 'stars' },
  // 05:45 — civil dawn, violet + rose bleeds in at horizon
  { h: 5.75, top: '#12101e', mid: '#2a1f38', hor: '#6b3050', text: '#d0b8c8', p: 'none'  },
  // 06:15 — sunrise, full orange-pink explosion
  { h: 6.25, top: '#1a0e22', mid: '#c0502a', hor: '#f5a030', text: '#f8d8a0', p: 'sun'   },
  // 07:00 — post-sunrise, gold fading upward
  { h: 7,    top: '#2a3a60', mid: '#e8803a', hor: '#f8c060', text: '#2a1408', p: 'sun'   },
  // 08:00 — morning blue establishes, warm horizon remains
  { h: 8,    top: '#3a6898', mid: '#78a8cc', hor: '#d4b870', text: '#1a2c3a', p: 'sun'   },
  // 10:00 — full morning blue, crisp
  { h: 10,   top: '#2a6aaa', mid: '#5898cc', hor: '#a8d4f0', text: '#0e2030', p: 'sun'   },
  // 12:00 — zenith, saturated midday
  { h: 12,   top: '#1a5a9a', mid: '#3a80c0', hor: '#78b8e8', text: '#081828', p: 'sun'   },
  // 14:00 — slight warmth returning, still blue
  { h: 14,   top: '#2060a0', mid: '#4a88c0', hor: '#90c0e0', text: '#0c1e2e', p: 'sun'   },
  // 16:00 — late afternoon, gold tint begins
  { h: 16,   top: '#2858a0', mid: '#6898c0', hor: '#d4a858', text: '#101c2a', p: 'sun'   },
  // 17:00 — golden hour begins, everything warm
  { h: 17,   top: '#1e3a70', mid: '#d06830', hor: '#f0a820', text: '#1a0c04', p: 'sun'   },
  // 17:45 — deep golden hour, saturated orange
  { h: 17.75,top: '#180c20', mid: '#c04820', hor: '#e88010', text: '#2a1000', p: 'none'  },
  // 18:15 — sunset peak, red-orange-gold bands
  { h: 18.25,top: '#100818', mid: '#a03020', hor: '#d86010', text: '#f0c060', p: 'none'  },
  // 18:45 — sun below horizon, purple-orange
  { h: 18.75,top: '#160820', mid: '#602858', hor: '#c05028', text: '#f0c0a0', p: 'none'  },
  // 19:15 — civil dusk, mauve-purple band
  { h: 19.25,top: '#100c20', mid: '#382060', hor: '#804878', text: '#d0a8c0', p: 'none'  },
  // 20:00 — nautical dusk, deep blue-purple
  { h: 20,   top: '#080818', mid: '#181838', hor: '#302858', text: '#c0b0d8', p: 'stars' },
  // 21:00 — astronomical dusk, stars emerging
  { h: 21,   top: '#040610', mid: '#0c1028', hor: '#181e40', text: '#c8d0e8', p: 'stars' },
  // 22:00 — deep night settling
  { h: 22,   top: '#020408', mid: '#08101e', hor: '#101828', text: '#b8c8e0', p: 'stars' },
  // 24:00 (wraps) — deep night
  { h: 24,   top: '#020408', mid: '#070d18', hor: '#0d1628', text: '#c0d0e8', p: 'stars' },
];

// weather overlays — tint + opacity applied on top of time sky
const WEATHER_OVERLAYS = {
  clear:  { tint: null,                 opacity: 0    },
  cloudy: { tint: 'rgba(180,190,200,',  opacity: 0.38 },
  overcast:{ tint: 'rgba(140,150,160,', opacity: 0.52 },
  rain:   { tint: 'rgba( 60, 80,100,',  opacity: 0.55 },
  storm:  { tint: 'rgba( 30, 40, 55,',  opacity: 0.68 },
  snow:   { tint: 'rgba(200,210,220,',  opacity: 0.45 },
  mist:   { tint: 'rgba(180,188,195,',  opacity: 0.40 },
};

let _skyWeatherId = 800; // default clear
let _skyIsNight   = false;
let _skyTicker    = null;

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r, g, b];
}

function lerpColor(hexA, hexB, t) {
  const [ar,ag,ab] = hexToRgb(hexA);
  const [br,bg,bb] = hexToRgb(hexB);
  const r = Math.round(ar + (br-ar)*t);
  const g = Math.round(ag + (bg-ag)*t);
  const b = Math.round(ab + (bb-ab)*t);
  return `rgb(${r},${g},${b})`;
}

function getSkyAtTime(hourDecimal) {
  // find the two surrounding phases and interpolate
  let lo = SKY_PHASES[0], hi = SKY_PHASES[SKY_PHASES.length-1];
  for (let i = 0; i < SKY_PHASES.length-1; i++) {
    if (hourDecimal >= SKY_PHASES[i].h && hourDecimal < SKY_PHASES[i+1].h) {
      lo = SKY_PHASES[i]; hi = SKY_PHASES[i+1]; break;
    }
  }
  const t = lo.h === hi.h ? 0 : (hourDecimal - lo.h) / (hi.h - lo.h);
  return {
    top:  lerpColor(lo.top,  hi.top,  t),
    mid:  lerpColor(lo.mid,  hi.mid,  t),
    hor:  lerpColor(lo.hor,  hi.hor,  t),
    text: lerpColor(lo.text, hi.text, t),
    p:    t < 0.5 ? lo.p : hi.p,
  };
}

function weatherOverlayKey(id) {
  if (id >= 200 && id < 300) return 'storm';
  if (id >= 300 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (id >= 700 && id < 800) return 'mist';
  if (id === 800)             return 'clear';
  if (id <= 804)              return id >= 803 ? 'overcast' : 'cloudy';
  return 'clear';
}

function paintSky() {
  const now   = new Date();
  const hour  = now.getHours() + now.getMinutes()/60 + now.getSeconds()/3600;
  const sky   = getSkyAtTime(hour);
  const wKey  = weatherOverlayKey(_skyWeatherId);
  const ov    = WEATHER_OVERLAYS[wKey] || WEATHER_OVERLAYS.clear;

  const bg = document.getElementById('sky-bg');
  if (!bg) return;

  // base time-of-day gradient
  let gradient = `linear-gradient(180deg, ${sky.top} 0%, ${sky.mid} 45%, ${sky.hor} 100%)`;

  // layer weather overlay if needed
  if (ov.tint && ov.opacity > 0) {
    bg.style.background = `linear-gradient(180deg, ${ov.tint}${ov.opacity}) 0%, ${ov.tint}${ov.opacity*0.7}) 100%), ${gradient}`;
    // fallback clean version
    bg.style.background = gradient;
    bg.style.filter = `saturate(${1 - ov.opacity * 0.5})`;
    // overlay via ::after workaround: just blend into gradient colors
    const [tr,tg,tb] = ov.tint.replace('rgba(','').split(',').map(Number);
    const blend = (hex, amt) => {
      const [r,g,b] = hexToRgb(hex.startsWith('rgb') ? '#' + hexToRgb : hex);
      return `rgb(${Math.round(r+(tr-r)*amt)},${Math.round(g+(tg-g)*amt)},${Math.round(b+(tb-b)*amt)})`;
    };
    // simple: just desaturate + darken the gradient for bad weather
    bg.style.background = gradient;
    bg.style.filter = `saturate(${Math.max(0.1, 1-ov.opacity*0.8)}) brightness(${1-ov.opacity*0.3})`;
  } else {
    bg.style.background = gradient;
    bg.style.filter = 'none';
  }

  // text color
  const content = document.getElementById('sky-content');
  if (content) content.style.color = sky.text;

  // particles — only re-render if type changed
  const pEl = document.getElementById('sky-particles');
  const curType = pEl?.dataset.type;
  const newType = ov.opacity > 0.3 && wKey !== 'clear' ? wKey : sky.p;
  if (newType !== curType) {
    renderSkyParticles(newType, sky.text);
    if (pEl) pEl.dataset.type = newType;
  }
}

function renderSkyParticles(type, color) {
  const el = document.getElementById('sky-particles');
  if (!el) return;
  el.innerHTML = '';
  if (type === 'stars') {
    for (let i = 0; i < 50; i++) {
      const s = document.createElement('div');
      const size = Math.random()*2.2+0.5;
      s.className = 'sky-star';
      s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*88}%;width:${size}px;height:${size}px;animation-delay:${Math.random()*4}s;animation-duration:${2+Math.random()*3}s;background:${color};opacity:${0.4+Math.random()*0.6}`;
      el.appendChild(s);
    }
  } else if (type === 'rain' || type === 'storm') {
    const count = type === 'storm' ? 40 : 28;
    for (let i = 0; i < count; i++) {
      const r = document.createElement('div');
      r.className = 'sky-rain';
      r.style.cssText = `left:${Math.random()*100}%;animation-duration:${0.3+Math.random()*0.35}s;animation-delay:${Math.random()}s;opacity:${0.15+Math.random()*0.3};background:${color};height:${12+Math.random()*8}px`;
      el.appendChild(r);
    }
  } else if (type === 'snow') {
    for (let i = 0; i < 25; i++) {
      const s = document.createElement('div');
      s.className = 'sky-snow';
      s.style.cssText = `left:${Math.random()*100}%;animation-duration:${3+Math.random()*4}s;animation-delay:${Math.random()*4}s;width:${2+Math.random()*4}px;height:${2+Math.random()*4}px;opacity:${0.5+Math.random()*0.5};background:${color}`;
      el.appendChild(s);
    }
  } else if (type === 'sun') {
    // sun position based on time
    const hour = new Date().getHours() + new Date().getMinutes()/60;
    const sunPct = Math.max(0, Math.min(1, (hour - 6) / 12)); // 0 at 6am, 1 at 6pm
    const sun = document.createElement('div');
    sun.className = 'sky-sun';
    sun.style.right  = `${20 + sunPct * 60}%`;
    sun.style.top    = `${8 + Math.sin(sunPct * Math.PI) * -4 + 20}%`;
    // sun color based on time — orange near horizon, white-yellow at zenith
    const nearHorizon = sunPct < 0.15 || sunPct > 0.85;
    sun.style.background = nearHorizon ? 'rgba(255,140,40,.65)' : 'rgba(255,225,100,.55)';
    sun.style.boxShadow  = nearHorizon
      ? '0 0 40px 20px rgba(255,100,20,.25)'
      : '0 0 30px 15px rgba(255,210,60,.2)';
    el.appendChild(sun);
  }
}

function startSkyTicker() {
  if (_skyTicker) clearInterval(_skyTicker);
  paintSky();
  // repaint every 60 seconds — smooth enough for time-of-day shifts
  _skyTicker = setInterval(paintSky, 60000);
}

function stopSkyTicker() {
  if (_skyTicker) { clearInterval(_skyTicker); _skyTicker = null; }
}

function skyGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'good night';
  if (h < 12) return 'good morning';
  if (h < 17) return 'good afternoon';
  if (h < 21) return 'good evening';
  return 'good night';
}

let _lastCoords = null;

async function loadSkyWeather() {
  document.getElementById('sky-greeting').textContent = skyGreeting();
  document.getElementById('sky-date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  // start ticking immediately with whatever time it is
  startSkyTicker();

  if (typeof OPENWEATHER_API_KEY === 'undefined' || !OPENWEATHER_API_KEY) {
    console.error('OPENWEATHER_API_KEY is missing from src/config.js — weather and forecast will not load.');
    document.getElementById('sky-condition').textContent = 'add OpenWeather key in config.js';
    const el = document.getElementById('forecast-row');
    if (el) el.innerHTML = `<div class="forecast-error">missing API key</div>`;
    return;
  }

  let lat, lon;
  try {
    const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 }));
    lat = pos.coords.latitude;
    lon = pos.coords.longitude;
    _lastCoords = { lat, lon };
  } catch(e) {
    console.error('geolocation error', e);
    document.getElementById('sky-condition').textContent = '';
    const el = document.getElementById('forecast-row');
    if (el) el.innerHTML = `<div class="forecast-error">location unavailable: ${e.message}</div>`;
    return;
  }

  // fire forecast independently — don't let weather's success gate it
  loadForecast(lat, lon);

  try {
    const res  = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=imperial`);
    if (!res.ok) { console.error('weather fetch failed', res.status, await res.text()); document.getElementById('sky-condition').textContent = ''; return; }
    const data = await res.json();

    _skyWeatherId = data.weather[0].id;
    _skyIsNight   = Date.now() < data.sys.sunrise*1000 || Date.now() > data.sys.sunset*1000;

    const temp     = Math.round(data.main.temp);
    const feels    = Math.round(data.main.feels_like);
    const humidity = data.main.humidity;
    const wind     = Math.round(data.wind.speed);
    const desc     = data.weather[0].description;

    document.getElementById('sky-left').textContent      = `${temp}°F  ·  feels ${feels}°`;
    document.getElementById('sky-condition').textContent = desc;
    document.getElementById('sky-right').textContent     = `${humidity}% humidity  ·  ${wind} mph`;

    // repaint with weather data
    paintSky();
    renderOutfitLine();
  } catch(e) {
    console.error('weather error', e);
    document.getElementById('sky-condition').textContent = '';
  }
}

function calcStats() {}
function renderStats() {}
function nudgeStat()  {}

// ─── FORECAST STRIP ───────────────────────────────────────
const WEATHER_ICONS = {
  storm: 'ti-bolt', rain: 'ti-cloud-rain', snow: 'ti-snowflake',
  mist: 'ti-cloud-fog', cloudy: 'ti-cloud', overcast: 'ti-cloud',
  clear_day: 'ti-sun', clear_night: 'ti-moon',
};

function weatherIconKey(id, isNight) {
  if (id >= 200 && id < 300) return 'storm';
  if (id >= 300 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (id >= 700 && id < 800) return 'mist';
  if (id === 800) return isNight ? 'clear_night' : 'clear_day';
  return id >= 803 ? 'overcast' : 'cloudy';
}

async function loadForecast(lat, lon) {
  const el = document.getElementById('forecast-row');
  try {
    const res  = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=imperial`);
    if (!res.ok) {
      const body = await res.text();
      console.error('forecast fetch failed', res.status, body);
      if (el) el.innerHTML = `<div class="forecast-error">forecast error ${res.status}: ${body.slice(0,80)}</div>`;
      return;
    }
    const data = await res.json();
    if (!data.list || !data.list.length) {
      if (el) el.innerHTML = `<div class="forecast-error">no forecast data returned</div>`;
      return;
    }
    renderForecastStrip(data.list);
  } catch(e) {
    console.error('forecast error', e);
    if (el) el.innerHTML = `<div class="forecast-error">forecast failed: ${e.message}</div>`;
  }
}

function renderForecastStrip(list) {
  const el = document.getElementById('forecast-row');
  if (!el || !list.length) return;

  // group by day, take midday-ish reading + min/max
  const days = {};
  list.forEach(item => {
    const d = new Date(item.dt * 1000);
    const key = d.toDateString();
    if (!days[key]) days[key] = { temps: [], items: [], date: d };
    days[key].temps.push(item.main.temp);
    days[key].items.push(item);
  });

  el.innerHTML = '';
  Object.values(days).slice(0, 5).forEach((day, i) => {
    const max = Math.round(Math.max(...day.temps));
    const min = Math.round(Math.min(...day.temps));
    // pick item closest to midday for icon representation
    const midday = day.items.reduce((best, item) => {
      const h = new Date(item.dt*1000).getHours();
      return Math.abs(h-13) < Math.abs(new Date(best.dt*1000).getHours()-13) ? item : best;
    }, day.items[0]);
    const iconKey = weatherIconKey(midday.weather[0].id, false);
    const icon = WEATHER_ICONS[iconKey] || 'ti-sun';
    const label = i === 0 ? 'today' : day.date.toLocaleDateString(undefined,{weekday:'short'});

    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <div class="forecast-day">${label}</div>
      <i class="ti ${icon} forecast-icon"></i>
      <div class="forecast-temps"><span class="forecast-max">${max}°</span><span class="forecast-min">${min}°</span></div>`;
    el.appendChild(card);
  });
}

// ─── TIMELINE DRAWER ──────────────────────────────────────
function toggleTimelineDrawer() {
  const drawer = document.getElementById('timeline-drawer');
  if (drawer?.classList.contains('timeline-drawer-open')) closeTimelineDrawer();
  else openTimelineDrawer();
}
function openTimelineDrawer() {
  document.getElementById('timeline-drawer')?.classList.remove('hidden');
  document.getElementById('timeline-overlay')?.classList.remove('hidden');
  requestAnimationFrame(() => {
    document.getElementById('timeline-drawer')?.classList.add('timeline-drawer-open');
  });
  document.getElementById('timeline-pulltab')?.classList.add('pulltab-open');
  resumeBlossom();
}
function closeTimelineDrawer() {
  const drawer = document.getElementById('timeline-drawer');
  drawer?.classList.remove('timeline-drawer-open');
  document.getElementById('timeline-pulltab')?.classList.remove('pulltab-open');
  setTimeout(() => {
    drawer?.classList.add('hidden');
    document.getElementById('timeline-overlay')?.classList.add('hidden');
  }, 320);
}

// ─── ACTIVITY LOG ─────────────────────────────────────────
function logActivityWithId(id, label, type = 'action') {
  if (!S.activityLog) S.activityLog = [];
  S.activityLog.unshift({ id, label, type, ts: Date.now(), note: '' });
  if (S.activityLog.length > 200) S.activityLog = S.activityLog.slice(0, 200);
}

function logActivity(label, type = 'action') {
  logActivityWithId('a' + Date.now() + Math.random().toString(36).slice(2), label, type);
}

function saveSessionNote(btn) {
  const wrap    = btn.closest('.session-note-wrap');
  const inp     = wrap?.querySelector('.session-note-in');
  const note    = inp?.value.trim();
  const entryId = inp?.dataset.entry;
  if (note && entryId) {
    const entry = (S.activityLog || []).find(e => e.id === entryId);
    if (entry) { entry.note = note; save(); }
  }
  wrap?.remove();
}

function deleteActivity(entryId) {
  S.activityLog = (S.activityLog || []).filter(x => x.id !== entryId);
  save(); renderHistory();
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
  if (!log.length) {
    el.innerHTML = '<div style="color:var(--ink3);font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:20px 0">nothing yet</div>';
    return;
  }
  el.innerHTML = '';
  let lastDate = null;
  for (const entry of log) {
    const d = new Date(entry.ts);
    const day = d.toDateString();
    if (day !== lastDate) {
      lastDate = day;
      const hdr = document.createElement('div');
      hdr.className = 'hist-date';
      hdr.textContent = day === new Date().toDateString() ? 'today' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      el.appendChild(hdr);
    }
    const icon = ACTIVITY_ICONS[entry.type] || ACTIVITY_ICONS['action'];
    const row = document.createElement('div');
    row.className = 'hist-row';
    row.innerHTML = `
      <i class="ti ${icon} hist-icon"></i>
      <div class="hist-source">
        <div>${entry.label}</div>
        ${entry.note ? `<div class="hist-note">${entry.note}</div>` : ''}
      </div>
      <div class="hist-time">${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
      <button class="hist-del" onclick="deleteActivity('${entry.id}')"><i class="ti ti-x"></i></button>`;
    el.appendChild(row);
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
  const now   = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  // ── todos ──
  const done  = S.todos.filter(t => t.done).length;
  const total = S.todos.length;
  const overdue = S.todos.filter(t => !t.done && t.dueDate && t.dueDate < today).length;
  const dueToday = S.todos.filter(t => !t.done && t.dueDate === today).length;
  const todosVal  = document.getElementById('now-todos-val');
  const todosSub  = document.getElementById('now-todos-sub');
  const todosNote = document.getElementById('now-todos-note');
  if (todosVal) {
    if (!total) { todosVal.textContent = 'nothing yet'; todosSub.textContent = ''; todosNote.textContent = 'add your first task'; }
    else {
      todosVal.textContent = `${done} / ${total}`;
      todosSub.textContent = done === total ? 'all done ✓' : `${total - done} remaining`;
      if (overdue > 0) todosNote.textContent = `${overdue} overdue — catch up`;
      else if (dueToday > 0) todosNote.textContent = `${dueToday} due today`;
      else if (done === total && total > 0) todosNote.textContent = 'clear day, nice work';
      else todosNote.textContent = 'nothing urgent';
    }
  }

  // ── goal ──
  const topGoal = [...(S.goals || [])].filter(g => g.cur < g.max).sort((a,b) => (b.cur/b.max) - (a.cur/a.max))[0];
  const goalVal  = document.getElementById('now-goal-val');
  const goalSub  = document.getElementById('now-goal-sub');
  const goalNote = document.getElementById('now-goal-note');
  if (goalVal) {
    if (!topGoal) { goalVal.textContent = 'no goals yet'; goalSub.textContent = ''; goalNote.textContent = 'set something to work toward'; }
    else {
      const pct = Math.round((topGoal.cur/topGoal.max)*100);
      goalVal.textContent = topGoal.name;
      goalSub.textContent = `${topGoal.cur} / ${topGoal.max}`;
      if (pct >= 90) goalNote.textContent = 'almost there';
      else if (pct >= 50) goalNote.textContent = 'past the halfway mark';
      else if (pct > 0) goalNote.textContent = 'building momentum';
      else goalNote.textContent = 'time to start';
    }
  }

  // ── hobby ──
  const lastHobby = (S.activityLog || []).find(e => e.type === 'hobby');
  const hobbyVal  = document.getElementById('now-hobby-val');
  const hobbySub  = document.getElementById('now-hobby-sub');
  const hobbyNote = document.getElementById('now-hobby-note');
  if (hobbyVal) {
    if (!lastHobby) { hobbyVal.textContent = 'nothing yet'; hobbySub.textContent = ''; hobbyNote.textContent = 'log your first session'; }
    else {
      hobbyVal.textContent = lastHobby.label.replace('logged ','').replace(' session','');
      const ago = Math.floor((Date.now() - lastHobby.ts) / 3600000);
      const days = Math.floor(ago/24);
      hobbySub.textContent = ago < 1 ? 'just now' : ago < 24 ? `${ago}h ago` : `${days}d ago`;
      if (days >= 3) hobbyNote.textContent = `${days} days quiet — pick it back up?`;
      else if (ago < 24) hobbyNote.textContent = 'fresh session, keep it going';
      else hobbyNote.textContent = 'steady pace';
    }
  }

  // ── music ──
  const lastMusic = (S.musicLog || [])[0];
  const musicVal  = document.getElementById('now-music-val');
  const musicSub  = document.getElementById('now-music-sub');
  const musicNote = document.getElementById('now-music-note');
  if (musicVal) {
    if (!lastMusic) { musicVal.textContent = 'nothing logged'; musicSub.textContent = ''; musicNote.textContent = 'log what you\'re hearing'; }
    else {
      musicVal.textContent = lastMusic.title || lastMusic.raw;
      musicSub.textContent = lastMusic.artist || lastMusic.genre || '';
      const moods = (S.musicLog||[]).slice(0,5).map(m=>m.mood).filter(Boolean).join(' ').toLowerCase();
      if (lastMusic.genre) musicNote.textContent = `mostly ${lastMusic.genre} lately`;
      else musicNote.textContent = 'see your full taste profile';
    }
  }

  renderOutfitLine();
}

// ─── OUTFIT SUGGESTION ────────────────────────────────────
function renderOutfitLine() {
  const el = document.getElementById('outfit-line');
  if (!el) return;
  if (typeof _skyWeatherId === 'undefined' || _skyWeatherId == null) { el.textContent = ''; return; }

  const tempEl = document.getElementById('sky-left');
  const tempMatch = tempEl?.textContent.match(/(-?\d+)°F/);
  const temp = tempMatch ? parseInt(tempMatch[1]) : null;
  if (temp === null) { el.textContent = ''; return; }

  const id = _skyWeatherId;
  const isRain  = id >= 300 && id < 600;
  const isStorm = id >= 200 && id < 300;
  const isSnow  = id >= 600 && id < 700;

  let suggestion = '';
  if (isStorm) suggestion = 'stormy out — stay in if you can, grab a waterproof layer if not';
  else if (isSnow) suggestion = 'snow today — boots, gloves, and a heavy coat';
  else if (isRain) suggestion = temp < 50 ? 'cold and wet — waterproof jacket, warm layers underneath' : 'rain expected — bring something waterproof';
  else if (temp >= 85) suggestion = 'hot one — light fabrics, stay hydrated';
  else if (temp >= 70) suggestion = 'warm and easy — t-shirt weather';
  else if (temp >= 55) suggestion = 'mild — a light layer should do it';
  else if (temp >= 40) suggestion = 'cool out — jacket weather';
  else if (temp >= 25) suggestion = 'cold — coat, and maybe a scarf';
  else suggestion = 'brutally cold — bundle up, layers on layers';

  el.textContent = suggestion;
}

function renderWorldTodosPreview() {
  const el = document.getElementById('world-todos-rows');
  if (!el) return;

  const now   = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  // priority: overdue, then due today, then no-date incomplete, then upcoming — cap at 4
  const incomplete = (S.todos || []).filter(t => !t.done);
  const overdue   = incomplete.filter(t => t.dueDate && t.dueDate < today);
  const dueToday  = incomplete.filter(t => t.dueDate === today);
  const noDate    = incomplete.filter(t => !t.dueDate);
  const upcoming  = incomplete.filter(t => t.dueDate && t.dueDate > today)
                               .sort((a,b) => a.dueDate.localeCompare(b.dueDate));

  const ordered = [...overdue, ...dueToday, ...noDate, ...upcoming].slice(0, 4);

  el.innerHTML = '';
  if (!ordered.length) {
    el.innerHTML = '<div class="world-todos-empty">nothing pending — you are clear</div>';
    return;
  }

  ordered.forEach(t => {
    const due = dueDateLabel(t.dueDate);
    const priColor = t.priority ? PRI_COLORS[t.priority] : null;
    const row = document.createElement('div');
    row.className = 'world-todo-row';
    row.innerHTML = `
      ${priColor ? `<div class="t-pri-bar" style="background:${priColor}"></div>` : '<div class="t-pri-bar" style="background:transparent"></div>'}
      <div class="tcirc" data-id="${t.id}"></div>
      <span class="world-todo-label">${t.label}</span>
      ${due ? `<span class="t-due ${due.cls}">${due.text}</span>` : ''}`;
    const circ = row.querySelector('.tcirc');
    circ.classList.toggle('done', t.done);
    circ.addEventListener('click', () => {
      t.done = !t.done;
      circ.classList.toggle('done', t.done);
      if (t.done) logActivity('completed: ' + t.label, 'todo');
      save();
      renderCalendar();
      renderTodos('todos-all');
      updateNavDots();
      setTimeout(() => renderWorldTodosPreview(), 250);
    });
    el.appendChild(row);
  });
}

// ─── NAV DOTS ─────────────────────────────────────────────
function updateNavDots() {
  setNavDot('todos',   S.todos.some(t => !t.done), 'bnb');
  const today = todayKey();
  const hasJournalToday = !!(S.journal?.[today]?.text?.trim());
  const shouldDotJournal = !hasJournalToday && (Object.keys(S.journal||{}).length > 0 || (S.activityLog||[]).length > 0);
  setNavDot('journal', shouldDotJournal, 'mbtn');
}

function setNavDot(tab, show, prefix = 'bnb') {
  const btn = document.getElementById(`${prefix}-${tab}`);
  if (!btn) return;
  const existing = btn.querySelector('.nb-dot');
  if (show && !existing) {
    const dot = document.createElement('span');
    dot.className = 'nb-dot';
    btn.appendChild(dot);
  } else if (!show && existing) {
    existing.remove();
  }
}

// ─── RENDER ALL ───────────────────────────────────────────
function renderAll() {
  renderHobbies();
  renderGoals();
  renderTodos('todos-all');
  renderCalendar();
  renderNowStrip();
  updateNavDots();
}

// ─── RENDER: HOBBIES ──────────────────────────────────────
function renderHobbies() {
  const list = document.getElementById('hobby-list');
  list.innerHTML = '';
  for (const h of S.hobbies) {
    const c = HOBBY_COLORS[h.color] || HOBBY_COLORS.sage;
    const card = document.createElement('div');
    card.className = 'hcard';
    card.draggable = true;
    card.dataset.id = h.id;
    card.innerHTML = `
      <div class="hcard-top">
        <div class="hdrag-handle"><i class="ti ti-grip-vertical"></i></div>
        <div class="hico" style="background:${c.bg}"><i class="ti ${h.icon}" style="color:${c.fill}"></i></div>
        <div class="hinfo">
          <div class="hname">${h.name}</div>
          <div class="hsub">${h.sessions || 0} sessions${h.streak ? `  ·  <span style="color:var(--rose)">${h.streak}d streak</span>` : ''}</div>
        </div>
      </div>
      <div class="hbtns">
        <button class="btn p" onclick="logHobby('${h.id}', this)">log session</button>
        <button class="btn"   onclick="openHobbyModal('${h.id}')">edit</button>
        <button class="btn"   onclick="sendPrompt('tips for ${h.name}')">tips ↗</button>
      </div>`;
    card.addEventListener('dragstart', e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', h.id); setTimeout(() => card.classList.add('dragging'), 0); });
    card.addEventListener('dragend',  () => card.classList.remove('dragging'));
    card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave',() => card.classList.remove('drag-over'));
    card.addEventListener('drop', e => {
      e.preventDefault(); card.classList.remove('drag-over');
      const from = S.hobbies.findIndex(x => x.id === e.dataTransfer.getData('text/plain'));
      const to   = S.hobbies.findIndex(x => x.id === h.id);
      if (from !== to) { const [m] = S.hobbies.splice(from, 1); S.hobbies.splice(to, 0, m); save(); renderHobbies(); }
    });
    list.appendChild(card);
  }
}

// ─── RENDER: GOALS ────────────────────────────────────────
function renderGoals() {
  const list = document.getElementById('goal-list');
  list.innerHTML = '';
  for (const g of S.goals) {
    const c = HOBBY_COLORS[g.color] || HOBBY_COLORS.sage;
    const pct      = Math.min(100, Math.round((g.cur / g.max) * 100));
    const complete = pct >= 100;
    const status   = complete ? 'complete' : pct > 50 ? 'past halfway' : pct > 0 ? 'in progress' : 'not started';
    const card = document.createElement('div');
    card.className = 'gcard' + (complete ? ' gcard-complete' : '');
    card.draggable = true;
    card.dataset.id = g.id;
    card.innerHTML = `
      <div class="gtop">
        <div class="hdrag-handle"><i class="ti ti-grip-vertical"></i></div>
        <div class="gico" style="background:${c.bg}"><i class="ti ${complete ? 'ti-check' : g.icon}" style="color:${complete ? 'var(--sage)' : c.fill};font-size:14px"></i></div>
        <div style="flex:1">
          <div class="gname ${complete ? 'gname-done' : ''}">${g.name}</div>
          <div class="gdesc">${g.desc}</div>
          <span class="gstatus" style="background:${complete ? 'rgba(94,150,100,.12)' : c.bg};color:${complete ? 'var(--sage)' : c.text}">${status}</span>
        </div>
      </div>
      <div class="gbot">
        <div class="gbar-bg"><div class="gbar-fill" style="width:0%;background:${complete ? 'var(--sage)' : c.fill}" data-w="${pct}"></div></div>
        <div class="gpct" style="${complete ? 'color:var(--sage)' : ''}">${g.cur} / ${g.max}</div>
      </div>
      <div class="hbtns">
        ${!complete
          ? `<button class="btn p" onclick="incGoal('${g.id}')">+ progress</button>`
          : `<button class="btn" style="color:var(--sage);border-color:rgba(94,150,100,.3)" disabled>completed ✓</button>`}
        <button class="btn" onclick="openGoalModal('${g.id}')">edit</button>
        <button class="btn" onclick="sendPrompt('advice on goal: ${g.name}')">advice ↗</button>
      </div>`;
    card.addEventListener('dragstart', e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', g.id); setTimeout(() => card.classList.add('dragging'), 0); });
    card.addEventListener('dragend',  () => card.classList.remove('dragging'));
    card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave',() => card.classList.remove('drag-over'));
    card.addEventListener('drop', e => {
      e.preventDefault(); card.classList.remove('drag-over');
      const from = S.goals.findIndex(x => x.id === e.dataTransfer.getData('text/plain'));
      const to   = S.goals.findIndex(x => x.id === g.id);
      if (from !== to) { const [m] = S.goals.splice(from, 1); S.goals.splice(to, 0, m); save(); renderGoals(); }
    });
    list.appendChild(card);
  }
  requestAnimationFrame(() => {
    list.querySelectorAll('.gbar-fill').forEach(el => { requestAnimationFrame(() => { el.style.width = el.dataset.w + '%'; }); });
  });
}

// ─── CALENDAR ─────────────────────────────────────────────
let _calYear  = new Date().getFullYear();
let _calMonth = new Date().getMonth();
let _calFilter = null; // 'YYYY-MM-DD' or null

function renderCalendar() {
  const grid  = document.getElementById('cal-grid');
  const label = document.getElementById('cal-month');
  if (!grid) return;

  const now   = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  label.textContent = new Date(_calYear, _calMonth, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  // build set of dates that have todos
  const todoDateSet = {};
  (S.todos || []).forEach(t => {
    if (t.dueDate) {
      if (!todoDateSet[t.dueDate]) todoDateSet[t.dueDate] = { total:0, overdue:0, done:0 };
      todoDateSet[t.dueDate].total++;
      if (t.done) todoDateSet[t.dueDate].done++;
      else if (t.dueDate < today) todoDateSet[t.dueDate].overdue++;
    }
  });

  const firstDay = new Date(_calYear, _calMonth, 1).getDay();
  const daysInMonth = new Date(_calYear, _calMonth+1, 0).getDate();

  grid.innerHTML = '';

  // empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-cell cal-empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${_calYear}-${String(_calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const info    = todoDateSet[dateStr];
    const isToday = dateStr === today;
    const isSelected = dateStr === _calFilter;

    const cell = document.createElement('div');
    cell.className = 'cal-cell'
      + (isToday    ? ' cal-today'    : '')
      + (isSelected ? ' cal-selected' : '')
      + (info?.overdue ? ' cal-overdue-day' : '');
    cell.innerHTML = `<span class="cal-day-num">${d}</span>`;

    if (info) {
      const dot = document.createElement('div');
      dot.className = 'cal-dot' + (info.overdue ? ' cal-dot-overdue' : info.done === info.total ? ' cal-dot-done' : '');
      cell.appendChild(dot);
    }

    cell.addEventListener('click', () => {
      if (_calFilter === dateStr) { clearCalFilter(); }
      else { _calFilter = dateStr; renderCalendar(); renderTodos('todos-all'); }
    });

    grid.appendChild(cell);
  }
}

function calPrev() { _calMonth--; if (_calMonth < 0) { _calMonth = 11; _calYear--; } renderCalendar(); }
function calNext() { _calMonth++; if (_calMonth > 11) { _calMonth = 0; _calYear++; } renderCalendar(); }

function clearCalFilter() {
  _calFilter = null;
  renderCalendar();
  renderTodos('todos-all');
  const filterBtn = document.getElementById('clear-cal-filter-btn');
  if (filterBtn) filterBtn.style.opacity = '0';
  const label = document.getElementById('todos-section-label');
  if (label) label.textContent = 'all tasks';
}

// ─── RENDER: TODOS ────────────────────────────────────────
function dueDateLabel(dueDate) {
  if (!dueDate) return null;
  const now     = new Date();
  const today   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate()+1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
  if (dueDate < today)      return { text: 'overdue',   cls: 'due-overdue' };
  if (dueDate === today)    return { text: 'today',      cls: 'due-today'   };
  if (dueDate === tomorrowStr) return { text: 'tomorrow', cls: 'due-soon'    };
  const [y,m,d] = dueDate.split('-').map(Number);
  return { text: new Date(y,m-1,d).toLocaleDateString(undefined,{month:'short',day:'numeric'}), cls: 'due-future' };
}

const PRI_COLORS = { high:'var(--rose)', medium:'var(--amber)', low:'var(--sage)' };

function renderTodos(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  let todos = [...(S.todos || [])];

  // calendar filter
  const filterBtn  = document.getElementById('clear-cal-filter-btn');
  const labelEl    = document.getElementById('todos-section-label');
  if (_calFilter) {
    todos = todos.filter(t => t.dueDate === _calFilter);
    if (filterBtn) filterBtn.style.opacity = '1';
    const [y,m,d] = _calFilter.split('-').map(Number);
    if (labelEl) labelEl.textContent = new Date(y,m-1,d).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  } else {
    if (filterBtn) filterBtn.style.opacity = '0';
    if (labelEl) labelEl.textContent = 'all tasks';
  }

  el.innerHTML = '';

  const now   = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  // group
  const groups = [
    { key:'overdue',  label:'overdue',   todos: todos.filter(t => !t.done && t.dueDate && t.dueDate < today) },
    { key:'today',    label:'today',     todos: todos.filter(t => !t.done && t.dueDate === today) },
    { key:'upcoming', label:'upcoming',  todos: todos.filter(t => !t.done && t.dueDate && t.dueDate > today) },
    { key:'none',     label:'no date',   todos: todos.filter(t => !t.done && !t.dueDate) },
    { key:'done',     label:'completed', todos: todos.filter(t => t.done) },
  ];

  // if calendar filter active, show flat list instead of groups
  if (_calFilter) {
    if (!todos.length) {
      el.innerHTML = '<div style="color:var(--ink3);font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:16px 0">nothing due this day</div>';
    } else {
      todos.forEach(t => el.appendChild(makeTodoRow(t)));
    }
  } else {
    let hasAny = false;
    groups.forEach(({ key, label, todos: group }) => {
      if (!group.length) return;
      hasAny = true;
      const hdr = document.createElement('div');
      hdr.className = 'todo-group-hdr todo-group-' + key;
      hdr.textContent = label;
      el.appendChild(hdr);
      group.forEach(t => el.appendChild(makeTodoRow(t)));
    });
    if (!hasAny) {
      el.innerHTML = '<div style="color:var(--ink3);font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:16px 0">nothing here</div>';
    }
  }

  const clearBtn = document.getElementById('clear-done-btn');
  if (clearBtn) clearBtn.style.opacity = S.todos.some(t => t.done) ? '1' : '0';
  updateNavDots();
}

function makeTodoRow(t) {
  const due     = dueDateLabel(t.dueDate);
  const priColor = t.priority ? PRI_COLORS[t.priority] : null;

  const row = document.createElement('div');
  row.className = 'trow' + (due?.cls === 'due-overdue' && !t.done ? ' trow-overdue' : '');
  row.draggable = true;
  row.dataset.id = t.id;
  row.innerHTML = `
    <div class="tdrag-handle"><i class="ti ti-grip-vertical"></i></div>
    ${priColor ? `<div class="t-pri-bar" style="background:${priColor}"></div>` : ''}
    <div class="tcirc ${t.done ? 'done' : ''}"></div>
    <div class="t-body">
      <span class="tlabel ${t.done ? 'done' : ''}">${t.label}</span>
      <div class="t-meta">
        ${due ? `<span class="t-due ${due.cls}">${due.text}</span>` : ''}
        ${t.note ? `<span class="t-note-preview">${t.note.slice(0,40)}${t.note.length>40?'…':''}</span>` : ''}
      </div>
    </div>
    <button class="tedit-btn" onclick="openTodoModal('${t.id}')"><i class="ti ti-pencil"></i></button>`;

  row.querySelector('.tcirc').addEventListener('click', () => toggleTodo(t.id, row));
  row.querySelector('.tlabel').addEventListener('click', () => toggleTodo(t.id, row));

  row.addEventListener('dragstart', e => { e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',t.id); setTimeout(()=>row.classList.add('dragging'),0); });
  row.addEventListener('dragend',  () => row.classList.remove('dragging'));
  row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('drag-over'); });
  row.addEventListener('dragleave',() => row.classList.remove('drag-over'));
  row.addEventListener('drop', e => {
    e.preventDefault(); row.classList.remove('drag-over');
    const from = S.todos.findIndex(x => x.id === e.dataTransfer.getData('text/plain'));
    const to   = S.todos.findIndex(x => x.id === t.id);
    if (from !== to) { const [m] = S.todos.splice(from,1); S.todos.splice(to,0,m); save(); renderTodos('todos-all'); }
  });

  return row;
}

// ─── ACTIONS ──────────────────────────────────────────────
function logHobby(id, btn) {
  const h = S.hobbies.find(x => x.id === id);
  if (!h) return;
  h.sessions = (h.sessions || 0) + 1;
  const entryId = 'a' + Date.now() + Math.random().toString(36).slice(2);
  logActivityWithId(entryId, 'logged ' + h.name + ' session', 'hobby');
  updateHobbyStreaks();
  save(); renderAll();

  const card = btn?.closest('.hcard');
  if (card && !card.querySelector('.session-note-wrap')) {
    const wrap = document.createElement('div');
    wrap.className = 'session-note-wrap';
    wrap.innerHTML = `
      <input class="session-note-in" placeholder="how was it? (optional)" data-entry="${entryId}" />
      <button class="session-note-save" onclick="saveSessionNote(this)">save</button>
      <button class="session-note-skip" onclick="this.closest('.session-note-wrap').remove()">skip</button>`;
    card.appendChild(wrap);
    setTimeout(() => wrap.querySelector('.session-note-in')?.focus(), 50);
    wrap.querySelector('.session-note-in').addEventListener('keydown', e => {
      if (e.key === 'Enter') saveSessionNote(wrap.querySelector('.session-note-save'));
      if (e.key === 'Escape') wrap.remove();
    });
  }
}

function incGoal(id) {
  const g = S.goals.find(x => x.id === id);
  if (!g || g.cur >= g.max) return;
  g.cur++;
  const justCompleted = g.cur >= g.max;
  logActivity(g.name + (justCompleted ? ' — completed' : ' — progress'), 'goal');
  save(); renderAll();

  if (justCompleted) {
    setTimeout(() => {
      if (!spiritOpen) spiritToggle();
      showSpiritTyping();
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 80, system: buildSpiritPrompt('goals'), messages: [{ role: 'user', content: `[goal just completed: "${g.name}". one sentence, direct.]` }] }),
      }).then(r => r.json()).then(data => {
        hideSpiritTyping();
        spiritAddBubble(data.content?.find(b => b.type === 'text')?.text || `${g.name} done.`, 'ai');
      }).catch(() => hideSpiritTyping());
    }, 400);
  }
}

function toggleTodo(id, row) {
  const t = S.todos.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  row.querySelector('.tcirc').classList.toggle('done', t.done);
  row.querySelector('.tlabel').classList.toggle('done', t.done);
  if (t.done) logActivity('completed: ' + t.label, 'todo');
  save();
  renderCalendar();
  const clearBtn = document.getElementById('clear-done-btn');
  if (clearBtn) clearBtn.style.opacity = S.todos.some(t => t.done) ? '1' : '0';
  updateNavDots();
}

function clearCompleted() { S.todos = S.todos.filter(t => !t.done); save(); renderTodos('todos-all'); renderCalendar(); }

function addTodo() {
  const inp = document.getElementById('todo-in');
  const v = inp.value.trim();
  if (!v) return;
  S.todos.push({ id: 't' + Date.now(), label: v, done: false, dueDate: null, priority: null, note: '' });
  logActivity('added todo: ' + v, 'add');
  inp.value = '';
  save(); renderTodos('todos-all'); renderCalendar();
}

// ─── MUSIC ────────────────────────────────────────────────
let musicSort = 'recent';
const GENRE_PALETTE = ['#2c2c2c','#555','#888','#aaa','#ccc','#444','#666','#999','#bbb','#ddd'];

function setMusicSort(sort) {
  musicSort = sort;
  document.querySelectorAll('.music-sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === sort));
  renderMusicLog();
}

async function addMusicEntry() {
  const inp = document.getElementById('music-in');
  const raw = inp.value.trim();
  if (!raw) return;
  inp.value = ''; inp.disabled = true;
  const btn = document.getElementById('music-add-btn'); btn.disabled = true;
  const msg = document.getElementById('music-parsing-msg'); msg.classList.remove('hidden');

  let parsed = { title: raw, artist: '', album: '', genre: 'other', subgenre: '', mood: '' };
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 300, messages: [{ role: 'user', content: `The user typed: "${raw}"\nIdentify this music entry and respond ONLY with valid JSON, nothing else:\n{"title":"song or empty","artist":"artist or empty","album":"album or empty","genre":"primary genre lowercase (j-pop, city pop, indie rock, hip-hop, r&b, electronic, pop, classical, jazz, metal, folk, anime ost, ambient, lo-fi, alternative, soul)","subgenre":"specific or empty","mood":"1-3 mood words comma separated"}` }] }),
    });
    const data = await res.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '{}';
    parsed = { ...parsed, ...JSON.parse(text.replace(/```json|```/g,'').trim()) };
  } catch(e) {}

  if (!S.musicLog) S.musicLog = [];
  const entry = { id: 'm' + Date.now(), raw, title: parsed.title || raw, artist: parsed.artist || '', album: parsed.album || '', genre: (parsed.genre || 'other').toLowerCase().trim(), subgenre: parsed.subgenre || '', mood: parsed.mood || '', ts: Date.now() };
  S.musicLog.unshift(entry);
  logActivity('logged: ' + (entry.title || raw) + (entry.artist ? ' — ' + entry.artist : ''), 'music');
  save();

  msg.classList.add('hidden'); inp.disabled = false; btn.disabled = false; inp.focus();
  renderMusicTab(); renderNowStrip();
}

function computeMusicProfile() {
  const log = S.musicLog || [];
  if (!log.length) return null;
  const genreCounts = {}, artistCounts = {}, moodCounts = {};
  for (const e of log) {
    const g = e.genre || 'other';
    genreCounts[g] = (genreCounts[g] || 0) + 1;
    if (e.artist) artistCounts[e.artist] = (artistCounts[e.artist] || 0) + 1;
    (e.mood || '').split(',').forEach(m => { const mm = m.trim().toLowerCase(); if (mm) moodCounts[mm] = (moodCounts[mm] || 0) + 1; });
  }
  const total = log.length;
  const genres = Object.entries(genreCounts).sort((a,b) => b[1]-a[1]).map(([genre,count],i) => ({ genre, count, pct: Math.round(count/total*100), color: GENRE_PALETTE[i%GENRE_PALETTE.length] }));
  const topArtists = Object.entries(artistCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([artist,count])=>({artist,count}));
  const moods = Object.entries(moodCounts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([mood,count])=>({mood,count}));
  return { genres, topArtists, moods, identity: genres.slice(0,2).map(g=>g.genre).join(' · '), total };
}

function renderMusicTab() { renderMusicLog(); renderMusicCard(); }

function renderMusicLog() {
  const log = [...(S.musicLog || [])];
  const listEl = document.getElementById('music-log-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (!log.length) { listEl.innerHTML = '<div style="color:var(--ink3);font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:20px 0">nothing logged yet</div>'; return; }

  if (musicSort === 'genre')  log.sort((a,b) => (a.genre||'').localeCompare(b.genre||'') || b.ts-a.ts);
  else if (musicSort === 'artist') log.sort((a,b) => (a.artist||'').localeCompare(b.artist||'') || b.ts-a.ts);
  else if (musicSort === 'mood')   log.sort((a,b) => (a.mood||'').localeCompare(b.mood||'') || b.ts-a.ts);
  else log.sort((a,b) => b.ts-a.ts);

  const groupKey = e => {
    if (musicSort === 'genre')  return e.genre  || 'other';
    if (musicSort === 'artist') return e.artist || 'unknown';
    if (musicSort === 'mood')   return (e.mood||'').split(',')[0].trim() || 'other';
    const d = new Date(e.ts);
    return d.toDateString() === new Date().toDateString() ? 'today' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
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
  if (!profile || profile.total < 1) return;
  document.getElementById('mc-date').textContent = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  document.getElementById('mc-identity').textContent = profile.identity;
  drawPieChart(profile.genres);

  const legendEl = document.getElementById('mc-pie-legend');
  legendEl.innerHTML = '';
  profile.genres.slice(0,6).forEach(({ genre, pct, color }) => {
    const item = document.createElement('div');
    item.className = 'mc-legend-item';
    item.innerHTML = `<span class="mc-legend-dot" style="background:${color}"></span><span class="mc-legend-genre">${genre}</span><span class="mc-legend-pct">${pct}%</span>`;
    legendEl.appendChild(item);
  });

  const artistsEl = document.getElementById('mc-artists');
  artistsEl.innerHTML = '';
  profile.topArtists.forEach(({ artist, count }, i) => {
    const row = document.createElement('div');
    row.className = 'mc-artist-row';
    row.innerHTML = `<span class="mc-artist-rank">${i+1}</span><span class="mc-artist-name">${artist}</span><span class="mc-artist-count">${count}</span>`;
    artistsEl.appendChild(row);
  });

  const moodsEl = document.getElementById('mc-moods');
  moodsEl.innerHTML = '';
  profile.moods.forEach(({ mood, count }) => {
    const tag = document.createElement('span');
    tag.className = 'mc-mood-tag';
    tag.style.opacity = Math.max(0.35, Math.min(1, 0.35 + count * 0.18)) + '';
    tag.textContent = mood;
    moodsEl.appendChild(tag);
  });

  document.getElementById('mc-stats').innerHTML = `
    <div class="mc-stat"><div class="mc-stat-num">${profile.total}</div><div class="mc-stat-lbl">logged</div></div>
    <div class="mc-stat"><div class="mc-stat-num">${profile.genres.length}</div><div class="mc-stat-lbl">genres</div></div>
    <div class="mc-stat"><div class="mc-stat-num">${profile.topArtists.length}</div><div class="mc-stat-lbl">artists</div></div>`;
}

function drawPieChart(genres) {
  const canvas = document.getElementById('mc-pie');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = canvas.width/2, cy = canvas.height/2, r = Math.min(cx,cy) - 4;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const total = genres.reduce((a,g) => a + g.count, 0);
  let startAngle = -Math.PI/2;
  genres.forEach(({ count, color }) => {
    const slice = (count/total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg') || '#fdfcfa';
    ctx.lineWidth = 1.5; ctx.stroke();
    startAngle += slice;
  });
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.52, 0, Math.PI*2);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg') || '#fdfcfa';
  ctx.fill();
}

function deleteMusicEntry(id) { S.musicLog = (S.musicLog||[]).filter(e => e.id !== id); save(); renderMusicTab(); }

// ─── JOURNAL ──────────────────────────────────────────────
const JOURNAL_MOODS = ['😶','😌','🙂','😊','😄'];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function renderJournalTab() {
  if (!S.journal) S.journal = {};

  // today header
  const today = new Date();
  document.getElementById('journal-today-date').textContent =
    today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  // mood picker
  const moodEl = document.getElementById('journal-mood-picker');
  const key    = todayKey();
  const entry  = S.journal[key] || {};
  moodEl.innerHTML = '';
  JOURNAL_MOODS.forEach((m, i) => {
    const btn = document.createElement('button');
    btn.className = 'mood-btn' + (entry.mood === i ? ' mood-active' : '');
    btn.textContent = m;
    btn.onclick = () => {
      S.journal[key] = { ...(S.journal[key]||{}), mood: i };
      save();
      moodEl.querySelectorAll('.mood-btn').forEach((b,j) => b.classList.toggle('mood-active', j===i));
    };
    moodEl.appendChild(btn);
  });

  // textarea
  const ta = document.getElementById('journal-textarea');
  ta.value = entry.text || '';
  updateJournalCount();

  // past entries
  renderJournalPast();
}

function updateJournalCount() {
  const ta  = document.getElementById('journal-textarea');
  const el  = document.getElementById('journal-char-count');
  const len = ta?.value.length || 0;
  if (el) el.textContent = len > 0 ? `${len} chars` : '';
}

function saveJournalEntry() {
  if (!S.journal) S.journal = {};
  const key  = todayKey();
  const text = document.getElementById('journal-textarea')?.value.trim();
  const existing = S.journal[key] || {};
  S.journal[key] = { ...existing, text, ts: Date.now() };
  logActivity('journal entry', 'action');
  save();
  updateNavDots();
  const btn = document.getElementById('journal-save-btn');
  if (btn) { btn.textContent = 'saved ✓'; setTimeout(() => { btn.textContent = 'save'; }, 1500); }
  renderJournalPast();
}

function renderJournalPast() {
  const list = document.getElementById('journal-past-list');
  const label = document.getElementById('journal-past-label');
  if (!list) return;
  const today = todayKey();
  const entries = Object.entries(S.journal || {})
    .filter(([k]) => k !== today && (S.journal[k].text || '').trim())
    .sort((a,b) => b[0].localeCompare(a[0]))
    .slice(0, 30);

  if (label) label.style.display = entries.length ? '' : 'none';
  list.innerHTML = '';

  for (const [dateKey, entry] of entries) {
    const [y,m,d] = dateKey.split('-').map(Number);
    const date = new Date(y, m-1, d);
    const dateStr = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const mood = entry.mood != null ? JOURNAL_MOODS[entry.mood] : '';
    const preview = (entry.text||'').slice(0,120) + ((entry.text||'').length > 120 ? '…' : '');

    const card = document.createElement('div');
    card.className = 'journal-past-card';
    card.innerHTML = `
      <div class="journal-past-header">
        <div class="journal-past-date">${dateStr}</div>
        ${mood ? `<div class="journal-past-mood">${mood}</div>` : ''}
        <button class="journal-past-del" onclick="deleteJournalEntry('${dateKey}')"><i class="ti ti-x"></i></button>
      </div>
      <div class="journal-past-text">${preview}</div>`;

    // click to expand / edit
    card.querySelector('.journal-past-text').addEventListener('click', () => {
      expandJournalEntry(dateKey, card, entry);
    });
    list.appendChild(card);
  }
}

function expandJournalEntry(dateKey, card, entry) {
  // toggle inline expand
  const existing = card.querySelector('.journal-expand');
  if (existing) { existing.remove(); return; }
  const div = document.createElement('div');
  div.className = 'journal-expand';
  const ta = document.createElement('textarea');
  ta.className = 'journal-textarea journal-expand-ta';
  ta.value = entry.text || '';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'journal-save-btn';
  saveBtn.textContent = 'save';
  saveBtn.onclick = () => {
    S.journal[dateKey] = { ...entry, text: ta.value.trim(), ts: Date.now() };
    save();
    saveBtn.textContent = 'saved ✓';
    setTimeout(() => renderJournalPast(), 1000);
  };
  div.appendChild(ta); div.appendChild(saveBtn);
  card.appendChild(div);
  ta.focus();
}

function deleteJournalEntry(dateKey) {
  if (!confirm('Delete this entry?')) return;
  delete S.journal[dateKey];
  save(); renderJournalPast();
}

// expose journal context to spirit
function getJournalContext() {
  if (!S.journal) return 'none';
  const recent = Object.entries(S.journal)
    .sort((a,b) => b[0].localeCompare(a[0]))
    .slice(0,3)
    .map(([k,v]) => `${k}: "${(v.text||'').slice(0,80)}"`)
    .join(' | ');
  return recent || 'none';
}

// ─── NOTES ────────────────────────────────────────────────
const NOTE_COLORS = [
  { id: 'none',   bg: 'var(--bg1)',               border: 'var(--line)',              label: 'default' },
  { id: 'rose',   bg: 'rgba(200, 92,106,.08)',    border: 'rgba(200, 92,106,.22)',    label: 'rose'    },
  { id: 'sage',   bg: 'rgba( 94,150,100,.08)',    border: 'rgba( 94,150,100,.22)',    label: 'sage'    },
  { id: 'amber',  bg: 'rgba(184,112, 48,.08)',    border: 'rgba(184,112, 48,.22)',    label: 'amber'   },
  { id: 'violet', bg: 'rgba(128,112,176,.08)',    border: 'rgba(128,112,176,.22)',    label: 'violet'  },
];

let _noteNewColor = 'none';
let _notesSort    = 'recent';

function initNoteColorBar() {
  const bar = document.getElementById('notes-color-bar');
  if (!bar) return;
  bar.innerHTML = '';
  NOTE_COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'note-color-dot' + (c.id === _noteNewColor ? ' active' : '');
    btn.style.background = c.id === 'none' ? 'var(--line)' : c.border;
    btn.title = c.label;
    btn.onclick = () => {
      _noteNewColor = c.id;
      bar.querySelectorAll('.note-color-dot').forEach((b,i) => b.classList.toggle('active', NOTE_COLORS[i].id === c.id));
    };
    bar.appendChild(btn);
  });
}

function addNote() {
  const ta  = document.getElementById('notes-quick-in');
  const text = ta?.value.trim();
  if (!text) { ta?.focus(); return; }
  if (!S.notes) S.notes = [];
  S.notes.unshift({
    id:        'n' + Date.now(),
    text,
    pinned:    false,
    color:     _noteNewColor,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  ta.value = '';
  _noteNewColor = 'none';
  initNoteColorBar();
  save(); renderNotes();
}

function setNotesSort(sort) {
  _notesSort = sort;
  document.querySelectorAll('.notes-sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === sort));
  renderNotes();
}

function renderNotes() {
  const list   = document.getElementById('notes-list');
  const search = (document.getElementById('notes-search')?.value || '').toLowerCase();
  if (!list) return;
  if (!S.notes) S.notes = [];

  let notes = [...S.notes];

  // filter
  if (search) notes = notes.filter(n => n.text.toLowerCase().includes(search));

  // sort
  if (_notesSort === 'pinned') {
    notes.sort((a,b) => (b.pinned?1:0) - (a.pinned?1:0) || b.updatedAt - a.updatedAt);
  } else if (_notesSort === 'color') {
    notes.sort((a,b) => (a.color||'none').localeCompare(b.color||'none') || b.updatedAt - a.updatedAt);
  } else {
    notes.sort((a,b) => (b.pinned?1:0) - (a.pinned?1:0) || b.updatedAt - a.updatedAt);
  }

  list.innerHTML = '';

  if (!notes.length) {
    list.innerHTML = `<div style="color:var(--ink3);font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:20px 0">${search ? 'no matches' : 'no notes yet'}</div>`;
    return;
  }

  notes.forEach(note => {
    const c       = NOTE_COLORS.find(x => x.id === (note.color||'none')) || NOTE_COLORS[0];
    const isLong  = note.text.length > 280;
    const preview = isLong ? note.text.slice(0,280) + '…' : note.text;
    const updated = formatNoteTime(note.updatedAt);

    const card = document.createElement('div');
    card.className = 'note-card' + (note.pinned ? ' note-pinned' : '');
    card.style.background   = c.bg;
    card.style.borderColor  = c.border;
    card.dataset.id         = note.id;

    card.innerHTML = `
      <div class="note-toolbar">
        <button class="note-tool-btn note-pin-btn ${note.pinned ? 'active' : ''}" onclick="toggleNotePin('${note.id}')" title="${note.pinned ? 'unpin' : 'pin'}">
          <i class="ti ti-pin${note.pinned ? '-filled' : ''}"></i>
        </button>
        <div class="note-color-dots-inline" data-id="${note.id}">
          ${NOTE_COLORS.map(cc => `<button class="note-color-dot-sm ${(note.color||'none')===cc.id?'active':''}" style="background:${cc.id==='none'?'var(--line)':cc.border}" onclick="setNoteColor('${note.id}','${cc.id}',this)" title="${cc.label}"></button>`).join('')}
        </div>
        <div class="note-meta">${updated}</div>
        <button class="note-tool-btn note-copy-btn" onclick="copyNote('${note.id}')" title="copy">
          <i class="ti ti-copy"></i>
        </button>
        <button class="note-tool-btn note-del-btn" onclick="deleteNote('${note.id}')" title="delete">
          <i class="ti ti-trash"></i>
        </button>
      </div>
      <div class="note-body" data-id="${note.id}">
        <div class="note-text" id="note-text-${note.id}">${escapeHtml(preview)}</div>
        ${isLong ? `<button class="note-expand-btn" onclick="toggleNoteExpand('${note.id}', ${note.text.length})">show more</button>` : ''}
      </div>
      <div class="note-edit-area hidden" id="note-edit-${note.id}">
        <textarea class="note-edit-ta" id="note-edit-ta-${note.id}">${escapeHtml(note.text)}</textarea>
        <div class="note-edit-footer">
          <span class="note-char-count" id="note-char-${note.id}">${note.text.length} chars</span>
          <button class="note-save-btn" onclick="saveNoteEdit('${note.id}')">save</button>
          <button class="note-cancel-btn" onclick="cancelNoteEdit('${note.id}')">cancel</button>
        </div>
      </div>`;

    // click text area to edit
    card.querySelector('.note-text').addEventListener('click', () => startNoteEdit(note.id));

    list.appendChild(card);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

function formatNoteTime(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff/60000);
  const hrs  = Math.floor(diff/3600000);
  const days = Math.floor(diff/86400000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs  < 24) return `${hrs}h ago`;
  if (days < 7)  return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function toggleNotePin(id) {
  const n = (S.notes||[]).find(x => x.id === id);
  if (!n) return;
  n.pinned = !n.pinned;
  save(); renderNotes();
}

function setNoteColor(id, color, btn) {
  const n = (S.notes||[]).find(x => x.id === id);
  if (!n) return;
  n.color = color;
  save();
  // update card styling immediately
  const card = document.querySelector(`.note-card[data-id="${id}"]`);
  const c    = NOTE_COLORS.find(x => x.id === color) || NOTE_COLORS[0];
  if (card) { card.style.background = c.bg; card.style.borderColor = c.border; }
  // update dot active states
  btn.closest('.note-color-dots-inline')?.querySelectorAll('.note-color-dot-sm').forEach((b,i) => {
    b.classList.toggle('active', NOTE_COLORS[i].id === color);
  });
}

async function copyNote(id) {
  const n = (S.notes||[]).find(x => x.id === id);
  if (!n) return;
  try {
    await navigator.clipboard.writeText(n.text);
    // brief visual feedback on the copy button
    const btn = document.querySelector(`.note-card[data-id="${id}"] .note-copy-btn`);
    if (btn) {
      btn.innerHTML = '<i class="ti ti-check"></i>';
      setTimeout(() => { btn.innerHTML = '<i class="ti ti-copy"></i>'; }, 1400);
    }
  } catch(e) {}
}

function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  S.notes = (S.notes||[]).filter(x => x.id !== id);
  save(); renderNotes();
}

function startNoteEdit(id) {
  const textEl = document.getElementById('note-text-' + id);
  const editEl = document.getElementById('note-edit-' + id);
  if (!textEl || !editEl) return;
  textEl.closest('.note-body').classList.add('hidden');
  editEl.classList.remove('hidden');
  const ta = document.getElementById('note-edit-ta-' + id);
  if (ta) {
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    ta.addEventListener('input', () => {
      const cc = document.getElementById('note-char-' + id);
      if (cc) cc.textContent = ta.value.length + ' chars';
    });
    ta.addEventListener('keydown', e => {
      if ((e.ctrlKey||e.metaKey) && e.key === 's') { e.preventDefault(); saveNoteEdit(id); }
      if (e.key === 'Escape') cancelNoteEdit(id);
    });
  }
}

function saveNoteEdit(id) {
  const ta = document.getElementById('note-edit-ta-' + id);
  const n  = (S.notes||[]).find(x => x.id === id);
  if (!n || !ta) return;
  n.text      = ta.value;
  n.updatedAt = Date.now();
  save(); renderNotes();
}

function cancelNoteEdit(id) {
  const bodyEl = document.querySelector(`[data-id="${id}"].note-body`);
  const editEl = document.getElementById('note-edit-' + id);
  if (bodyEl) bodyEl.classList.remove('hidden');
  if (editEl) editEl.classList.add('hidden');
}

function toggleNoteExpand(id, fullLen) {
  const n   = (S.notes||[]).find(x => x.id === id);
  if (!n) return;
  const el  = document.getElementById('note-text-' + id);
  const btn = el?.nextElementSibling;
  if (!el) return;
  if (el.dataset.expanded === '1') {
    el.innerHTML  = escapeHtml(n.text.slice(0,280)) + '…';
    el.dataset.expanded = '0';
    if (btn) btn.textContent = 'show more';
  } else {
    el.innerHTML  = escapeHtml(n.text);
    el.dataset.expanded = '1';
    if (btn) btn.textContent = 'show less';
  }
}

function getPinnedNotesContext() {
  return (S.notes||[])
    .filter(n => n.pinned)
    .slice(0,3)
    .map(n => `"${n.text.slice(0,100)}"`)
    .join(' | ') || 'none';
}

// ─── EXPORT / IMPORT ──────────────────────────────────────
function exportData() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0,10);
  a.href = url; a.download = `hanagara-${date}.json`;
  a.click(); URL.revokeObjectURL(url);
}

function importData(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!confirm('This will replace all your current data. Continue?')) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      location.reload();
    } catch(err) {
      alert('Invalid file — could not import.');
    }
  };
  reader.readAsText(file);
  input.value = ''; // reset so same file can be re-selected
}

// ─── HOBBY STREAKS ────────────────────────────────────────
function updateHobbyStreaks() {
  // called whenever a session is logged
  // for each hobby, check activityLog for consecutive days
  const today = todayKey();
  S.hobbies.forEach(h => {
    // get all days this hobby was logged
    const days = new Set(
      (S.activityLog || [])
        .filter(e => e.label === 'logged ' + h.name + ' session')
        .map(e => {
          const d = new Date(e.ts);
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        })
    );
    // count consecutive days ending today
    let streak = 0;
    let cursor = new Date();
    while (true) {
      const k = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;
      if (!days.has(k)) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    h.streak = streak;
  });
}

// ─── WEEKLY RECAP ─────────────────────────────────────────
async function generateWeeklyRecap() {
  const btn = document.getElementById('recap-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'generating...'; }

  const weekAgo = Date.now() - 7 * 86400000;
  const log   = (S.activityLog || []).filter(e => e.ts > weekAgo);
  const music = (S.musicLog    || []).filter(e => e.ts > weekAgo);

  const sessions  = log.filter(e => e.type === 'hobby');
  const completed = log.filter(e => e.type === 'todo');
  const goals     = log.filter(e => e.type === 'goal');
  const topGenres = [...new Set(music.map(e => e.genre).filter(Boolean))].slice(0,3);
  const notes     = log.filter(e => e.note).map(e => `"${e.note}"`).join(', ');

  const summary = [
    sessions.length ? `${sessions.length} sessions (${[...new Set(sessions.map(e=>e.label.replace('logged ','').replace(' session','')))].join(', ')})` : 'no sessions',
    completed.length ? `${completed.length} tasks done` : null,
    goals.length ? `goals: ${[...new Set(goals.map(e=>e.label))].join(', ')}` : null,
    music.length ? `${music.length} songs${topGenres.length ? ', mainly '+topGenres.join('/') : ''}` : 'no music',
    notes ? `notes: ${notes}` : null,
  ].filter(Boolean).join('. ');

  if (!spiritOpen) spiritToggle();
  showSpiritTyping();

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 200, system: buildSpiritPrompt('weekly recap'), messages: [{ role: 'user', content: `[weekly recap. last 7 days: ${summary}. 2-3 sentences, direct, specific. no intro phrase.]` }] }),
    });
    const data = await res.json();
    hideSpiritTyping();
    spiritAddBubble(data.content?.find(b=>b.type==='text')?.text || 'quiet week.', 'ai');
    S.lastRecap = Date.now(); save();
  } catch(e) { hideSpiritTyping(); }

  if (btn) { btn.disabled = false; btn.textContent = 'generate weekly recap'; }
}

function maybeWeeklyRecap() {
  if (new Date().getDay() !== 0) return;
  if ((Date.now() - (S.lastRecap||0)) > 6*86400000) generateWeeklyRecap();
}

// ─── BOTTOM NAV ───────────────────────────────────────────
const BOTTOM_TABS = ['world','hobbies','goals','todos','music'];
const MORE_TABS   = ['journal','notes','history','settings'];

function nav(name) {
  TABS.forEach(t => {
    const panel = document.getElementById('panel-' + t);
    panel?.classList.toggle('on',     t === name);
    panel?.classList.toggle('hidden', t !== name);
  });

  // bottom bar active state
  BOTTOM_TABS.forEach(t => {
    document.getElementById('bnb-' + t)?.classList.toggle('bnb-on', t === name);
  });

  // more button active if a more-tab is selected
  const moreActive = MORE_TABS.includes(name);
  document.getElementById('bnb-more')?.classList.toggle('bnb-on', moreActive);
  MORE_TABS.forEach(t => {
    document.getElementById('mbtn-' + t)?.classList.toggle('more-btn-on', t === name);
  });

  if (name === 'world')    { resumeBlossom(); }
  else                     { pauseBlossom(); closeTimelineDrawer(); }
  document.getElementById('timeline-pulltab')?.classList.toggle('hidden', name !== 'world');
  if (name === 'history')  renderHistory();
  if (name === 'music')    renderMusicTab();
  if (name === 'journal')  { renderJournalTab(); setTimeout(updateNavDots, 100); }
  if (name === 'notes')    { renderNotes(); initNoteColorBar(); }
  if (name === 'settings') renderSettings();
  updateNavDots();
}

function navMore(name) {
  closeMoreDrawer();
  nav(name);
}

let _moreOpen = false;
function toggleMoreDrawer() {
  _moreOpen ? closeMoreDrawer() : openMoreDrawer();
}
function openMoreDrawer() {
  _moreOpen = true;
  document.getElementById('more-drawer')?.classList.remove('hidden');
  document.getElementById('more-overlay')?.classList.remove('hidden');
  document.getElementById('bnb-more')?.classList.add('bnb-on');
  requestAnimationFrame(() => {
    document.getElementById('more-drawer')?.classList.add('more-drawer-open');
  });
}
function closeMoreDrawer() {
  _moreOpen = false;
  const drawer = document.getElementById('more-drawer');
  drawer?.classList.remove('more-drawer-open');
  setTimeout(() => {
    drawer?.classList.add('hidden');
    document.getElementById('more-overlay')?.classList.add('hidden');
  }, 280);
  // don't remove active state if a more tab is selected
  const currentMoreActive = MORE_TABS.some(t => document.getElementById('panel-'+t)?.classList.contains('on'));
  if (!currentMoreActive) document.getElementById('bnb-more')?.classList.remove('bnb-on');
}

// ─── INTRO + ENTER ────────────────────────────────────────
// ─── INTRO SKY + FLOWER ───────────────────────────────────
let _flowerAnim   = null;
let _flowerAngle  = 0; // gentle breathing rotation

function initIntroSky() {
  const now  = new Date();
  const hour = now.getHours() + now.getMinutes()/60;
  const sky  = getSkyAtTime(hour);

  const bg = document.getElementById('intro-sky-bg');
  if (bg) bg.style.background = `linear-gradient(180deg,${sky.top} 0%,${sky.mid} 45%,${sky.hor} 100%)`;

  // stars at night
  const pEl = document.getElementById('intro-sky-particles');
  if (pEl && sky.p === 'stars') {
    for (let i = 0; i < 60; i++) {
      const s = document.createElement('div');
      const sz = Math.random()*2+0.5;
      s.className = 'sky-star';
      s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*85}%;width:${sz}px;height:${sz}px;animation-delay:${Math.random()*4}s;animation-duration:${2+Math.random()*3}s;background:${sky.text};opacity:${0.3+Math.random()*0.7}`;
      pEl.appendChild(s);
    }
  }

  if (sky.p !== 'stars') initIntroBirds(sky.text);

  // draw the top-down flower
  drawTopDownFlower(0);
  // gentle idle breathing
  let t = 0;
  _flowerAnim = setInterval(() => {
    t += 0.015;
    drawTopDownFlower(t);
  }, 40);
}

function drawTopDownFlower(t) {
  const canvas = document.getElementById('intro-flower-canvas');
  if (!canvas) return;
  const W = canvas.offsetWidth || 200;
  const H = canvas.offsetHeight || 200;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const cx = W/2, cy = H/2;
  const breathe = 1 + Math.sin(t) * 0.018; // very subtle pulse

  // ── leaves (behind petals) ──
  const leafCount = 6;
  for (let i = 0; i < leafCount; i++) {
    const angle  = (i / leafCount) * Math.PI * 2 + t * 0.08;
    const lLen   = 52 * breathe;
    const lWidth = 14;
    const lx     = cx + Math.cos(angle) * lLen;
    const ly     = cy + Math.sin(angle) * lLen;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(lWidth*0.5, lLen*0.35, lWidth*0.4, lLen*0.65, lLen*0.9, lLen*0.92);
    ctx.bezierCurveTo(-lWidth*0.4, lLen*0.65, -lWidth*0.5, lLen*0.35, 0, 0);
    ctx.fillStyle = i % 2 === 0 ? '#8aaa78' : '#6a9060';
    ctx.globalAlpha = 0.82;
    ctx.fill();
    // midrib
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(0, lLen*0.5, lLen*0.88, lLen*0.9);
    ctx.strokeStyle = '#5a7850';
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.restore();
  }

  // ── petals ──
  const petalCount = 8;
  for (let i = 0; i < petalCount; i++) {
    const angle  = (i / petalCount) * Math.PI * 2 + t * 0.04;
    const pLen   = 44 * breathe;
    const pWidth = 16;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    // petal shape
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(pWidth*0.6, 12, pWidth*0.55, pLen*0.6, 0, pLen);
    ctx.bezierCurveTo(-pWidth*0.55, pLen*0.6, -pWidth*0.6, 12, 0, 6);
    ctx.closePath();
    // gradient per petal
    const grad = ctx.createLinearGradient(0, 0, 0, pLen);
    grad.addColorStop(0, '#f5e8e0');
    grad.addColorStop(0.5, '#eedad0');
    grad.addColorStop(1, '#e8c8b8');
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.strokeStyle = '#d4b8a8';
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    // vein
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(0, pLen*0.5, 0, pLen*0.9);
    ctx.strokeStyle = '#c8a090';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.35;
    ctx.stroke();
    ctx.restore();
  }

  // ── inner petals ──
  const innerCount = 6;
  for (let i = 0; i < innerCount; i++) {
    const angle = (i / innerCount) * Math.PI * 2 + (t * 0.04) + (Math.PI / innerCount);
    const pLen  = 26 * breathe;
    const pWidth = 10;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(pWidth*0.5, 8, pWidth*0.45, pLen*0.55, 0, pLen);
    ctx.bezierCurveTo(-pWidth*0.45, pLen*0.55, -pWidth*0.5, 8, 0, 4);
    ctx.closePath();
    ctx.fillStyle = '#f8e8d8';
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.restore();
  }

  // ── stamen center ──
  ctx.globalAlpha = 1;
  const cRad = 10 * breathe;
  const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cRad);
  cGrad.addColorStop(0,  '#f0d840');
  cGrad.addColorStop(0.6,'#d8b820');
  cGrad.addColorStop(1,  '#c09010');
  ctx.beginPath();
  ctx.arc(cx, cy, cRad, 0, Math.PI*2);
  ctx.fillStyle = cGrad;
  ctx.fill();

  // stamen dots
  for (let i = 0; i < 12; i++) {
    const a = (i/12)*Math.PI*2 + t*0.1;
    const r = 7 + Math.sin(t*2 + i)*0.5;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a)*r, cy + Math.sin(a)*r, 1.5, 0, Math.PI*2);
    ctx.fillStyle = '#e0c030';
    ctx.globalAlpha = 0.7;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── SPIRAL BLOOM TRANSITION ──────────────────────────────
function bloomAndEnter() {
  // stop idle animation
  if (_flowerAnim) { clearInterval(_flowerAnim); _flowerAnim = null; }
  stopIntroBirds();

  const bc = document.getElementById('bloom-canvas');
  bc.style.display = 'block';
  bc.width  = window.innerWidth;
  bc.height = window.innerHeight;
  const ctx = bc.getContext('2d');
  const cx  = window.innerWidth  / 2;
  const cy  = window.innerHeight / 2;

  let frame = 0;
  const totalFrames = 65;
  const maxR = Math.sqrt(cx*cx + cy*cy) * 1.05;

  function drawBloomFrame() {
    ctx.clearRect(0, 0, bc.width, bc.height);
    const p = frame / totalFrames; // 0→1
    const eased = p < 0.5 ? 2*p*p : -1+(4-2*p)*p; // ease in-out

    // ── spiraling petals fill screen ──
    const petalCount = 8;
    for (let i = 0; i < petalCount; i++) {
      const baseAngle = (i / petalCount) * Math.PI * 2;
      const spin = eased * Math.PI * 3; // spiral 1.5 rotations
      const angle = baseAngle + spin;
      const pLen  = eased * maxR * 1.2;
      const pWidth = eased * maxR * 0.45;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(pWidth*0.5, pLen*0.2, pWidth*0.45, pLen*0.6, 0, pLen);
      ctx.bezierCurveTo(-pWidth*0.45, pLen*0.6, -pWidth*0.5, pLen*0.2, 0, 0);
      ctx.closePath();
      const alpha = Math.min(1, eased * 1.4);
      const grad = ctx.createLinearGradient(0, 0, 0, pLen);
      grad.addColorStop(0, `rgba(245,232,224,${alpha})`);
      grad.addColorStop(1, `rgba(232,200,184,${alpha})`);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }

    // ── spiraling leaves between petals ──
    const leafCount = 8;
    for (let i = 0; i < leafCount; i++) {
      const baseAngle = (i / leafCount) * Math.PI * 2 + (Math.PI / leafCount);
      const spin = eased * Math.PI * 2.5;
      const angle = baseAngle + spin;
      const lLen  = eased * maxR * 1.1;
      const lWidth = eased * maxR * 0.28;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(lWidth*0.5, lLen*0.25, lWidth*0.4, lLen*0.65, 0, lLen);
      ctx.bezierCurveTo(-lWidth*0.4, lLen*0.65, -lWidth*0.5, lLen*0.25, 0, 0);
      ctx.closePath();
      const alpha = Math.min(1, eased * 1.3);
      ctx.fillStyle = `rgba(${i%2===0?'138,170,120':'106,144,96'},${alpha*0.85})`;
      ctx.fill();
      // vine curl from center
      if (p > 0.2) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const vProgress = (p - 0.2) / 0.8;
        const vLen = lLen * vProgress * 0.85;
        ctx.quadraticCurveTo(lWidth*0.3*Math.sin(p*4), vLen*0.5, 0, vLen);
        ctx.strokeStyle = `rgba(80,110,60,${alpha*0.5})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── center circle grows to cover everything ──
    if (p > 0.55) {
      const coverP = (p - 0.55) / 0.45;
      const coverR = coverP * maxR * 1.3;
      const coverGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coverR);
      coverGrad.addColorStop(0,   `rgba(253,252,250,${coverP})`);
      coverGrad.addColorStop(0.6, `rgba(245,242,237,${coverP*0.9})`);
      coverGrad.addColorStop(1,   `rgba(235,231,224,0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, coverR, 0, Math.PI*2);
      ctx.fillStyle = coverGrad;
      ctx.fill();
    }

    frame++;
    if (frame <= totalFrames) {
      requestAnimationFrame(drawBloomFrame);
    } else {
      // hold for a beat, then transition to app
      setTimeout(() => {
        bc.style.display = 'none';
        document.getElementById('intro').style.display = 'none';
        document.getElementById('app').classList.remove('hidden');
        renderAll();
        loadSkyWeather();
        document.getElementById('bnb-world')?.classList.add('bnb-on');
        const today = new Date().toDateString();
        if (S.lastLogin !== today) { S.lastLogin = today; save(); }
        requestAnimationFrame(() => renderBlossom());
        setTimeout(maybeSpiritWhisper, 3000);
        setTimeout(maybeWeeklyRecap,   5000);
      }, 600); // hold the full bloom for 600ms
    }
  }

  requestAnimationFrame(drawBloomFrame);
}

// Simple canvas bird animation
let _birdAnimFrame = null;
const _birds = [];

function initIntroBirds(color) {
  const canvas = document.getElementById('intro-birds');
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');

  // parse color to rgba
  let r=80, g=80, b=80;
  if (color.startsWith('#')) {
    r = parseInt(color.slice(1,3),16);
    g = parseInt(color.slice(3,5),16);
    b = parseInt(color.slice(5,7),16);
  }
  const birdColor = `rgba(${r},${g},${b},0.55)`;

  // spawn 6-10 birds in loose flocks
  _birds.length = 0;
  const count = 6 + Math.floor(Math.random()*5);
  for (let i = 0; i < count; i++) {
    const flock = i < 4 ? 0 : 1; // two small flocks
    _birds.push({
      x:    -80 - Math.random()*200 - flock*300,
      y:    canvas.height * (0.1 + Math.random()*0.35),
      spd:  0.5 + Math.random()*0.6,
      amp:  2 + Math.random()*3,      // wing flap amplitude
      freq: 0.04 + Math.random()*0.03, // flap frequency
      phase: Math.random()*Math.PI*2,
      size: 6 + Math.random()*5,
    });
  }

  function drawBird(ctx, x, y, size, wingAngle, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.2;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    // left wing
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - size*0.7, y - wingAngle, x - size*1.4, y - wingAngle*0.3);
    // right wing
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + size*0.7, y - wingAngle, x + size*1.4, y - wingAngle*0.3);
    ctx.stroke();
  }

  let t = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t++;
    _birds.forEach(bird => {
      bird.x += bird.spd;
      const wingAngle = Math.sin(t * bird.freq + bird.phase) * bird.amp;
      const yWave = Math.sin(t * 0.008 + bird.phase) * 6;
      drawBird(ctx, bird.x, bird.y + yWave, bird.size, wingAngle, birdColor);
      // reset when off screen
      if (bird.x > canvas.width + 100) {
        bird.x = -80 - Math.random()*100;
        bird.y = canvas.height * (0.08 + Math.random()*0.38);
        bird.spd = 0.5 + Math.random()*0.6;
      }
    });
    _birdAnimFrame = requestAnimationFrame(animate);
  }

  if (_birdAnimFrame) cancelAnimationFrame(_birdAnimFrame);
  animate();
}

function stopIntroBirds() {
  if (_birdAnimFrame) { cancelAnimationFrame(_birdAnimFrame); _birdAnimFrame = null; }
}

async function loadIntroNote() {
  const el  = document.getElementById('inote');
  const btn = document.getElementById('ebtn');
  const hobbies = S.hobbies || [];
  const top = [...hobbies].sort((a,b) => (b.sessions||0)-(a.sessions||0))[0];
  const tod = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';

  const fallback = setTimeout(() => { el.textContent = 'ready.'; btn.classList.add('show'); }, 4000);

  try {
    const controller = new AbortController();
    const abort = setTimeout(() => controller.abort(), 3800);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 80, messages: [{ role: 'user', content: `One sentence for a life terminal intro. Time: ${tod}. Top hobby: ${top?.name || 'none'}. Direct, not poetic. No greeting.` }] }),
      signal: controller.signal,
    });
    clearTimeout(abort);
    const data = await res.json();
    el.textContent = data.content?.find(b => b.type==='text')?.text || 'ready.';
  } catch(e) { el.textContent = 'ready.'; }

  clearTimeout(fallback);
  btn.classList.add('show');
}

function enter() { bloomAndEnter(); }

// ─── SPIRIT ───────────────────────────────────────────────
let spiritOpen   = false;
let spiritTyping = false;

function deriveMood() {
  const daysSince = (S.activityLog||[]).length ? Math.floor((Date.now()-(S.activityLog[0].ts||0))/86400000) : 99;
  if (daysSince === 0) return 'warm';
  if (daysSince >= 3)  return 'searching';
  if (daysSince === 1) return 'neutral';
  return 'quiet';
}

function buildSpiritPrompt(screenContext) {
  const h = S.hobbies.map(x => `${x.name} (id:${x.id}, ${x.sessions||0} sessions)`).join(', ') || 'none';
  const g = S.goals.map(x => `${x.name} (id:${x.id}, ${x.cur}/${x.max})`).join(', ') || 'none';
  const recentLog = (S.activityLog||[]).slice(0,5).map(e => e.label).join(', ') || 'none';
  const lastMusic = (S.musicLog||[])[0];
  const memory = (S.spiritMemory||[]).slice(-6).join(' / ') || 'none';
  const daysSince = (S.activityLog||[]).length ? Math.floor((Date.now()-S.activityLog[0].ts)/86400000) : null;
  const journalCtx = getJournalContext();

  return `You are a quiet presence inside a personal life terminal called hanagara. You watch, remember, and occasionally speak.

Your voice: calm, direct, a little dry. You say the exact thing, not the decorated version. Mysticism comes from what you notice, not how you phrase it.

MOOD: ${deriveMood()}
DATA:
- Screen: ${screenContext||'general'}
- Hobbies: ${h}
- Goals: ${g}
- Recent: ${recentLog}
- Last music: ${lastMusic ? `${lastMusic.title} — ${lastMusic.artist} (${lastMusic.genre})` : 'nothing'}
- Last active: ${daysSince === null ? 'unknown' : daysSince === 0 ? 'today' : daysSince+'d ago'}
- Memory: ${memory}
- Recent journal: ${journalCtx}
- Pinned notes: ${getPinnedNotesContext()}

ACTIONS (append as JSON on a new line, only when asked):
{"action":"add_todo","label":"..."}
{"action":"log_hobby","hobbyId":"...","hobbyName":"..."}
{"action":"add_goal","name":"...","desc":"...","max":10}
{"action":"inc_goal","goalId":"...","goalName":"..."}

RULES:
- 1-2 sentences max. Often one is enough.
- No metaphors, no flowery language.
- No greetings. No "I notice", "I see".
- Don't explain yourself.
- Only suggest actions when asked.`;
}

function parseSpiritReply(raw) {
  const lines = raw.trim().split('\n');
  let action = null;
  const textLines = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('{"action"')) { try { action = JSON.parse(t); } catch(e) {} }
    else textLines.push(line);
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
  if (action && role === 'ai') {
    const chip = document.createElement('button');
    chip.className = 'spirit-action-chip';
    chip.textContent = actionChipLabel(action) + ' ↳';
    chip.onclick = () => { executeSpiritAction(action); chip.textContent = 'done ✓'; chip.disabled = true; chip.style.opacity = '.4'; };
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
    default: return 'do this';
  }
}

function executeSpiritAction(action) {
  switch (action.action) {
    case 'add_todo':
      S.todos.push({ id: 't'+Date.now(), label: action.label, done: false });
      logActivity('added todo: '+action.label, 'add'); save(); renderTodos('todos-all'); break;
    case 'log_hobby': {
      const h = S.hobbies.find(x => x.id === action.hobbyId);
      if (h) { h.sessions=(h.sessions||0)+1; logActivity('logged '+h.name+' session','hobby'); save(); renderAll(); } break;
    }
    case 'add_goal':
      S.goals.push({ id:'g'+Date.now(), name:action.name, desc:action.desc||'', icon:'ti-star', color:'sage', cur:0, max:action.max||10 });
      logActivity('added goal: '+action.name,'add'); save(); renderGoals(); break;
    case 'inc_goal': {
      const g = S.goals.find(x => x.id === action.goalId);
      if (g && g.cur < g.max) { g.cur++; logActivity(g.name+' — progress','goal'); save(); renderAll(); } break;
    }
  }
}

function spiritToggle() {
  spiritOpen = !spiritOpen;
  const orb = document.getElementById('spirit-orb');
  const bubbles = document.getElementById('spirit-bubbles');
  const inputRow = document.getElementById('spirit-input-row');
  orb.classList.toggle('spirit-open', spiritOpen);
  bubbles.classList.toggle('hidden', !spiritOpen);
  inputRow.classList.toggle('hidden', !spiritOpen);
  if (spiritOpen && !bubbles.children.length) spiritGreet();
  if (spiritOpen) setTimeout(() => document.getElementById('spirit-input')?.focus(), 100);
}

async function spiritGreet() {
  showSpiritTyping();
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 120, system: buildSpiritPrompt(currentScreenContext()), messages: [{ role: 'user', content: '[opened. one sentence, specific to data, no greeting.]' }] }),
    });
    const data = await res.json();
    const { text, action } = parseSpiritReply(data.content?.find(b=>b.type==='text')?.text || '...');
    hideSpiritTyping(); spiritAddBubble(text, 'ai', action); rememberFromReply(text);
  } catch(e) { hideSpiritTyping(); }
}

async function spiritSend() {
  const inp = document.getElementById('spirit-input');
  const msg = inp?.value.trim();
  if (!msg || spiritTyping) return;
  inp.value = '';
  spiritAddBubble(msg, 'user');
  chatHistory.push({ role: 'user', content: msg });
  spiritTyping = true; showSpiritTyping();
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 300, system: buildSpiritPrompt(currentScreenContext()), messages: chatHistory.slice(-12) }),
    });
    const data = await res.json();
    const { text, action } = parseSpiritReply(data.content?.find(b=>b.type==='text')?.text || '...');
    chatHistory.push({ role: 'assistant', content: text });
    hideSpiritTyping(); spiritAddBubble(text, 'ai', action); rememberFromReply(text); save();
  } catch(e) { hideSpiritTyping(); spiritAddBubble('something went wrong.', 'ai'); }
  spiritTyping = false;
}

function showSpiritTyping() {
  const area = document.getElementById('spirit-bubbles');
  if (!area) return;
  const t = document.createElement('div');
  t.className = 'spirit-bubble spirit-ai spirit-typing'; t.id = 'spirit-typing-indicator';
  t.innerHTML = '<span></span><span></span><span></span>';
  area.appendChild(t); area.scrollTop = area.scrollHeight;
}
function hideSpiritTyping() { document.getElementById('spirit-typing-indicator')?.remove(); }

function currentScreenContext() {
  const active = TABS.find(t => document.getElementById('panel-'+t)?.classList.contains('on'));
  const ctx = { world:'world tab — timeline and weather', hobbies:'hobbies', goals:'goals', todos:`todos (${S.todos.filter(t=>t.done).length}/${S.todos.length} done)`, music:'music tab', history:'activity history', settings:'settings' };
  return ctx[active] || 'app';
}

function rememberFromReply(reply) {
  if (!S.spiritMemory) S.spiritMemory = [];
  if (reply.length > 40 && Math.random() < 0.35) {
    const snippet = reply.split('.')[0].trim();
    if (snippet.length > 10 && snippet.length < 100) {
      S.spiritMemory.push(snippet);
      if (S.spiritMemory.length > 12) S.spiritMemory.shift();
    }
  }
}

async function maybeSpiritWhisper() {
  if (spiritOpen) return;
  const now = Date.now();
  if ((now - (S.spiritLastWhisper||0)) < 4*3600000) return;
  const daysSince = (S.activityLog||[]).length ? Math.floor((now-S.activityLog[0].ts)/86400000) : 99;
  const goalHalf  = S.goals.some(g => { const p=g.cur/g.max; return p>=0.5&&p<0.55; });
  if (!goalHalf && daysSince < 3) return;
  const trigger = daysSince >= 3 ? `${daysSince} days since last activity` : 'a goal just crossed halfway';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 80, system: buildSpiritPrompt(currentScreenContext()), messages: [{ role: 'user', content: `[${trigger}. one direct sentence.]` }] }),
    });
    const data = await res.json();
    const whisper = data.content?.find(b=>b.type==='text')?.text;
    if (whisper) { S.spiritLastWhisper = now; save(); showSpiritWhisper(whisper); }
  } catch(e) {}
}

function showSpiritWhisper(text) {
  const w = document.createElement('div');
  w.className = 'spirit-whisper'; w.textContent = text;
  document.body.appendChild(w);
  document.getElementById('spirit-orb')?.classList.add('spirit-pulse');
  setTimeout(() => document.getElementById('spirit-orb')?.classList.remove('spirit-pulse'), 2000);
  setTimeout(() => { w.classList.add('spirit-whisper-out'); setTimeout(() => w.remove(), 800); }, 8000);
}

function sendPrompt(text) {
  if (!spiritOpen) spiritToggle();
  const inp = document.getElementById('spirit-input');
  if (inp) { inp.value = text; spiritSend(); }
}

// ─── HOBBY MODAL ──────────────────────────────────────────
const HOBBY_ICONS = ['ti-crosshair','ti-trophy','ti-brush','ti-barbell','ti-camera','ti-music','ti-book','ti-run','ti-bike','ti-swim','ti-chess','ti-palette','ti-code','ti-pencil','ti-heart','ti-leaf','ti-star','ti-flame','ti-bolt','ti-moon','ti-plant','ti-paw','ti-chef-hat','ti-guitar-pick','ti-dice'];
let _editingHobbyId = null, _hmColor = 'sage', _hmIcon = 'ti-star';

function openHobbyModal(id = null) {
  _editingHobbyId = id;
  const h = id ? S.hobbies.find(x => x.id === id) : null;
  document.getElementById('modal-title').textContent = h ? 'edit hobby' : 'add hobby';
  document.getElementById('hm-name').value = h ? h.name : '';
  document.getElementById('hm-delete').style.display = h ? 'block' : 'none';
  _hmColor = h ? h.color : 'sage'; _hmIcon = h ? h.icon : 'ti-star';
  const colorsEl = document.getElementById('hm-colors'); colorsEl.innerHTML = '';
  for (const [key, c] of Object.entries(HOBBY_COLORS)) {
    const s = document.createElement('div');
    s.className = 'modal-color-swatch' + (key === _hmColor ? ' active' : '');
    s.style.background = c.fill; s.title = key;
    s.onclick = () => { _hmColor = key; colorsEl.querySelectorAll('.modal-color-swatch').forEach(x=>x.classList.remove('active')); s.classList.add('active'); };
    colorsEl.appendChild(s);
  }
  const iconsEl = document.getElementById('hm-icons'); iconsEl.innerHTML = '';
  for (const icon of HOBBY_ICONS) {
    const b = document.createElement('button');
    b.className = 'modal-icon-btn' + (icon === _hmIcon ? ' active' : '');
    b.innerHTML = `<i class="ti ${icon}"></i>`;
    b.onclick = () => { _hmIcon = icon; iconsEl.querySelectorAll('.modal-icon-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); };
    iconsEl.appendChild(b);
  }
  document.getElementById('hobby-modal-overlay').classList.remove('hidden');
  document.getElementById('hobby-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('hm-name').focus(), 50);
}
function closeHobbyModal() { document.getElementById('hobby-modal-overlay').classList.add('hidden'); document.getElementById('hobby-modal').classList.add('hidden'); _editingHobbyId = null; }
function saveHobby() {
  const name = document.getElementById('hm-name').value.trim();
  if (!name) { document.getElementById('hm-name').focus(); return; }
  if (_editingHobbyId) {
    const h = S.hobbies.find(x => x.id === _editingHobbyId);
    if (h) { h.name = name; h.color = _hmColor; h.icon = _hmIcon; }
    logActivity('edited hobby: '+name, 'add');
  } else {
    S.hobbies.push({ id:'h'+Date.now(), name, icon:_hmIcon, color:_hmColor, sessions:0 });
    logActivity('added hobby: '+name, 'add');
  }
  save(); renderHobbies(); closeHobbyModal();
}
function deleteHobby() {
  if (!_editingHobbyId) return;
  const h = S.hobbies.find(x => x.id === _editingHobbyId);
  if (!h || !confirm(`Delete "${h.name}"?`)) return;
  logActivity('deleted hobby: '+h.name, 'delete');
  S.hobbies = S.hobbies.filter(x => x.id !== _editingHobbyId);
  save(); renderHobbies(); closeHobbyModal();
}

// ─── GOAL MODAL ───────────────────────────────────────────
let _editingGoalId = null, _gmColor = 'sage', _gmIcon = 'ti-star';

function openGoalModal(id = null) {
  _editingGoalId = id;
  const g = id ? S.goals.find(x => x.id === id) : null;
  document.getElementById('gm-title').textContent = g ? 'edit goal' : 'add goal';
  document.getElementById('gm-name').value = g ? g.name  : '';
  document.getElementById('gm-desc').value = g ? g.desc  : '';
  document.getElementById('gm-max').value  = g ? g.max   : 10;
  document.getElementById('gm-cur').value  = g ? g.cur   : 0;
  document.getElementById('gm-delete').style.display = g ? 'block' : 'none';
  _gmColor = g ? g.color : 'sage'; _gmIcon = g ? g.icon : 'ti-star';
  const colorsEl = document.getElementById('gm-colors'); colorsEl.innerHTML = '';
  for (const [key, c] of Object.entries(HOBBY_COLORS)) {
    const s = document.createElement('div');
    s.className = 'modal-color-swatch' + (key === _gmColor ? ' active' : '');
    s.style.background = c.fill; s.title = key;
    s.onclick = () => { _gmColor = key; colorsEl.querySelectorAll('.modal-color-swatch').forEach(x=>x.classList.remove('active')); s.classList.add('active'); };
    colorsEl.appendChild(s);
  }
  const iconsEl = document.getElementById('gm-icons'); iconsEl.innerHTML = '';
  for (const icon of HOBBY_ICONS) {
    const b = document.createElement('button');
    b.className = 'modal-icon-btn' + (icon === _gmIcon ? ' active' : '');
    b.innerHTML = `<i class="ti ${icon}"></i>`;
    b.onclick = () => { _gmIcon = icon; iconsEl.querySelectorAll('.modal-icon-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); };
    iconsEl.appendChild(b);
  }
  document.getElementById('goal-modal-overlay').classList.remove('hidden');
  document.getElementById('goal-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('gm-name').focus(), 50);
}
function closeGoalModal() { document.getElementById('goal-modal-overlay').classList.add('hidden'); document.getElementById('goal-modal').classList.add('hidden'); _editingGoalId = null; }
function saveGoal() {
  const name = document.getElementById('gm-name').value.trim();
  const desc = document.getElementById('gm-desc').value.trim();
  const max  = parseInt(document.getElementById('gm-max').value) || 10;
  const cur  = Math.min(parseInt(document.getElementById('gm-cur').value)||0, max);
  if (!name) { document.getElementById('gm-name').focus(); return; }
  if (_editingGoalId) {
    const g = S.goals.find(x => x.id === _editingGoalId);
    if (g) { g.name=name; g.desc=desc; g.max=max; g.cur=cur; g.color=_gmColor; g.icon=_gmIcon; }
    logActivity('edited goal: '+name, 'goal');
  } else {
    S.goals.push({ id:'g'+Date.now(), name, desc, icon:_gmIcon, color:_gmColor, cur, max });
    logActivity('added goal: '+name, 'goal');
  }
  save(); renderGoals(); closeGoalModal();
}
function deleteGoal() {
  if (!_editingGoalId) return;
  const g = S.goals.find(x => x.id === _editingGoalId);
  if (!g || !confirm(`Delete "${g.name}"?`)) return;
  logActivity('deleted goal: '+g.name, 'delete');
  S.goals = S.goals.filter(x => x.id !== _editingGoalId);
  save(); renderGoals(); closeGoalModal();
}

// ─── TODO MODAL ───────────────────────────────────────────
let _editingTodoId = null;
let _todoPriority = null;

function openTodoModal(id = null) {
  _editingTodoId = id;
  const t = id ? S.todos.find(x => x.id === id) : null;
  document.getElementById('tm-title').textContent = t ? 'edit task' : 'add task';
  document.getElementById('tm-label').value = t ? t.label  : '';
  document.getElementById('tm-due').value   = t?.dueDate  || '';
  document.getElementById('tm-note').value  = t?.note     || '';
  document.getElementById('tm-delete').style.display = t ? 'block' : 'none';

  _todoPriority = t?.priority || null;
  document.querySelectorAll('.tm-pri-btn').forEach(b => {
    b.classList.toggle('tm-pri-active', b.dataset.pri === _todoPriority);
    b.onclick = () => {
      _todoPriority = _todoPriority === b.dataset.pri ? null : b.dataset.pri;
      document.querySelectorAll('.tm-pri-btn').forEach(x => x.classList.toggle('tm-pri-active', x.dataset.pri === _todoPriority));
    };
  });

  document.getElementById('todo-modal-overlay').classList.remove('hidden');
  document.getElementById('todo-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('tm-label').focus(), 50);
}
function closeTodoModal() {
  document.getElementById('todo-modal-overlay').classList.add('hidden');
  document.getElementById('todo-modal').classList.add('hidden');
  _editingTodoId = null; _todoPriority = null;
}
function saveTodo() {
  const label   = document.getElementById('tm-label').value.trim();
  const dueDate = document.getElementById('tm-due').value || null;
  const note    = document.getElementById('tm-note').value.trim();
  if (!label) { document.getElementById('tm-label').focus(); return; }
  if (_editingTodoId) {
    const t = S.todos.find(x => x.id === _editingTodoId);
    if (t) { t.label = label; t.dueDate = dueDate; t.priority = _todoPriority; t.note = note; }
  } else {
    S.todos.push({ id:'t'+Date.now(), label, done:false, dueDate, priority:_todoPriority, note });
    logActivity('added todo: '+label, 'add');
  }
  save(); renderTodos('todos-all'); renderCalendar(); closeTodoModal();
}
function deleteTodo() {
  if (!_editingTodoId) return;
  const t = S.todos.find(x => x.id === _editingTodoId);
  if (!t || !confirm(`Delete "${t.label}"?`)) return;
  S.todos = S.todos.filter(x => x.id !== _editingTodoId);
  save(); renderTodos('todos-all'); renderCalendar(); closeTodoModal();
}

// ─── DRAG SCROLL (timeline) ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('todo-in')?.addEventListener('keydown',    e => { if (e.key==='Enter') addTodo(); });
  document.getElementById('music-in')?.addEventListener('keydown',   e => { if (e.key==='Enter') addMusicEntry(); });
  document.getElementById('spirit-input')?.addEventListener('keydown', e => { if (e.key==='Enter') spiritSend(); });
  document.getElementById('journal-textarea')?.addEventListener('input', updateJournalCount);
  document.getElementById('journal-textarea')?.addEventListener('keydown', e => { if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); saveJournalEntry(); } });
  document.getElementById('notes-quick-in')?.addEventListener('keydown', e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); addNote(); } });
  document.addEventListener('keydown', e => { if (e.key==='Escape') { closeHobbyModal(); closeGoalModal(); closeTodoModal(); } });

  const wrap = document.getElementById('timeline-wrap');
  if (wrap) {
    let isDown=false, startX, scrollLeft;
    wrap.addEventListener('mousedown', e => { isDown=true; startX=e.pageX-wrap.offsetLeft; scrollLeft=wrap.scrollLeft; });
    wrap.addEventListener('mouseleave', () => isDown=false);
    wrap.addEventListener('mouseup',    () => isDown=false);
    wrap.addEventListener('mousemove',  e => { if (!isDown) return; e.preventDefault(); wrap.scrollLeft = scrollLeft-(e.pageX-wrap.offsetLeft-startX); });
  }

  loadIntroNote();
  initIntroSky();
});

function spawnXpPop() {}
function renderChatUI() {}
function buildSystemPrompt() { return ''; }
