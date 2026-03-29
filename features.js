/* ═══════════════════════════════════════════════════
   BITPULSE v5 · js/features.js
   Portfolio tracker, price alerts, settings panel
   ═══════════════════════════════════════════════════ */

/* ═══════════════ PORTFOLIO ═══════════════ */

window.addPortEntry = () => {
  const btc  = parseFloat($('portBTC')?.value)  || 0;
  const cost = parseFloat($('portCost')?.value) || 0;
  if (!btc || !cost) { toast('Enter BTC amount and buy price', 'err'); return; }
  S.portfolio.push({ btc, cost, id: Date.now() });
  savePort();
  $('portBTC').value = '';
  $('portCost').value = '';
  updatePortfolio();
  toast('Entry added ✓', 'ok');
};

window.delPortEntry = id => {
  S.portfolio = S.portfolio.filter(e => e.id !== id);
  savePort();
  updatePortfolio();
  toast('Entry removed', 'warn');
};

window.clearPortfolio = () => {
  if (!confirm('Clear all portfolio data?')) return;
  S.portfolio = [];
  savePort();
  updatePortfolio();
  toast('Portfolio cleared', 'warn');
};

window.updatePortfolio = () => {
  const p     = btcP();
  const list  = $('portEntries');
  const sumEl = $('portSum');
  if (!list) return;

  if (!S.portfolio.length) {
    list.innerHTML = `<p style="text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--t3);padding:16px;">No entries yet. Add your first transaction above.</p>`;
    if (sumEl) sumEl.style.display = 'none';
    ST('portBreak', '—');
    return;
  }

  let tBTC = 0, tCost = 0;
  list.innerHTML = S.portfolio.map(e => {
    const cv  = e.btc * p;
    const pnl = cv - (e.btc * e.cost);
    const pp  = ((pnl / (e.btc * e.cost)) * 100).toFixed(1);
    tBTC  += e.btc;
    tCost += e.btc * e.cost;
    const col = pnl >= 0 ? 'var(--acid)' : 'var(--ruby)';
    return `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);padding:9px 12px;font-family:'JetBrains Mono',monospace;font-size:11px;transition:border-color .14s;" onmouseover="this.style.borderColor='var(--rim)'" onmouseout="this.style.borderColor='var(--line)'">
        <span style="color:var(--acc);font-weight:600;">₿${e.btc.toFixed(5)}</span>
        <span style="color:var(--t3);">@$${F.p(e.cost)}</span>
        <span style="flex:1;text-align:right;color:var(--t1);">$${F.p(cv)}</span>
        <span style="color:${col};">${pnl >= 0 ? '+' : ''}${pp}%</span>
        <button onclick="delPortEntry(${e.id})" style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:14px;padding:0 2px;line-height:1;" onmouseover="this.style.color='var(--ruby)'" onmouseout="this.style.color='var(--t3)'">✕</button>
      </div>`;
  }).join('');

  const tv   = tBTC * p;
  const tpnl = tv - tCost;
  const roi  = ((tpnl / tCost) * 100).toFixed(2);
  const avg  = tCost / tBTC;

  ST('psBTC', '₿ ' + tBTC.toFixed(6));
  ST('psInv', '$' + F.p(tCost));
  ST('psVal', '$' + F.p(tv));
  ST('psAvg', '$' + F.p(avg));
  ST('portBreak', '$' + F.p(avg));

  const pe = $('psPnl'), re = $('psROI');
  if (pe) { pe.textContent = (tpnl >= 0 ? '+' : '') + '$' + F.p(Math.abs(tpnl)); pe.style.color = tpnl >= 0 ? 'var(--acid)' : 'var(--ruby)'; }
  if (re) { re.textContent = (roi >= 0 ? '+' : '') + roi + '%'; re.style.color = roi >= 0 ? 'var(--acid)' : 'var(--ruby)'; }

  if (sumEl) sumEl.style.display = 'grid';

  // Break-even sparkline
  const data = S.portfolio.map(e => e.btc * e.cost);
  if (data.length < 2) data.push(tv);
  setTimeout(() => sparkline('portCanvas', data, '#0ee87c', 'rgba(14,232,124,.1)'), 80);
};

/* ═══════════════ ALERTS ═══════════════ */

window.addAlert = () => {
  const type  = $('alType')?.value;
  const rawV  = parseFloat($('alVal')?.value);
  const note  = $('alNote')?.value || '';
  if (!rawV) { toast('Enter a target value', 'err'); return; }
  S.alerts.push({
    type, val: rawV, note, id: Date.now(),
    triggered: false, refPrice: btcP(),
    createdAt: new Date().toLocaleTimeString(),
  });
  saveAlerts();
  renderAlerts();
  $('alVal').value  = '';
  $('alNote').value = '';
  toast('Alert set ✓ — checking every 10s', 'ok');
};

window.delAlert = id => {
  S.alerts = S.alerts.filter(a => a.id !== id);
  saveAlerts();
  renderAlerts();
};

window.clearAlerts = () => {
  if (!confirm('Clear all alerts?')) return;
  S.alerts = [];
  saveAlerts();
  renderAlerts();
  toast('Alerts cleared', 'warn');
};

window.renderAlerts = () => {
  const el = $('alertsList'); if (!el) return;
  if (!S.alerts.length) {
    el.innerHTML = `<p style="text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--t3);padding:24px;">No alerts configured.</p>`;
    return;
  }
  const icons  = { above: '📈', below: '📉', pct_up: '⚡', pct_dn: '⬇' };
  const labels = { above: 'Price ABOVE', below: 'Price BELOW', pct_up: 'Rises by %', pct_dn: 'Falls by %' };
  el.innerHTML = S.alerts.map(a => {
    const tc  = a.triggered ? (a.type === 'above' || a.type === 'pct_up' ? ' fired-up' : ' fired-dn') : '';
    const val = (a.type === 'pct_up' || a.type === 'pct_dn') ? a.val + '%' : '$' + F.p(a.val);
    const ref = a.refPrice && (a.type === 'pct_up' || a.type === 'pct_dn') ? ` from $${F.p(a.refPrice)}` : '';
    return `
      <div class="alert-row${tc}" id="alRow${a.id}">
        <span style="font-size:18px;flex-shrink:0;">${icons[a.type] || '🔔'}</span>
        <div style="flex:1;min-width:0;">
          <p style="font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);">${labels[a.type] || a.type}${ref}</p>
          <p style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:var(--t1);">${val}</p>
          ${a.note ? `<p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--t3);margin-top:1px;">${a.note}</p>` : ''}
        </div>
        <span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${a.triggered ? 'var(--acc)' : 'var(--acid)'};">${a.triggered ? '✓ FIRED' : '● ACTIVE'}</span>
        <button onclick="delAlert(${a.id})" style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:14px;line-height:1;" onmouseover="this.style.color='var(--ruby)'" onmouseout="this.style.color='var(--t3)'">✕</button>
      </div>`;
  }).join('');
};

/* ═══════════════ SETTINGS ═══════════════ */

window.initSettings = () => {
  const set = (id, val, prop = 'checked') => { const e = $(id); if (e) e[prop] = val; };
  set('togDark',    PREFS.dark);
  set('togCompact', PREFS.compact);
  set('togBg',      PREFS.bg);
  set('togFlash',   PREFS.flash);
  set('togTicker',  PREFS.ticker);
  set('togSpark',   PREFS.spark);
  set('defSym',     PREFS.defSym, 'value');
  set('defInt',     PREFS.defInt, 'value');
  set('rfSlider',   PREFS.rfInterval, 'value');
  ST('rfValDisp', PREFS.rfInterval);

  // Color swatches
  document.querySelectorAll('.swatch').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.c === PREFS.accent);
    sw.addEventListener('click', () => {
      PREFS.accent = sw.dataset.c;
      document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      applyPrefs();
      toast('Accent updated ✓', 'ok');
    });
  });

  // Font size buttons
  document.querySelectorAll('.sz-btn[data-sz]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sz === PREFS.fontSize);
    btn.addEventListener('click', () => {
      PREFS.fontSize = btn.dataset.sz;
      document.querySelectorAll('.sz-btn[data-sz]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyPrefs();
    });
  });

  // Toggle bindings
  const bt = (id, key, cb) => {
    const e = $(id); if (!e) return;
    e.addEventListener('change', () => { PREFS[key] = e.checked; applyPrefs(); if (cb) cb(e.checked); });
  };
  bt('togDark',    'dark');
  bt('togCompact', 'compact');
  bt('togBg',      'bg');
  bt('togFlash',   'flash');
  bt('togTicker',  'ticker');
  bt('togSpark',   'spark');

  // Refresh slider
  $('rfSlider')?.addEventListener('input', e => {
    PREFS.rfInterval = parseInt(e.target.value);
    ST('rfValDisp', e.target.value);
    S.rfIn = PREFS.rfInterval;
    savePrefs();
  });

  // Chart defaults
  $('defSym')?.addEventListener('change', e => { PREFS.defSym = e.target.value; S.curSym = e.target.value; savePrefs(); });
  $('defInt')?.addEventListener('change', e => { PREFS.defInt = e.target.value; S.curInt = e.target.value; savePrefs(); });

  // Panel open/close
  const ov    = $('settingsOverlay');
  const open  = () => ov.classList.add('open');
  const close = () => ov.classList.remove('open');
  $('settingsBtn')?.addEventListener('click', open);
  $('settingsMobBtn')?.addEventListener('click', open);
  $('spClose')?.addEventListener('click', close);
  ov?.addEventListener('click', e => { if (e.target === ov) close(); });

  applyPrefs();
};

/* ═══════════════ MAIN INIT ═══════════════ */

window.initApp = async () => {
  /* Clock */
  startClock();

  /* Desktop + mobile nav */
  document.querySelectorAll('.nav-btn, .mob-btn').forEach(btn => {
    if (btn.id === 'settingsMobBtn') return;
    btn.addEventListener('click', () => navTo(btn.dataset.page));
  });

  /* Chart symbol / interval */
  document.querySelectorAll('.chart-sym-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-sym-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.curSym = btn.dataset.sym;
      loadTV(S.curSym, S.curInt);
      S.tvLoaded = true;
    });
  });
  document.querySelectorAll('.chart-int-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-int-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.curInt = btn.dataset.int;
      loadTV(S.curSym, S.curInt);
      S.tvLoaded = true;
    });
  });

  /* Converter */
  Object.entries(CIN || {}).forEach(([k]) => $(CIN[k].id)?.addEventListener('input', () => updateConv(k)));
  document.querySelectorAll('.qp-btn').forEach(btn =>
    btn.addEventListener('click', () => { const e = $('cBTC'); if (e) { e.value = btn.dataset.v; updateConv('BTC'); } })
  );

  /* DCA toggles */
  document.querySelectorAll('.dca-freq').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.dca-freq').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      S.dcaFreq = t.dataset.f;
    });
  });
  $('dcaBtn')?.addEventListener('click', runDCA);

  /* ROI */
  $('roiBtn')?.addEventListener('click', calcROI);

  /* Portfolio */
  $('portAddBtn')?.addEventListener('click', addPortEntry);

  /* Alerts */
  $('alAddBtn')?.addEventListener('click', addAlert);
  $('alTestBtn')?.addEventListener('click', testNotification);
  $('notifRequestBtn')?.addEventListener('click', requestNotificationPermission);
  $('alType')?.addEventListener('change', e => {
    const lbl = $('alValLbl');
    if (lbl) lbl.textContent = e.target.value.startsWith('pct') ? '% Threshold' : 'Target Price (USD)';
  });

  /* News */
  $('newsRefBtn')?.addEventListener('click', () => { S.newsLoaded = true; loadNews(); });

  /* Settings */
  initSettings();
  renderAlerts();
  updatePortfolio();
  updateNotifBanner();

  /* Background */
  initBgCanvas();

  /* Data */
  await refresh();
  startCountdown();
  startAlertPoller();
};

document.addEventListener('DOMContentLoaded', initApp);
