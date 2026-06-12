// ─── BLOSSOM SCREEN ───────────────────────────────────────
// Sits between the intro and the main terminal.
// Reads from S (state) so bubbles reflect real data.
// Call initBlossom() after load() has run.

let blossomFrame = null;
let blossomAngles = [0, 0];
let blossomSpeeds = [0.18, 0.10];
let blossomBubbles = [];
let blossomStarted = false;

function blossomW() { return window.innerWidth; }
function blossomH() { return window.innerHeight; }

function getOrbitRadius(orbit) {
  const min = Math.min(blossomW(), blossomH());
  return orbit === 0 ? min * 0.29 : min * 0.44;
}

function getCenterSize() {
  return Math.min(blossomW(), blossomH()) * 0.16;
}

// Build bubble data from live state
function buildBlossomData() {
  const hobbies = S.hobbies.map((h, i) => ({
    id: h.id,
    label: h.name,
    icon: { aim: '🎯', rank: '🏆', draw: '🖌', gym: '🏋', photo: '📷' }[h.id] || '✦',
    val: 'lv ' + h.lvl,
    size: 62 + Math.min(h.sessions, 5) * 3,
    color: HOBBY_COLORS[h.color],
    orbit: 0,
    angle: i * 72,
    tip: `${h.sessions} sessions logged\n+${h.xpPerSession}xp per session\n${h.streak}d streak`,
    tab: 'hobbies',
  }));

  const goals = S.goals.map((g, i) => {
    const pct = Math.min(100, Math.round((g.cur / g.max) * 100));
    return {
      id: g.id,
      label: g.name,
      icon: { g1: '🥇', g2: '📓', g3: '🔥', g4: '📷' }[g.id] || '✦',
      val: pct + '%',
      size: 54 + Math.round(pct / 20),
      color: HOBBY_COLORS[g.color],
      orbit: 1,
      angle: i * 90,
      tip: `${g.desc}\n${g.cur} / ${g.max}`,
      tab: 'goals',
    };
  });

  return [...hobbies, ...goals];
}

function positionCenterOrb() {
  const orb = document.getElementById('blossom-center');
  if (!orb) return;
  const s = getCenterSize();
  orb.style.width  = s + 'px';
  orb.style.height = s + 'px';
  orb.style.left   = '50%';
  orb.style.top    = '50%';
  orb.style.transform = 'translate(-50%,-50%)';
}

function buildBubbleEls() {
  const container = document.getElementById('blossom-bubbles');
  if (!container) return;
  container.innerHTML = '';
  blossomBubbles = [];

  const data = buildBlossomData();
  data.forEach((b, i) => {
    const el = document.createElement('div');
    el.className = 'bl-bubble';
    el.style.cssText = `
      width:${b.size}px;height:${b.size}px;
      background:${b.color.bg};
      border-color:${b.color.border};
      left:0;top:0;opacity:0;
      transition:opacity .5s ease ${i * 0.07 + 0.2}s, transform .2s ease;
    `;
    el.innerHTML = `
      <div class="bl-b-icon" style="color:${b.color.text}">${b.icon}</div>
      <div class="bl-b-label" style="color:${b.color.text}">${b.label}</div>
      <div class="bl-b-val" style="color:${b.color.text}">${b.val}</div>`;

    el.addEventListener('mouseenter', () => {
      showBlossomTooltip(b, el);
      blossomSpeeds = [0.04, 0.025];
    });
    el.addEventListener('mouseleave', () => {
      hideBlossomTooltip();
      blossomSpeeds = [0.18, 0.10];
    });
    el.addEventListener('click', () => exitBlossom(b.tab));

    container.appendChild(el);
    blossomBubbles.push({ el, data: b });
  });
}

function updateBubblePositions() {
  const cx = blossomW() / 2, cy = blossomH() / 2;
  blossomBubbles.forEach(({ el, data }) => {
    const r     = getOrbitRadius(data.orbit);
    const base  = blossomAngles[data.orbit];
    const angle = (data.angle + base) * Math.PI / 180;
    const x     = cx + Math.cos(angle) * r - data.size / 2;
    const y     = cy + Math.sin(angle) * r - data.size / 2;
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
  });
  drawBlossomConnectors();
}

function drawBlossomConnectors() {
  const svg = document.getElementById('blossom-svg');
  if (!svg) return;
  svg.innerHTML = '';
  const cx = blossomW() / 2, cy = blossomH() / 2;

  blossomBubbles.forEach(({ data }) => {
    if (data.orbit !== 0) return;
    const r     = getOrbitRadius(0);
    const angle = (data.angle + blossomAngles[0]) * Math.PI / 180;
    const bx    = cx + Math.cos(angle) * r;
    const by    = cy + Math.sin(angle) * r;
    const line  = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', cx); line.setAttribute('y1', cy);
    line.setAttribute('x2', bx); line.setAttribute('y2', by);
    line.setAttribute('stroke', '#c8d9c1');
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-dasharray', '3 5');
    line.setAttribute('opacity', '0.55');
    svg.appendChild(line);
  });
}

function blossomAnimate() {
  blossomAngles[0] += blossomSpeeds[0];
  blossomAngles[1] -= blossomSpeeds[1];
  updateBubblePositions();
  blossomFrame = requestAnimationFrame(blossomAnimate);
}

function showBlossomTooltip(b, el) {
  const tt   = document.getElementById('blossom-tooltip');
  const rect = el.getBoundingClientRect();
  document.getElementById('bl-tt-name').textContent = b.label;
  document.getElementById('bl-tt-body').textContent = b.tip;
  tt.style.left = (rect.left + rect.width / 2) + 'px';
  tt.style.top  = rect.top + 'px';
  tt.classList.add('show');
}

function hideBlossomTooltip() {
  document.getElementById('blossom-tooltip')?.classList.remove('show');
}

// Called when user clicks a bubble or "open terminal"
function exitBlossom(tabName) {
  cancelAnimationFrame(blossomFrame);
  const screen = document.getElementById('blossom-screen');
  screen.style.transition = 'opacity .45s ease';
  screen.style.opacity = '0';
  setTimeout(() => {
    screen.classList.add('hidden');
    screen.style.opacity = '';
    document.getElementById('app').classList.remove('hidden');
    renderAll();
    loadWhisper();
    if (tabName) nav(tabName);
    const today = new Date().toDateString();
    if (S.lastLogin !== today) { S.lastLogin = today; save(); }
  }, 450);
}

// Called from intro "enter" button
function showBlossom() {
  if (blossomStarted) return;
  blossomStarted = true;

  const intro = document.getElementById('intro');
  intro.classList.add('out');

  setTimeout(() => {
    intro.style.display = 'none';
    const screen = document.getElementById('blossom-screen');
    screen.classList.remove('hidden');
    screen.style.opacity = '0';
    screen.style.transition = 'opacity .5s ease';
    requestAnimationFrame(() => { screen.style.opacity = '1'; });

    // update center orb text
    document.getElementById('bl-co-sub').textContent = S.xp.toLocaleString() + ' xp · ' + S.streak + 'd streak';
    document.getElementById('bl-xp-bar').textContent = '✦ ' + S.xp.toLocaleString() + ' xp   ·   🔥 ' + S.streak + ' day streak';

    positionCenterOrb();
    buildBubbleEls();
    updateBubblePositions();

    requestAnimationFrame(() => {
      blossomBubbles.forEach(({ el }) => { el.style.opacity = '1'; });
    });

    blossomAnimate();
  }, 750);
}

function initBlossom() {
  window.addEventListener('resize', () => {
    if (blossomStarted) { positionCenterOrb(); updateBubblePositions(); }
  });
}
