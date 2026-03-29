/* ═══════════════════════════════════════════════════
   BITPULSE v5 · js/core.js
   State, formatters, UI utilities, background canvas
   ═══════════════════════════════════════════════════ */
'use strict';

/* ── PREFERENCES ── */
const PREF_KEY = 'bp5prefs';
const DEFAULT_PREFS = {
  dark: true, compact: false, bg: true,
  accent: '#f7931a', fontSize: '15px',
  flash: true, ticker: true, spark: true,
  rfInterval: 60, defSym: 'BINANCE:BTCUSDT', defInt: '60',
};
window.PREFS = { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') };
window.savePrefs = () => localStorage.setItem(PREF_KEY, JSON.stringify(window.PREFS));

/* ── APP STATE ── */
window.S = {
  btc: null, global: null, fx: {}, blockH: null, fg: null, coins: [],
  portfolio:  JSON.parse(localStorage.getItem('bp5port')   || '[]'),
  alerts:     JSON.parse(localStorage.getItem('bp5alerts') || '[]'),
  dcaFreq: 'monthly',
  rfIn: window.PREFS.rfInterval,
  curSym: window.PREFS.defSym,
  curInt: window.PREFS.defInt,
  tvLoaded: false, newsLoaded: false,
  alertPoller: null,
  currentPage: 'dash',
};

/* ── SAVE ── */
window.savePort   = () => localStorage.setItem('bp5port',   JSON.stringify(S.portfolio));
window.saveAlerts = () => localStorage.setItem('bp5alerts', JSON.stringify(S.alerts));

/* ── FORMATTERS ── */
window.F = {
  p:    n => n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 })
                       : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  p2:   n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  p4:   n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
  k:    n => n >= 1e12 ? '$' + (n / 1e12).toFixed(2) + 'T'
           : n >= 1e9  ? '$' + (n / 1e9).toFixed(2)  + 'B'
           : n >= 1e6  ? '$' + (n / 1e6).toFixed(2)  + 'M'
           : '$' + n.toLocaleString(),
  pct:  n => (n >= 0 ? '+' : '') + n.toFixed(2) + '%',
  n:    n => Math.round(n).toLocaleString('en-US'),
  pad:  v => String(v).padStart(2, '0'),
  ts:   () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  date: () => new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
};

/* ── DOM HELPERS ── */
window.$  = id => document.getElementById(id);
window.ST = (id, v) => { const e = $(id); if (e) e.textContent = v; };
window.SH = (id, v) => { const e = $(id); if (e) e.innerHTML = v; };
window.btcP = () => S.btc?.market_data?.current_price?.usd || 0;

/* ── TOAST ── */
window.toast = (msg, type = '') => {
  const box = $('toastContainer');
  const t = document.createElement('div');
  const cls = { ok: 'toast-ok', warn: 'toast-warn', err: 'toast-err' }[type] || 'toast-def';
  t.className = `toast ${cls}`;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), 4200);
};

/* ── REAL-TIME CLOCK ── */
window.startClock = () => {
  const tick = () => {
    ST('clockDisplay', F.ts());
    ST('footerDate', F.date());
  };
  tick();
  setInterval(tick, 1000);
};

/* ── NAVIGATION ── */
window.navTo = page => {
  S.currentPage = page;
  document.querySelectorAll('.nav-btn, .mob-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll(`[data-page="${page}"]`).forEach(b => b.classList.add('active'));
  const pe = $('page-' + page);
  if (pe) pe.classList.add('active');
  if (page === 'chart'   && !S.tvLoaded)    { loadTV(S.curSym, S.curInt); S.tvLoaded = true; }
  if (page === 'news'    && !S.newsLoaded)  { S.newsLoaded = true; loadNews(); }
  if (page === 'alerts')  { updateNotifBanner(); }
};

/* ── APPLY PREFS ── */
window.applyPrefs = () => {
  const html = document.getElementById('htmlRoot');
  html.classList.toggle('dark',    PREFS.dark);
  html.classList.toggle('light',  !PREFS.dark);
  html.classList.toggle('compact', PREFS.compact);
  document.documentElement.style.setProperty('--acc',    PREFS.accent);
  document.documentElement.style.setProperty('--acc2',   PREFS.accent + 'bb');
  document.documentElement.style.setProperty('--accD',   PREFS.accent + '88');
  document.documentElement.style.setProperty('--accGS',  PREFS.accent + '12');
  document.documentElement.style.setProperty('--accG',   PREFS.accent + '22');
  document.documentElement.style.fontSize = PREFS.fontSize;
  savePrefs();
};

/* ── BACKGROUND PARTICLE CANVAS ── */
window.initBgCanvas = () => {
  const cv = $('bgCanvas'); if (!cv) return;
  const ctx = cv.getContext('2d');
  let W, H, pts = [];
  const resize = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; initPts(); };
  const initPts = () => {
    pts = [];
    for (let i = 0; i < 48; i++) pts.push({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22,
      r: Math.random() * 1.3 + .4,
    });
  };
  const draw = () => {
    if (!PREFS.bg) { ctx.clearRect(0, 0, W, H); requestAnimationFrame(draw); return; }
    ctx.clearRect(0, 0, W, H);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = PREFS.accent + '55'; ctx.fill();
    });
    pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
      const dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 100) {
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(247,147,26,${(1 - d / 100) * .04})`;
        ctx.lineWidth = .5; ctx.stroke();
      }
    }));
    requestAnimationFrame(draw);
  };
  window.addEventListener('resize', resize);
  resize(); draw();
};

/* ── SPARKLINE CANVAS ── */
window.sparkline = (id, data, col, fillCol) => {
  col     = col     || PREFS.accent || '#f7931a';
  fillCol = fillCol || col + '18';
  const cv = $(id); if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.offsetWidth || 600, H = cv.offsetHeight || 60;
  cv.width = W; cv.height = H;
  if (!data || data.length < 2) return;
  const mn = Math.min(...data), mx = Math.max(...data), pad = 3;
  const xs = i => pad + (i / (data.length - 1)) * (W - pad * 2);
  const ys = v => H - pad - ((v - mn) / (mx - mn || 1)) * (H - pad * 2);
  ctx.clearRect(0, 0, W, H);
  // Fill
  const fg = ctx.createLinearGradient(0, 0, 0, H);
  fg.addColorStop(0, fillCol); fg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.moveTo(xs(0), H);
  data.forEach((v, i) => ctx.lineTo(xs(i), ys(v)));
  ctx.lineTo(xs(data.length - 1), H); ctx.closePath();
  ctx.fillStyle = fg; ctx.fill();
  // Line
  const lg = ctx.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, col + '70'); lg.addColorStop(1, col);
  ctx.beginPath();
  data.forEach((v, i) => i === 0 ? ctx.moveTo(xs(i), ys(v)) : ctx.lineTo(xs(i), ys(v)));
  ctx.strokeStyle = lg; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke();
  // End dot
  const lx = xs(data.length - 1), ly = ys(data[data.length - 1]);
  ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
  ctx.beginPath(); ctx.arc(lx, ly, 9, 0, Math.PI * 2); ctx.fillStyle = col + '28'; ctx.fill();
};

/* ── MINI DONUT CHART ── */
window.drawDonut = (id, value, max, color) => {
  const cv = $(id); if (!cv) return;
  const ctx = cv.getContext('2d');
  const size = 80; cv.width = size; cv.height = size;
  const cx = size / 2, cy = size / 2, r = 30, lw = 8;
  ctx.clearRect(0, 0, size, size);
  // Track
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = lw; ctx.stroke();
  // Fill
  const pct = Math.min(1, value / (max || 1));
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
  ctx.strokeStyle = color || PREFS.accent;
  ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
};

/* ── HALVING TIMER ── */
const halvLeft = h => ((Math.floor(h / 210000) + 1) * 210000) - h;
window.startHalvTimer = () => {
  if (S._hT) clearInterval(S._hT);
  const tick = () => {
    const h = S.blockH || 896000;
    const s = Math.floor(halvLeft(h) * 10 * 60);
    const d = Math.floor(s / 86400);
    const hr = Math.floor((s % 86400) / 3600);
    const mn = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    ST('hvD', F.n(d)); ST('hvH', F.pad(hr)); ST('hvM', F.pad(mn)); ST('hvS', F.pad(sc));
    ST('hvBlocks', F.n(halvLeft(h)));
    const est = new Date(Date.now() + halvLeft(h) * 10 * 60 * 1000);
    ST('hvDate', est.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
  };
  tick();
  S._hT = setInterval(tick, 1000);
};

/* ── FEAR & GREED GAUGE ── */
window.updateFG = val => {
  const arc  = $('fgArc');
  const need = $('fgNeedle');
  if (arc)  arc.style.strokeDashoffset  = 188.4 - (val / 100) * 188.4;
  if (need) need.style.transform = `rotate(${(val / 100) * 180 - 90}deg)`;
  const labs = [
    [0,  25, 'Extreme Fear', '#ff3d5a'],
    [25, 45, 'Fear',         '#ff9430'],
    [45, 55, 'Neutral',      '#ffc93a'],
    [55, 75, 'Greed',        '#9de025'],
    [75, 101,'Extreme Greed','#0ee87c'],
  ];
  const l = labs.find(([a, b]) => val >= a && val < b) || labs[2];
  const v = $('fgVal'), lb = $('fgLbl');
  if (v)  { v.textContent  = val; v.style.color  = l[3]; }
  if (lb) { lb.textContent = l[2]; lb.style.color = l[3]; }
};

/* ── RANGE BAR HELPER ── */
window.setRange = (lowId, highId, fillId, dotId, lo, hi, cur) => {
  ST(lowId,  '$' + F.p(lo));
  ST(highId, '$' + F.p(hi));
  const pct = hi === lo ? 50 : Math.max(3, Math.min(96, ((cur - lo) / (hi - lo)) * 100));
  const f = $(fillId), d = $(dotId);
  if (f) f.style.width = pct + '%';
  if (d) d.style.left  = pct + '%';
};

/* ── BADGE HELPER ── */
window.setBadge = (id, val, label) => {
  const e = $(id); if (!e) return;
  const abs = Math.abs(val);
  e.className = 'badge ' + (abs < .05 ? 'badge-flat' : val >= 0 ? 'badge-up' : 'badge-dn');
  e.textContent = label + ' ' + (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
};
