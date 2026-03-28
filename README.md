# ₿ BITPULSE — Bitcoin Dashboard

> Un dashboard Bitcoin completo en **un solo archivo `index.html`**. Sin dependencias. Sin build. Listo para GitHub Pages.

---

## 🚀 Deploy en GitHub Pages (2 pasos)

### Paso 1 — Sube el archivo
```bash
# Opción A: crea un repo nuevo en GitHub y sube index.html
# (drag & drop en la interfaz web de GitHub)

# Opción B: vía git
git init
git add index.html
git commit -m "init: BITPULSE Bitcoin Dashboard"
git remote add origin https://github.com/TU_USUARIO/bitpulse.git
git push -u origin main
```

### Paso 2 — Activa GitHub Pages
```
GitHub repo → Settings → Pages → Source: main / root → Save
```

✅ Tu app estará en: `https://TU_USUARIO.github.io/bitpulse/`

---

## ✨ Funcionalidades

### 📊 Dashboard
- **Precio en vivo** con flash visual (verde/rojo) al cambiar
- **Ticker strip** con 8 criptomonedas (BTC, ETH, BNB, SOL, XRP, ADA, DOGE, AVAX)
- **Market Cap**, Volumen 24h, Supply circulante con barra de progreso
- **Block Height** actual (via Blockchain.info)
- **Rangos de precio** 24H / 7D / ATH con barras visuales interactivas
- **Countdown Halving** en tiempo real (días · horas · minutos · segundos)
- **Fear & Greed Index** con gauge animado (alternative.me)
- **Dominancia BTC** con mini sparkline
- **BTC en 12 monedas** (USD, EUR, GBP, JPY, BRL, CAD, AUD, CHF, MXN, INR, KRW, ARS)
- **Métricas on-chain**: hash rate, mining revenue, mempool, fees (mempool.space)
- **Gráfico de precio 7 días** (simulado con tendencia real)

### 🔁 Converter
- Conversión en tiempo real entre **BTC ↔ SATS ↔ USD / EUR / GBP / JPY / BRL**
- Presets rápidos: 0.001 / 0.01 / 0.1 / 1 / 10 / 100 BTC
- **Tabla de referencia** con 12 monedas: 1 BTC / 1000 USD / 1M sats

### 💰 DCA Calculator
- **Dollar Cost Averaging**: frecuencia diaria / semanal / mensual
- Precio de inicio personalizable (o usa el precio actual)
- **Precio objetivo de salida** opcional
- Resultados: BTC acumulado, precio promedio, valor actual, P&L, ROI
- Barras visuales comparando invertido vs valor actual

### 📁 Portfolio Tracker
- **Agrega transacciones** (cantidad BTC + precio de compra)
- Cálculo de P&L por entrada
- **Resumen total**: BTC, invertido, valor actual, P&L, ROI
- **Precio de break-even** calculado automáticamente
- Datos guardados en `localStorage` (persisten al cerrar el navegador)

### 🔔 Price Alerts
- Alertas por **precio ABOVE / BELOW** o **% de cambio**
- Usa la **Notifications API** del navegador
- Se disparan mientras la pestaña esté abierta
- Estado visual (activo / triggered)
- Alertas guardadas en `localStorage`

### 📰 News
- Feed de noticias Bitcoin vía CryptoPanic API
- Fallback con enlaces directos si la API no responde

---

## 🌐 APIs utilizadas (todas gratuitas, sin API key)

| API | Datos | Límite |
|-----|-------|--------|
| [CoinGecko](https://api.coingecko.com) | Precio BTC, market cap, volumen, ATH, supply, top coins | 10-30 req/min |
| [Blockchain.info](https://blockchain.info/q/getblockcount) | Block height actual | Generoso |
| [Alternative.me](https://api.alternative.me/fng/) | Fear & Greed Index | Sin límite conocido |
| [Open Exchange Rates](https://open.er-api.com/v6/latest/USD) | Tasas de cambio fiat | 1500 req/mes |
| [Mempool.space](https://mempool.space/api) | Mempool, fees recomendados | Sin límite |
| [CryptoPanic](https://cryptopanic.com/api/) | Noticias Bitcoin | API pública limitada |

---

## 🛠️ Estructura del proyecto

```
bitpulse/
└── index.html     # Todo el app (HTML + CSS + JS) — ~900 líneas
```

Un solo archivo. Nada más.

---

## ⚙️ Personalización

### Cambiar intervalo de refresco (por defecto 60s)
```js
// Busca en app.js inline:
S.refreshIn = 60;  // ← cambia a 30 para 30s
```

### Cambiar tema de colores
```css
/* Busca las CSS variables al inicio del <style>: */
--btc: #f7931a;   /* Color Bitcoin */
--green: #10d98a; /* Positivo */
--red: #ff4d6a;   /* Negativo */
--void: #03060a;  /* Fondo más oscuro */
```

### Añadir monedas al converter
```js
// En el objeto CINPS:
MXN: {id:'cMXN', toUSD: v => v / (S.fx.MXN || 17)}
```

---

## 📱 Responsive

| Pantalla | Comportamiento |
|----------|---------------|
| Desktop 1440px+ | Grid completo 12 columnas |
| Tablet 768-1100px | Grid 6 columnas |
| Mobile < 768px | Columna única, nav oculto |

---

## ⚠️ Disclaimer

Esta aplicación es únicamente con fines informativos. Nada aquí constituye asesoramiento financiero. Las criptomonedas son activos de alta volatilidad. Haz tu propia investigación (DYOR) antes de invertir.

---

## 📄 Licencia

MIT — libre para usar, modificar y distribuir.
