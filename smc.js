/* Smart Money Concepts engine (spot, long-only). Used by the website AND the Telegram alert script. */
(function (R) {
  const parse = k => k.map(x => ({ o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5] }));
  const ema = (a, n) => { const k = 2 / (n + 1), o = []; let p = a[0]; a.forEach((v, i) => { p = i ? v * k + p * (1 - k) : v; o.push(p); }); return o; };
  const atr = (K, n = 14) => { let s = 0; return K.map((x, i) => { const t = i ? Math.max(x.h - x.l, Math.abs(x.h - K[i - 1].c), Math.abs(x.l - K[i - 1].c)) : x.h - x.l; s = i < n ? (s * i + t) / (i + 1) : (s * (n - 1) + t) / n; return s; }); };
  /* Looks only at candles <= i (no look-ahead). Setup = swing structure, bullish Break of Structure (BOS),
     bullish Order Block (last down candle before the impulse), price retracing into it inside the discount half of the leg. */
  function detect(K, i, A) {
    const kk = 3, w = Math.max(0, i - 150), sh = [], sl = [];
    for (let j = w + kk; j <= i - kk; j++) {
      let hi = 1, lo = 1;
      for (let m = 1; m <= kk; m++) { if (K[j].h <= K[j - m].h || K[j].h <= K[j + m].h) hi = 0; if (K[j].l >= K[j - m].l || K[j].l >= K[j + m].l) lo = 0; }
      if (hi) sh.push(j); if (lo) sl.push(j);
    }
    let b = null;
    for (const h of sh) { let br = -1; for (let j = h + kk + 1; j <= i; j++) if (K[j].c > K[h].h) { br = j; break; } if (br > 0 && i - br <= 60 && (!b || br > b.br)) b = { h, br }; }
    if (!b) return null;
    const ls = sl.filter(j => j < b.br); if (!ls.length) return null;
    const lo = ls[ls.length - 1]; let hh = 0;
    for (let j = lo; j <= i; j++) hh = Math.max(hh, K[j].h);
    const legL = K[lo].l; if (K[i].c > (legL + hh) / 2) return null;           // must be in discount
    let ob = -1; for (let j = b.br - 1; j >= lo; j--) if (K[j].c < K[j].o) { ob = j; break; }
    if (ob < 0) return null;
    const zl = K[ob].l, zh = K[ob].h;
    for (let j = b.br; j <= i; j++) if (K[j].c < zl) return null;               // order block already broken
    if (K[i].l > zh * 1.002) return null;                                       // price not in the zone yet
    const e = Math.min(K[i].c, zh), stop = zl - 0.5 * A[i];
    if (stop >= e || hh < e * 1.005) return null;
    let fvg = 0; for (let j = lo + 1; j < b.br; j++) if (K[j - 1].h < K[j + 1].l) fvg = 1;   // Fair Value Gap
    const pl = sl.filter(j => j < lo).pop(), sw = pl != null && K[lo].l < K[pl].l ? 1 : 0;   // liquidity sweep
    return { zl, zh, e, sl: stop, t1: hh, t2: hh + 0.5 * (hh - legL), fvg, sw };
  }
  /* Replays every past setup: exit at stop (low) or target 1 (high), whichever first; stop wins a tie; timeout 72 candles; minus fees. */
  function bt(K, A, E, F, H = 72) {
    const o = []; let last = -99;
    for (let i = 120; i < K.length - 1; i++) {
      if (i - last < 12 || K[i].c < E[i]) continue;
      const s = detect(K, i, A); if (!s) continue; last = i;
      let r = null, k = 0;
      for (let j = i + 1; j <= Math.min(i + H, K.length - 1); j++) {
        if (K[j].l <= s.sl) { r = s.sl / s.e - 1; k = j - i; break; }
        if (K[j].h >= s.t1) { r = s.t1 / s.e - 1; k = j - i; break; }
      }
      if (r == null) { if (K.length - 1 - i < H) continue; r = K[i + H].c / s.e - 1; k = H; }
      o.push({ r: r - F, k });
    }
    return o;
  }
  function stat(o) { const n = o.length, ks = o.map(x => x.k).sort((a, b) => a - b); return { n, wr: n ? o.filter(x => x.r > 0).length / n * 100 : 0, avg: n ? o.reduce((a, x) => a + x.r, 0) / n : 0, mk: n ? ks[n >> 1] : 0 }; }
  function analyse(raw) {
    const K = parse(raw).slice(0, -1), A = atr(K), E = ema(K.map(x => x.c), 100), i = K.length - 1, up = K[i].c > E[i];
    return { p: K[i].c, up, st: stat(bt(K, A, E, 0.002)), sig: up ? detect(K, i, A) : null };
  }
  /* quality gate: enough past trades, positive average, win rate above the user's minimum */
  function pick(res, o) { const q = r => r.st.wr + 8 * (r.sig.fvg + r.sig.sw); return res.filter(r => r.sig && r.st.n >= 8 && r.st.avg > 0 && r.st.wr >= o.minWR).sort((a, b) => q(b) - q(a)); }

  const rsiA = (c, n = 14) => { const o = Array(c.length).fill(50); let g = 0, l = 0; for (let i = 1; i < c.length; i++) { const d = c[i] - c[i - 1], G = Math.max(d, 0), L = Math.max(-d, 0); if (i <= n) { g += G; l += L; if (i == n) { g /= n; l /= n; o[i] = 100 - 100 / (1 + g / (l || 1e-9)); } } else { g = (g * (n - 1) + G) / n; l = (l * (n - 1) + L) / n; o[i] = 100 - 100 / (1 + g / (l || 1e-9)); } } return o; };
  /* Movers forecast: for horizons 1h/12h/24h, how often did THIS coin, in a similar state (trend, RSI zone, 6h momentum, volume surge),
     reach +5% / +10% BEFORE hitting a 2xATR stop? Blended with the coin's own base rate (weight 10) so small samples do not mislead. */
  function movers(raw) {
    const K = parse(raw).slice(0, -1), n = K.length, A = atr(K), c = K.map(x => x.c), E = ema(c, 50), Rr = rsiA(c), vs = []; let sum = 0;
    K.forEach((x, i) => { sum += x.v; if (i >= 20) sum -= K[i - 20].v; vs.push(sum / Math.min(i + 1, 20)); });
    const key = i => (c[i] > E[i] ? 1 : 0) + '' + (Rr[i] < 40 ? 0 : Rr[i] < 60 ? 1 : 2) + (c[i] > c[Math.max(0, i - 6)] ? 1 : 0) + (K[i].v > 1.5 * vs[i] ? 1 : 0);
    const sdf = i => Math.min(0.08, Math.max(0.015, 2 * A[i] / c[i])), HS = [1, 12, 24], TS = [0.05, 0.1], all = {}, by = {};
    const win = (i, H, T) => { const e = c[i], tp = e * (1 + T), sl = e * (1 - sdf(i)); for (let j = i + 1; j <= i + H; j++) { if (K[j].l <= sl) return 0; if (K[j].h >= tp) return 1; } return 0; };
    for (let i = 60; i < n - 1; i++) { const k = key(i); for (const H of HS) { if (i + H > n - 1) continue; for (const T of TS) { const id = H + '_' + T, w = win(i, H, T), a = all[id] = all[id] || { w: 0, n: 0 }, b = by[k + id] = by[k + id] || { w: 0, n: 0 }; a.w += w; a.n++; b.w += w; b.n++; } } }
    const k0 = key(n - 1), h = {};
    for (const H of HS) { const o = {}; for (const T of TS) { const id = H + '_' + T, a = all[id] || { w: 0, n: 0 }, b = by[k0 + id] || { w: 0, n: 0 }, base = a.n ? a.w / a.n : 0, t = Math.round(T * 100); o['p' + t] = (b.w + 10 * base) / (b.n + 10); o['n' + t] = b.n; } h[H] = o; }
    return { p: c[n - 1], atr: A[n - 1], sd: sdf(n - 1), rsi: Rr[n - 1], up: c[n - 1] > E[n - 1], vx: K[n - 1].v / vs[n - 1], h };
  }
  R.SMC = { analyse, pick, detect, bt, stat, movers };
})(typeof window !== 'undefined' ? window : module.exports);
