// ─── BLOSSOM / WORLD SCREEN ───────────────────────────────
// The "world" tab — AI-generated insight bubbles orbiting a center orb.
// Call renderBlossom() when the world tab is activated.

let blossomFrame = null;
let blossomBubbles = [];
let blossomAngles = [];
let blossomSpeeds = [];
let blossomLoading = false;

const BLOSSOM_COLORS = [
  {bg:'#eaf2e6',border:'#c8d9c1',text:'#3d5a37'},
  {bg:'#eae6f5',border:'#c8bfe8',text:'#3d2e6b'},
  {bg:'#f5e8d4',border:'#e8c990',text:'#7a4e18'},
  {bg:'#ddeef7',border:'#aacfe8',text:'#1e4d6b'},
  {bg:'#f5e0e0',border:'#e8b8b8',text:'#7a3030'},
  {bg:'#f3ede2',border:'#e0d4bc',text:'#5c5549'},
  {bg:'#eaf2e6',border:'#c8d9c1',text:'#3d5a37'},
  {bg:'#eae6f5',border:'#c8bfe8',text:'#3d2e6b'},
];

const BLOSSOM_ORBITS     = [0, 0, 0, 0, 1, 1, 1];
const BLOSSOM_BASE_ANGLES = [0, 51, 103, 154, 60, 180, 300];
const BLOSSOM_SIZES       = [110, 120, 115, 108, 96, 100, 94];

function blossomW() { return window.innerWidth; }
function blossomH() { return document.getElementById('blossom-panel')?.offsetHeight || window.innerHeight - 88; }

function buildInsightPrompt() {
  const h = S.hobbies.map(h => `${h.name}: ${h.sessions} sessions, lv${h.lvl}, streak ${h.streak}d`).join('\n');
  const g = S.goals.map(g => `${g.name}: ${g.cur}/${g.max} (${Math.min(100,Math.round(g.cur/g.max*100))}%)`).join('\n');
  return `You are analyzing someone's personal life terminal called "my world".
Their data:
HOBBIES:\n${h}
GOALS:\n${g}
STATS: consistency ${S.stats.consistency}, creativity ${S.stats.creativity}, discipline ${S.stats.discipline}, energy ${S.stats.energy}
STREAK: ${S.streak} days, XP: ${S.xp}

Generate exactly 7 short insight bubbles. Each should be a genuine observation, trend, encouragement, or gentle nudge — like a wise friend reading the data.

Respond with ONLY a JSON array, no markdown, no explanation:
[
  {"text": "short poetic insight here", "tag": "oneword"},
  ...
]

Rules:
- "text" is 6–12 words max, punchy and personal
- Vary tone: warm, observational, gently challenging
- Reference specific hobby/goal names from the data
- No generic advice
- "tag" is always 1 word lowercase`;
}

function clearBlossom() {
  cancelAnimationFrame(blossomFrame);
  blossomFrame = null;
  const c = document.getElementById('blossom-bubbles');
  if (c) c.innerHTML = '';
  blossomBubbles = [];
  blossomAngles = [];
  blossomSpeeds = [];
}

function spawnBlossomBubbles(insights) {
  const container = document.getElementById('blossom-bubbles');
  if (!container) return;
  container.innerHTML = '';
  blossomBubbles = [];
  blossomAngles = [];
  blossomSpeeds = [];

  insights.forEach((ins, i) => {
    const c      = BLOSSOM_COLORS[i % BLOSSOM_COLORS.length];
    const orbit  = BLOSSOM_ORBITS[i] ?? 0;
    const size   = BLOSSOM_SIZES[i] ?? 105;
    const fsize  = size > 110 ? '11.5px' : '11px';
    const speed  = (0.08 + Math.random() * 0.06) * (orbit === 1 ? -1 : 1);

    const el = document.createElement('div');
    el.className = 'bl-bubble';
    el.style.cssText = `width:${size}px;height:${size}px;background:${c.bg};border-color:${c.border};opacity:0;transition:opacity .5s ease ${i*80+100}ms;`;
    el.innerHTML = `
      <div class="bl-btext" style="color:${c.text};font-size:${fsize}">${ins.text}</div>
      <div class="bl-btag"  style="color:${c.text}">${ins.tag}</div>`;
    container.appendChild(el);

    blossomBubbles.push({ el, orbit, size });
    blossomAngles.push(BLOSSOM_BASE_ANGLES[i] ?? i * 51);
    blossomSpeeds.push(speed);

    requestAnimationFrame(() => { el.style.opacity = '1'; });
  });

  blossomAnimate();
}

function blossomAnimate() {
  const panel  = document.getElementById('blossom-panel');
  if (!panel) return;
  const bounds = panel.getBoundingClientRect();
  const cx = bounds.width / 2;
  const cy = bounds.height / 2;
  const orbitR = [Math.min(bounds.width, bounds.height) * 0.28, Math.min(bounds.width, bounds.height) * 0.43];

  blossomBubbles.forEach(({ el, orbit, size }, i) => {
    blossomAngles[i] += blossomSpeeds[i];
    const rad = blossomAngles[i] * Math.PI / 180;
    const x   = cx + Math.cos(rad) * orbitR[orbit] - size / 2;
    const y   = cy + Math.sin(rad) * orbitR[orbit] - size / 2;
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
  });

  blossomFrame = requestAnimationFrame(blossomAnimate);
}

async function loadBlossomInsights() {
  if (blossomLoading) return;
  blossomLoading = true;

  const btn = document.getElementById('blossom-refresh');
  if (btn) { btn.style.transform = 'rotate(360deg)'; btn.style.transition = 'transform .6s ease'; setTimeout(() => { btn.style.transform = ''; btn.style.transition = ''; }, 700); }

  clearBlossom();
  const loader = document.getElementById('blossom-loader');
  const loaderText = document.getElementById('blossom-loader-text');
  if (loader) loader.style.display = 'block';
  if (loaderText) loaderText.style.display = 'block';

  // update center orb
  const sub = document.getElementById('bl-orb-sub');
  if (sub) sub.textContent = S.xp.toLocaleString() + ' xp · ' + S.streak + 'd streak';

  const fallback = [
    {text:"drawing is your most practiced art",     tag:"habit"},
    {text:"aim training hasn't seen you in a while", tag:"nudge"},
    {text:"creativity is your highest stat",         tag:"trend"},
    {text:"sketchbook nearly half full",             tag:"goal"},
    {text:"photography is just waking up",           tag:"habit"},
    {text:"keep the streak alive today",             tag:"streak"},
    {text:"platinum is a long road, but moving",     tag:"goal"},
  ];

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: buildInsightPrompt() }]
      })
    });
    const data = await res.json();
    const raw  = data.content?.find(b => b.type === 'text')?.text || '[]';
    const insights = JSON.parse(raw.replace(/```json|```/g,'').trim());
    if (loader) loader.style.display = 'none';
    if (loaderText) loaderText.style.display = 'none';
    spawnBlossomBubbles(insights.length ? insights : fallback);
  } catch(e) {
    if (loader) loader.style.display = 'none';
    if (loaderText) loaderText.style.display = 'none';
    spawnBlossomBubbles(fallback);
  }

  blossomLoading = false;
}

// called when switching away from world tab
function pauseBlossom() {
  cancelAnimationFrame(blossomFrame);
  blossomFrame = null;
}

// called when switching back to world tab
function resumeBlossom() {
  if (blossomBubbles.length > 0) blossomAnimate();
}

// called on first render
function renderBlossom() {
  loadBlossomInsights();
}
