// ============================================================
//  Graphiques SVG (donut + barres) — sans dépendance externe
// ============================================================
const Charts = (() => {

  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  // ---------- Donut ----------
  // segments : [{ label, value, color }]
  function donut(container, segments) {
    const total = segments.reduce((a, s) => a + (s.value || 0), 0);
    if (total <= 0) {
      container.innerHTML = '<p class="hint">Aucune donnée</p>';
      return;
    }
    const size = 170, stroke = 34, r = (size - stroke) / 2, c = size / 2;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    let svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img">`;
    segments.forEach(s => {
      const frac = (s.value || 0) / total;
      if (frac <= 0) return;
      const len = frac * circ;
      svg += `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${stroke}"` +
        ` stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}"` +
        ` transform="rotate(-90 ${c} ${c})"><title>${esc(s.label)} : ${s.value}</title></circle>`;
      offset += len;
    });
    svg += `<text x="${c}" y="${c - 4}" text-anchor="middle" font-size="22" font-weight="bold" fill="#1f2933">${total}</text>` +
      `<text x="${c}" y="${c + 16}" text-anchor="middle" font-size="10" fill="#6b7280">total</text>`;
    svg += `</svg>`;

    let legend = '<div class="legend">';
    segments.forEach(s => {
      const pct = total ? Math.round((s.value / total) * 1000) / 10 : 0;
      legend += `<div class="legend-item">` +
        `<span class="dot" style="background:${s.color}"></span>` +
        `<span class="legend-label">${esc(s.label)}</span>` +
        `<span class="legend-value"><b>${s.value}</b> (${pct}%)</span></div>`;
    });
    legend += '</div>';

    container.innerHTML = svg + legend;
  }

  // ---------- Barres groupées ----------
  // series : [{ label, values: [{ value, color, name }] }]
  function bars(container, series) {
    const max = Math.max(1, ...series.flatMap(s => s.values.map(v => v.value || 0)));
    if (series.length === 0) {
      container.innerHTML = '<p class="hint">Aucune donnée</p>';
      return;
    }
    const width = 720, height = 260, padL = 42, padR = 10, padT = 12, padB = 34;
    const plotW = width - padL - padR, plotH = height - padT - padB;
    const n = series.length;
    const groupW = plotW / n;
    const nbars = Math.max(1, ...series.map(s => s.values.length));
    const barW = Math.min(30, (groupW * 0.7) / nbars);
    const nice = niceMax(max);

    let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" preserveAspectRatio="xMidYMid meet" role="img">`;
    // grille horizontale
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const val = (nice / steps) * i;
      const y = padT + plotH - (val / nice) * plotH;
      svg += `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>` +
        `<text x="${padL - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#6b7280">${Math.round(val)}</text>`;
    }
    // barres
    series.forEach((s, gi) => {
      const x0 = padL + gi * groupW + (groupW - barW * nbars) / 2;
      s.values.forEach((v, vi) => {
        const h = ((v.value || 0) / nice) * plotH;
        const x = x0 + vi * barW;
        const y = padT + plotH - h;
        svg += `<rect x="${x}" y="${y}" width="${barW - 3}" height="${h}" rx="2" fill="${v.color}">` +
          `<title>${esc(s.label)} — ${esc(v.name)} : ${v.value}</title></rect>`;
      });
      const cx = padL + gi * groupW + groupW / 2;
      svg += `<text x="${cx}" y="${height - padB + 16}" text-anchor="middle" font-size="10" fill="#4b5563">${esc(s.label)}</text>`;
    });
    svg += `</svg>`;

    // légende (couleurs communes)
    const colors = new Map();
    series.forEach(s => s.values.forEach(v => colors.set(v.name, v.color)));
    let legend = '<div class="legend legend-inline">';
    colors.forEach((color, name) => {
      legend += `<div class="legend-item"><span class="dot" style="background:${color}"></span><span class="legend-label">${esc(name)}</span></div>`;
    });
    legend += '</div>';

    container.innerHTML = svg + legend;
  }

  function niceMax(v) {
    if (v <= 10) return 10;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / pow;
    let nf;
    if (f <= 1) nf = 1; else if (f <= 2) nf = 2; else if (f <= 5) nf = 5; else nf = 10;
    return nf * pow;
  }

  return { donut, bars };
})();
