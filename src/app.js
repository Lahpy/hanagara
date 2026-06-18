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
  if (S.savedLocation) {
    lat = S.savedLocation.lat;
    lon = S.savedLocation.lon;
    _lastCoords = { lat, lon };
  } else {
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 20000 }));
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
      _lastCoords = { lat, lon };
    } catch(e) {
      console.error('geolocation error', e);
      document.getElementById('sky-condition').textContent = '';
      const el = document.getElementById('forecast-row');
      const reason = e.code === 1 ? 'location access denied' : e.code === 3 ? 'location request timed out' : 'location unavailable';
      if (el) el.innerHTML = `<div class="forecast-error">${reason} — <button class="forecast-error-link" onclick="nav('settings')">set a location in settings</button> to skip this</div>`;
      return;
    }
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

let _forecastList = [];
let _forecastDayIndex = null; // null = showing 5-day view; number = showing hourly for that day

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
    _forecastList = data.list;
    _forecastDayIndex = null;
    renderForecastStrip(_forecastList);
  } catch(e) {
    console.error('forecast error', e);
    if (el) el.innerHTML = `<div class="forecast-error">forecast failed: ${e.message}</div>`;
  }
}

function groupForecastByDay(list) {
  const days = {};
  list.forEach(item => {
    const d = new Date(item.dt * 1000);
    const key = d.toDateString();
    if (!days[key]) days[key] = { temps: [], items: [], date: d };
    days[key].temps.push(item.main.temp);
    days[key].items.push(item);
  });
  return Object.values(days).slice(0, 5);
}

function renderForecastStrip(list) {
  const el = document.getElementById('forecast-row');
  if (!el || !list.length) return;

  const days = groupForecastByDay(list);

  el.innerHTML = '';
  el.classList.remove('forecast-row-hourly');
  days.forEach((day, i) => {
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
    card.className = 'forecast-card forecast-card-enter';
    card.style.animationDelay = `${i * 28}ms`;
    card.dataset.dayIndex = i;
    card.innerHTML = `
      <div class="forecast-day">${label}</div>
      <i class="ti ${icon} forecast-icon"></i>
      <div class="forecast-temps"><span class="forecast-max">${max}°</span><span class="forecast-min">${min}°</span></div>`;
    card.addEventListener('click', () => openHourlyForecast(i));
    el.appendChild(card);
  });
  el.classList.remove('forecast-row-transitioning');
}

function openHourlyForecast(dayIndex) {
  const days = groupForecastByDay(_forecastList);
  const day = days[dayIndex];
  if (!day) return;
  _forecastDayIndex = dayIndex;

  const el = document.getElementById('forecast-row');
  if (!el) return;

  el.classList.add('forecast-row-transitioning');
  setTimeout(() => {
    el.innerHTML = '';
    el.classList.add('forecast-row-hourly');

    const backBtn = document.createElement('button');
    backBtn.className = 'forecast-back-btn';
    backBtn.innerHTML = '<i class="ti ti-chevron-left"></i>';
    backBtn.addEventListener('click', closeHourlyForecast);
    el.appendChild(backBtn);

    day.items.forEach((item, idx) => {
      const hour = new Date(item.dt*1000);
      const label = hour.toLocaleTimeString(undefined, { hour: 'numeric' }).replace(' ','').toLowerCase();
      const iconKey = weatherIconKey(item.weather[0].id, false);
      const icon = WEATHER_ICONS[iconKey] || 'ti-sun';
      const temp = Math.round(item.main.temp);

      const card = document.createElement('div');
      card.className = 'forecast-card forecast-card-hourly forecast-card-enter';
      card.style.animationDelay = `${idx * 28}ms`;
      card.innerHTML = `
        <div class="forecast-day">${label}</div>
        <i class="ti ${icon} forecast-icon"></i>
        <div class="forecast-temps"><span class="forecast-max">${temp}°</span></div>`;
      el.appendChild(card);
    });

    el.classList.remove('forecast-row-transitioning');
  }, 160);
}

function closeHourlyForecast() {
  _forecastDayIndex = null;
  const el = document.getElementById('forecast-row');
  if (!el) { renderForecastStrip(_forecastList); return; }
  el.classList.add('forecast-row-transitioning');
  setTimeout(() => {
    renderForecastStrip(_forecastList);
  }, 160);
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

  // group by calendar day
  const byDay = {};
  for (const entry of log) {
    const d = new Date(entry.ts);
    const dayKey = d.toDateString();
    if (!byDay[dayKey]) byDay[dayKey] = { entries: [], date: d };
    byDay[dayKey].entries.push(entry);
  }

  const TYPE_COLOR = { hobby: 'hist-icon-hobby', todo: 'hist-icon-todo', goal: 'hist-icon-goal', music: 'hist-icon-music' };

  for (const [dayKey, { entries, date }] of Object.entries(byDay)) {
    const isToday = dayKey === new Date().toDateString();
    const dateLabel = isToday ? 'today' : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

    // build a short summary: "2 sessions · 1 task · 3 songs"
    const counts = { hobby: 0, todo: 0, goal: 0, music: 0 };
    entries.forEach(e => { if (counts[e.type] !== undefined) counts[e.type]++; });
    const summaryParts = [
      counts.hobby ? `${counts.hobby} session${counts.hobby!==1?'s':''}` : null,
      counts.todo  ? `${counts.todo} task${counts.todo!==1?'s':''}` : null,
      counts.goal  ? `${counts.goal} goal${counts.goal!==1?'s':''}` : null,
      counts.music ? `${counts.music} song${counts.music!==1?'s':''}` : null,
    ].filter(Boolean).join(' · ');

    const hdr = document.createElement('div');
    hdr.className = 'hist-date';
    hdr.innerHTML = `<span>${dateLabel}</span>${summaryParts ? `<span class="hist-date-summary">${summaryParts}</span>` : ''}`;
    el.appendChild(hdr);

    for (const entry of entries) {
      const icon = ACTIVITY_ICONS[entry.type] || ACTIVITY_ICONS['action'];
      const colorClass = TYPE_COLOR[entry.type] || 'hist-icon-action';
      const d = new Date(entry.ts);
      const row = document.createElement('div');
      row.className = 'hist-row';
      row.innerHTML = `
        <i class="ti ${icon} hist-icon ${colorClass}"></i>
        <div class="hist-source">
          <div>${entry.label}</div>
          ${entry.note ? `<div class="hist-note">${entry.note}</div>` : ''}
        </div>
        <div class="hist-time">${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
        <button class="hist-del" onclick="deleteActivity('${entry.id}')"><i class="ti ti-x"></i></button>`;
      el.appendChild(row);
    }
  }
}

// ─── RENDER: SETTINGS ─────────────────────────────────────
function renderSettings() {
  renderThemeSwitcher();
  const total = S.hobbies.reduce((a, h) => a + (h.sessions || 0), 0);
  document.getElementById('sessions-label').textContent = total + ' sessions logged';
  renderLocationSetting();
}

// ─── LOCATION SETTING ─────────────────────────────────────
function renderLocationSetting() {
  const el = document.getElementById('location-current');
  if (!el) return;
  if (S.savedLocation) {
    el.innerHTML = `<i class="ti ti-map-pin"></i> using <strong>${S.savedLocation.label}</strong>`;
    el.classList.remove('hidden');
  } else {
    el.innerHTML = '';
    el.classList.add('hidden');
  }
}

async function searchAndSaveLocation() {
  const inp = document.getElementById('loc-city-input');
  const query = inp.value.trim();
  if (!query) { inp.focus(); return; }
  if (typeof OPENWEATHER_API_KEY === 'undefined' || !OPENWEATHER_API_KEY) {
    alert('OpenWeather API key is missing from config.js');
    return;
  }
  try {
    const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${OPENWEATHER_API_KEY}`);
    const data = await res.json();
    if (!data.length) { alert('Couldn\'t find that location — try a different spelling or add a country code (e.g. "Madison, WI, US")'); return; }
    const place = data[0];
    const label = [place.name, place.state, place.country].filter(Boolean).join(', ');
    S.savedLocation = { lat: place.lat, lon: place.lon, label };
    save();
    inp.value = '';
    renderLocationSetting();
    loadSkyWeather();
  } catch(e) {
    console.error('location search error', e);
    alert('Something went wrong searching for that location.');
  }
}

function clearSavedLocation() {
  S.savedLocation = null;
  save();
  renderLocationSetting();
  loadSkyWeather();
}

// ─── RENDER: NOW STRIP ────────────────────────────────────
// ─── REMINDERS (games) ────────────────────────────────────
function getDueReminders() {
  const now = Date.now();
  const due = [];
  (S.hobbies||[]).filter(h => h.type === 'games').forEach(h => {
    (h.reminders||[]).forEach(r => {
      const rem = { ...r, interestId: h.id, interestName: h.name }; // always pull from parent
      if (!r.lastDone) { due.push(rem); return; }
      const sinceMs = now - r.lastDone;
      if (r.recurrence === 'daily'  && sinceMs > 20*3600000) due.push(rem);
      if (r.recurrence === 'weekly' && sinceMs > 6.5*86400000) due.push(rem);
    });
  });
  return due;
}

function renderRemindersBanner() {
  const el = document.getElementById('reminders-banner');
  if (!el) return;
  const due = getDueReminders();
  if (!due.length) { el.innerHTML = ''; el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="reminders-banner-hdr"><i class="ti ti-bell"></i> reminders</div>
    <div class="reminders-banner-list">
      ${due.slice(0,4).map(r => `
        <div class="reminder-chip">
          <span>${r.interestName}: ${r.text}</span>
          <button data-rid="${r.id}" data-hid="${r.interestId}"><i class="ti ti-check"></i></button>
        </div>`).join('')}
    </div>`;
  el.querySelectorAll('.reminder-chip button').forEach(btn => {
    btn.addEventListener('click', () => {
      const h = S.hobbies.find(x => x.id === btn.dataset.hid);
      const r = h?.reminders.find(x => x.id === btn.dataset.rid);
      if (r) { r.lastDone = Date.now(); save(); renderRemindersBanner(); }
    });
  });
}

// ─── PULSE — tailored news feed ───────────────────────────
let _pulseLastLoad = 0;

async function loadPulse() {
  const listEl = document.getElementById('pulse-list');
  const btnEl  = document.getElementById('pulse-refresh-btn');
  if (!listEl) return;

  // throttle: don't refetch if loaded within last 10 minutes
  if (Date.now() - _pulseLastLoad < 10 * 60000 && listEl.children.length && !listEl.querySelector('.pulse-empty')) return;

  listEl.innerHTML = '<div class="pulse-loading"><i class="ti ti-loader-2 pulse-spinner"></i> fetching stories...</div>';
  if (btnEl) btnEl.classList.add('pulse-refreshing');

  // build queries from what's actually on the board
  const queries = [];
  const games = (S.hobbies||[]).filter(h => h.type === 'games');
  games.forEach(g => queries.push(`${g.name} latest patch notes news 2025 2026`));

  const anime = (S.hobbies||[]).filter(h => h.type === 'anime' && (h.status === 'watching' || h.status === 'planned'));
  anime.forEach(a => queries.push(`${a.name} anime news episodes release`));

  const books = (S.hobbies||[]).filter(h => h.type === 'book' && h.status === 'reading');
  books.forEach(b => queries.push(`${b.name}${b.author?' '+b.author:''} book news`));

  const alcohol = (S.hobbies||[]).find(h => h.type === 'alcohol');
  if (alcohol && (alcohol.drinks||[]).length) {
    const kinds = [...new Set((alcohol.drinks||[]).map(d=>d.kind).filter(Boolean))];
    const tags  = (alcohol.tasteTags||[]).slice(0,3);
    queries.push(`new ${kinds[0]||'whiskey'} releases ${tags.length?tags.join(' '):'recommended'} 2025 2026`);
  }

  const fitness = (S.hobbies||[]).filter(h => h.type === 'fitness');
  fitness.forEach(f => queries.push(`${f.activityType||'fitness'} training tips news`));

  if (!queries.length) {
    listEl.innerHTML = '<div class="pulse-empty">add some interests to your board first</div>';
    if (btnEl) btnEl.classList.remove('pulse-refreshing');
    return;
  }

  const systemPrompt = `You are a news curator for a personal life terminal. 
Given search queries about the user's current interests, find and summarise the most relevant, recent, specific news items.
Return ONLY valid JSON — no prose, no markdown fences: {"items":[{"title":"...","summary":"one sentence, specific and factual","source":"site name","url":"https://...","topic":"..."}]}
Max 6 items total. Prefer: patch notes, character reveals, release dates, specific product launches, author news — not generic opinion pieces or roundups.`;

  const userMsg = `Find recent news for these interest queries:\n${queries.map((q,i) => `${i+1}. ${q}`).join('\n')}\n\nReturn the top 5-6 most interesting, specific, recent items as JSON.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: userMsg }],
      }),
    });
    const data = await res.json();
    // collect all text blocks from potentially multi-turn tool use response
    const textBlock = data.content?.filter(b => b.type === 'text').map(b => b.text).join('');
    if (!textBlock) throw new Error('no text response');
    const clean = textBlock.replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(clean);
    const items = parsed.items || [];
    _pulseLastLoad = Date.now();

    if (!items.length) {
      listEl.innerHTML = '<div class="pulse-empty">nothing found right now — try again later</div>';
    } else {
      listEl.innerHTML = items.map(item => `
        <div class="pulse-item">
          <div class="pulse-item-topic">${escapeHtml(item.topic||'')}</div>
          <div class="pulse-item-title">${escapeHtml(item.title)}</div>
          <div class="pulse-item-summary">${escapeHtml(item.summary)}</div>
          <div class="pulse-item-meta">
            <span>${escapeHtml(item.source||'')}</span>
            ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="pulse-item-link">read <i class="ti ti-arrow-up-right"></i></a>` : ''}
          </div>
        </div>`).join('');
    }
  } catch(e) {
    console.error('pulse error', e);
    listEl.innerHTML = '<div class="pulse-empty">couldn\'t load stories right now</div>';
  }
  if (btnEl) btnEl.classList.remove('pulse-refreshing');
}

function renderNowStrip() {
  const now   = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  // ── todos ──
  const done  = S.todos.filter(t => t.done).length;
  const total = S.todos.length;
  const overdue = S.todos.filter(t => !t.done && t.dueDate && t.dueDate < today).length;
  const dueToday = S.todos.filter(t => !t.done && t.dueDate === today).length;
  const upcoming = S.todos.filter(t => !t.done && t.dueDate && t.dueDate > today).length;
  const todosVal  = document.getElementById('now-todos-val');
  const todosSub  = document.getElementById('now-todos-sub');
  const todosNote = document.getElementById('now-todos-note');
  const todosBreak = document.getElementById('now-todos-break');
  if (todosVal) {
    if (!total) { todosVal.textContent = 'nothing yet'; todosSub.textContent = ''; todosNote.textContent = 'add your first task'; if (todosBreak) todosBreak.innerHTML = ''; }
    else {
      todosVal.textContent = `${done} / ${total}`;
      todosSub.textContent = done === total ? 'all done ✓' : `${total - done} remaining`;
      if (overdue > 0) todosNote.textContent = `${overdue} overdue — catch up`;
      else if (dueToday > 0) todosNote.textContent = `${dueToday} due today`;
      else if (done === total && total > 0) todosNote.textContent = 'clear day, nice work';
      else todosNote.textContent = 'nothing urgent';
      if (todosBreak) {
        todosBreak.innerHTML = `
          ${overdue ? `<span class="insight-pill insight-pill-rose">${overdue} overdue</span>` : ''}
          ${dueToday ? `<span class="insight-pill">${dueToday} today</span>` : ''}
          ${upcoming ? `<span class="insight-pill insight-pill-muted">${upcoming} upcoming</span>` : ''}`;
      }
    }
  }

  // ── goal ──
  const activeGoals = (S.goals||[]).filter(g => g.cur < g.max);
  const completeGoals = (S.goals||[]).filter(g => g.cur >= g.max);
  const topGoal = [...activeGoals].sort((a,b) => (b.cur/b.max) - (a.cur/a.max))[0];
  const goalVal  = document.getElementById('now-goal-val');
  const goalSub  = document.getElementById('now-goal-sub');
  const goalNote = document.getElementById('now-goal-note');
  const goalBreak = document.getElementById('now-goal-break');
  if (goalVal) {
    if (!topGoal) { goalVal.textContent = 'no goals yet'; goalSub.textContent = ''; goalNote.textContent = 'set something to work toward'; if (goalBreak) goalBreak.innerHTML = ''; }
    else {
      const pct = Math.round((topGoal.cur/topGoal.max)*100);
      goalVal.textContent = topGoal.name;
      goalSub.textContent = `${topGoal.cur} / ${topGoal.max}`;
      if (pct >= 90) goalNote.textContent = 'almost there';
      else if (pct >= 50) goalNote.textContent = 'past the halfway mark';
      else if (pct > 0) goalNote.textContent = 'building momentum';
      else goalNote.textContent = 'time to start';
      if (goalBreak) {
        goalBreak.innerHTML = `
          <span class="insight-pill">${activeGoals.length} active</span>
          ${completeGoals.length ? `<span class="insight-pill insight-pill-sage">${completeGoals.length} done</span>` : ''}`;
      }
    }
  }

  // ── hobby ──
  const lastHobby = (S.activityLog || []).find(e => e.type === 'hobby');
  const hobbyVal  = document.getElementById('now-hobby-val');
  const hobbySub  = document.getElementById('now-hobby-sub');
  const hobbyNote = document.getElementById('now-hobby-note');
  const hobbyBreak = document.getElementById('now-hobby-break');
  const totalSessions = (S.hobbies||[]).reduce((a,h) => a + (h.sessions||0), 0);
  const activeStreaks = (S.hobbies||[]).filter(h => h.streak > 0).length;
  if (hobbyVal) {
    if (!lastHobby) { hobbyVal.textContent = 'nothing yet'; hobbySub.textContent = ''; hobbyNote.textContent = 'log your first session'; if (hobbyBreak) hobbyBreak.innerHTML = ''; }
    else {
      hobbyVal.textContent = lastHobby.label.replace('logged ','').replace(' session','');
      const ago = Math.floor((Date.now() - lastHobby.ts) / 3600000);
      const days = Math.floor(ago/24);
      hobbySub.textContent = ago < 1 ? 'just now' : ago < 24 ? `${ago}h ago` : `${days}d ago`;
      if (days >= 3) hobbyNote.textContent = `${days} days quiet — pick it back up?`;
      else if (ago < 24) hobbyNote.textContent = 'fresh session, keep it going';
      else hobbyNote.textContent = 'steady pace';
      if (hobbyBreak) {
        hobbyBreak.innerHTML = `
          <span class="insight-pill">${totalSessions} total session${totalSessions!==1?'s':''}</span>
          ${activeStreaks ? `<span class="insight-pill insight-pill-amber">${activeStreaks} streak${activeStreaks!==1?'s':''} active</span>` : ''}`;
      }
    }
  }

  // ── music ──
  const lastMusic = (S.musicLog || [])[0];
  const musicVal  = document.getElementById('now-music-val');
  const musicSub  = document.getElementById('now-music-sub');
  const musicNote = document.getElementById('now-music-note');
  const musicBreak = document.getElementById('now-music-break');
  if (musicVal) {
    if (!lastMusic) { musicVal.textContent = 'nothing logged'; musicSub.textContent = ''; musicNote.textContent = 'log what you\'re hearing'; if (musicBreak) musicBreak.innerHTML = ''; }
    else {
      musicVal.textContent = lastMusic.title || lastMusic.raw;
      musicSub.textContent = lastMusic.artist || lastMusic.genre || '';
      if (lastMusic.genre) musicNote.textContent = `mostly ${lastMusic.genre} lately`;
      else musicNote.textContent = 'see your full taste profile';
      if (musicBreak) {
        const genreCounts = {};
        (S.musicLog||[]).forEach(m => { if (m.genre) genreCounts[m.genre] = (genreCounts[m.genre]||0)+1; });
        const topGenre = Object.entries(genreCounts).sort((a,b)=>b[1]-a[1])[0];
        musicBreak.innerHTML = `
          <span class="insight-pill">${(S.musicLog||[]).length} logged</span>
          ${topGenre ? `<span class="insight-pill insight-pill-violet">${topGenre[0]}</span>` : ''}
          ${lastMusic.mood ? `<span class="insight-pill insight-pill-muted">${lastMusic.mood}</span>` : ''}`;
      }
    }
  }

  renderOutfitLine();
  renderRemindersBanner();
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
  setNavDot('journal', shouldDotJournal, 'bnb');
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
  initShinkansenScene();
  applySpiritMood();
}

// ─── SHINKANSEN SCENE (decorative, world tab) ─────────────
function initShinkansenScene() {
  const g = document.getElementById('sk-poles');
  if (!g || g.dataset.built) return;
  g.dataset.built = '1';

  // build two sets of poles back-to-back so the scroll loop is seamless
  for (let set = 0; set < 2; set++) {
    for (let i = 0; i < 9; i++) {
      const x = set * 400 + i * 50;
      const pole = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      pole.innerHTML = `
        <line x1="${x}" y1="58" x2="${x}" y2="72" stroke="var(--bg3)" stroke-width="1.5"/>
        <line x1="${x-6}" y1="61" x2="${x+6}" y2="61" stroke="var(--bg3)" stroke-width="1"/>`;
      g.appendChild(pole);
    }
  }
  // animate the whole poles group leftward by exactly one viewBox-width, looping seamlessly
  const polesAnim = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
  polesAnim.setAttribute('attributeName', 'transform');
  polesAnim.setAttribute('type', 'translate');
  polesAnim.setAttribute('from', '0 0');
  polesAnim.setAttribute('to', '-400 0');
  polesAnim.setAttribute('dur', '3s');
  polesAnim.setAttribute('repeatCount', 'indefinite');
  g.appendChild(polesAnim);

  // animate the train sliding across and off, looping
  const train = document.getElementById('sk-train');
  if (train) {
    const trainAnim = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
    trainAnim.setAttribute('attributeName', 'transform');
    trainAnim.setAttribute('type', 'translate');
    trainAnim.setAttribute('from', '-90 0');
    trainAnim.setAttribute('to', '420 0');
    trainAnim.setAttribute('dur', '8s');
    trainAnim.setAttribute('repeatCount', 'indefinite');
    train.appendChild(trainAnim);
  }
}

// ─── RENDER: INTERESTS (grouped grid, formerly hobbies) ───
let _interestTypeFilter = 'all';

function renderInterestTypeFilter() {
  const el = document.getElementById('interest-type-filter');
  if (!el) return;
  const counts = { all: S.hobbies.length };
  INTEREST_TYPES.forEach(t => { counts[t.id] = S.hobbies.filter(h => (h.type||'generic') === t.id).length; });

  el.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.className = 'itype-btn' + (_interestTypeFilter === 'all' ? ' itype-active' : '');
  allBtn.textContent = `all (${counts.all})`;
  allBtn.onclick = () => { _interestTypeFilter = 'all'; renderHobbies(); };
  el.appendChild(allBtn);

  INTEREST_TYPES.forEach(t => {
    if (!counts[t.id]) return;
    const btn = document.createElement('button');
    btn.className = 'itype-btn' + (_interestTypeFilter === t.id ? ' itype-active' : '');
    btn.innerHTML = `<i class="ti ${t.icon}"></i> ${t.label} (${counts[t.id]})`;
    btn.onclick = () => { _interestTypeFilter = t.id; renderHobbies(); };
    el.appendChild(btn);
  });
}

// surface-level info shown directly on the tile face, per type
function interestTileOverview(h) {
  const type = h.type || 'generic';

  if (type === 'alcohol') {
    const drinks = h.drinks || [];
    const rows = drinks.slice(0,3).map(d => `<div class="interest-tile-row"><span>${d.name}</span></div>`);
    if (!rows.length) rows.push('<div class="interest-tile-row interest-tile-row-empty"><span>nothing logged yet</span></div>');
    return rows.join('');
  }

  if (type === 'anime') {
    const rows = [`<div class="interest-tile-row"><span class="anime-status-${h.status||'planned'}">${h.status||'planned'}</span></div>`];
    const chars = (h.characters||[]).slice(0,2);
    chars.forEach(c => rows.push(`<div class="interest-tile-row"><span>${c.name}</span></div>`));
    if (!chars.length) rows.push('<div class="interest-tile-row interest-tile-row-empty"><span>no characters yet</span></div>');
    return rows.join('');
  }

  if (type === 'games') {
    const rows = [];
    rows.push(`<div class="interest-tile-row"><span>${h.uid ? `UID ${h.uid}` : 'no UID set'}</span></div>`);
    const chars = (h.characters||[]).slice(0,2);
    chars.forEach(c => rows.push(`<div class="interest-tile-row"><span>${c.name}</span></div>`));
    const reminders = h.reminders || [];
    const due = reminders.filter(r => {
      if (!r.lastDone) return true;
      const since = Date.now() - r.lastDone;
      if (r.recurrence === 'daily') return since > 20*3600000;
      if (r.recurrence === 'weekly') return since > 6.5*86400000;
      return false;
    }).length;
    if (reminders.length) rows.push(`<div class="interest-tile-row"><span>${due ? `${due} due` : 'caught up'}</span></div>`);
    return rows.join('');
  }

  if (type === 'book') {
    const rows = [];
    rows.push(`<div class="interest-tile-row"><span style="color:${BOOK_STATUS_COLORS[h.status||'want to read']}">${h.status||'want to read'}</span></div>`);
    if (h.author) rows.push(`<div class="interest-tile-row"><span>${h.author}</span></div>`);
    if (h.rating) rows.push(`<div class="interest-tile-row"><span>${'★'.repeat(h.rating)}${'☆'.repeat(5-h.rating)}</span></div>`);
    else if (!h.author) rows.push(`<div class="interest-tile-row interest-tile-row-empty"><span>tap to add details</span></div>`);
    return rows.join('');
  }

  if (type === 'fitness') {
    return `
      <div class="interest-tile-row"><span>${h.activityType || 'activity'}</span></div>
      <div class="interest-tile-row"><span>${h.sessions||0} sessions</span></div>
      <div class="interest-tile-row"><span>${h.streak ? `${h.streak}d streak` : 'no streak'}</span></div>
    `;
  }

  // generic
  return `
    <div class="interest-tile-row"><span>${h.sessions||0} sessions</span></div>
    <div class="interest-tile-row"><span>${h.streak ? `${h.streak}d streak` : 'no streak yet'}</span></div>
  `;
}

function renderHobbies() {
  renderInterestTypeFilter();
  const list = document.getElementById('hobby-list');
  list.innerHTML = '';

  const visible = S.hobbies.filter(h => _interestTypeFilter === 'all' || (h.type||'generic') === _interestTypeFilter);

  if (!visible.length) {
    list.innerHTML = '<div style="color:var(--ink3);font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:20px 0">nothing here yet</div>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'interest-grid';

  visible.forEach(h => {
    const typeId = h.type || 'generic';
    const c = HOBBY_COLORS[h.color] || HOBBY_COLORS.sage;
    const overview = interestTileOverview(h);
    const tile = document.createElement('div');
    tile.className = 'interest-tile';
    tile.draggable = true;
    tile.dataset.id = h.id;
    tile.innerHTML = `
      <button class="interest-tile-edit" onclick="event.stopPropagation();openHobbyModal('${h.id}')"><i class="ti ti-pencil"></i></button>
      <div class="interest-tile-name">${h.name}</div>
      <div class="interest-tile-thumb" style="background:${c.bg};color:${c.fill}"><i class="ti ${h.icon}"></i></div>
      <div class="interest-tile-overview">${overview}</div>
      ${typeId === 'generic' ? `<button class="interest-tile-log" onclick="event.stopPropagation();logHobby('${h.id}', this)"><i class="ti ti-plus"></i> log</button>` : ''}
    `;
    tile.addEventListener('click', (e) => {
      if (e.target.closest('.interest-tile-edit') || e.target.closest('.interest-tile-log')) return;
      if (typeId === 'generic') openHobbyModal(h.id);
      else openInterestDetail(h.id);
    });
    tile.addEventListener('dragstart', e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', h.id); setTimeout(() => tile.classList.add('dragging'), 0); });
    tile.addEventListener('dragend',  () => tile.classList.remove('dragging'));
    tile.addEventListener('dragover', e => { e.preventDefault(); tile.classList.add('drag-over'); });
    tile.addEventListener('dragleave',() => tile.classList.remove('drag-over'));
    tile.addEventListener('drop', e => {
      e.preventDefault(); tile.classList.remove('drag-over');
      const fromId = e.dataTransfer.getData('text/plain');
      if (fromId === h.id) return;
      const from = S.hobbies.findIndex(x => x.id === fromId);
      const to   = S.hobbies.findIndex(x => x.id === h.id);
      if (from !== -1 && to !== -1 && from !== to) {
        const [m] = S.hobbies.splice(from, 1);
        S.hobbies.splice(to, 0, m);
        save(); renderHobbies();
      }
    });
    grid.appendChild(tile);
  });

  list.appendChild(grid);
}

// ─── RENDER: GOALS ────────────────────────────────────────
function renderGoals() {
  const list = document.getElementById('goal-list');
  list.innerHTML = '';
  for (const g of S.goals) {
    const c = HOBBY_COLORS[g.color] || HOBBY_COLORS.sage;
    const pct      = Math.min(100, Math.round((g.cur / g.max) * 100));
    const complete = pct >= 100;
    const ringColor = complete ? 'var(--sage)' : c.fill;
    const circumference = 2 * Math.PI * 17;
    const offset = circumference * (1 - pct/100);

    let insight;
    if (complete) insight = 'completed — nice work';
    else if (g.createdAt) {
      const days = Math.max(0, Math.floor((Date.now() - g.createdAt) / 86400000));
      if (days === 0) insight = 'started today';
      else if (pct === 0) insight = `${days} day${days!==1?'s':''} in, no progress yet`;
      else {
        const perDay = pct / Math.max(days,1);
        const daysLeft = perDay > 0 ? Math.ceil((100-pct) / perDay) : null;
        insight = daysLeft && daysLeft < 365 ? `on pace to finish in ~${daysLeft}d` : `${days} day${days!==1?'s':''} in, ${pct}% there`;
      }
    } else {
      insight = pct === 0 ? 'not started yet' : pct > 50 ? 'past the halfway mark' : 'building momentum';
    }

    const card = document.createElement('div');
    card.className = 'gcard' + (complete ? ' gcard-complete' : '');
    card.draggable = true;
    card.dataset.id = g.id;
    card.innerHTML = `
      <div class="hdrag-handle"><i class="ti ti-grip-vertical"></i></div>
      <div class="gring-wrap">
        <svg viewBox="0 0 40 40" class="gring">
          <circle cx="20" cy="20" r="17" fill="none" stroke="var(--line)" stroke-width="3"/>
          <circle cx="20" cy="20" r="17" fill="none" stroke="${ringColor}" stroke-width="3"
            stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"
            stroke-linecap="round" transform="rotate(-90 20 20)" data-target-offset="${offset}"/>
        </svg>
        <i class="ti ${complete ? 'ti-check' : g.icon} gring-icon" style="color:${ringColor}"></i>
      </div>
      <div class="ginfo">
        <div class="gname ${complete ? 'gname-done' : ''}">${g.name}</div>
        <div class="gdesc">${g.desc}</div>
        <div class="ginsight">${insight}</div>
      </div>
      <div class="gpct-big" style="${complete ? 'color:var(--sage)' : ''}">${g.cur}<span class="gpct-max">/${g.max}</span></div>
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
    list.querySelectorAll('.gring circle[data-target-offset]').forEach(el => {
      requestAnimationFrame(() => { el.style.transition = 'stroke-dashoffset .7s ease'; el.style.strokeDashoffset = el.dataset.targetOffset; });
    });
  });
  renderGoalsOverview();
}

function renderGoalsOverview() {
  const dateEl    = document.getElementById('goals-card-date');
  const identityEl = document.getElementById('goals-card-identity');
  const circleEl  = document.getElementById('goals-overview-circle');
  const pctEl     = document.getElementById('goals-ring-pct');
  const statsEl   = document.getElementById('goals-card-stats');
  const barsEl    = document.getElementById('goals-card-bars');
  if (!dateEl) return;

  dateEl.textContent = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const goals    = S.goals || [];
  const complete = goals.filter(g => g.cur >= g.max);
  const active   = goals.filter(g => g.cur < g.max);
  const avgPct   = goals.length ? Math.round(goals.reduce((a,g) => a + Math.min(100,(g.cur/g.max)*100), 0) / goals.length) : 0;

  identityEl.textContent = goals.length
    ? (avgPct >= 70 ? 'closing in on everything' : avgPct >= 35 ? 'steady progress' : 'early days')
    : 'nothing set yet';

  // key stats
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="mc-stat"><div class="mc-stat-num">${goals.length}</div><div class="mc-stat-lbl">total</div></div>
      <div class="mc-stat"><div class="mc-stat-num">${active.length}</div><div class="mc-stat-lbl">active</div></div>
      <div class="mc-stat"><div class="mc-stat-num">${complete.length}</div><div class="mc-stat-lbl">done</div></div>`;
  }

  // per-goal progress bars
  if (barsEl) {
    barsEl.innerHTML = goals.length ? goals.map(g => {
      const pct  = Math.min(100, Math.round((g.cur/g.max)*100));
      const done = g.cur >= g.max;
      const c    = HOBBY_COLORS[g.color] || HOBBY_COLORS.sage;
      let pace = '';
      if (!done && g.createdAt) {
        const days = Math.max(1, Math.floor((Date.now()-g.createdAt)/86400000));
        const perDay = pct/days;
        const left   = perDay > 0 ? Math.ceil((100-pct)/perDay) : null;
        pace = left && left < 365 ? `~${left}d left` : '';
      }
      return `
        <div class="gc-bar-row">
          <div class="gc-bar-meta">
            <span class="gc-bar-name">${g.name}</span>
            <span class="gc-bar-pct" style="color:${done?'var(--sage)':c.fill}">${done?'✓':pct+'%'}</span>
          </div>
          <div class="gc-bar-track">
            <div class="gc-bar-fill" style="width:0%;background:${done?'var(--sage)':c.fill}" data-w="${pct}"></div>
          </div>
          ${pace ? `<div class="gc-bar-pace">${pace}</div>` : ''}
        </div>`;
    }).join('') : '<div class="idtl-empty-sm">no goals yet</div>';

    requestAnimationFrame(() => {
      barsEl.querySelectorAll('.gc-bar-fill').forEach(el => {
        requestAnimationFrame(() => { el.style.transition = 'width .9s cubic-bezier(.4,0,.2,1)'; el.style.width = el.dataset.w + '%'; });
      });
    });
  }

  // hero avg ring (r=68, circumference=427.26)
  const circumference = 2 * Math.PI * 68;
  if (circleEl) {
    requestAnimationFrame(() => {
      circleEl.style.transition = 'stroke-dashoffset 1s ease';
      circleEl.style.strokeDashoffset = circumference * (1 - avgPct/100);
    });
  }
  if (pctEl) pctEl.textContent = `${avgPct}%`;
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
const GENRE_PALETTE = [
  'var(--rose)', 'var(--sky-c)', 'var(--sage)', 'var(--violet)',
  'var(--amber)', 'var(--gold)', 'var(--ink2)', 'var(--ink3)',
];

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
  const svg = document.getElementById('mc-pie-svg');
  const center = document.getElementById('mc-chart-center');
  if (!svg) return;
  svg.innerHTML = '';
  const total = genres.reduce((a,g) => a + g.count, 0);
  if (!total) return;

  const cx = 100, cy = 100, r = 80, inner = 52;
  let startAngle = -Math.PI / 2;

  genres.forEach(({ count, color, genre }) => {
    const slice = (count / total) * Math.PI * 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(startAngle + slice);
    const y2 = cy + r * Math.sin(startAngle + slice);
    const xi1 = cx + inner * Math.cos(startAngle);
    const yi1 = cy + inner * Math.sin(startAngle);
    const xi2 = cx + inner * Math.cos(startAngle + slice);
    const yi2 = cy + inner * Math.sin(startAngle + slice);
    const large = slice > Math.PI ? 1 : 0;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${xi1},${yi1} A${inner},${inner} 0 ${large} 1 ${xi2},${yi2} L${x2},${y2} A${r},${r} 0 ${large} 0 ${x1},${y1} Z`);
    path.setAttribute('fill', color);
    path.style.transition = 'opacity .2s';
    path.style.cursor = 'default';
    svg.appendChild(path);
    startAngle += slice;
  });

  // stroke separator ring
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#fdfcfa';
  const sep = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  sep.setAttribute('cx', cx); sep.setAttribute('cy', cy); sep.setAttribute('r', inner);
  sep.setAttribute('fill', bg);
  svg.appendChild(sep);

  // center text
  if (center && genres[0]) {
    center.innerHTML = `<div class="mc-chart-pct">${Math.round((genres[0].count/total)*100)}%</div><div class="mc-chart-genre">${genres[0].genre}</div>`;
  }
}

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

    const wordCount = (entry.text||'').trim().split(/\s+/).filter(Boolean).length;

    const card = document.createElement('div');
    card.className = 'journal-past-card';
    card.innerHTML = `
      <div class="journal-past-header">
        <div class="journal-past-date">${dateStr}</div>
        ${mood ? `<div class="journal-past-mood">${mood}</div>` : ''}
        <div class="journal-past-wc">${wordCount}w</div>
        <button class="journal-past-del" onclick="deleteJournalEntry('${dateKey}')"><i class="ti ti-x"></i></button>
      </div>
      <div class="journal-past-text">${escapeHtml(entry.text||'')}</div>`;

    card.querySelector('.journal-past-text').addEventListener('click', function() {
      this.classList.toggle('expanded');
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
    card.dataset.id    = note.id;
    card.dataset.color = note.color || 'none';

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
const BOTTOM_TABS = ['world','hobbies','goals','todos','music','journal','notes','history','settings'];

function nav(name) {
  TABS.forEach(t => {
    const panel = document.getElementById('panel-' + t);
    panel?.classList.toggle('on',     t === name);
    panel?.classList.toggle('hidden', t !== name);
  });

  // bottom bar active state — all tabs now in one bar
  BOTTOM_TABS.forEach(t => {
    document.getElementById('bnb-' + t)?.classList.toggle('bnb-on', t === name);
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

  // scroll active tab button into view in the nav bar
  requestAnimationFrame(() => {
    document.getElementById('bnb-' + name)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  });
}

// kept as no-ops so any lingering calls don't throw
function navMore(name) { nav(name); }
function toggleMoreDrawer() {}
function openMoreDrawer() {}
function closeMoreDrawer() {}

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

function applySpiritMood() {
  const orb = document.getElementById('spirit-orb');
  if (!orb) return;
  const mood = deriveMood();
  if (S.spiritMood !== mood) { S.spiritMood = mood; save(); }
  orb.dataset.mood = mood;
}

function buildSpiritPrompt(screenContext) {
  const h = S.hobbies.map(x => `${x.name} [${x.type||'generic'}] (id:${x.id}, ${x.sessions||0} sessions)`).join(', ') || 'none';
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

// ─── INTEREST DETAIL DRAWER ───────────────────────────────
let _activeInterestId = null;

function openInterestDetail(id) {
  const h = S.hobbies.find(x => x.id === id);
  if (!h) return;
  _activeInterestId = id;
  const c = HOBBY_COLORS[h.color] || HOBBY_COLORS.sage;

  document.getElementById('idtl-icon').innerHTML = `<i class="ti ${h.icon}"></i>`;
  document.getElementById('idtl-icon').style.background = c.bg;
  document.getElementById('idtl-icon').style.color = c.fill;
  document.getElementById('idtl-title').textContent = h.name;

  renderInterestDetailBody(h);

  document.getElementById('interest-detail-overlay').classList.remove('hidden');
  document.getElementById('interest-detail').classList.remove('hidden');
  requestAnimationFrame(() => document.getElementById('interest-detail').classList.add('interest-detail-open'));
}

function closeInterestDetail() {
  const d = document.getElementById('interest-detail');
  d?.classList.remove('interest-detail-open');
  setTimeout(() => {
    d?.classList.add('hidden');
    document.getElementById('interest-detail-overlay')?.classList.add('hidden');
  }, 280);
  _activeInterestId = null;
}

function renderInterestDetailBody(h) {
  const body = document.getElementById('idtl-body');
  if (!body) return;
  const type = h.type || 'generic';
  if (type === 'alcohol') body.innerHTML = alcoholDetailHTML(h);
  else if (type === 'anime')   body.innerHTML = animeDetailHTML(h);
  else if (type === 'games')   body.innerHTML = gamesDetailHTML(h);
  else if (type === 'book')    body.innerHTML = bookDetailHTML(h);
  else if (type === 'fitness') body.innerHTML = fitnessDetailHTML(h);
  else body.innerHTML = '<div class="idtl-empty">nothing special here — just log sessions from the interests list.</div>';
  wireInterestDetailEvents(h);
}

function refreshInterestDetail() {
  const h = S.hobbies.find(x => x.id === _activeInterestId);
  if (h) renderInterestDetailBody(h);
  renderHobbies();
}

// ─────────────────────────────────────────────────────────
// ALCOHOL
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// ALCOHOL — each entry is one drink
// ─────────────────────────────────────────────────────────
function alcoholDetailHTML(h) {
  const drinks = h.drinks || [];
  const tags = h.tasteTags || [];
  return `
    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>favorites</span></div>
      <div class="idtl-add-row">
        <input class="idtl-input" id="alc-drink-name" placeholder="name, e.g. Lagavulin 16" />
        <input class="idtl-input idtl-input-sm" id="alc-drink-kind" placeholder="type, e.g. whiskey" />
        <button class="idtl-add-btn" data-action="add-drink"><i class="ti ti-plus"></i></button>
      </div>
      <div class="idtl-list">
        ${drinks.length ? drinks.map(d => `
          <div class="idtl-row">
            <div class="idtl-row-main">
              <div class="idtl-row-title">${d.name}</div>
              ${d.kind ? `<div class="idtl-row-sub">${d.kind}</div>` : ''}
            </div>
            <button class="idtl-row-del" data-action="del-drink" data-id="${d.id}"><i class="ti ti-x"></i></button>
          </div>`).join('') : '<div class="idtl-empty-sm">no favorites logged yet</div>'}
      </div>
    </div>

    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>taste profile</span></div>
      <div class="idtl-add-row">
        <input class="idtl-input" id="alc-tag-input" placeholder="e.g. smoky, dry, sweet..." />
        <button class="idtl-add-btn" data-action="add-tag"><i class="ti ti-plus"></i></button>
      </div>
      <div class="idtl-tags">
        ${tags.length ? tags.map(t => `<span class="idtl-tag">${t}<button data-action="del-tag" data-tag="${t}"><i class="ti ti-x"></i></button></span>`).join('') : '<div class="idtl-empty-sm">no taste tags yet</div>'}
      </div>
    </div>

    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>notes</span></div>
      <textarea class="idtl-input idtl-textarea" id="alc-notes-input" placeholder="anything else worth remembering...">${h.notes||''}</textarea>
      <button class="idtl-action-btn" data-action="save-notes" style="margin-top:8px"><i class="ti ti-check"></i> save notes</button>
    </div>

    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>recommendations</span></div>
      <button class="idtl-action-btn" data-action="get-recs"><i class="ti ti-sparkles"></i> get recommendations</button>
      <div id="idtl-recs" class="idtl-recs"></div>
    </div>`;
}

function wireAlcoholEvents(h) {
  const body = document.getElementById('idtl-body');
  body.querySelector('[data-action="add-drink"]')?.addEventListener('click', () => {
    const nameEl = document.getElementById('alc-drink-name');
    const kindEl = document.getElementById('alc-drink-kind');
    const name = nameEl.value.trim();
    if (!name) { nameEl.focus(); return; }
    if (!h.drinks) h.drinks = [];
    h.drinks.unshift({ id:'d'+Date.now(), name, kind: kindEl.value.trim() });
    save(); refreshInterestDetail();
  });
  body.querySelectorAll('[data-action="del-drink"]').forEach(btn => {
    btn.addEventListener('click', () => {
      h.drinks = (h.drinks||[]).filter(d => d.id !== btn.dataset.id);
      save(); refreshInterestDetail();
    });
  });
  body.querySelector('[data-action="add-tag"]')?.addEventListener('click', () => {
    const inp = document.getElementById('alc-tag-input');
    const tag = inp.value.trim().toLowerCase();
    if (!tag) { inp.focus(); return; }
    if (!h.tasteTags) h.tasteTags = [];
    if (!h.tasteTags.includes(tag)) h.tasteTags.push(tag);
    save(); refreshInterestDetail();
  });
  body.querySelectorAll('[data-action="del-tag"]').forEach(btn => {
    btn.addEventListener('click', () => {
      h.tasteTags = (h.tasteTags||[]).filter(t => t !== btn.dataset.tag);
      save(); refreshInterestDetail();
    });
  });
  body.querySelector('[data-action="save-notes"]')?.addEventListener('click', () => {
    h.notes = document.getElementById('alc-notes-input').value.trim();
    save(); refreshInterestDetail();
  });
  body.querySelector('[data-action="get-recs"]')?.addEventListener('click', () => getInterestRecommendations(h, 'alcohol'));
}

// ─────────────────────────────────────────────────────────
// ANIME — each entry is one title
// ─────────────────────────────────────────────────────────
function animeDetailHTML(h) {
  const characters = h.characters || [];
  const tags = h.tasteTags || [];
  return `
    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>status</span></div>
      <div class="modal-type-row">
        ${ANIME_STATUSES.map(s => `<button class="modal-type-btn ${h.status===s?'active':''}" data-action="set-status" data-status="${s}">${s}</button>`).join('')}
      </div>
    </div>

    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>character tier list</span></div>
      <div class="idtl-add-row">
        <input class="idtl-input" id="anime-char-input" placeholder="character name" />
        <select class="idtl-select idtl-select-sm" id="anime-tier-input">
          ${ANIME_TIERS.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
        <button class="idtl-add-btn" data-action="add-char"><i class="ti ti-plus"></i></button>
      </div>
      <div class="idtl-tierlist">
        ${ANIME_TIERS.map(tier => {
          const inTier = characters.filter(ch => ch.tier === tier);
          if (!inTier.length) return '';
          return `<div class="idtl-tier-row">
            <div class="idtl-tier-badge" style="background:${TIER_COLORS[tier]}">${tier}</div>
            <div class="idtl-tier-chars">
              ${inTier.map(ch => `<span class="idtl-char-chip">${ch.name}<button data-action="del-char" data-id="${ch.id}"><i class="ti ti-x"></i></button></span>`).join('')}
            </div>
          </div>`;
        }).join('') || '<div class="idtl-empty-sm">no characters ranked yet</div>'}
      </div>
    </div>

    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>taste</span></div>
      <div class="idtl-add-row">
        <input class="idtl-input" id="anime-tag-input" placeholder="e.g. shounen, slow burn, isekai..." />
        <button class="idtl-add-btn" data-action="add-tag"><i class="ti ti-plus"></i></button>
      </div>
      <div class="idtl-tags">
        ${tags.length ? tags.map(t => `<span class="idtl-tag">${t}<button data-action="del-tag" data-tag="${t}"><i class="ti ti-x"></i></button></span>`).join('') : '<div class="idtl-empty-sm">no taste tags yet</div>'}
      </div>
    </div>

    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>recommendations</span></div>
      <button class="idtl-action-btn" data-action="get-recs"><i class="ti ti-sparkles"></i> get recommendations</button>
      <div id="idtl-recs" class="idtl-recs"></div>
    </div>`;
}

function wireAnimeEvents(h) {
  const body = document.getElementById('idtl-body');
  body.querySelectorAll('[data-action="set-status"]').forEach(btn => {
    btn.addEventListener('click', () => {
      h.status = btn.dataset.status;
      save(); refreshInterestDetail();
    });
  });
  body.querySelector('[data-action="add-char"]')?.addEventListener('click', () => {
    const nameEl = document.getElementById('anime-char-input');
    const tierEl = document.getElementById('anime-tier-input');
    const name = nameEl.value.trim();
    if (!name) { nameEl.focus(); return; }
    if (!h.characters) h.characters = [];
    h.characters.push({ id:'c'+Date.now(), name, tier: tierEl.value });
    save(); refreshInterestDetail();
  });
  body.querySelectorAll('[data-action="del-char"]').forEach(btn => {
    btn.addEventListener('click', () => {
      h.characters = (h.characters||[]).filter(c => c.id !== btn.dataset.id);
      save(); refreshInterestDetail();
    });
  });
  body.querySelector('[data-action="add-tag"]')?.addEventListener('click', () => {
    const inp = document.getElementById('anime-tag-input');
    const tag = inp.value.trim().toLowerCase();
    if (!tag) { inp.focus(); return; }
    if (!h.tasteTags) h.tasteTags = [];
    if (!h.tasteTags.includes(tag)) h.tasteTags.push(tag);
    save(); refreshInterestDetail();
  });
  body.querySelectorAll('[data-action="del-tag"]').forEach(btn => {
    btn.addEventListener('click', () => {
      h.tasteTags = (h.tasteTags||[]).filter(t => t !== btn.dataset.tag);
      save(); refreshInterestDetail();
    });
  });
  body.querySelector('[data-action="get-recs"]')?.addEventListener('click', () => getInterestRecommendations(h, 'anime'));
}

// ─────────────────────────────────────────────────────────
// GAMES — each entry is one game
// ─────────────────────────────────────────────────────────
function gamesDetailHTML(h) {
  const characters = h.characters || [];
  const reminders = h.reminders || [];
  return `
    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>account</span></div>
      <div class="idtl-add-row">
        <input class="idtl-input" id="game-uid-input" placeholder="UID / username" value="${h.uid||''}" />
        <button class="idtl-add-btn" data-action="save-uid"><i class="ti ti-check"></i></button>
      </div>
    </div>

    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>characters</span></div>
      <div class="idtl-add-row">
        <input class="idtl-input" id="game-char-input" placeholder="character name" />
        <select class="idtl-select idtl-select-sm" id="game-char-tier-input">
          ${ANIME_TIERS.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
        <button class="idtl-add-btn" data-action="add-game-char"><i class="ti ti-plus"></i></button>
      </div>
      <div class="idtl-tierlist">
        ${ANIME_TIERS.map(tier => {
          const inTier = characters.filter(ch => ch.tier === tier);
          if (!inTier.length) return '';
          return `<div class="idtl-tier-row">
            <div class="idtl-tier-badge" style="background:${TIER_COLORS[tier]}">${tier}</div>
            <div class="idtl-tier-chars">
              ${inTier.map(ch => `<span class="idtl-char-chip">${ch.name}<button data-action="del-game-char" data-id="${ch.id}"><i class="ti ti-x"></i></button></span>`).join('')}
            </div>
          </div>`;
        }).join('') || '<div class="idtl-empty-sm">no characters added yet</div>'}
      </div>
    </div>

    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>reminders</span></div>
      <div class="idtl-add-row idtl-add-row-wrap">
        <input class="idtl-input" id="game-reminder-input" placeholder="e.g. claim daily login" />
        <select class="idtl-select idtl-select-sm" id="game-reminder-recur">
          ${REMINDER_RECURRENCE.map(r => `<option value="${r}">${r}</option>`).join('')}
        </select>
        <button class="idtl-add-btn" data-action="add-reminder"><i class="ti ti-plus"></i></button>
      </div>
      <div class="idtl-list">
        ${reminders.length ? reminders.map(r => `
          <div class="idtl-row">
            <div class="idtl-row-main">
              <div class="idtl-row-title">${r.text}</div>
              <div class="idtl-row-sub">${r.recurrence}${r.lastDone ? ' · done ' + formatNoteTime(r.lastDone) : ''}</div>
            </div>
            <button class="idtl-reminder-check" data-action="check-reminder" data-id="${r.id}"><i class="ti ti-check"></i></button>
            <button class="idtl-row-del" data-action="del-reminder" data-id="${r.id}"><i class="ti ti-x"></i></button>
          </div>`).join('') : '<div class="idtl-empty-sm">no reminders set</div>'}
      </div>
    </div>`;
}

function wireGamesEvents(h) {
  const body = document.getElementById('idtl-body');
  body.querySelector('[data-action="save-uid"]')?.addEventListener('click', () => {
    h.uid = document.getElementById('game-uid-input').value.trim();
    save(); refreshInterestDetail();
  });
  body.querySelector('[data-action="add-game-char"]')?.addEventListener('click', () => {
    const nameEl = document.getElementById('game-char-input');
    const tierEl = document.getElementById('game-char-tier-input');
    const name = nameEl.value.trim();
    if (!name) { nameEl.focus(); return; }
    if (!h.characters) h.characters = [];
    h.characters.push({ id:'c'+Date.now(), name, tier: tierEl.value });
    save(); refreshInterestDetail();
  });
  body.querySelectorAll('[data-action="del-game-char"]').forEach(btn => {
    btn.addEventListener('click', () => {
      h.characters = (h.characters||[]).filter(c => c.id !== btn.dataset.id);
      save(); refreshInterestDetail();
    });
  });
  body.querySelector('[data-action="add-reminder"]')?.addEventListener('click', () => {
    const textEl = document.getElementById('game-reminder-input');
    const recurEl = document.getElementById('game-reminder-recur');
    const text = textEl.value.trim();
    if (!text) { textEl.focus(); return; }
    if (!h.reminders) h.reminders = [];
    h.reminders.push({ id:'r'+Date.now(), text, recurrence: recurEl.value, lastDone: null, interestId: h.id, interestName: h.name });
    save(); refreshInterestDetail();
  });
  body.querySelectorAll('[data-action="check-reminder"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = (h.reminders||[]).find(x => x.id === btn.dataset.id);
      if (r) { r.lastDone = Date.now(); save(); refreshInterestDetail(); }
    });
  });
  body.querySelectorAll('[data-action="del-reminder"]').forEach(btn => {
    btn.addEventListener('click', () => {
      h.reminders = (h.reminders||[]).filter(r => r.id !== btn.dataset.id);
      save(); refreshInterestDetail();
    });
  });
}

// ─────────────────────────────────────────────────────────
// BOOK / MANGA
// ─────────────────────────────────────────────────────────
function bookDetailHTML(h) {
  const stars = h.rating || 0;
  return `
    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>details</span></div>
      <div class="idtl-add-row">
        <input class="idtl-input" id="book-author-input" placeholder="author" value="${h.author||''}" />
        <button class="idtl-add-btn" data-action="save-author"><i class="ti ti-check"></i></button>
      </div>
      <div class="idtl-row" style="margin-top:8px;align-items:center;gap:6px">
        <label style="font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3)">manga</label>
        <input type="checkbox" id="book-manga-toggle" ${h.isManga?'checked':''} style="cursor:pointer">
      </div>
    </div>

    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>status</span></div>
      <div class="idtl-tags" style="gap:6px">
        ${BOOK_STATUSES.map(s => `<button class="idtl-action-btn ${h.status===s?'idtl-action-btn-active':''}" data-action="set-status" data-status="${s}" style="${h.status===s?`border-color:${BOOK_STATUS_COLORS[s]};color:${BOOK_STATUS_COLORS[s]}`:''}">${s}</button>`).join('')}
      </div>
    </div>

    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>rating</span></div>
      <div class="book-stars" id="book-stars">
        ${[1,2,3,4,5].map(i => `<button class="book-star-btn ${stars>=i?'active':''}" data-star="${i}">★</button>`).join('')}
      </div>
    </div>

    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>notes</span></div>
      <textarea class="idtl-input idtl-textarea" id="book-notes-input" placeholder="thoughts, quotes, things to remember...">${h.notes||''}</textarea>
      <button class="idtl-action-btn" data-action="save-notes" style="margin-top:8px"><i class="ti ti-check"></i> save notes</button>
    </div>

    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>recommendations</span></div>
      <button class="idtl-action-btn" data-action="get-recs"><i class="ti ti-sparkles"></i> get recommendations</button>
      <div id="idtl-recs" class="idtl-recs"></div>
    </div>`;
}

function wireBookEvents(h) {
  const body = document.getElementById('idtl-body');
  body.querySelector('[data-action="save-author"]')?.addEventListener('click', () => {
    h.author = document.getElementById('book-author-input').value.trim();
    save(); refreshInterestDetail();
  });
  document.getElementById('book-manga-toggle')?.addEventListener('change', function() {
    h.isManga = this.checked; save(); refreshInterestDetail();
  });
  body.querySelectorAll('[data-action="set-status"]').forEach(btn => {
    btn.addEventListener('click', () => { h.status = btn.dataset.status; save(); refreshInterestDetail(); });
  });
  body.querySelectorAll('.book-star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.dataset.star);
      h.rating = h.rating === n ? null : n; // toggle off if same
      save(); refreshInterestDetail();
    });
  });
  body.querySelector('[data-action="save-notes"]')?.addEventListener('click', () => {
    h.notes = document.getElementById('book-notes-input').value.trim();
    save(); refreshInterestDetail();
  });
  body.querySelector('[data-action="get-recs"]')?.addEventListener('click', () => getInterestRecommendations(h, 'book'));
}

// ─────────────────────────────────────────────────────────
// FITNESS
// ─────────────────────────────────────────────────────────
function fitnessDetailHTML(h) {
  const log = (h.log||[]).slice(0,10);
  return `
    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>activity type</span></div>
      <div class="idtl-tags" style="flex-wrap:wrap;gap:6px">
        ${FITNESS_TYPES.map(t => `<button class="idtl-action-btn ${h.activityType===t?'idtl-action-btn-active':''}" data-action="set-activity" data-activity="${t}">${t}</button>`).join('')}
      </div>
    </div>

    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>log session</span></div>
      <div class="idtl-add-row">
        <input class="idtl-input idtl-input-sm" id="fitness-mins-input" type="number" min="1" max="600" placeholder="mins" style="max-width:80px"/>
        <input class="idtl-input" id="fitness-note-input" placeholder="note (optional)" />
        <button class="idtl-add-btn" data-action="log-session"><i class="ti ti-plus"></i></button>
      </div>
    </div>

    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>stats</span></div>
      <div class="idtl-row" style="justify-content:space-around;padding:8px 0">
        <div style="text-align:center">
          <div style="font-family:'Libre Baskerville',serif;font-style:italic;font-size:22px;color:var(--ink)">${h.sessions||0}</div>
          <div style="font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3)">sessions</div>
        </div>
        <div style="text-align:center">
          <div style="font-family:'Libre Baskerville',serif;font-style:italic;font-size:22px;color:var(--ink)">${h.streak||0}</div>
          <div style="font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3)">day streak</div>
        </div>
        <div style="text-align:center">
          <div style="font-family:'Libre Baskerville',serif;font-style:italic;font-size:22px;color:var(--ink)">${h.totalMins||0}</div>
          <div style="font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3)">total mins</div>
        </div>
      </div>
    </div>

    ${log.length ? `
    <div class="idtl-section">
      <div class="idtl-section-hdr"><span>recent sessions</span></div>
      <div class="idtl-list">
        ${log.map(entry => {
          const d = new Date(entry.ts);
          const label = d.toLocaleDateString(undefined, {month:'short', day:'numeric'});
          return `<div class="idtl-row">
            <div class="idtl-row-main">
              <div class="idtl-row-title">${entry.mins} min${entry.note ? ` · ${entry.note}` : ''}</div>
              <div class="idtl-row-sub">${label}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}`;
}

function wireFitnessEvents(h) {
  const body = document.getElementById('idtl-body');
  body.querySelectorAll('[data-action="set-activity"]').forEach(btn => {
    btn.addEventListener('click', () => {
      h.activityType = btn.dataset.activity;
      save(); refreshInterestDetail();
    });
  });
  body.querySelector('[data-action="log-session"]')?.addEventListener('click', () => {
    const minsEl = document.getElementById('fitness-mins-input');
    const noteEl = document.getElementById('fitness-note-input');
    const mins = parseInt(minsEl.value) || 0;
    if (mins <= 0) { minsEl.focus(); return; }
    if (!h.log) h.log = [];
    h.log.unshift({ id:'fl'+Date.now(), mins, note: noteEl.value.trim(), ts: Date.now() });
    h.sessions = (h.sessions||0) + 1;
    h.totalMins = (h.totalMins||0) + mins;
    // simple streak: check if last session was today or yesterday
    const today = new Date(); today.setHours(0,0,0,0);
    const lastTs = h.log[1]?.ts;
    const lastDay = lastTs ? new Date(lastTs) : null;
    if (lastDay) { lastDay.setHours(0,0,0,0); const diff = (today - lastDay)/86400000; h.streak = diff <= 1 ? (h.streak||0)+1 : 1; }
    else h.streak = 1;
    logActivity(`logged ${h.name} session (${mins}min)`, 'hobby');
    save(); refreshInterestDetail();
  });
}

function wireInterestDetailEvents(h) {
  const type = h.type || 'generic';
  if (type === 'alcohol') wireAlcoholEvents(h);
  else if (type === 'anime')   wireAnimeEvents(h);
  else if (type === 'games')   wireGamesEvents(h);
  else if (type === 'book')    wireBookEvents(h);
  else if (type === 'fitness') wireFitnessEvents(h);
}

// ─────────────────────────────────────────────────────────
// AI RECOMMENDATIONS — based on sibling entries of the same type
// ─────────────────────────────────────────────────────────
async function getInterestRecommendations(h, type) {
  const recsEl = document.getElementById('idtl-recs');
  if (!recsEl) return;
  recsEl.innerHTML = '<div class="idtl-recs-loading">thinking...</div>';

  let prompt = '';
  if (type === 'alcohol') {
    const favs = (h.drinks||[]).map(d => `${d.name}${d.kind?' ('+d.kind+')':''}`).join(', ') || 'none yet';
    const tags = (h.tasteTags||[]).join(', ') || 'none specified';
    prompt = `Based on these favorite drinks: ${favs}. Taste preferences: ${tags}. Suggest 3 drinks they might like, each with a one-sentence reason. Respond ONLY with valid JSON: {"items":[{"name":"...","reason":"..."}]}`;
  } else if (type === 'anime') {
    const siblings = S.hobbies.filter(x => x.type === type);
    const watched = siblings.filter(w=>w.status==='completed').map(w=>w.name).join(', ') || h.name;
    const tags = [...new Set(siblings.flatMap(s => s.tasteTags||[]))].join(', ') || 'none specified';
    prompt = `Based on completed anime: ${watched}. Taste preferences: ${tags}. Suggest 3 anime they might like, each with a one-sentence reason. Respond ONLY with valid JSON: {"items":[{"name":"...","reason":"..."}]}`;
  } else if (type === 'book') {
    const siblings = S.hobbies.filter(x => x.type === 'book');
    const read = siblings.filter(b=>b.status==='completed').map(b=>`${b.name}${b.author?' by '+b.author:''}`).join(', ') || h.name;
    const reading = siblings.filter(b=>b.status==='reading').map(b=>b.name).join(', ');
    const hasManga = siblings.some(b=>b.isManga);
    prompt = `Books/manga completed: ${read}. ${reading ? 'Currently reading: '+reading+'.' : ''} ${hasManga ? 'Interested in manga.' : ''} Suggest 3 books${hasManga?' or manga':''} they might like next, with a one-sentence reason each. Respond ONLY with valid JSON: {"items":[{"name":"...","reason":"..."}]}`;
  }
  if (!prompt) { recsEl.innerHTML = ''; return; }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await res.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
    const items = parsed.items || [];
    recsEl.innerHTML = items.length
      ? items.map(it => `<div class="idtl-rec"><div class="idtl-rec-name">${it.name}</div><div class="idtl-rec-reason">${it.reason}</div></div>`).join('')
      : '<div class="idtl-empty-sm">no suggestions came back — try adding more favorites first</div>';
  } catch(e) {
    recsEl.innerHTML = '<div class="idtl-empty-sm">couldn\'t fetch recommendations right now</div>';
  }
}


// ─── HOBBY MODAL ──────────────────────────────────────────
const HOBBY_ICONS = ['ti-crosshair','ti-trophy','ti-brush','ti-barbell','ti-camera','ti-music','ti-book','ti-run','ti-bike','ti-swim','ti-chess','ti-palette','ti-code','ti-pencil','ti-heart','ti-leaf','ti-star','ti-flame','ti-bolt','ti-moon','ti-plant','ti-paw','ti-chef-hat','ti-guitar-pick','ti-dice','ti-glass-cocktail','ti-movie','ti-device-gamepad-2'];
let _editingHobbyId = null, _hmColor = 'sage', _hmIcon = 'ti-star', _hmType = 'generic';

function openHobbyModal(id = null) {
  _editingHobbyId = id;
  const h = id ? S.hobbies.find(x => x.id === id) : null;
  document.getElementById('modal-title').textContent = h ? 'edit' : 'add interest';
  document.getElementById('hm-delete').style.display = h ? 'block' : 'none';
  _hmColor = h ? h.color : 'sage';
  _hmIcon  = h ? h.icon  : 'ti-star';
  _hmType  = h ? (h.type || 'generic') : 'generic';

  const typeRow = document.getElementById('hm-type-row');
  typeRow.innerHTML = '';
  INTEREST_TYPES.forEach(t => {
    const meta = t;
    const alreadyExists = meta.mode === 'categorical' && S.hobbies.some(x => x.type === t.id);
    const b = document.createElement('button');
    b.className = 'modal-type-btn' + (t.id === _hmType ? ' active' : '');
    b.innerHTML = `<i class="ti ${t.icon}"></i> ${t.label}`;
    b.disabled = !!h || (alreadyExists && !h); // can't change type after creation, or re-add a categorical type that already exists
    b.onclick = () => {
      if (h) return;
      _hmType = t.id;
      typeRow.querySelectorAll('.modal-type-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      if (t.id !== 'generic') _hmIcon = t.icon;
      updateNameFieldVisibility();
    };
    typeRow.appendChild(b);
  });
  updateNameFieldVisibility();
  document.getElementById('hm-name').value = h ? h.name : '';

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

function updateNameFieldVisibility() {
  const meta = INTEREST_TYPES.find(t => t.id === _hmType);
  const fieldWrap = document.getElementById('hm-name-field');
  const inp = document.getElementById('hm-name');
  if (meta?.mode === 'categorical') {
    fieldWrap.style.display = 'none';
    inp.value = meta.label; // auto-named, hidden from user
  } else {
    fieldWrap.style.display = '';
    const hints = {
      generic: 'e.g. guitar, journaling, drawing...',
      anime:   'e.g. Frieren, Attack on Titan...',
      games:   'e.g. Wuthering Waves, Genshin Impact...',
      book:    'e.g. Piranesi, Dune, Berserk...',
      fitness: 'e.g. morning run, pull day, swim...',
    };
    inp.placeholder = hints[_hmType] || hints.generic;
  }
}

function closeHobbyModal() { document.getElementById('hobby-modal-overlay').classList.add('hidden'); document.getElementById('hobby-modal').classList.add('hidden'); _editingHobbyId = null; }
function saveHobby() {
  const meta = INTEREST_TYPES.find(t => t.id === _hmType);
  const name = meta?.mode === 'categorical' ? meta.label : document.getElementById('hm-name').value.trim();
  if (!name) { document.getElementById('hm-name').focus(); return; }
  if (_editingHobbyId) {
    const h = S.hobbies.find(x => x.id === _editingHobbyId);
    if (h) { h.name = name; h.color = _hmColor; h.icon = _hmIcon; }
    logActivity('edited: '+name, 'add');
  } else {
    const base = { id:'h'+Date.now(), name, icon:_hmIcon, color:_hmColor, type:_hmType, sessions:0 };
    if (_hmType === 'alcohol') { base.drinks = []; base.tasteTags = []; base.notes = ''; }
    if (_hmType === 'anime')   { base.status = 'planned'; base.characters = []; base.tasteTags = []; }
    if (_hmType === 'games')   { base.uid = ''; base.characters = []; base.reminders = []; }
    if (_hmType === 'book')    { base.status = 'want to read'; base.author = ''; base.rating = null; base.notes = ''; base.isManga = false; }
    if (_hmType === 'fitness') { base.activityType = 'run'; base.sessions = 0; base.streak = 0; base.totalMins = 0; base.log = []; }
    S.hobbies.push(base);
    logActivity('added: '+name, 'add');
  }
  save(); renderHobbies(); closeHobbyModal();
}
function deleteHobby() {
  if (!_editingHobbyId) return;
  const h = S.hobbies.find(x => x.id === _editingHobbyId);
  if (!h || !confirm(`Delete "${h.name}"?`)) return;
  logActivity('deleted: '+h.name, 'delete');
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
    S.goals.push({ id:'g'+Date.now(), name, desc, icon:_gmIcon, color:_gmColor, cur, max, createdAt: Date.now() });
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
