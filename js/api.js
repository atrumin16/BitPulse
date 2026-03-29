/* ═══════════════════════════════════════════════════
   BITPULSE v5 · js/api.js
   Data fetching, refresh loop, alert poller
   ═══════════════════════════════════════════════════ */

/* ── FETCH HELPERS ── */
const sF = async url => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

const API = {
  btc:    () => sF('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false'),
  global: () => sF('https://api.coingecko.com/api/v3/global'),
  coins:  () => sF('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=12&page=1&sparkline=false'),
  fg:     () => sF('https://api.alternative.me/fng/?limit=1').then(j => parseInt(j.data[0].value, 10)),
  block:  () => fetch('https://blockchain.info/q/getblockcount').then(r => r.text()).then(t => parseInt(t.trim(), 10)),
  fx:     () => sF('https://open.er-api.com/v6/latest/USD').then(j => j.rates || {}),
  mem:    () => sF('https://mempool.space/api/mempool').catch(() => null),
  fees:   () => sF('https://mempool.space/api/v1/fees/recommended').catch(() => null),
  price:  () => sF('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
                  .then(j => j?.bitcoin?.usd || 0).catch(() => 0),
};

/* ── MAIN REFRESH ── */
window.refresh = async () => {
  try {
    const [btc, gl, coins, h, fg, fx, mp, fees] = await Promise.allSettled([
      API.btc(), API.global(), API.coins(), API.block(),
      API.fg(), API.fx(), API.mem(), API.fees(),
    ]);
    if (btc.status   === 'fulfilled') S.btc    = btc.value;
    if (gl.status    === 'fulfilled') S.global = gl.value;
    if (coins.status === 'fulfilled') S.coins  = coins.value;
    if (h.status     === 'fulfilled') S.blockH = h.value   || S.blockH;
    if (fg.status    === 'fulfilled') S.fg     = fg.value;
    if (fx.status    === 'fulfilled') S.fx     = fx.value;
    if (mp.status    === 'fulfilled' && mp.value)    ST('sMem', F.n(mp.value.count || 0));
    if (fees.status  === 'fulfilled' && fees.value)  ST('sFee', (fees.value.halfHourFee || '—') + ' sat/vB');

    renderDash();
    renderConvTable();
    startHalvTimer();
    fireAlerts(btcP()); // Check alerts on each full refresh too
  } catch (e) {
    console.warn('[BITPULSE] Refresh error:', e);
    toast('Data refresh failed — retrying…', 'err');
  }
};

/* ── REFRESH COUNTDOWN ── */
window.startCountdown = () => {
  S.rfIn = PREFS.rfInterval;
  if (S._rcT) clearInterval(S._rcT);
  S._rcT = setInterval(() => {
    S.rfIn--;
    ST('footerRefresh', `Refresh in ${S.rfIn}s`);
    if (S.rfIn <= 0) { S.rfIn = PREFS.rfInterval; refresh(); }
  }, 1000);
};

/* ── FAST ALERT POLLER (10s) ── */
window.startAlertPoller = () => {
  if (S.alertPoller) clearInterval(S.alertPoller);
  S.alertPoller = setInterval(async () => {
    const hasActive = S.alerts.some(a => !a.triggered);
    if (!hasActive) return;
    const price = await API.price();
    if (!price) return;
    ST('alertCurPrice', '$' + F.p(price));
    fireAlerts(price);
  }, 10000);
};

/* ── ALERT FIRE LOGIC ── */
window.fireAlerts = price => {
  if (!price) return;
  let changed = false;
  S.alerts.forEach(a => {
    if (a.triggered) return;
    let fire = false;
    if (a.type === 'above'   && price >= a.val)                       fire = true;
    if (a.type === 'below'   && price <= a.val)                       fire = true;
    if (a.type === 'pct_up'  && a.refPrice && price >= a.refPrice * (1 + a.val / 100)) fire = true;
    if (a.type === 'pct_dn'  && a.refPrice && price <= a.refPrice * (1 - a.val / 100)) fire = true;

    if (fire) {
      a.triggered = true; changed = true;
      const typeLabel = { above: 'crossed above', below: 'dropped below', pct_up: 'rose', pct_dn: 'fell' }[a.type] || 'hit';
      const target = (a.type === 'pct_up' || a.type === 'pct_dn') ? a.val + '%' : '$' + F.p(a.val);
      const msg = `₿ BTC ${typeLabel} ${target}! Now: $${F.p(price)}`;
      const full = msg + (a.note ? ` · ${a.note}` : '');

      toast('🔔 ' + full, 'warn');
      sendNotification('BITPULSE Price Alert', full);

      // Visual pulse on the row
      setTimeout(() => {
        const el = $('alRow' + a.id);
        if (el) { el.classList.add('alert-fired'); setTimeout(() => el.classList.remove('alert-fired'), 2200); }
      }, 120);
    }
  });
  if (changed) { saveAlerts(); renderAlerts(); }
};

/* ── NOTIFICATION SYSTEM ── */
window.sendNotification = (title, body) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">₿</text></svg>',
        tag: 'bitpulse-alert',
        requireInteraction: true,
      });
      return;
    } catch (e) {}
  }
  // Fallback: in-page floating banner
  showInPageAlert(title + ': ' + body);
};

window.showInPageAlert = msg => {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;top:62px;left:50%;transform:translateX(-50%);z-index:9999;
    padding:14px 24px;border-radius:14px;cursor:pointer;text-align:center;
    background:linear-gradient(135deg,rgba(247,147,26,.96),rgba(255,170,51,.96));
    color:#000;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;
    box-shadow:0 8px 32px rgba(0,0,0,.5);max-width:90vw;
    animation:toastIn .3s ease;
  `;
  el.textContent = '🔔 ' + msg;
  el.onclick = () => el.remove();
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 9000);
};

window.requestNotificationPermission = async () => {
  if (!('Notification' in window)) { toast('Notifications not supported in this browser', 'err'); return; }
  if (Notification.permission === 'granted') { toast('Notifications already enabled ✓', 'ok'); updateNotifBanner(); return; }
  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') toast('Notifications enabled! 🔔', 'ok');
    else toast('Blocked. In-page banners will be used as fallback.', 'warn');
    updateNotifBanner();
  } catch (e) { toast('Permission request failed: ' + e.message, 'err'); }
};

window.testNotification = () => {
  sendNotification('BITPULSE Test', 'Notifications are working! BTC is at $' + F.p(btcP() || 50000));
  toast('Test notification sent!', 'ok');
};

window.updateNotifBanner = () => {
  const b = $('notifBanner'); if (!b) return;
  const show = 'Notification' in window && Notification.permission !== 'granted';
  b.style.display = show ? 'flex' : 'none';
};

/* ── NEWS RSS ── */
const NEWS_FEEDS = [
  { name: 'CoinDesk',      rss: 'https://www.coindesk.com/arc/outboundfeeds/rss/',  color: '#f7931a' },
  { name: 'Decrypt',       rss: 'https://decrypt.co/feed',                          color: '#0ee87c' },
  { name: 'Cointelegraph', rss: 'https://cointelegraph.com/rss',                    color: '#3b9fff' },
  { name: 'Bitcoin Mag',   rss: 'https://bitcoinmagazine.com/.rss/full/',            color: '#ff3d5a' },
  { name: 'The Block',     rss: 'https://www.theblock.co/rss.xml',                  color: '#a06ee8' },
];
const CORS_PROXIES = [
  u => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
  u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
];

const fetchRSS = async feed => {
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(feed.rss), { signal: AbortSignal.timeout(8000) });
      const j   = await res.json();
      const xml  = j.contents || j.data || '';
      if (!xml) continue;
      const doc  = new DOMParser().parseFromString(xml, 'text/xml');
      return [...doc.querySelectorAll('item')].slice(0, 4).map(item => ({
        source: feed.name, color: feed.color,
        title:  item.querySelector('title')?.textContent?.trim() || '',
        link:   item.querySelector('link')?.textContent?.trim()  || '#',
        desc:   (() => { const d = document.createElement('div'); d.innerHTML = item.querySelector('description')?.textContent || ''; return (d.textContent || '').slice(0, 130); })(),
        date:   item.querySelector('pubDate')?.textContent || '',
      })).filter(i => i.title);
    } catch { continue; }
  }
  return [];
};

window.loadNews = async () => {
  const g = $('newsGrid'); if (!g) return;
  g.innerHTML = `<div class="skel" style="height:165px;border-radius:16px;"></div>`.repeat(6);
  try {
    const results  = await Promise.allSettled(NEWS_FEEDS.map(fetchRSS));
    const articles = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    if (!articles.length) { g.innerHTML = newsErrorHTML(); return; }
    const seen   = new Set();
    const unique = articles
      .filter(a => { const k = a.title.toLowerCase().slice(0, 36); if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 12);
    g.innerHTML = unique.map(a => {
      const date = a.date ? new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      return `
        <div class="news-card">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;color:${a.color};">${a.source}</span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:8.5px;color:var(--t3);">${date}</span>
          </div>
          <h3 style="font-size:12.5px;font-weight:600;color:var(--t1);line-height:1.45;">${a.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h3>
          <p style="font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--t3);line-height:1.55;flex:1;">${a.desc.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          <a href="${a.link}" target="_blank" rel="noopener"
             style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${a.color};text-decoration:none;transition:opacity .15s;"
             onmouseover="this.style.opacity='.65'" onmouseout="this.style.opacity='1'">Read article →</a>
        </div>`;
    }).join('');
  } catch { g.innerHTML = newsErrorHTML(); }
};

const newsErrorHTML = () => `
  <div style="grid-column:1/-1;text-align:center;padding:36px 18px;font-family:'JetBrains Mono',monospace;color:var(--t3);">
    <div style="font-size:32px;margin-bottom:10px;">📰</div>
    <p style="font-size:13px;color:var(--t2);margin-bottom:6px;">RSS feeds unavailable</p>
    <p style="font-size:10px;margin-bottom:14px;">CORS proxy may be restricted. Visit sources directly:</p>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;">
      <a href="https://coindesk.com"       target="_blank" style="padding:4px 13px;background:var(--card);border:1px solid var(--line);border-radius:8px;color:var(--acc);text-decoration:none;">CoinDesk</a>
      <a href="https://decrypt.co"         target="_blank" style="padding:4px 13px;background:var(--card);border:1px solid var(--line);border-radius:8px;color:var(--acid);text-decoration:none;">Decrypt</a>
      <a href="https://cointelegraph.com"  target="_blank" style="padding:4px 13px;background:var(--card);border:1px solid var(--line);border-radius:8px;color:var(--sky);text-decoration:none;">Cointelegraph</a>
      <a href="https://bitcoinmagazine.com"target="_blank" style="padding:4px 13px;background:var(--card);border:1px solid var(--line);border-radius:8px;color:var(--ruby);text-decoration:none;">Bitcoin Mag</a>
    </div>
  </div>`;

/* ── TRADINGVIEW ── */
window.loadTV = (sym, interval) => {
  const c = $('tvContainer'); if (!c) return;
  c.innerHTML = '';
  const s = document.createElement('script');
  s.src   = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  s.async = true;
  s.innerHTML = JSON.stringify({
    autosize: true, symbol: sym || 'BINANCE:BTCUSDT', interval: interval || '60',
    timezone: 'Etc/UTC', theme: PREFS.dark ? 'dark' : 'light', style: '1', locale: 'en',
    enable_publishing: false,
    backgroundColor: PREFS.dark ? 'rgba(9,14,24,1)' : 'rgba(242,245,250,1)',
    gridColor: PREFS.dark ? 'rgba(34,56,88,0.3)' : 'rgba(200,210,225,0.4)',
    withdateranges: true, hide_side_toolbar: false,
    allow_symbol_change: true, save_image: true, calendar: false,
    support_host: 'https://www.tradingview.com',
    studies: ['STD;EMA', 'STD;Bollinger_Bands'],
  });
  c.appendChild(s);
};
