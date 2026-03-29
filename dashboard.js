/* ═══════════════════════════════════════════════════
   BITPULSE v5 · js/dashboard.js
   Dashboard render, converter, DCA, ROI
   ═══════════════════════════════════════════════════ */

/* ═══════════════ DASHBOARD ═══════════════ */

window.renderDash = () => {
  const md  = S.btc?.market_data;
  const usd = md?.current_price?.usd || 0;
  const ath = md?.ath?.usd || 0;

  /* ── Price hero ── */
  const hEl = $('heroPrice');
  if (hEl) {
    const prev = parseFloat(hEl.dataset.prev || 0);
    hEl.textContent = '$' + F.p(usd);
    if (prev && usd !== prev && PREFS.flash) {
      hEl.classList.remove('flash-up', 'flash-down');
      void hEl.offsetWidth; // reflow
      hEl.classList.add(usd > prev ? 'flash-up' : 'flash-down');
      setTimeout(() => hEl.classList.remove('flash-up', 'flash-down'), 950);
    }
    hEl.dataset.prev = usd;
  }

  /* ── Badges ── */
  setBadge('badge24h', md?.price_change_percentage_24h || 0, '24h');
  setBadge('badge7d',  md?.price_change_percentage_7d  || 0, '7d');
  setBadge('badge30d', md?.price_change_percentage_30d || 0, '30d');

  /* ── Sats + ATH ── */
  if (usd > 0) ST('heroSats', F.n(1e8 / usd) + ' sats');
  ST('heroATH', `ATH $${F.p(ath)} · ${ath ? ((usd / ath) * 100).toFixed(1) : 0}% of peak`);

  /* ── Market overview ── */
  const mcap = md?.market_cap?.usd || 0;
  const vol  = md?.total_volume?.usd || 0;
  const dom  = S.global?.data?.market_cap_percentage?.btc;
  ST('sMcap', F.k(mcap));
  ST('sVol',  F.k(vol));
  ST('sVolPct', mcap ? ((vol / mcap) * 100).toFixed(2) + '% of mcap' : '—');
  if (dom) { ST('sDom', dom.toFixed(1) + '%'); ST('chartDom', dom.toFixed(1) + '%'); }
  ST('sBlock', S.blockH ? F.n(S.blockH) : '—');

  /* ── Supply bar ── */
  const circ = md?.circulating_supply || 0;
  const spct = ((circ / 21e6) * 100).toFixed(2);
  ST('sSupply', F.n(circ) + ' BTC');
  const sf = $('supFill'); if (sf) sf.style.width = spct + '%';
  ST('supPct', spct + '%');

  /* ── Block reward ── */
  if (S.blockH) {
    const halvs  = Math.floor(S.blockH / 210000);
    const reward = [50, 25, 12.5, 6.25, 3.125][halvs] || 3.125;
    ST('sReward', reward);
  }

  /* ── Fear & Greed ── */
  if (S.fg !== null) updateFG(S.fg);

  /* ── Price ranges ── */
  const l24 = md?.low_24h?.usd  || usd * .97;
  const h24 = md?.high_24h?.usd || usd * 1.03;
  setRange('rL24', 'rH24', 'rf24', 'rd24', l24, h24, usd);
  setRange('rL7',  'rH7',  'rf7',  'rd7',  usd * .9, usd * 1.1, usd);
  ST('rHATH', '$' + F.p(ath));
  const athPct = ath ? Math.max(3, Math.min(96, (usd / ath) * 100)) : 50;
  const fa = $('rfATH'), da = $('rdATH');
  if (fa) fa.style.width = athPct + '%';
  if (da) da.style.left  = athPct + '%';

  /* ── Historical comparison ── */
  renderHistorical(usd, md);

  /* ── Currencies ── */
  renderCurrencies(usd);

  /* ── Ticker ── */
  renderTicker();

  /* ── Mini sparkline ── */
  if (PREFS.spark) {
    const p7 = md?.price_change_percentage_7d || 0;
    const data = Array.from({ length: 42 }, (_, i) => {
      const t = i / 41, sp = usd / (1 + p7 / 100);
      return sp + (usd - sp) * t + (Math.random() - .5) * usd * .02;
    });
    data[data.length - 1] = usd;
    setTimeout(() => sparkline('miniSpark', data, PREFS.accent), 80);
  }

  /* ── Chart key levels ── */
  ST('cR1', '$' + F.p(h24 * 1.02));
  ST('cCur','$' + F.p(usd));
  ST('cS1', '$' + F.p(l24 * .99));
  ST('cS2', '$' + F.p(l24 * .97));
  ST('chartVol', F.k(vol));

  /* ── Footer ── */
  ST('footerPrice', 'BTC $' + F.p(usd));
  ST('convRate',    '1 BTC = $' + F.p(usd));
  ST('alertCurPrice', '$' + F.p(usd));

  /* ── Hash rate + daily revenue (estimated) ── */
  ST('sHash', '~' + (575 + Math.floor(Math.random() * 55)) + ' EH/s');
  ST('sRev',  F.k(usd * 144 * 3.125));

  /* ── Portfolio + alerts re-render ── */
  updatePortfolio();
  renderROIScenarios(usd);
};

/* ── HISTORICAL COMPARISON ── */
window.renderHistorical = (usd, md) => {
  const items = [
    { label: '1 Hour',    pct: md?.price_change_percentage_1h_in_currency?.usd  || 0 },
    { label: '24 Hours',  pct: md?.price_change_percentage_24h                  || 0 },
    { label: '7 Days',    pct: md?.price_change_percentage_7d                   || 0 },
    { label: '30 Days',   pct: md?.price_change_percentage_30d                  || 0 },
    { label: '60 Days',   pct: md?.price_change_percentage_60d_in_currency?.usd || 0 },
    { label: '200 Days',  pct: md?.price_change_percentage_200d_in_currency?.usd|| 0 },
    { label: '1 Year',    pct: md?.price_change_percentage_1y_in_currency?.usd  || 0 },
    { label: 'vs ATH',    pct: md?.ath?.usd ? ((usd / md.ath.usd - 1) * 100)   : 0, noFrom: true },
  ];
  const g = $('histGrid'); if (!g) return;
  g.innerHTML = items.map(s => {
    const c = Math.abs(s.pct) < .05 ? 'var(--t3)' : s.pct >= 0 ? 'var(--acid)' : 'var(--ruby)';
    const prev = s.noFrom ? 0 : (s.pct ? usd / (1 + s.pct / 100) : 0);
    return `
      <div style="background:var(--card2);border:1px solid var(--line);border-radius:var(--r);padding:10px 12px;transition:border-color .18s;" onmouseover="this.style.borderColor='var(--rim)'" onmouseout="this.style.borderColor='var(--line)'">
        <p style="font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:4px;">${s.label}</p>
        <p style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:600;color:${c};">${s.pct >= 0 ? '+' : ''}${s.pct.toFixed(2)}%</p>
        ${prev > 0 ? `<p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--t4);margin-top:2px;">was $${F.p(prev)}</p>` : ''}
      </div>`;
  }).join('');
};

/* ── CURRENCIES ── */
const CURRS = [
  {c:'USD',f:'🇺🇸',s:'$'},{c:'EUR',f:'🇪🇺',s:'€'},{c:'GBP',f:'🇬🇧',s:'£'},
  {c:'JPY',f:'🇯🇵',s:'¥'},{c:'BRL',f:'🇧🇷',s:'R$'},{c:'CAD',f:'🇨🇦',s:'C$'},
  {c:'AUD',f:'🇦🇺',s:'A$'},{c:'CHF',f:'🇨🇭',s:'Fr'},{c:'MXN',f:'🇲🇽',s:'$'},
  {c:'INR',f:'🇮🇳',s:'₹'},{c:'KRW',f:'🇰🇷',s:'₩'},{c:'ARS',f:'🇦🇷',s:'$'},
];
window.renderCurrencies = usd => {
  const g = $('currGrid'); if (!g) return;
  g.innerHTML = CURRS.map(cc => {
    const rate = cc.c === 'USD' ? 1 : (S.fx[cc.c] || null);
    if (!rate) return '';
    const val = usd * rate;
    const fv  = val >= 1000 ? val.toLocaleString('en-US', { maximumFractionDigits: 0 }) : val.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--card2);border:1px solid var(--line);border-radius:var(--r);padding:8px 11px;transition:border-color .14s;" onmouseover="this.style.borderColor='var(--rim)'" onmouseout="this.style.borderColor='var(--line)'">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:15px;">${cc.f}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:8.5px;color:var(--t3);">${cc.c}</span>
        </div>
        <span style="font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:600;color:var(--t1);">${cc.s}${fv}</span>
      </div>`;
  }).join('');
};

/* ── TICKER ── */
const TICKER_MAP = { bitcoin:'tBTC', ethereum:'tETH', binancecoin:'tBNB', solana:'tSOL', ripple:'tXRP', cardano:'tADA', dogecoin:'tDOGE', 'avalanche-2':'tAVAX' };
window.renderTicker = () => {
  S.coins.forEach(c => {
    const id = TICKER_MAP[c.id]; if (!id) return;
    const pct = c.price_change_percentage_24h || 0;
    const h   = `<span style="color:var(--t1);">$${F.p(c.current_price)}</span> <span style="color:${pct >= 0 ? 'var(--acid)' : 'var(--ruby)'};">${F.pct(pct)}</span>`;
    [id, id + '2'].forEach(i => SH(i, h));
  });
};

/* ═══════════════ CONVERTER ═══════════════ */

const CIN = {
  BTC:  { id: 'cBTC',  toUSD: v => v * btcP() },
  SATS: { id: 'cSATS', toUSD: v => (v / 1e8) * btcP() },
  USD:  { id: 'cUSD',  toUSD: v => v },
  EUR:  { id: 'cEUR',  toUSD: v => v / (S.fx.EUR || .92) },
  GBP:  { id: 'cGBP',  toUSD: v => v / (S.fx.GBP || .79) },
  JPY:  { id: 'cJPY',  toUSD: v => v / (S.fx.JPY || 149) },
  BRL:  { id: 'cBRL',  toUSD: v => v / (S.fx.BRL || 5) },
};

window.updateConv = src => {
  const p = btcP(); if (!p) return;
  const usd = CIN[src].toUSD(parseFloat($( CIN[src].id)?.value) || 0);
  const vals = {
    BTC:  (usd / p).toFixed(8),
    SATS: Math.round((usd / p) * 1e8),
    USD:  usd.toFixed(2),
    EUR:  (usd * (S.fx.EUR || .92)).toFixed(2),
    GBP:  (usd * (S.fx.GBP || .79)).toFixed(2),
    JPY:  Math.round(usd * (S.fx.JPY || 149)),
    BRL:  (usd * (S.fx.BRL || 5)).toFixed(2),
  };
  Object.entries(CIN).forEach(([k, v]) => {
    if (k === src) return;
    const el = $(v.id); if (el) el.value = vals[k];
  });
};

window.renderConvTable = () => {
  const p = btcP(); const tb = $('convTable'); if (!tb || !p) return;
  tb.innerHTML = CURRS.map(cc => {
    const rate = cc.c === 'USD' ? 1 : (S.fx[cc.c] || null); if (!rate) return '';
    const fmt  = v => cc.s + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
    return `
      <tr style="border-bottom:1px solid rgba(34,56,88,.5);" onmouseover="this.style.background='var(--card2)'" onmouseout="this.style.background=''">
        <td style="padding:8px 10px 8px 0;font-size:16px;">${cc.f}</td>
        <td style="padding:8px 10px 8px 0;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--t2);font-weight:600;">${cc.c}</td>
        <td style="padding:8px 10px 8px 0;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--t1);text-align:right;">${fmt(p * rate)}</td>
        <td style="padding:8px 10px 8px 0;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--t3);text-align:right;">${fmt(1000 * rate)}</td>
        <td style="padding:8px 0;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--t3);text-align:right;">${cc.s}${((p / 1e8) * rate).toFixed(4)}</td>
      </tr>`;
  }).join('');
};

/* ═══════════════ DCA CALCULATOR ═══════════════ */

window.runDCA = () => {
  const amt   = parseFloat($('dcaAmt')?.value)   || 100;
  const mos   = parseInt($('dcaMos')?.value)     || 24;
  const start = parseFloat($('dcaStart')?.value) || btcP() || 50000;
  const exitP = parseFloat($('dcaExit')?.value)  || 0;
  const ppm   = { daily: 30, weekly: 4.33, monthly: 1 }[S.dcaFreq];
  const total = Math.round(mos * ppm), inv = amt * total;
  const cur   = btcP() || start;
  let tBTC = 0;
  for (let i = 0; i < total; i++) tBTC += amt / (start + (cur - start) * (i / (total - 1 || 1)));
  const curVal = tBTC * cur, pnl = curVal - inv, roi = (pnl / inv) * 100, avg = inv / tBTC;
  const pc = pnl >= 0 ? 'var(--acid)' : 'var(--ruby)';
  const card = (lbl, val, col, sub) => `
    <div style="background:var(--card2);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px;">
      <p style="font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:4px;">${lbl}</p>
      <p style="font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:700;${col ? 'color:' + col + ';' : ''}">${val}</p>
      ${sub ? `<p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--t3);margin-top:3px;">${sub}</p>` : ''}
    </div>`;
  const rows = [
    card('Total Invested',    '$' + F.p2(inv),              '',   `${F.n(total)} × $${amt} ${S.dcaFreq}`),
    card('BTC Accumulated',   '₿ ' + tBTC.toFixed(6),       'var(--acc)', F.n(Math.round(tBTC * 1e8)) + ' sats'),
    card('Avg Buy Price',     '$' + F.p(avg),               '',   'cost basis'),
    card('Current Value',     '$' + F.p2(curVal),           '',   'at $' + F.p(cur)),
    card('P&L',               (pnl >= 0 ? '+' : '') + '$' + F.p2(Math.abs(pnl)), pc, F.pct(roi) + ' return'),
    card('ROI',               F.pct(roi),                   pc,   'on capital'),
  ];
  if (exitP) {
    const ev = tBTC * exitP;
    rows.push(card('At Target $' + F.p(exitP), '$' + F.p2(ev), 'var(--acid)', '+' + F.pct((ev - inv) / inv * 100)));
  }
  const wrap = $('dcaCard');
  if (wrap) wrap.innerHTML = `
    <div class="card-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;">${rows.join('')}</div>
      <div style="margin-top:11px;padding:9px 12px;background:var(--bg2);border:1px solid var(--line);border-radius:9px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--t3);">
        Strategy: $${amt}/${S.dcaFreq} · ${mos} months · ${F.n(total)} purchases · start $${F.p(start)}
      </div>
    </div>`;
};

/* ═══════════════ ROI CALCULATOR ═══════════════ */

window.renderROIScenarios = usd => {
  const g = $('roiScenarios'); if (!g || !usd) return;
  const inv = 1000, btcB = inv / usd;
  const scenarios = [
    { label: '× 1.5',    target: usd * 1.5 },
    { label: '× 2',      target: usd * 2 },
    { label: '× 5',      target: usd * 5 },
    { label: '× 10',     target: usd * 10 },
    { label: '+ 100%',   target: usd * 2 },
    { label: '→ $100K',  target: 100000 },
    { label: '→ $200K',  target: 200000 },
    { label: '→ ATH',    target: S.btc?.market_data?.ath?.usd || usd },
  ];
  g.innerHTML = scenarios.map(s => {
    const val = btcB * s.target, pnl = val - inv, roi = ((pnl / inv) * 100).toFixed(0);
    const c = roi >= 0 ? 'var(--acid)' : 'var(--ruby)';
    return `
      <div style="background:var(--card2);border:1px solid var(--line);border-radius:var(--r);padding:10px 12px;cursor:pointer;transition:border-color .15s;" onclick="setROITarget(${s.target.toFixed(0)})" onmouseover="this.style.borderColor='var(--acc)'" onmouseout="this.style.borderColor='var(--line)'">
        <p style="font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:3px;">${s.label} → $${F.p(s.target)}</p>
        <p style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:${c};">+${roi}% / $${F.n(val)}</p>
        <p style="font-family:'JetBrains Mono',monospace;font-size:8.5px;color:var(--t4);">on $1K invested</p>
      </div>`;
  }).join('');
};

window.setROITarget = price => {
  const si = $('roiSell');
  if (si) { si.value = price.toFixed(0); navTo('roi'); }
};

window.calcROI = () => {
  const amt    = parseFloat($('roiAmt')?.value)  || 1000;
  const buy    = parseFloat($('roiBuy')?.value)  || btcP() || 50000;
  const sell   = parseFloat($('roiSell')?.value) || 100000;
  const feePct = parseFloat($('roiFee')?.value)  || 0;
  const btcB   = (amt * (1 - feePct / 100)) / buy;
  const rev    = btcB * sell * (1 - feePct / 100);
  const pnl    = rev - amt, roi = (pnl / amt) * 100, mult = sell / buy;
  const pc     = pnl >= 0 ? 'var(--acid)' : 'var(--ruby)';
  const res = $('roiResult');
  if (res) res.innerHTML = `
    <div class="card-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div style="background:var(--card2);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px;">
          <p style="font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:4px;">Invested</p>
          <p style="font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:700;">$${F.p2(amt)}</p>
        </div>
        <div style="background:var(--card2);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px;">
          <p style="font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:4px;">BTC Bought</p>
          <p style="font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:700;color:var(--acc);">₿ ${btcB.toFixed(6)}</p>
        </div>
        <div style="background:var(--card2);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px;">
          <p style="font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:4px;">Sale Revenue</p>
          <p style="font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:700;">$${F.p2(rev)}</p>
        </div>
        <div style="background:var(--card2);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px;">
          <p style="font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:4px;">Multiplier</p>
          <p style="font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:700;color:var(--acc);">${mult.toFixed(2)}×</p>
        </div>
        <div style="grid-column:span 2;background:${pnl >= 0 ? 'rgba(14,232,124,.08)' : 'rgba(255,61,90,.08)'};border:1px solid ${pnl >= 0 ? 'rgba(14,232,124,.25)' : 'rgba(255,61,90,.25)'};border-radius:var(--r);padding:14px 16px;">
          <p style="font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:4px;">Net P&L</p>
          <p style="font-family:'JetBrains Mono',monospace;font-size:26px;font-weight:700;color:${pc};">${pnl >= 0 ? '+' : ''}$${F.p2(Math.abs(pnl))}</p>
          <p style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--t3);margin-top:3px;">${F.pct(roi)} return · buy $${F.p(buy)} → sell $${F.p(sell)}</p>
        </div>
      </div>
    </div>`;
};
