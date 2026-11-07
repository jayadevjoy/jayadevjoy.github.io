document.getElementById('yr').textContent = new Date().getFullYear();

// sticky header border once scrolled
const bar = document.getElementById('bar');
addEventListener('scroll', () => bar.classList.toggle('scrolled', scrollY > 8), { passive: true });

// ---------- theme toggle (dark on every load) ----------
const root = document.documentElement;
const toggle = document.getElementById('theme-toggle');
function isLight() { return root.dataset.theme === 'light'; }
function syncToggle() { toggle.setAttribute('aria-label', isLight() ? 'Switch to dark mode' : 'Switch to light mode'); }
toggle.addEventListener('click', () => {
  if (isLight()) delete root.dataset.theme; else root.dataset.theme = 'light';
  syncToggle(); readColors(); draw();
});
syncToggle();

// ---------- reveal sections as they scroll in ----------
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -10% 0px' });
  reveals.forEach(el => io.observe(el));
} else reveals.forEach(el => el.classList.add('in'));

// ---------- highlight the nav link for the section in view ----------
const navLinks = [...document.querySelectorAll('nav a')];
const spy = new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting)
    navLinks.forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id));
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('section[id]').forEach(s => spy.observe(s));

// ---------- 16-QAM constellation ----------
const canvas = document.getElementById('qam');
const frame = document.getElementById('frame');
const slider = document.getElementById('snr');
const out = document.getElementById('snrval');
const ctx = canvas.getContext('2d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const levels = [-3, -1, 1, 3];
const Es = 10;                      // average symbol energy of 16-QAM on ±1, ±3
const N = 1400;                     // points kept on screen
let snrDb = 18, pts = [], w = 0, h = 0, dpr = 1, colors = {};

// canvas colours come from the CSS theme tokens
function readColors() {
  const cs = getComputedStyle(root), v = n => cs.getPropertyValue(n).trim();
  colors = { grid: v('--rule'), label: v('--muted'), dot: v('--qam-dot'), ideal: v('--qam-ideal'), glow: !isLight() };
}

function gauss() { // Box-Muller
  let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function sigma() { return Math.sqrt(Es / (2 * Math.pow(10, snrDb / 10))); }
function sample() {
  const s = sigma();
  return { x: levels[Math.random() * 4 | 0], y: levels[Math.random() * 4 | 0], nx: gauss(), ny: gauss(), s };
}
function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect(); w = r.width; h = r.height;
  canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
// noise stored unit-normal so changing SNR rescales every point instantly
function draw() {
  const s = sigma(), scale = Math.min(w, h) / 10, cx = w / 2, cy = h / 2 + 8;
  ctx.clearRect(0, 0, w, h);
  // decision boundaries
  ctx.strokeStyle = colors.grid; ctx.lineWidth = 1;
  for (const b of [-2, 0, 2]) {
    ctx.beginPath(); ctx.moveTo(cx + b * scale, cy - 4.3 * scale); ctx.lineTo(cx + b * scale, cy + 4.3 * scale); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 4.3 * scale, cy + b * scale); ctx.lineTo(cx + 4.3 * scale, cy + b * scale); ctx.stroke();
  }
  ctx.fillStyle = colors.label; ctx.font = '500 12px "JetBrains Mono", monospace';
  ctx.fillText('I', cx + 4.3 * scale + 6, cy + 4); ctx.fillText('Q', cx - 4, cy - 4.3 * scale - 8);
  // received symbols; additive blending in dark mode makes dense clusters glow
  ctx.fillStyle = colors.dot;
  if (colors.glow) ctx.globalCompositeOperation = 'lighter';
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(cx + (p.x + p.nx * s) * scale, cy - (p.y + p.ny * s) * scale, 1.7, 0, 6.283);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // ideal points
  ctx.strokeStyle = colors.ideal; ctx.lineWidth = 1.5;
  for (const x of levels) for (const y of levels) {
    ctx.beginPath(); ctx.arc(cx + x * scale, cy - y * scale, 4, 0, 6.283); ctx.stroke();
  }
}
function setSnr(v) {
  snrDb = Math.max(0, Math.min(30, v));
  slider.value = snrDb; out.textContent = (Math.round(snrDb * 2) / 2).toString();
  if (reduce) draw();
}
for (let i = 0; i < N; i++) pts.push(sample());

let touched = false;
slider.addEventListener('input', () => { touched = true; setSnr(+slider.value); });
function fromPointer(e) {
  const r = frame.getBoundingClientRect();
  touched = true; setSnr(((e.clientX - r.left) / r.width) * 30);
}
frame.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) fromPointer(e); });
frame.addEventListener('pointerdown', e => { frame.setPointerCapture(e.pointerId); fromPointer(e); });

// live stream: replace a slice of points each frame; drift SNR until someone interacts
let t0 = performance.now();
function tick(t) {
  for (let i = 0; i < 40; i++) pts[(Math.random() * N) | 0] = sample();
  if (!touched) setSnr(15 + 9 * Math.sin((t - t0) / 2600));
  draw();
  requestAnimationFrame(tick);
}
addEventListener('resize', resize);
readColors();
resize();
if (!reduce) requestAnimationFrame(tick);

// ---------- lightbox for gallery photos and project figures ----------
// links still point at the full image, so everything works without JS too
const lb = document.getElementById('lightbox');
const lbImg = lb.querySelector('img');
const lbCap = lb.querySelector('figcaption');
let lbSet = [], lbIdx = 0;
// remember markup order before the gallery gets rearranged into columns
document.querySelectorAll('a.zoom').forEach((a, i) => { a.dataset.i = i; });

function lbShow(i) {
  lbIdx = (i + lbSet.length) % lbSet.length;
  const a = lbSet[lbIdx], thumb = a.querySelector('img');
  lbImg.src = a.href; lbImg.alt = thumb.alt; lbCap.textContent = thumb.alt;
  const multi = lbSet.length > 1;
  lb.querySelector('.lb-prev').hidden = lb.querySelector('.lb-next').hidden = !multi;
}
document.querySelectorAll('a.zoom').forEach(a => a.addEventListener('click', e => {
  if (typeof lb.showModal !== 'function') return;
  e.preventDefault();
  lbSet = [...document.querySelectorAll(`a.zoom[data-group="${a.dataset.group}"]`)].sort((x, y) => x.dataset.i - y.dataset.i);
  lbShow(lbSet.indexOf(a));
  lb.showModal();
}));
lb.querySelector('.lb-close').addEventListener('click', () => lb.close());
lb.querySelector('.lb-prev').addEventListener('click', () => lbShow(lbIdx - 1));
lb.querySelector('.lb-next').addEventListener('click', () => lbShow(lbIdx + 1));
lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });   // click outside the image
lb.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
  if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
});
let touchX = null;
lb.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX; touchX = null;
  if (Math.abs(dx) > 50) lbShow(lbIdx + (dx < 0 ? 1 : -1));
});
lb.addEventListener('close', () => { lbImg.removeAttribute('src'); });

// ---------- gallery: lay photos out row by row (newest across the top) ----------
// CSS columns fill top-to-bottom, so we deal photos into the shortest column instead.
const gallery = document.querySelector('.gallery');
const photos = [...gallery.querySelectorAll('a')];
let galleryCols = 0;
function layoutGallery() {
  const w = gallery.clientWidth, n = w >= 900 ? 4 : w >= 560 ? 3 : 2;
  if (n === galleryCols) return;
  galleryCols = n;
  const cols = Array.from({ length: n }, () => { const c = document.createElement('div'); c.className = 'gcol'; return c; });
  const heights = new Array(n).fill(0);
  for (const a of photos) {
    const img = a.querySelector('img'), i = heights.indexOf(Math.min(...heights));
    cols[i].appendChild(a);
    heights[i] += img.getAttribute('height') / img.getAttribute('width');   // known from the markup, no need to wait for loading
  }
  gallery.replaceChildren(...cols);
  gallery.classList.add('masonry');
}
layoutGallery();
addEventListener('resize', layoutGallery);
