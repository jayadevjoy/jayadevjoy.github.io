document.getElementById('yr').textContent = new Date().getFullYear();

// copy the email address to the clipboard
const toastEl = document.querySelector('.toast');
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
}
document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(b.dataset.copy); } catch { return; }
  toast('Email copied to clipboard');
  b.textContent = 'Copied';
  setTimeout(() => { b.textContent = 'Copy'; }, 1600);
}));

// header: frosted and compact once scrolled
const bar = document.getElementById('bar');
addEventListener('scroll', () => bar.classList.toggle('scrolled', scrollY > 8), { passive: true });

// ---------- theme toggle (dark on every load) ----------
const root = document.documentElement;
const toggle = document.getElementById('theme-toggle');
function isLight() { return root.dataset.theme === 'light'; }
function syncToggle() { toggle.setAttribute('aria-label', isLight() ? 'Switch to dark mode' : 'Switch to light mode'); }
function flipTheme() {
  if (isLight()) delete root.dataset.theme; else root.dataset.theme = 'light';
  toggle.classList.remove('spin'); void toggle.offsetWidth; toggle.classList.add('spin');   // the new icon spins in
  syncToggle(); readColors(); draw();
}
// the new theme grows out of the toggle in a circle (View Transitions); older browsers just switch
toggle.addEventListener('click', () => {
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) { flipTheme(); return; }
  const r = toggle.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.classList.add('theme-swap');   // no colour transitions inside the snapshot, so the circle reveals the final colours
  let flipped = false;
  const once = () => { if (!flipped) { flipped = true; flipTheme(); } };
  const vt = document.startViewTransition(once);
  setTimeout(() => { if (!flipped) { vt.skipTransition && vt.skipTransition(); once(); root.classList.remove('theme-swap'); } }, 500);   // never leave the click unanswered
  vt.ready.then(() => root.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
    { duration: 600, easing: 'cubic-bezier(.4, 0, .2, 1)', pseudoElement: '::view-transition-new(root)' }));
  vt.finished.finally(() => root.classList.remove('theme-swap'));
  setTimeout(() => root.classList.remove('theme-swap'), 1200);   // and never leave transitions switched off
});
syncToggle();

// ---------- hero buttons: together exactly as wide as the longest line of the sentence above (when they fit) ----------
const lede = document.querySelector('.lede'), actions = document.querySelector('.actions');
function matchActions() {
  const range = document.createRange(); range.selectNodeContents(lede);
  const left = lede.getBoundingClientRect().left;
  let w = 0; for (const r of range.getClientRects()) w = Math.max(w, r.right - left);
  // natural width the buttons need side by side; only match when the sentence is at least that wide
  actions.classList.remove('matched');
  const btns = [...actions.querySelectorAll('.btn')];
  const need = Math.max(...btns.map(b => b.offsetWidth)) * btns.length + 12 * (btns.length - 1);
  if (w < need) return;   // phones: the lines are shorter than the buttons, so keep their natural size
  actions.style.setProperty('--lede-w', `${Math.ceil(w)}px`);
  actions.classList.add('matched');
}
matchActions();
addEventListener('resize', matchActions);
document.fonts && document.fonts.ready.then(matchActions);

// ---------- experience timeline: a dot on the line beside each role ----------
function placeTimelineDots() {
  document.querySelectorAll('.exp:not(.proj) .roles').forEach(list => {
    list.querySelectorAll('.tl-dot').forEach(d => d.remove());
    if (!list.offsetParent) return;   // hidden tab: placed when it opens
    const single = getComputedStyle(list).gridTemplateColumns.split(' ').length === 1;
    [...list.children].forEach((li, i) => {
      if (li.tagName !== 'LI') return;
      const dot = document.createElement('span');
      dot.className = 'tl-dot ' + (single || i % 2 ? 'r' : 'l');   // connector reaches toward the card
      dot.style.top = `${li.offsetTop + 34}px`;   // level with the logo row
      dot.setAttribute('aria-hidden', 'true');
      const brand = li.style.getPropertyValue('--brand').trim();
      if (brand) dot.style.setProperty('--dot-b', brand);
      if (li.matches(':hover')) dot.classList.add('hot');
      li._dot = dot;
      if (!li._hoverBound) {   // light the dot while the card is hovered
        li._hoverBound = true;
        li.addEventListener('pointerenter', () => li._dot && li._dot.classList.add('hot'));
        li.addEventListener('pointerleave', () => li._dot && li._dot.classList.remove('hot'));
      }
      list.appendChild(dot);
    });
  });
}
placeTimelineDots();
addEventListener('resize', placeTimelineDots);
addEventListener('load', placeTimelineDots);
document.fonts && document.fonts.ready.then(placeTimelineDots);
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => requestAnimationFrame(placeTimelineDots)));

// ---------- click ripple from the exact point of the click ----------
document.addEventListener('pointerdown', e => {
  const host = e.target.closest('.btn, .seg button, .presets button, .tab, .copy, .links a, .more, .theme-toggle, .to-top, .lb-btn');
  if (!host || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const r = host.getBoundingClientRect(), d = Math.hypot(r.width, r.height) * 2.2;
  const box = document.createElement('span'), dot = document.createElement('i');
  box.className = 'rp';
  dot.style.cssText = `left:${e.clientX - r.left}px;top:${e.clientY - r.top}px;width:${d}px;height:${d}px`;
  box.appendChild(dot); host.appendChild(box);
  dot.addEventListener('animationend', () => box.remove(), { once: true });
});

// ---------- section headings rise into place (only when scrolling down to them) ----------
(() => {
  const heads = document.querySelectorAll('.sec-head');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  heads.forEach(h => {
    const h2 = h.querySelector('h2'), mask = document.createElement('div');
    mask.className = 'h-mask'; h2.before(mask); mask.appendChild(h2);
    h.classList.add('h-rise');
  });
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      const el = e.target;
      if (e.boundingClientRect.top < 0) { el.classList.add('in'); io.unobserve(el); continue; }   // passed from below: just show it
      if (e.isIntersecting) { el.classList.add('in'); io.unobserve(el); }
    }
  }, { rootMargin: '0px 0px -12% 0px' });
  heads.forEach(h => io.observe(h));
})();

// ---------- back-to-top button with a scroll progress ring ----------
(() => {
  const btn = document.querySelector('.to-top');
  let queued = false;
  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    btn.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0);
    btn.classList.toggle('show', scrollY > innerHeight * 0.8);
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  btn.addEventListener('click', () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  update();
})();

// ---------- blocks slide up as they scroll in ----------
// runs after the gallery is split into columns, see the end of the file
function setupRise() {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const blocks = document.querySelectorAll('.bento > *, .lab, .cards > *, .tabs, .hobbies > li, .gallery a, .cta');
  const io = new IntersectionObserver(entries => {
    let n = 0;   // blocks entering together get a small stagger
    for (const e of entries) {
      const el = e.target;
      // above the viewport (scrolling up, or jumped past via the nav): just show it
      if (e.boundingClientRect.top < 0) { el.classList.remove('rise'); io.unobserve(el); continue; }
      if (!e.isIntersecting) continue;
      el.style.setProperty('--d', `${Math.min(n++, 4) * 90}ms`);
      el.classList.add('in');
      const done = ev => {   // ignore animations finishing inside the block
        if (ev.target !== el) return;
        el.classList.remove('rise', 'in'); el.style.removeProperty('--d');
        el.removeEventListener('animationend', done);
      };
      el.addEventListener('animationend', done);
      io.unobserve(el);
    }
  }, { rootMargin: '0px 0px -40px 0px' });
  blocks.forEach(el => { if (el.closest('.exp-panel')) return; el.classList.add('rise'); io.observe(el); });
}

// ---------- nav: gliding highlight for the section in view (and on hover) ----------
const navLinks = [...document.querySelectorAll('nav a')];
const navInd = document.querySelector('nav .nav-ind');
function placeNavInd(a) {
  if (!a || !a.offsetParent) { navInd.style.opacity = 0; return; }   // none active, or link hidden on small screens
  const li = a.parentElement;
  navInd.style.width = li.offsetWidth + 'px';
  navInd.style.transform = `translateX(${li.offsetLeft}px)`;
  navInd.style.opacity = 1;
}
const currentLink = () => navLinks.find(a => a.hasAttribute('aria-current'));
const spy = new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting) {
    navLinks.forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id));
    placeNavInd(currentLink());
  }
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('section[id]').forEach(s => spy.observe(s));
// leaving the sections (back in the hero) clears the highlight
new IntersectionObserver(([e]) => {
  if (e.isIntersecting) { navLinks.forEach(a => a.removeAttribute('aria-current')); placeNavInd(null); }
}, { rootMargin: '-45% 0px -50% 0px' }).observe(document.querySelector('.hero'));
navLinks.forEach(a => a.addEventListener('pointerenter', () => placeNavInd(a)));
document.querySelector('nav ul').addEventListener('pointerleave', () => placeNavInd(currentLink()));
addEventListener('resize', () => placeNavInd(currentLink()));


// ---------- QAM constellation lab ----------
const canvas = document.getElementById('qam');
const frame = document.getElementById('frame');
const slider = document.getElementById('snr');
const out = document.getElementById('snrval');
const serOut = document.getElementById('serval');
const evmOut = document.getElementById('evmval');
const modTag = document.getElementById('modtag');
const viewBtns = [...document.querySelectorAll('.view-seg button')];
let altView = { pam: false, qam: false };   // false: eye (PAM) / constellation (QAM); true: histogram / 3D
const view = () => pam ? (altView.pam ? 'hist' : 'eye') : (altView.qam ? '3d' : 'const');
const gridCanvas = document.getElementById('qam-grid');
const cv3 = document.getElementById('qam3d');
const gctx = gridCanvas.getContext('2d');
const ctx = canvas.getContext('2d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const N = 1600;                     // points kept on screen
let M = 16, k = 4, levels = [], qLevels = [], pam = false, Es = 10, histMax = 0, avgAll = null, avgOk = null;
let gridDirty = true;
let snrDb = 18, snrTarget = 18, pts = [], w = 0, h = 0, dpr = 1, colors = {};

// levels on odd integers: ±1, ±3, …
// square M-QAM uses them on both axes, Es = 2(M-1)/3; M-PAM only on I, Es = (M²-1)/3
function setMod(m, isPam = false) {
  M = m; pam = isPam; k = pam ? M : Math.sqrt(M);
  Es = pam ? (M * M - 1) / 3 : 2 * (M - 1) / 3;
  levels = Array.from({ length: k }, (_, i) => 2 * i - (k - 1));
  qLevels = pam ? [0] : levels;
  pts = Array.from({ length: N }, sample);
  modTag.textContent = pam ? (M === 2 ? 'NRZ' : `PAM${M}`) : M === 4 ? 'QPSK' : `${M}QAM`;
  viewBtns[0].textContent = pam ? 'Eye Diagram' : 'Constellation';
  viewBtns[1].textContent = 'Histogram';
  syncViewBtns();
  surf = null; eyeFresh = true;
  histMax = 0; avgAll = avgOk = null;
  gridDirty = true;
  if (reduce) draw();
}

// canvas colours come from the CSS theme tokens
function readColors() {
  const cs = getComputedStyle(root), v = n => cs.getPropertyValue(n).trim();
  gridDirty = true;
  colors = { grid: v('--rule'), label: v('--muted'), dot: v('--qam-dot'), ideal: v('--qam-ideal'), err: v('--qam-err'), glow: !isLight() };
}

function gauss() { // Box-Muller
  let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
// complex QAM splits the noise power over I and Q; real-valued PAM has all of it on I
function sigma() { return Math.sqrt(Es / ((pam ? 1 : 2) * Math.pow(10, snrDb / 10))); }
function sample() { return { i: Math.random() * k | 0, q: Math.random() * qLevels.length | 0, nx: gauss(), ny: gauss() }; }
// nearest-level decision on one axis
function decide(v) { return Math.max(0, Math.min(k - 1, Math.round((v + k - 1) / 2))); }

function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect(); w = r.width; h = r.height;
  for (const [c, cx2] of [[canvas, ctx], [gridCanvas, gctx]]) {
    c.width = w * dpr; c.height = h * dpr; cx2.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  cv3.width = w * dpr; cv3.height = h * dpr;
  gridDirty = true;
  draw();
}
function geom() {
  // PAM's axis sits near the bottom (room for the sample strip and HUD) so the histogram gets the height
  return { cx: w / 2, cy: pam ? h - 92 : h / 2, ext: k + 0.3, scale: Math.min(w, h) / (2 * k + 1.8) };
}

// static layer: graph paper faded toward the edges, I/Q axes with level labels
function drawGrid() {
  gridDirty = false;
  const { cx, cy, ext, scale } = geom(), g = gctx;
  g.clearRect(0, 0, w, h);
  if (view() === 'eye') { drawEyeGrid(g); return; }
  if (view() === '3d') return;   // the 3D view draws its own (rotating) floor
  // minor lines every half level, major ones on the decision boundaries
  const span = Math.ceil(Math.max(w, h) / scale / 2) + 1;
  g.strokeStyle = colors.grid; g.lineWidth = 1;
  for (let v = -span; v <= span; v += 0.5) {
    g.globalAlpha = v % 2 === 0 ? 1 : 0.5;
    const x = Math.round(cx + v * scale) + 0.5, y = Math.round(cy - v * scale) + 0.5;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
  }
  g.globalAlpha = 1;
  const fade = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.62);
  fade.addColorStop(0, '#000'); fade.addColorStop(0.55, 'rgba(0,0,0,0.7)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalCompositeOperation = 'destination-in'; g.fillStyle = fade; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  // axes
  g.strokeStyle = colors.label; g.globalAlpha = 0.45;
  g.beginPath(); g.moveTo(cx - ext * scale, cy + 0.5); g.lineTo(cx + ext * scale, cy + 0.5);
  if (!pam) { g.moveTo(cx + 0.5, cy - ext * scale); g.lineTo(cx + 0.5, cy + ext * scale); }
  g.stroke();
  g.fillStyle = colors.label; g.font = '500 10px "JetBrains Mono", monospace';
  const shown = v => k < 8 || Math.abs(v) % 4 === 3;
  for (const v of levels) {
    g.beginPath(); g.moveTo(cx + v * scale, cy - 4); g.lineTo(cx + v * scale, cy + 4);
    if (!pam) { g.moveTo(cx - 4, cy - v * scale); g.lineTo(cx + 4, cy - v * scale); }
    g.stroke();
  }
  if (pam) {   // PAM decides on I alone: dashed thresholds between the levels
    g.save(); g.setLineDash([3, 5]); g.globalAlpha = 0.6;
    for (let b = -(k - 2); b <= k - 2; b += 2) {
      g.beginPath(); g.moveTo(cx + b * scale + 0.5, 44); g.lineTo(cx + b * scale + 0.5, cy + 34); g.stroke();
    }
    g.restore();
  }
  g.textAlign = 'center'; g.textBaseline = 'top';
  for (const v of levels) if (shown(v)) g.fillText(v, cx + v * scale, cy + 7);
  g.textAlign = 'right'; g.textBaseline = 'middle';
  if (!pam) for (const v of levels) if (shown(v)) g.fillText(v, cx - 7, cy - v * scale);
  g.globalAlpha = 0.8; g.font = '600 11px "JetBrains Mono", monospace';
  g.textAlign = 'left'; g.fillText('I', cx + ext * scale + 6, cy);
  if (!pam) { g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText('Q', cx, cy - ext * scale - 6); }
  g.globalAlpha = 1;
}

// noise stored unit-normal so changing SNR rescales every point instantly
let statFrame = 0;
function dots(list, r) {   // list = [x0, y0, x1, y1, …] in pixels
  ctx.beginPath();
  for (let j = 0; j < list.length; j += 2) { ctx.moveTo(list[j] + r, list[j + 1]); ctx.arc(list[j], list[j + 1], r, 0, 6.283); }
  ctx.fill();
}
function draw() {
  if (gridDirty) drawGrid();
  const v = view();
  cv3.hidden = !(v === '3d' && (gl3 || !glTried));
  if (v === 'eye' || v === '3d') {
    const st = measure(sigma());
    if (v === 'eye') drawEye(sigma());
    else {
      if (!glTried) gl3 = initGL();
      if (!(gl3 && draw3DGL())) draw3D();   // fall back to the 2D-canvas mesh
    }
    readouts(st.errors, st.noise);
    return;
  }
  const s = sigma(), { cx, cy, scale } = geom();
  // phosphor persistence: the previous frame fades instead of vanishing
  if (reduce || pam) ctx.clearRect(0, 0, w, h);   // the histogram averages over time instead
  else {
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(0, 0, w, h);
  }
  // received symbols: correct ones in the theme colour, wrong decisions in coral
  const r = k >= 8 ? 1.2 : M === 4 && !pam ? 1.8 : 1.5;
  let errors = 0, noise = 0;
  const ok = [], bad = [];
  const lo = -cx / scale, nb = 240, bw = -2 * lo / nb;   // PAM density on a fine grid across the full width
  // kernel density estimate: each sample adds a small Gaussian, sized to the noise so shapes stay true (≈5% wider)
  const kh = Math.max(1.5 * bw, 0.32 * s), kr = Math.ceil(3 * kh / bw);   // Silverman's rule for ~400 samples per level
  const kern = pam ? Array.from({ length: 2 * kr + 1 }, (_, j) => Math.exp(-0.5 * ((j - kr) * bw / kh) ** 2)) : null;
  const hOk = pam ? new Float32Array(nb) : null, hAll = pam ? new Float32Array(nb) : null;
  for (const p of pts) {
    const x = levels[p.i] + p.nx * s;
    if (pam) {   // one real dimension: noise on I only
      noise += p.nx * p.nx * s * s;
      const wrong = decide(x) !== p.i;
      if (wrong) errors++;
      const bi = Math.round((x - lo) / bw);
      for (let j = -kr; j <= kr; j++) {
        const t = bi + j;
        if (t < 0 || t >= nb) continue;
        hAll[t] += kern[j + kr]; if (!wrong) hOk[t] += kern[j + kr];
      }
      // rug of individual samples under the axis (vertical spread is only for visibility)
      (wrong ? bad : ok).push(cx + x * scale, cy + 16 + Math.max(-2, Math.min(2, p.ny)) * 4);
      continue;
    }
    const y = qLevels[p.q] + p.ny * s;
    noise += (p.nx * p.nx + p.ny * p.ny) * s * s;
    const wrong = decide(x) !== p.i || decide(y) !== p.q;
    if (wrong) errors++;
    (wrong ? bad : ok).push(cx + x * scale, cy - y * scale);
  }
  if (pam) {
    // amplitude histogram: total in coral underneath, correct decisions in the theme colour on top,
    // so the coral that shows is the part of each hump that spilled across a threshold
    // running average across frames, so the humps settle instead of flickering
    if (!avgAll || avgAll.length !== nb) { avgAll = hAll.slice(); avgOk = hOk.slice(); }
    const a = reduce ? 1 : 0.12;
    for (let i = 0; i < nb; i++) { avgAll[i] += (hAll[i] - avgAll[i]) * a; avgOk[i] += (hOk[i] - avgOk[i]) * a; }
    hAll.set(avgAll); hOk.set(avgOk);
    let peak = 0; for (const v of hAll) peak = Math.max(peak, v);
    histMax = Math.max(peak, histMax * 0.98);   // slow-moving scale so the plot doesn't jump
    const H = (cy - 64) / histMax;
    const X = i => cx + (lo + (i + 0.5) * bw) * scale;
    const curve = (hist, from, to, step) => {   // quadratic segments through midpoints, so no corners show
      for (let i = from; i !== to; i += step) {
        const j = i + step, mx = (X(i) + X(j)) / 2, my = cy - (hist[i] + hist[j]) / 2 * H;
        ctx.quadraticCurveTo(X(i), cy - hist[i] * H, mx, my);
      }
      ctx.lineTo(X(to), cy - hist[to] * H);
    };
    ctx.globalCompositeOperation = 'source-over';
    // glass look: smooth gradient-filled humps with a crisp glowing edge, errors as a coral layer on top
    const light = isLight(), top0 = 64;
    const area = (upper, lower) => {   // closed path between two curves (lower = null: down to the axis)
      ctx.beginPath(); ctx.moveTo(X(0), cy - upper[0] * H); curve(upper, 0, nb - 1, 1);
      if (lower) { ctx.lineTo(X(nb - 1), cy - lower[nb - 1] * H); curve(lower, nb - 1, 0, -1); }
      else { ctx.lineTo(X(nb - 1), cy); ctx.lineTo(X(0), cy); }
      ctx.closePath();
    };
    const accent = getComputedStyle(root).getPropertyValue('--accent').trim(), cyan = getComputedStyle(root).getPropertyValue('--accent-2').trim();
    const rgba = (c, a) => `rgba(${hex(c)},${a})`;
    const paint = (alphaScale) => {
      const gOk = ctx.createLinearGradient(0, top0, 0, cy);
      gOk.addColorStop(0, rgba(cyan, (light ? 0.42 : 0.5) * alphaScale)); gOk.addColorStop(0.55, rgba(accent, (light ? 0.22 : 0.26) * alphaScale)); gOk.addColorStop(1, rgba(accent, 0.03 * alphaScale));
      area(hOk, null); ctx.fillStyle = gOk; ctx.fill();
      const gErr = ctx.createLinearGradient(0, top0, 0, cy);
      gErr.addColorStop(0, rgba(colors.err.startsWith('#') ? colors.err : '#FF7A6B', 0.75 * alphaScale)); gErr.addColorStop(1, rgba(colors.err.startsWith('#') ? colors.err : '#FF7A6B', 0.3 * alphaScale));
      area(hAll, hOk); ctx.fillStyle = gErr; ctx.fill();
    };
    paint(1);
    // edges: coral over everything first (shows only where errors stack up), then the cyan edge with a thin bright core
    ctx.save();
    ctx.lineJoin = 'round';
    if (colors.glow) { ctx.shadowColor = colors.err; ctx.shadowBlur = 16; }
    ctx.strokeStyle = colors.err; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(X(0), cy - hAll[0] * H); curve(hAll, 0, nb - 1, 1); ctx.stroke();
    if (colors.glow) { ctx.shadowColor = cyan; ctx.shadowBlur = 20; }
    ctx.strokeStyle = cyan; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(0), cy - hOk[0] * H); curve(hOk, 0, nb - 1, 1); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = light ? 'rgba(255,255,255,0.7)' : 'rgba(235,252,255,0.75)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(X(0), cy - hOk[0] * H); curve(hOk, 0, nb - 1, 1); ctx.stroke();
    ctx.restore();
    // a crisp baseline
    ctx.strokeStyle = rgba(cyan, 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy + 0.5); ctx.lineTo(w, cy + 0.5); ctx.stroke();
    // the received samples as a strip under the axis (correct in the theme colour, errors in coral)
    ctx.fillStyle = colors.dot; dots(ok, 1.1);
    ctx.fillStyle = colors.err; dots(bad, 1.3);
  } else {
    ctx.globalCompositeOperation = colors.glow ? 'lighter' : 'source-over';
    if (colors.glow) {   // soft halo under each dot
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = colors.dot; dots(ok, r * 3.2);
      ctx.fillStyle = colors.err; dots(bad, r * 3.2);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = colors.dot; dots(ok, r);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = colors.err; dots(bad, r + 0.4);
  }
  // ideal points: a ring with four reticle ticks
  ctx.strokeStyle = colors.ideal; ctx.lineWidth = k >= 8 ? 1 : 1.4;
  const ring = k >= 8 ? 2.6 : 4, t0 = ring + 2, t1 = ring + (k >= 8 ? 4 : 6);
  ctx.beginPath();
  for (const lx of levels) for (const ly of qLevels) {
    const x = cx + lx * scale, y = cy - ly * scale;
    ctx.moveTo(x + ring, y); ctx.arc(x, y, ring, 0, 6.283);
    if (k < 8) {
      ctx.moveTo(x - t1, y); ctx.lineTo(x - t0, y); ctx.moveTo(x + t0, y); ctx.lineTo(x + t1, y);
      ctx.moveTo(x, y - t1); ctx.lineTo(x, y - t0); ctx.moveTo(x, y + t0); ctx.lineTo(x, y + t1);
    }
  }
  ctx.stroke();
  readouts(errors, noise);
}
// live readouts (throttled so the numbers are readable)
function readouts(errors, noise) {
  if (statFrame++ % 8 !== 0 && !reduce) return;
  const ser = errors / pts.length * 100, evm = Math.sqrt(noise / pts.length / Es) * 100;
  serOut.textContent = errors === 0 ? '0' : ser < 0.1 ? '<0.1' : ser < 10 ? ser.toFixed(1) : Math.round(ser);
  evmOut.textContent = evm < 10 ? evm.toFixed(1) : Math.round(evm);
}
// SER/EVM from the live symbols (same statistics as the other views)
function measure(s) {
  let errors = 0, noise = 0;
  for (const p of pts) {
    const x = levels[p.i] + p.nx * s;
    if (pam) {
      noise += p.nx * p.nx * s * s;
      if (decide(x) !== p.i) errors++;
      continue;
    }
    const y = qLevels[p.q] + p.ny * s;
    noise += (p.nx * p.nx + p.ny * p.ny) * s * s;
    if (decide(x) !== p.i || decide(y) !== p.q) errors++;
  }
  return { errors, noise };
}

// ---- eye diagram (PAM): raised-cosine shaped symbols plus noise, 2 UI per trace, phosphor persistence ----
const EYE_N = 64, EYE_L = 5, EYE_BETA = 1;   // samples per 2 UI, pulse span (symbols each side), roll-off
function rc(t) {   // raised-cosine pulse: zero at every other symbol instant, so the eye opens fully without noise
  if (Math.abs(t) < 1e-9) return 1;
  const den = 1 - (2 * EYE_BETA * t) ** 2;
  const sinc = Math.sin(Math.PI * t) / (Math.PI * t);
  return Math.abs(den) < 1e-6 ? (Math.PI / 4) * Math.sin(Math.PI / (2 * EYE_BETA)) / (Math.PI / (2 * EYE_BETA)) : sinc * Math.cos(Math.PI * EYE_BETA * t) / den;
}
const eyeTab = Array.from({ length: EYE_N + 1 }, (_, j) => {   // pulse value for each sample and neighbour symbol
  const t = -1 + 2 * j / EYE_N;
  return Array.from({ length: 2 * EYE_L + 1 }, (_, m) => rc(t - (m - EYE_L)));
});
let eyeFresh = true;
function eyeGeom() {
  const x0 = 46, x1 = w - 24, top = 50, bot = h - 66, A = (k - 1) + 1.5;   // room below for the time labels, clear of the HUD
  return { x0, x1, top, bot, A, X: j => x0 + (x1 - x0) * j / EYE_N, Y: v => (top + bot) / 2 - v / A * (bot - top) / 2 };
}
function drawEyeGrid(g) {
  const { x0, x1, top, bot, A, Y } = eyeGeom();
  // scope graticule: 8 x 6 divisions
  g.strokeStyle = colors.grid; g.lineWidth = 1;
  for (let i = 0; i <= 8; i++) { const x = Math.round(x0 + (x1 - x0) * i / 8) + 0.5; g.globalAlpha = i % 4 ? 0.5 : 1; g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke(); }
  for (let i = 0; i <= 6; i++) { const y = Math.round(top + (bot - top) * i / 6) + 0.5; g.globalAlpha = i % 3 ? 0.5 : 1; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
  g.globalAlpha = 1;
  // decision thresholds and the sampling instant, dashed
  g.save(); g.setLineDash([3, 5]); g.strokeStyle = colors.label; g.globalAlpha = 0.6;
  for (let b = -(k - 2); b <= k - 2; b += 2) { const y = Math.round(Y(b)) + 0.5; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
  const xc = Math.round((x0 + x1) / 2) + 0.5; g.beginPath(); g.moveTo(xc, top); g.lineTo(xc, bot); g.stroke();
  g.restore();
  // labels: level values on the left, time in UI along the bottom
  g.fillStyle = colors.label; g.font = '500 10px "JetBrains Mono", monospace'; g.globalAlpha = 0.8;
  g.textAlign = 'right'; g.textBaseline = 'middle';
  for (const v of levels) if (k < 8 || Math.abs(v) % 4 === 3) g.fillText(v, x0 - 8, Y(v));
  g.textAlign = 'center'; g.textBaseline = 'top';
  [['−1 UI', x0], ['0', (x0 + x1) / 2], ['+1 UI', x1]].forEach(([t, x]) => g.fillText(t, x, bot + 8));
  g.globalAlpha = 1;
}
// digital-phosphor eye: every trace is splatted into a hit-density buffer that slowly decays,
// then the buffer is colour-graded (rare: deep blue, common: cyan, densest: near white; errors: coral)
let eyeBuf = null;
function eyeBuffers() {
  const { x0, x1, top, bot } = eyeGeom(), bw = Math.max(2, Math.round((x1 - x0) / 1.5)), bh = Math.max(2, Math.round((bot - top) / 1.5));
  if (!eyeBuf || eyeBuf.bw !== bw || eyeBuf.bh !== bh) {
    const c = document.createElement('canvas'); c.width = bw; c.height = bh;
    eyeBuf = { bw, bh, all: new Float32Array(bw * bh), err: new Float32Array(bw * bh), c, g: c.getContext('2d'), img: c.getContext('2d').createImageData(bw, bh), peak: 1 };
  }
  return eyeBuf;
}
function drawEye(s) {
  const { x0, x1, top, bot, A } = eyeGeom(), B = eyeBuffers(), { bw, bh, all, err } = B;
  if (eyeFresh) { all.fill(0); err.fill(0); B.peak = 1; }
  eyeFresh = false;
  // persistence: old hits fade
  const decay = reduce ? 1 : 0.93;
  for (let i = 0; i < all.length; i++) { all[i] *= decay; err[i] *= decay; }
  const traces = reduce ? 700 : 70, mid = EYE_N / 2, L2 = 2 * EYE_L + 1, yOf = v => (0.5 - v / (2 * A)) * (bh - 1);
  const v = new Float32Array(EYE_N + 1);
  for (let tr = 0; tr < traces; tr++) {
    let y0;   // band-limited noise: one noise value per symbol, shaped by the same pulse (exact sigma at the sampling instant)
    const sym = new Array(L2), nzs = new Float32Array(L2);
    for (let m = 0; m < L2; m++) { sym[m] = Math.random() * k | 0; nzs[m] = gauss(); }
    for (let j = 0; j <= EYE_N; j++) { let y = 0; const row = eyeTab[j]; for (let m = 0; m < L2; m++) y += (levels[sym[m]] + s * nzs[m]) * row[m]; v[j] = y; }
    const bad = decide(v[mid]) !== sym[EYE_L];
    // splat the trace one buffer column at a time (linear interpolation between samples, soft vertical spread)
    for (let x = 0; x < bw; x++) {
      const f = x / (bw - 1) * EYE_N, j = Math.min(EYE_N - 1, f | 0), t = f - j;
      const y = yOf(v[j] + (v[j + 1] - v[j]) * t), yi = y | 0, fy = y - yi;
      if (yi < 0 || yi >= bh - 1) continue;
      const q = yi * bw + x;
      all[q] += 1 - fy; all[q + bw] += fy;
      if (bad) { err[q] += 1 - fy; err[q + bw] += fy; }
    }
  }
  // colour grade on a log scale against a slowly tracking peak
  let pk = 0; for (let i = 0; i < all.length; i++) if (all[i] > pk) pk = all[i];
  B.peak = Math.max(pk, B.peak * 0.97);
  const lg = Math.log1p(B.peak), d = B.img.data, light = isLight();
  const c0 = hex(getComputedStyle(root).getPropertyValue('--accent').trim()), c1 = hex(getComputedStyle(root).getPropertyValue('--accent-2').trim());
  const ce = hex(getComputedStyle(root).getPropertyValue('--qam-err').trim()), hot = light ? [10, 40, 90] : [235, 250, 255];
  for (let i = 0, o = 0; i < all.length; i++, o += 4) {
    const a = all[i];
    if (a < 0.02) { d[o + 3] = 0; continue; }
    const t = Math.log1p(a) / lg;   // 0 … 1
    let r, g2, b;
    if (t < 0.6) { const u = t / 0.6; r = c0[0] + (c1[0] - c0[0]) * u; g2 = c0[1] + (c1[1] - c0[1]) * u; b = c0[2] + (c1[2] - c0[2]) * u; }
    else { const u = (t - 0.6) / 0.4; r = c1[0] + (hot[0] - c1[0]) * u; g2 = c1[1] + (hot[1] - c1[1]) * u; b = c1[2] + (hot[2] - c1[2]) * u; }
    const e = err[i] / a;   // share of hits here from wrongly decided symbols
    if (e > 0.02) { const m = Math.min(1, e * 1.6); r += (ce[0] - r) * m; g2 += (ce[1] - g2) * m; b += (ce[2] - b) * m; }
    d[o] = r; d[o + 1] = g2; d[o + 2] = b; d[o + 3] = Math.min(255, 40 + 215 * t);
  }
  B.g.putImageData(B.img, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (colors.glow) {   // soft bloom under the bright traces
    ctx.globalAlpha = 0.5; ctx.filter = 'blur(6px)'; ctx.drawImage(B.c, x0, top, x1 - x0, bot - top); ctx.filter = 'none'; ctx.globalAlpha = 1;
  }
  ctx.drawImage(B.c, x0, top, x1 - x0, bot - top);
  // eye-height marker on the middle eye: inner edges at about ±3 sigma from the two levels around it
  const { Y } = eyeGeom(), lv = k === 2 ? [-1, 1] : [levels[(k >> 1) - 1], levels[k >> 1]], xc = (x0 + x1) / 2;
  const hiV = lv[1] - 3 * s, loV = lv[0] + 3 * s, eh = hiV - loV;
  ctx.font = '600 10px "JetBrains Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineWidth = 1.2;
  const label = (txt, x, y, col) => {   // small readout on a dark pill, legible over bright traces
    const tw = ctx.measureText(txt).width, pw = tw + 14, ph = 18;
    ctx.fillStyle = light ? 'rgba(255,255,255,0.88)' : 'rgba(7,8,15,0.82)';
    ctx.beginPath(); ctx.roundRect(x, y - ph / 2, pw, ph, 9); ctx.fill();
    ctx.strokeStyle = col; ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = col; ctx.fillText(txt, x + 7, y + 0.5);
  };
  const tone = light ? '#0B7A94' : '#E9FBFF';
  if (eh > 0.05) {
    const yh = Y(hiV), yl = Y(loV);
    ctx.strokeStyle = tone;
    ctx.beginPath(); ctx.moveTo(xc, yh); ctx.lineTo(xc, yl); ctx.moveTo(xc - 5, yh); ctx.lineTo(xc + 5, yh); ctx.moveTo(xc - 5, yl); ctx.lineTo(xc + 5, yl); ctx.stroke();
    label(`EYE OPENING ${(eh / 2 * 100).toFixed(0)}%`, xc + 10, (yh + yl) / 2, tone);
  } else label('EYE CLOSED', xc + 10, Y((lv[0] + lv[1]) / 2), colors.err);
}

// ---- 3D histogram (QAM), WebGL: the I/Q density as a smooth, per-pixel lit surface ----
// height = how densely received samples land there; coral tint = share of them decoded as the wrong symbol
const GL_N = 140;   // mesh cells per side (fine enough to stay round at any SNR)
let gl3 = null, glTried = false, glKey = '';
function hexf(c) { return hex(c).map(x => x / 255); }
function initGL() {
  glTried = true;
  const g = cv3.getContext('webgl', { antialias: true, premultipliedAlpha: true, alpha: true });
  if (!g) return null;
  g.getExtension('OES_standard_derivatives');   // for crisp contour and grid lines
  const sh = (type, src) => { const o = g.createShader(type); g.shaderSource(o, src); g.compileShader(o); return g.getShaderParameter(o, g.COMPILE_STATUS) ? o : null; };
  const prog = (vs, fs) => { const p = g.createProgram(); const a = sh(g.VERTEX_SHADER, vs), b = sh(g.FRAGMENT_SHADER, fs); if (!a || !b) return null; g.attachShader(p, a); g.attachShader(p, b); g.linkProgram(p); return g.getProgramParameter(p, g.LINK_STATUS) ? p : null; };
  // shared projection: turn about the vertical axis, then view from 30° above (matches the 2D floor maths)
  const proj = `
    uniform float uCa, uSa, uS, uW, uH, uHH, uCy;
    vec4 project(vec2 uv, float z) {
      float x = uv.x * uCa - uv.y * uSa, d = uv.x * uSa + uv.y * uCa;
      float yup = z * uHH - d * 0.5 * uS;
      return vec4(x * uS / (uW * 0.5), uCy + yup / (uH * 0.5), -(d * 0.866 + z * 0.5) * 0.4, 1.0);
    }`;
  const surf = prog(`
    attribute vec2 aUV; attribute float aZ; attribute vec3 aN; attribute float aE;
    varying float vZ; varying vec3 vN; varying float vE; varying vec2 vUV; varying float vD;
    ${proj}
    void main() {
      gl_Position = project(aUV, aZ);
      vN = vec3(aN.x * uCa - aN.z * uSa, aN.y, aN.x * uSa + aN.z * uCa);
      vZ = aZ; vE = aE; vUV = aUV; vD = aUV.x * uSa + aUV.y * uCa;
    }`, `
    #extension GL_OES_standard_derivatives : enable
    precision mediump float;
    uniform vec3 uC0, uC1, uErr, uFloor; uniform float uLight, uExt, uK;
    varying float vZ; varying vec3 vN; varying float vE; varying vec2 vUV; varying float vD;
    float band(float v, float width) {   // anti-aliased thin line where v crosses an integer
      float f = abs(fract(v - 0.5) - 0.5) / fwidth(v);
      return 1.0 - clamp(f / width, 0.0, 1.0);
    }
    void main() {
      vec3 n = normalize(vN), L = normalize(vec3(-0.5, 0.85, 0.45)), V = vec3(0.0, 0.5, 0.866);
      float diff = max(dot(n, L), 0.0);
      float spec = pow(max(dot(reflect(-L, n), V), 0.0), 40.0);
      float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
      float lift = smoothstep(0.004, 0.06, vZ);
      // height colour ramp: deep blue at the base, through the accent, to cyan, to a pale glow at the peaks
      float m = clamp(vZ * 1.1, 0.0, 1.0);
      vec3 deep = mix(uFloor, uC0, 0.55), peak = mix(uC1, vec3(1.0), 0.55 * (1.0 - uLight));
      vec3 base = m < 0.5 ? mix(deep, uC0, m * 2.0) : (m < 0.85 ? mix(uC0, uC1, (m - 0.5) / 0.35) : mix(uC1, peak, (m - 0.85) / 0.15));
      float err = smoothstep(0.06, 0.5, vE) * lift;
      base = mix(base, uErr, err);
      vec3 col = base * (0.3 + 0.8 * diff) + vec3(0.35) * spec + mix(uC1, uErr, err) * fres * 0.6 * lift;
      col += uErr * err * 0.25;   // errors glow a little
      // floor: dark glass with a fine grid and the decision boundaries etched in, fading out toward the edges
      vec2 lv = vUV * uExt;
      float grid = max(band(lv.x, 0.6), band(lv.y, 0.6)) * 0.10;
      float inside = step(abs(lv.x), uK - 1.5) , insideY = step(abs(lv.y), uK - 1.5);
      float bnd = max(band(lv.x * 0.5, 0.9) * inside, band(lv.y * 0.5, 0.9) * insideY) * 0.35;
      vec3 floorCol = uFloor + uC1 * (grid + bnd);
      float fade = 1.0 - smoothstep(0.55, 1.0, length(vUV) / 1.25);
      col = mix(floorCol, col, lift);
      float a = max(lift, fade);
      gl_FragColor = vec4(col * a, a);
    }`);
  const line = prog(`
    attribute vec3 aP;
    ${proj}
    void main() { vec4 p = project(aP.xy, aP.z); p.z -= 0.003; gl_Position = p; }`, `
    precision mediump float; uniform vec4 uCol;
    void main() { gl_FragColor = uCol; }`);
  if (!surf || !line) return null;
  // static grid: positions and triangle indices
  const N1 = GL_N + 1, uv = new Float32Array(N1 * N1 * 2), idx = new Uint16Array(GL_N * GL_N * 6);
  for (let j = 0; j <= GL_N; j++) for (let i = 0; i <= GL_N; i++) { const q = j * N1 + i; uv[2 * q] = -1 + 2 * i / GL_N; uv[2 * q + 1] = -1 + 2 * j / GL_N; }
  let t = 0;
  for (let j = 0; j < GL_N; j++) for (let i = 0; i < GL_N; i++) { const q = j * N1 + i; idx.set([q, q + 1, q + N1, q + 1, q + N1 + 1, q + N1], t); t += 6; }
  const buf = (target, data, usage) => { const b = g.createBuffer(); g.bindBuffer(target, b); g.bufferData(target, data, usage); return b; };
  return {
    g, surf, line, N1,
    uvBuf: buf(g.ARRAY_BUFFER, uv, g.STATIC_DRAW), idxBuf: buf(g.ELEMENT_ARRAY_BUFFER, idx, g.STATIC_DRAW),
    dyn: new Float32Array(N1 * N1 * 5), dynBuf: buf(g.ARRAY_BUFFER, new Float32Array(N1 * N1 * 5), g.DYNAMIC_DRAW),
    lineBuf: g.createBuffer(), lineCount: 0, count: idx.length,
  };
}
// heights, normals and error share on the mesh; only recomputed when the noise level changes
function buildGL(s, ext) {
  const { g, N1, dyn, dynBuf } = gl3, n = N1 - 1, ref = 0.35 / s;
  const ax = Array.from({ length: N1 }, (_, i) => -ext + 2 * ext * i / n);
  const gx = levels.map(l => ax.map(x => Math.exp(-((x - l) ** 2) / (2 * s * s))));   // one Gaussian per level, per axis
  const S1 = ax.map((_, i) => gx.reduce((t, row) => t + row[i], 0));
  const own = ax.map((x, i) => gx[decide(x)][i]);   // the level whose decision region this coordinate falls in
  const Z = new Float32Array(N1 * N1);
  for (let j = 0; j < N1; j++) for (let i = 0; i < N1; i++) Z[j * N1 + i] = 1 - Math.exp(-1.2 * S1[i] * S1[j] * ref * ref);
  const hs = (h * 0.4) / (Math.min(w, h) * 0.36 * 0.866), du = 2 / n;   // height in floor units, for true normals
  for (let j = 0; j < N1; j++) for (let i = 0; i < N1; i++) {
    const q = j * N1 + i, o = q * 5;
    const zx = (Z[j * N1 + Math.min(n, i + 1)] - Z[j * N1 + Math.max(0, i - 1)]) / (du * (i > 0 && i < n ? 2 : 1)) * hs;
    const zy = (Z[Math.min(n, j + 1) * N1 + i] - Z[Math.max(0, j - 1) * N1 + i]) / (du * (j > 0 && j < n ? 2 : 1)) * hs;
    const l = Math.hypot(zx, 1, zy);
    const tot = S1[i] * S1[j];
    dyn[o] = Z[q]; dyn[o + 1] = -zx / l; dyn[o + 2] = 1 / l; dyn[o + 3] = -zy / l;
    dyn[o + 4] = tot > 1e-9 ? 1 - (own[i] * own[j]) / tot : 0;
  }
  g.bindBuffer(g.ARRAY_BUFFER, dynBuf); g.bufferSubData(g.ARRAY_BUFFER, 0, dyn);
  // decision boundaries and the outline, draped over the surface
  const pts3 = [], heightAt = (u, v) => { const fi = (u + 1) / 2 * n, fj = (v + 1) / 2 * n; return Z[Math.round(fj) * N1 + Math.round(fi)] + 0.004; };
  const strip = (fn) => { for (let t = 0; t < 120; t++) { const a = fn(t / 120), b = fn((t + 1) / 120); pts3.push(a[0], a[1], heightAt(a[0], a[1]), b[0], b[1], heightAt(b[0], b[1])); } };
  for (let b = -(k - 2); b <= k - 2; b += 2) { const f = b / ext; strip(t => [f, -1 + 2 * t]); strip(t => [-1 + 2 * t, f]); }
  strip(t => [-1 + 2 * t, -1]); strip(t => [1, -1 + 2 * t]); strip(t => [1 - 2 * t, 1]); strip(t => [-1, 1 - 2 * t]);
  g.bindBuffer(g.ARRAY_BUFFER, gl3.lineBuf); g.bufferData(g.ARRAY_BUFFER, new Float32Array(pts3), g.DYNAMIC_DRAW);
  gl3.lineCount = pts3.length / 3;
}
function draw3DGL() {
  if (!gl3) return false;
  const { g, surf, line } = gl3, ext = k + 0.6, s = Math.round(sigma() * 400) / 400;
  const key = `${s}|${k}|${w}|${h}`;
  if (key !== glKey) { buildGL(s, ext); glKey = key; }
  const ang = 0.7 + (reduce ? 0 : performance.now() * 0.00011), S = Math.min(w, h) * 0.36;
  g.viewport(0, 0, cv3.width, cv3.height);
  g.clearColor(0, 0, 0, 0); g.clearDepth(1); g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
  g.enable(g.DEPTH_TEST); g.depthFunc(g.LEQUAL);
  const setProj = p => {
    const u = n => g.getUniformLocation(p, n);
    g.uniform1f(u('uCa'), Math.cos(ang)); g.uniform1f(u('uSa'), Math.sin(ang)); g.uniform1f(u('uS'), S);
    g.uniform1f(u('uW'), w); g.uniform1f(u('uH'), h); g.uniform1f(u('uHH'), h * 0.4); g.uniform1f(u('uCy'), 1 - 2 * 0.6);
  };
  const cs = getComputedStyle(root), tok = n => cs.getPropertyValue(n).trim();
  // surface
  g.useProgram(surf); setProj(surf);
  g.uniform3fv(g.getUniformLocation(surf, 'uC0'), hexf(tok('--accent')));
  g.uniform3fv(g.getUniformLocation(surf, 'uC1'), hexf(tok('--accent-2')));
  g.uniform3fv(g.getUniformLocation(surf, 'uErr'), hexf(tok('--qam-err')));
  g.uniform1f(g.getUniformLocation(surf, 'uLight'), isLight() ? 1 : 0);
  g.uniform1f(g.getUniformLocation(surf, 'uExt'), ext); g.uniform1f(g.getUniformLocation(surf, 'uK'), k);
  g.uniform3fv(g.getUniformLocation(surf, 'uFloor'), hexf(tok('--bg-2')).map((c, i) => c * 0.9 + hexf(tok('--accent'))[i] * 0.1));
  const at = n => g.getAttribLocation(surf, n);
  g.bindBuffer(g.ARRAY_BUFFER, gl3.uvBuf); g.enableVertexAttribArray(at('aUV')); g.vertexAttribPointer(at('aUV'), 2, g.FLOAT, false, 0, 0);
  g.bindBuffer(g.ARRAY_BUFFER, gl3.dynBuf);
  g.enableVertexAttribArray(at('aZ')); g.vertexAttribPointer(at('aZ'), 1, g.FLOAT, false, 20, 0);
  g.enableVertexAttribArray(at('aN')); g.vertexAttribPointer(at('aN'), 3, g.FLOAT, false, 20, 4);
  g.enableVertexAttribArray(at('aE')); g.vertexAttribPointer(at('aE'), 1, g.FLOAT, false, 20, 16);
  g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, gl3.idxBuf);
  g.enable(g.BLEND); g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);   // the floor fades out at its edges
  g.drawElements(g.TRIANGLES, gl3.count, g.UNSIGNED_SHORT, 0);
  g.disable(g.BLEND);
  [at('aUV'), at('aZ'), at('aN'), at('aE')].forEach(l => g.disableVertexAttribArray(l));
  // soft light pooling on the floor under the terrain (on the layer behind the 3D canvas)
  gctx.clearRect(0, 0, w, h);
  const pool = gctx.createRadialGradient(w / 2, h * 0.6, 0, w / 2, h * 0.6, S * 1.25);
  pool.addColorStop(0, `rgba(${hex(tok('--accent-2'))},${isLight() ? 0.12 : 0.16})`); pool.addColorStop(1, 'rgba(0,0,0,0)');
  gctx.save(); gctx.translate(w / 2, h * 0.6); gctx.scale(1, 0.5); gctx.translate(-w / 2, -h * 0.6);
  gctx.fillStyle = pool; gctx.fillRect(0, 0, w, h * 2); gctx.restore();
  gridDirty = false;
  // axis labels on the 2D layer (outside the floor, so never hidden)
  ctx.clearRect(0, 0, w, h);
  const ca = Math.cos(ang), sa = Math.sin(ang), P = (u, v) => [w / 2 + (u * ca - v * sa) * S, h * 0.6 + (u * sa + v * ca) * S * 0.5];
  ctx.fillStyle = colors.label; ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 0.8;
  const li = P(1.18, 0), lq = P(0, 1.18); ctx.fillText('I', li[0], li[1]); ctx.fillText('Q', lq[0], lq[1]); ctx.globalAlpha = 1;
  return true;
}

// ---- 3D histogram fallback (no WebGL): the I/Q density as a shaded mesh on a slowly turning floor ----
const hex = c => { const m = c.replace('#', ''); const n = parseInt(m.length === 3 ? m.replace(/./g, x => x + x) : m, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
let surf = null;   // cached heights for the current sigma / modulation
function surface(s, ext) {
  s = Math.round(s * 400) / 400;   // reuse the mesh while the SNR glides in tiny steps
  if (surf && surf.s === s && surf.k === k) return surf;
  // the density is separable: f(x, y) = Sx(x) * Sy(y), with each a sum of Gaussians over the levels;
  // mesh fine enough to keep sharp peaks round (about two cells per sigma), within a sensible budget
  const n = Math.max(36, Math.min(76, Math.ceil(2 * ext / (s * 0.55)))), ax = Float32Array.from({ length: n + 1 }, (_, i) => -ext + 2 * ext * i / n);
  const S1 = ax.map(x => levels.reduce((t, l) => t + Math.exp(-((x - l) ** 2) / (2 * s * s)), 0));
  const ref = 0.35 / s;   // a cloud of spread 0.35 peaks at about 0.7 tall; tighter clouds rise toward 1
  const z = new Float32Array((n + 1) * (n + 1));
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) z[j * (n + 1) + i] = 1 - Math.exp(-1.2 * S1[i] * S1[j] * ref * ref);
  return (surf = { s, k, n, ax, z });
}
let last3d = 0;
function draw3D() {
  const now = performance.now();
  if (!reduce && now - last3d < 32) return;   // ~30 fps is plenty for a slow turn, and keeps fine meshes light
  last3d = now;
  ctx.clearRect(0, 0, w, h);
  const ext = k + 0.6, { n, z } = surface(sigma(), ext);
  const ang = 0.7 + (reduce ? 0 : performance.now() * 0.00011), ca = Math.cos(ang), sa = Math.sin(ang);
  const S = Math.min(w, h) * 0.36, TILT = 0.5, HH = h * 0.4, cx = w / 2, cy = h * 0.6;
  const P = (u, v, hz = 0) => { const x = u * ca - v * sa, d = u * sa + v * ca; return [cx + x * S, cy + d * S * TILT - hz * HH, d]; };
  // floor: outline, decision boundaries
  ctx.strokeStyle = colors.grid; ctx.lineWidth = 1;
  const edge = (u0, v0, u1, v1) => { const a = P(u0, v0), b = P(u1, v1); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
  edge(-1, -1, 1, -1); edge(1, -1, 1, 1); edge(1, 1, -1, 1); edge(-1, 1, -1, -1);
  ctx.globalAlpha = 0.7;
  for (let b = -(k - 2); b <= k - 2; b += 2) { const f = b / ext; edge(f, -1, f, 1); edge(-1, f, 1, f); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = colors.label; ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const li = P(1.15, 0), lq = P(0, 1.15); ctx.globalAlpha = 0.8; ctx.fillText('I', li[0], li[1]); ctx.fillText('Q', lq[0], lq[1]); ctx.globalAlpha = 1;
  // project every mesh vertex once
  const N1 = n + 1, px = new Float32Array(N1 * N1), py = new Float32Array(N1 * N1), pd = new Float32Array(N1 * N1);
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const q = j * N1 + i, p = P(-1 + 2 * i / n, -1 + 2 * j / n, z[q]); px[q] = p[0]; py[q] = p[1]; pd[q] = p[2];
  }
  // patches far to near; colour by height, shade by slope toward a light from the upper left
  const c0 = hex(getComputedStyle(root).getPropertyValue('--accent').trim()), c1 = hex(getComputedStyle(root).getPropertyValue('--accent-2').trim());
  const order = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const q = j * N1 + i, hz = (z[q] + z[q + 1] + z[q + N1] + z[q + N1 + 1]) / 4;
    order.push([q, (pd[q] + pd[q + N1 + 1]) / 2, hz]);
  }
  order.sort((a, b) => a[1] - b[1]);
  const light = isLight();
  ctx.lineWidth = 0.5; ctx.lineJoin = 'round';
  for (const [q, , hz] of order) {
    const dzx = (z[q + 1] + z[q + N1 + 1] - z[q] - z[q + N1]) * n / 4, dzy = (z[q + N1] + z[q + N1 + 1] - z[q] - z[q + 1]) * n / 4;
    const lit = Math.max(0.35, Math.min(1.25, 0.85 - 0.5 * (dzx * ca - dzy * sa) + 0.25 * hz));   // simple slope lighting
    const m = Math.min(1, hz * 1.15);
    const rgb = c0.map((c, i) => Math.round(Math.min(255, (c + (c1[i] - c) * m) * lit)));
    const fillA = light ? 0.55 + 0.4 * m : 0.35 + 0.6 * m;
    ctx.fillStyle = `rgba(${rgb},${fillA})`;
    ctx.beginPath(); ctx.moveTo(px[q], py[q]); ctx.lineTo(px[q + 1], py[q + 1]); ctx.lineTo(px[q + N1 + 1], py[q + N1 + 1]); ctx.lineTo(px[q + N1], py[q + N1]); ctx.closePath();
    ctx.fill();
    if (n <= 56) { ctx.strokeStyle = `rgba(${c1},${0.08 + 0.3 * m})`; ctx.stroke(); }   // faint wireframe (skipped on very fine meshes)
  }
}

// view switch
const viewName = document.getElementById('viewname');
function syncViewBtns() {
  const alt = pam ? altView.pam : altView.qam;
  viewName.textContent = `${{ eye: 'Eye diagram', hist: 'Histogram', const: 'Constellation', '3d': 'Histogram' }[view()]} · CH1`;
  viewBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === 1 ? alt : !alt)));
  if (typeof moveSegInd === 'function') requestAnimationFrame(moveSegInd);   // labels change width too
}
viewBtns.forEach((b, i) => {
  b.addEventListener('click', () => {
    if (pam) altView.pam = i === 1; else altView.qam = i === 1;
    syncViewBtns(); gridDirty = true; eyeFresh = true; last3d = 0;
    ctx.clearRect(0, 0, w, h);
    if (reduce) draw();
  });
});
// controls set a target; the displayed SNR glides toward it each frame
let dragging = false;
function setSnr(v) {
  snrTarget = Math.max(0, Math.min(30, v));
  if (reduce) { snrDb = snrTarget; showSnr(); draw(); }
}
function showSnr() {
  if (!dragging) slider.value = snrDb;
  out.textContent = snrDb.toFixed(1);
  slider.style.setProperty('--p', `${snrDb / 30 * 100}%`);
}

let touched = false;
slider.addEventListener('input', () => { touched = true; setSnr(+slider.value); });
slider.addEventListener('pointerdown', () => { dragging = true; });
addEventListener('pointerup', () => { dragging = false; });
function fromPointer(e) {
  const r = frame.getBoundingClientRect();
  touched = true; setSnr(((e.clientX - r.left) / r.width) * 30);
}
frame.addEventListener('pointermove', e => { if (e.buttons) fromPointer(e); });   // only while pressed: click and drag
frame.addEventListener('pointerdown', e => { frame.setPointerCapture(e.pointerId); fromPointer(e); });

// modulation switch and SNR presets
function moveSegInd() {   // glide each row's highlight to its pressed button, like the tabs
  document.querySelectorAll('.lab .seg').forEach(seg => {
    const b = seg.querySelector('button[aria-pressed="true"]'), ind = seg.querySelector('.seg-ind');
    if (!b || !ind) return;
    ind.style.width = b.offsetWidth + 'px';
    ind.style.transform = `translateX(${b.offsetLeft}px)`;
  });
}
document.querySelectorAll('[data-mod]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-mod]').forEach(x => x.setAttribute('aria-pressed', x === b));
  setMod(+b.dataset.mod, 'pam' in b.dataset);
  moveSegInd();
}));
moveSegInd();
addEventListener('resize', moveSegInd);
document.fonts && document.fonts.ready.then(moveSegInd);
document.querySelectorAll('[data-snr]').forEach(b => b.addEventListener('click', () => { touched = true; setSnr(+b.dataset.snr); }));

// live stream: replace a slice of points each frame; drift SNR until someone interacts
let t0 = performance.now();
function tick(t) {
  for (let i = 0; i < 40; i++) pts[(Math.random() * N) | 0] = sample();
  if (!touched) setSnr(15 + 9 * Math.sin((t - t0) / 2600));
  snrDb += (snrTarget - snrDb) * 0.14;   // ease toward the target
  if (Math.abs(snrTarget - snrDb) < 0.01) snrDb = snrTarget;
  showSnr();
  draw();
  if (onScreen) requestAnimationFrame(tick); else running = false;
}
// only animate while the plot is on screen, so scrolling elsewhere stays smooth
let onScreen = true, running = false;
function start() { if (!running && !reduce) { running = true; requestAnimationFrame(tick); } }
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) start(); }).observe(frame);
}
addEventListener('resize', resize);
readColors();
setMod(16);
showSnr();
resize();
start();

// ---------- lightbox for gallery photos and project figures ----------
// links still point at the full image, so everything works without JS too
const lb = document.getElementById('lightbox');
const lbImg = lb.querySelector('img');
const lbCap = lb.querySelector('figcaption');
let lbSet = [], lbIdx = 0;
// remember markup order before the gallery gets rearranged into columns
document.querySelectorAll('a.zoom').forEach((a, i) => { a.dataset.i = i; });

const lbAmbs = [...lb.querySelectorAll('.lb-ambient')], lbCount = lb.querySelector('.lb-count');
let lbAmb = lbAmbs[0];   // the visible backdrop layer
let lbSliding = false, lbAmbPending = null;
const lbPrefetched = new Map();
// give the viewer image its final on-screen size up front (from the photo's shape), so the zoom grows
// straight to full size even while the small thumbnail is the one loaded
function sizeLbImg(thumb) {
  const ar = (+thumb.getAttribute('width') || thumb.naturalWidth) / (+thumb.getAttribute('height') || thumb.naturalHeight);
  const maxW = innerWidth - (innerWidth <= 560 ? 24 : 128), maxH = innerHeight * 0.84;
  const w = Math.min(maxW, maxH * ar);
  lbImg.style.width = `${w}px`; lbImg.style.height = `${w / ar}px`;
}
addEventListener('resize', () => { if (lb.open && lbSet[lbIdx]) sizeLbImg(lbSet[lbIdx].querySelector('img')); });
function lbShow(i) {
  lbIdx = (i + lbSet.length) % lbSet.length;
  const a = lbSet[lbIdx], thumb = a.querySelector('img');
  // show the cached thumbnail at once, then swap in the full image when it has loaded
  const pre = lbPrefetched.get(a.href), ready = pre && pre.complete && pre.naturalWidth;
  lbImg.src = ready ? a.href : (thumb.currentSrc || thumb.src);   // a preloaded full image is already decoded: use it straight away
  lbImg.alt = thumb.alt; lbCap.textContent = thumb.alt;
  sizeLbImg(thumb);
  const full = new Image();
  full.onload = () => { if (lbSet[lbIdx] !== a) return; if (lbBusy) lbPending = a.href; else lbImg.src = a.href; };
  full.src = a.href;   // instant when it was prefetched
  const photo = a.dataset.group === 'gallery';
  lb.classList.toggle('photo', photo);
  const amb = photo ? `url("${thumb.currentSrc || thumb.src}")` : '';
  if (lbSliding) lbAmbPending = amb; else lbAmb.style.backgroundImage = amb;   // a backdrop redraw mid-slide would stutter
  // load and decode the neighbours' full images ahead of time, so the next slide has nothing to wait for
  for (const k of [lbIdx + 1, lbIdx - 1]) {
    const n = lbSet[(k + lbSet.length) % lbSet.length];
    if (n && !lbPrefetched.has(n.href)) { const im = new Image(); im.src = n.href; im.decode && im.decode().catch(() => {}); lbPrefetched.set(n.href, im); }
  }
  const multi = lbSet.length > 1;
  lbCount.textContent = multi ? `${String(lbIdx + 1).padStart(2, '0')} / ${String(lbSet.length).padStart(2, '0')}` : '';
  lb.querySelector('.lb-prev').hidden = lb.querySelector('.lb-next').hidden = !multi;
  if (lb.open && !reduce) hideTile(a);   // keep the current photo's tile empty, ready for the zoom back
}
// zoom between the tile and the viewer. The viewer image starts exactly over the tile: scaled so the
// photo matches the tile's crop (object-fit: cover, plus its zoom and drift) and clipped to the tile's
// rounded box, then grows to full view. Closing runs the same path backwards.
let lbTile = null;   // the tile hidden while its photo is open
let lbBusy = false, lbPending = null;   // swap in the full image only once a zoom has finished
const LB_EASE = 'cubic-bezier(.2, .8, .2, 1)';
// fade the darkening, the ambient glow and the controls on the same clock as the zoom
function fadeChrome(show, duration) {
  const els = [lb.querySelector('.lb-veil'), lbAmb, lbCount, lbCap, ...lb.querySelectorAll('.lb-btn')];
  return els.map(el => {
    const target = el === lbAmb && !lb.classList.contains('photo') ? 0 : 1;
    const frames = [{ opacity: 0 }, { opacity: target }];
    return el.animate(show ? frames : frames.reverse(), { duration, easing: LB_EASE, fill: 'both' });
  }).concat(lb.querySelector('.lb-shadow').animate(   // the shadow forms over the second half of the zoom in, and goes first on the way out
    show ? [{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0, offset: 0.5 }, { opacity: 0 }],
    { duration, easing: 'ease-out', fill: 'both' }));
}
function hideTile(a) {
  if (lbTile) lbTile.style.visibility = '';
  lbTile = a; if (a) a.style.visibility = 'hidden';
}
function flip(a, reverse) {
  const thumb = a.querySelector('img'), full = a.getBoundingClientRect(), box = thumb.getBoundingClientRect();
  // only the part of the tile that is actually showing counts (the collapsed gallery hides the rest)
  const clipper = a.closest('.gallery, .card'), cr = clipper && getComputedStyle(clipper).overflow !== 'visible' ? clipper.getBoundingClientRect() : null;
  const tile = cr ? { left: Math.max(full.left, cr.left), top: Math.max(full.top, cr.top), right: Math.min(full.right, cr.right), bottom: Math.min(full.bottom, cr.bottom) } : full;
  tile.width = tile.right - tile.left; tile.height = tile.bottom - tile.top;
  const cut = tile.height < full.height - 1 || tile.width < full.width - 1;
  const to = lbImg.getBoundingClientRect();
  if (!to.width || !tile.width) return null;
  // where the whole photo sits on screen inside the tile (cover or contain fit around the image box's centre)
  const ar = to.width / to.height;
  const fit = getComputedStyle(thumb).objectFit === 'contain' ? Math.min : Math.max;   // project figures are contained
  const cw = fit(box.width, box.height * ar), ch = cw / ar;
  const s = cw / to.width;
  const pcx = box.left + box.width / 2, pcy = box.top + box.height / 2;
  const dx = pcx - (to.left + to.width / 2), dy = pcy - (to.top + to.height / 2);
  // the tile's box in the viewer image's own (unscaled) coordinates, as clip-path insets
  const top = (tile.top - (pcy - ch / 2)) / s, left = (tile.left - (pcx - cw / 2)) / s;
  const bottom = ((pcy + ch / 2) - tile.bottom) / s, right = ((pcx + cw / 2) - tile.right) / s;
  const radius = parseFloat(getComputedStyle(a).borderTopLeftRadius) || 0;
  const frames = [
    { transform: `translate(${dx}px, ${dy}px) scale(${s})`, clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius / s}px)` },
    { transform: 'translate(0, 0) scale(1)', clipPath: 'inset(0px 0px 0px 0px round 10px)' },
  ];
  const duration = reverse ? 420 : 520;
  const anim = lbImg.animate(reverse ? frames.reverse() : frames, { duration, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'both' });
  if (cut) {   // a partly hidden tile sits under a fade, so melt into it rather than landing with a hard edge
    const fade = reverse ? [{ opacity: 1 }, { opacity: 1, offset: 0.55 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 1 }];
    anim.fade = lbImg.animate(fade, { duration, easing: 'ease-out', fill: 'both' });
  }
  anim.cut = cut;
  return anim;
}
document.querySelectorAll('a.zoom').forEach(a => a.addEventListener('click', e => {
  if (typeof lb.showModal !== 'function') return;
  e.preventDefault();
  lbSet = [...document.querySelectorAll(`a.zoom[data-group="${a.dataset.group}"]`)].sort((x, y) => x.dataset.i - y.dataset.i);
  lbShow(lbSet.indexOf(a));
  const open = () => {
    lb.classList.remove('closing');
    lb.showModal();
    if (reduce) return;
    lbBusy = true;
    const anim = flip(a, false), fades = fadeChrome(true, 520);
    hideTile(a);
    let settled = false;
    const settle = () => {
      if (settled) return; settled = true;
      lbBusy = false; anim && anim.cancel(); anim && anim.fade && anim.fade.cancel(); fades.forEach(f => f.cancel());
      if (lbPending) { lbImg.src = lbPending; lbPending = null; }
    };
    anim ? anim.finished.then(settle, settle) : settle();
    setTimeout(settle, 700);   // in case the animation never reports back (e.g. a background tab)
  };
  lbImg.decode ? lbImg.decode().then(open, open) : open();
}));
function lbClose() {
  if (!lb.open || lb.classList.contains('closing')) return;
  lb.classList.add('closing');
  const a = lbSet[lbIdx], r = a && a.getBoundingClientRect();
  const visible = r && r.bottom > 0 && r.top < innerHeight && r.width;
  if (!reduce && visible) hideTile(a); else hideTile(null);
  const dur = reduce ? 1 : visible ? 420 : 260;
  lbBusy = true;
  const anim = !reduce && visible ? flip(a, true) : lbImg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: LB_EASE, fill: 'both' });
  if (anim && anim.cut) hideTile(null);   // the partly hidden tile shows again underneath as the photo melts into it
  const fades = fadeChrome(false, dur);   // the page shows through gradually as the photo shrinks home
  let finished = false;
  const done = () => {
    if (finished) return; finished = true;
    hideTile(null); lb.close(); lb.classList.remove('closing');
    lbBusy = false; anim && anim.cancel(); anim && anim.fade && anim.fade.cancel(); fades.forEach(f => f.cancel());
  };
  anim ? anim.finished.then(done, done) : done();
  setTimeout(done, dur + 200);   // same safety net for closing
}
lb.addEventListener('cancel', e => { e.preventDefault(); lbClose(); });   // Esc
lb.querySelector('.lb-close').addEventListener('click', lbClose);
// next / previous: a filmstrip slide. A copy of the current photo glides fully off one side while
// the next glides in from the other, side by side; the blurred backdrop crossfades on the same clock.
let lbStepId = 0, lbStepAnims = [], lbStepClone = null;
function lbStepTidy() {
  lbStepAnims.forEach(a => a.cancel()); lbStepAnims = [];
  if (lbStepClone) { lbStepClone.remove(); lbStepClone = null; }
  lb.querySelector('.lb-frame').style.opacity = '';
  if (lbSliding) {   // motion over: swap in the full-res photo
    lbSliding = false; lbBusy = false;
    if (lbPending) { lbImg.src = lbPending; lbPending = null; }
    if (lbAmbPending !== null) { lbAmb.style.backgroundImage = lbAmbPending; lbAmbPending = null; }
  }
}
function lbStep(d) {
  if (lbSet.length < 2) return;
  if (reduce || !lb.open || lb.classList.contains('closing')) { lbShow(lbIdx + d); return; }
  lbStepTidy();   // a quick repeat click starts the next slide from where things are
  const id = ++lbStepId, frame = lb.querySelector('.lb-frame'), r = frame.getBoundingClientRect();
  // the current photo as a copy sitting exactly where it is
  const clone = frame.cloneNode(true);
  clone.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;pointer-events:none;will-change:transform`;
  lb.appendChild(clone); lbStepClone = clone;
  lbSliding = true; lbBusy = true;   // hold the full-res swap until the slide ends
  lbShow(lbIdx + d);
  // one motion, like flicking through photos: both travel a full screen width together,
  // the current photo out of frame on one side, the next into place from the other
  const w = innerWidth, dur = 600, ease = 'cubic-bezier(.4, 0, .2, 1)';
  lbStepAnims = [
    clone.animate([{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(${-d * w}px,0,0)` }], { duration: dur, easing: ease, fill: 'both' }),
    frame.animate([{ transform: `translate3d(${d * w}px,0,0)` }, { transform: 'translate3d(0,0,0)' }], { duration: dur, easing: ease, fill: 'both' }),
    lbCap.animate([{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }], { duration: dur, fill: 'both' }),
  ];
  // the backdrop crossfades on the same clock
  if (lbAmbPending !== null) {
    const from = lbAmb, to = lbAmbs.find(x => x !== from);
    to.style.backgroundImage = lbAmbPending; lbAmbPending = null;
    to.classList.add('on'); from.classList.remove('on');
    lbStepAnims.push(
      to.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, easing: ease, fill: 'both' }),
      from.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: ease, fill: 'both' }));
    lbAmb = to;
  }
  const done = () => { if (id === lbStepId) lbStepTidy(); };
  lbStepAnims[1].finished.then(done, () => {});
  setTimeout(done, dur + 120);   // never leave the copy behind if the animation doesn't report back
}
lb.querySelector('.lb-prev').addEventListener('click', () => lbStep(-1));
lb.querySelector('.lb-next').addEventListener('click', () => lbStep(1));
lb.addEventListener('click', e => { if (e.target === lb) lbClose(); });   // click outside the image
// swipe between photos on touch screens
let swipeX = null;
lb.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') swipeX = e.clientX; });
lb.addEventListener('pointerup', e => {
  if (swipeX === null) return;
  const dx = e.clientX - swipeX; swipeX = null;
  if (Math.abs(dx) > 50 && lbSet.length > 1) lbStep(dx < 0 ? 1 : -1);
});
lb.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') lbStep(-1);
  if (e.key === 'ArrowRight') lbStep(1);
});
lb.addEventListener('close', () => { lbStepId++; lbStepTidy(); lbImg.removeAttribute('src'); });   // drop any slide still in flight

// ---------- gallery: mosaic of mixed tile sizes (newest first) ----------
// rows are half a column tall, so each photo gets a tile close to its own shape:
// square 1×2, portrait 1×3, landscape 2×3, wide 2×2; every few photos one becomes a big feature.
// Dense packing fills the gaps, which gives the collage look. The lightbox shows the full photo.
const gallery = document.querySelector('.gallery');
const photos = [...gallery.querySelectorAll('a')];
let galleryW = 0;
function layoutGallery() {
  const W = gallery.clientWidth;
  if (!W || W === galleryW) return;
  galleryW = W;
  const gap = 12, cols = W >= 900 ? 4 : W >= 560 ? 3 : 2;
  const colW = (W - gap * (cols - 1)) / cols, unit = (colW - gap) / 2;   // two units + a gap = one square cell
  gallery.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gallery.style.gridAutoRows = `${unit}px`;
  // skyline packing: each photo goes into the lowest open spot and narrows to fit. Tile sizes are
  // picked at random from shapes that suit the photo; for each width we try many seeded layouts and
  // keep the one with no empty space and the least stretching, so it looks random but stays the same.
  const ars = photos.map(a => { const img = a.querySelector('img'); return img.getAttribute('width') / img.getAttribute('height'); });
  const shapes = ar =>   // [columns, rows, weight]
    ar < 0.9 ? [[1, 3, 5], [1, 4, 3], [2, 5, 1]] :             // portrait: tall, extra tall, big
    ar < 1.15 ? [[1, 2, 6], [2, 4, 1]] :                        // square: small, big
    ar < 1.5 ? [[2, 3, 5], [2, 2, 2], [3, 4, 1]] :              // 4:3 landscape: regular, short, big
    [[2, 2, 5], [3, 3, 1]];                                     // 16:9 wide: regular, big
  const pack = rand => {
    const colH = new Array(cols).fill(0), tiles = [];
    ars.forEach((ar, i) => {
      const y = Math.min(...colH), x = colH.indexOf(y);
      let room = 0; while (x + room < cols && colH[x + room] === y) room++;   // flat run at that height
      const opts = shapes(ar).filter(([c, r]) => i >= 4 || c * r <= 6);   // no big tiles right at the top
      let pick = rand() * opts.reduce((t, o) => t + o[2], 0), c, r;
      for (const o of opts) { if ((pick -= o[2]) <= 0) { [c, r] = o; break; } }
      if (c === undefined) [c, r] = opts[0];
      if (c > room) [c, r] = [room, Math.max(2, Math.round(r * room / c))];   // narrow gap: shrink, keep the shape
      for (let j = x; j < x + c; j++) colH[j] = y + r;
      tiles.push({ a: photos[i], x, y, c, r });
    });
    // straight bottom edge: stretch the last tile in each column down to the deepest column
    const H = Math.max(...colH);
    let stretch = 0;
    for (const t of tiles) {
      const bottom = t.y + t.r, cs = colH.slice(t.x, t.x + t.c);
      if (cs.every(v => v === bottom) && bottom < H) { stretch += H - bottom; t.r += H - bottom; for (let j = t.x; j < t.x + t.c; j++) colH[j] = H; }
    }
    const holes = colH.reduce((t, v) => t + H - v, 0);
    return { tiles, score: holes * 1000 + stretch };
  };
  const seeded = seed => () => {   // mulberry32
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let best = null;
  for (let seed = 1; seed <= 120; seed++) {
    const p = pack(seeded(seed + cols * 1000));
    if (!best || p.score < best.score) best = p;
    if (best.score === 0) break;
  }
  const tiles = best.tiles;
  for (const { a, x, y, c, r } of tiles) {
    a.style.gridColumn = `${x + 1} / span ${c}`;
    a.style.gridRow = `${y + 1} / span ${r}`;
  }
  const peekRows = cols >= 4 ? 3.2 : cols === 3 ? 3.6 : 4.2;   // narrower screens show more rows before the fade
  gallery.style.setProperty('--peek', `${Math.round(colW * peekRows)}px`);
  gallery.classList.add('mosaic');
}
layoutGallery();
addEventListener('resize', layoutGallery);

// depth: each photo drifts a little inside its tile as you scroll
if (!reduce) {
  let ticking = false, galleryOn = false;
  const drift = () => {
    ticking = false;
    const vh = innerHeight;
    for (const a of photos) {
      const r = a.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
      a.querySelector('img').style.setProperty('--py', `${(p * r.height * 0.035).toFixed(1)}px`);
    }
  };
  new IntersectionObserver(([e]) => { galleryOn = e.isIntersecting; if (galleryOn) drift(); }).observe(gallery);
  addEventListener('scroll', () => { if (galleryOn && !ticking) { ticking = true; requestAnimationFrame(drift); } }, { passive: true });
}

// each photo glows in its own average colour on hover
const swatch = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
function tint(img) {
  try {
    swatch.drawImage(img, 0, 0, 1, 1);
    let [r, g, b] = swatch.getImageData(0, 0, 1, 1).data;
    const avg = (r + g + b) / 3;
    [r, g, b] = [r, g, b].map(c => avg + (c - avg) * 2.2);   // averages come out greyish: push the colour
    const m = Math.max(r, g, b, 1), k = Math.min(1.6, 220 / m);   // lift dark photos so the glow stays visible
    [r, g, b] = [r, g, b].map(c => Math.round(Math.max(0, Math.min(255, c * k))));
    img.closest('a').style.setProperty('--tint', `rgb(${r} ${g} ${b})`);
  } catch { /* unreadable image: keep the default cyan */ }
}
for (const a of photos) {
  const img = a.querySelector('img');
  if (img.complete && img.naturalWidth) tint(img); else img.addEventListener('load', () => tint(img), { once: true });
}

// gentle tilt toward the cursor
if (!reduce) for (const a of photos) {
  a.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = a.getBoundingClientRect();
    a.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 7}deg`);
    a.style.setProperty('--rx', `${(0.5 - (e.clientY - r.top) / r.height) * 7}deg`);
  });
  a.addEventListener('pointerleave', () => { a.style.setProperty('--rx', '0deg'); a.style.setProperty('--ry', '0deg'); });
}

// show a couple of rows first; the rest unfold on request
const more = document.querySelector('.more');
if (photos.length > 12) {
  gallery.classList.add('collapsed');
  more.hidden = false;
  const label = () => { more.textContent = gallery.classList.contains('collapsed') ? 'Show more' : 'Show less'; };
  label();
  more.addEventListener('click', () => {
    const open = gallery.classList.contains('collapsed');
    if (open) {
      gallery.style.maxHeight = gallery.scrollHeight + 'px';   // animate to the full height, then let it go
      gallery.classList.remove('collapsed');
      const done = e => {   // ignore the photos' own hover transitions
        if (e && (e.target !== gallery || e.propertyName !== 'max-height')) return;
        gallery.removeEventListener('transitionend', done); clearTimeout(t);
        gallery.style.maxHeight = ''; gallery.classList.add('open');
      };
      gallery.addEventListener('transitionend', done);
      const t = setTimeout(done, 1000);   // in case the transition never reports back
    } else {
      gallery.style.maxHeight = gallery.scrollHeight + 'px';
      gallery.classList.remove('open');
      void gallery.offsetHeight;
      gallery.style.maxHeight = '';
      gallery.classList.add('collapsed');
      gallery.closest('section').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }
    more.setAttribute('aria-expanded', open);
    label();
  });
}
setupRise();

// ---------- tabbed groups (projects, experience) with a sliding highlight ----------
document.querySelectorAll('.exp').forEach(box => {
  const tabs = [...box.querySelectorAll('.tab')];
  const tabInd = box.querySelector('.tab-ind');
  const moveTabInd = tab => {
    tabInd.style.width = tab.offsetWidth + 'px';
    tabInd.style.transform = `translateX(${tab.offsetLeft}px)`;
  };
  const current = () => tabs.find(t => t.getAttribute('aria-selected') === 'true');
  function selectTab(tab, animate = true) {
    const from = box.offsetHeight;
    tabs.forEach(t => {
      const on = t === tab, panel = document.getElementById(t.getAttribute('aria-controls'));
      t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      panel.hidden = !on;
      panel.classList.remove('enter');
      if (on && animate) { void panel.offsetWidth; panel.classList.add('enter'); }
    });
    moveTabInd(tab);
    if (animate && !reduce) {   // ease the box to its new height instead of jumping
      const to = box.offsetHeight;
      box.style.overflow = 'hidden';   // clip only while resizing, so hover shadows aren't cut off
      box.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: 350, easing: 'cubic-bezier(.3,.7,.2,1)' })
        .finished.then(() => { box.style.overflow = ''; });
      clearTimeout(box._t); box._t = setTimeout(() => { box.style.overflow = ''; }, 450);   // safety net
    }
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {   // arrow keys move between tabs
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      const next = tabs[(i + d + tabs.length) % tabs.length]; next.focus(); selectTab(next);
    });
  });
  selectTab(tabs[0], false);
  // first time the group scrolls into view, play the entrance for the open tab
  const obs = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    obs.disconnect();
    box.querySelector('.exp-panel:not([hidden])').classList.add('enter');
  }, { threshold: 0.15 });
  obs.observe(box);
  addEventListener('resize', () => moveTabInd(current()));
  document.fonts && document.fonts.ready.then(() => moveTabInd(current()));
});

// spotlight + slight 3D tilt: the card follows the cursor
document.querySelectorAll('.fx').forEach(card => {
  card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    card.style.setProperty('--mx', `${x}px`);
    card.style.setProperty('--my', `${y}px`);
    if (!reduce && e.pointerType === 'mouse' && !card.classList.contains('lab')) {   // no tilt on the lab, so dragging the plot stays steady
      const k = 6 * Math.min(1, 420 / r.width);   // wide panels tilt less
      card.style.setProperty('--ry', `${(x / r.width - 0.5) * k}deg`);
      card.style.setProperty('--rx', `${(0.5 - y / r.height) * k}deg`);
    }
  });
  card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
});

// portrait: gentle tilt toward the cursor
const portrait = document.querySelector('.portrait');
if (!reduce) {
  portrait.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = portrait.getBoundingClientRect();
    portrait.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`);
    portrait.style.setProperty('--rx', `${(0.5 - (e.clientY - r.top) / r.height) * 8}deg`);
  });
  portrait.addEventListener('pointerleave', () => { portrait.style.setProperty('--rx', '0deg'); portrait.style.setProperty('--ry', '0deg'); });
}

// hero kicker: rotate through a few short facts
const rot = [...document.querySelectorAll('.rot > span')];
if (!reduce && rot.length > 1) {
  let ri = 0;
  setInterval(() => {
    const cur = rot[ri]; ri = (ri + 1) % rot.length; const nxt = rot[ri];
    cur.classList.remove('on'); cur.classList.add('out');
    nxt.classList.remove('out'); nxt.classList.add('on');
    setTimeout(() => cur.classList.remove('out'), 600);
  }, 3200);
}
