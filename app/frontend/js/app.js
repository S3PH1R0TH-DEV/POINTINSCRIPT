// ============================================================
//  APPLICATION — POINTINSCRIPT (Firebase)
//  Saisie quotidienne + compilation hebdo + graphiques + hors-ligne
// ============================================================
(function () {
  let session = null;       // { user, role, school }
  let config = null;        // { year, startDate, endDate, weeks, days }
  let myReports = [];
  let secteurs = [];
  let ecoles = [];

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => (n === null || n === undefined || n === '') ? '—' : n;

  const TYPE_LABELS = {
    primaire: 'Primaire (CP1-CM2)',
    primaire_prescolaire: 'Primaire + Grande Section',
    prescolaire: 'Préscolaire (PS-MS-GS)'
  };
  const ORANGE = '#f77f00';
  const ORANGE_LIGHT = '#fbbf77';
  const GREEN = '#009e60';
  const GREEN_LIGHT = '#7fd4ae';
  const GREY = '#9ca3af';

  // ---------- Période / calendrier ----------
  function buildCalendar() {
    const cfg = window.APP_CONFIG;
    const start = cfg.startDate, end = cfg.endDate;
    const days = [];
    let cur = new Date(start + 'T00:00:00Z');
    const endD = new Date(end + 'T00:00:00Z');
    while (cur <= endD) {
      days.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    // semaines alignées sur lundi
    const weeks = [];
    const monday = (d) => { const x = new Date(d); const day = (x.getUTCDay() + 6) % 7; x.setUTCDate(x.getUTCDate() - day); return x; };
    let ws = monday(new Date(start + 'T00:00:00Z'));
    let i = 1;
    while (ws <= endD) {
      const from = ws.toISOString().slice(0, 10);
      let to = new Date(ws.getTime() + 6 * 86400000);
      if (to > endD) to = new Date(endD);
      weeks.push({ no: i, label: 'Semaine ' + i, from, to: to.toISOString().slice(0, 10) });
      ws.setTime(ws.getTime() + 7 * 86400000);
      i++;
    }
    return { year: cfg.year, startDate: start, endDate: end, days, weeks };
  }
  function weekForDate(dateStr) {
    for (const w of config.weeks) if (dateStr >= w.from && dateStr <= w.to) return w;
    return null;
  }
  function formatDateFr(d) {
    const dt = new Date(d + 'T00:00:00Z');
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const mois = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    return jours[dt.getUTCDay()] + ' ' + dt.getUTCDate() + ' ' + mois[dt.getUTCMonth()] + ' ' + dt.getUTCFullYear();
  }

  // ---------- Utilitaires UI ----------
  function toast(msg, type) {
    const t = $('toast');
    t.textContent = msg;
    t.className = 'toast ' + (type || '');
    t.classList.remove('hidden');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.add('hidden'), 3000);
  }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function setSyncBadge(state) {
    const b = $('sync-badge');
    b.className = 'sync-badge ' + state;
    b.textContent = state === 'online' ? '● En ligne' : state === 'offline' ? '○ Hors ligne' : '⟳ Synchro…';
  }
  function updateOnlineStatus() { setSyncBadge(navigator.onLine ? 'online' : 'offline'); }

  // ---------- Authentification ----------
  async function handleLogin(e) {
    e.preventDefault();
    const u = $('login-username').value.trim();
    const p = $('login-password').value;
    $('login-btn').disabled = true;
    $('login-error').textContent = '';
    try {
      const user = await FB.login(u, p);
      await enterAppFor(user);
    } catch (err) {
      $('login-error').textContent = friendlyAuthError(err);
    } finally {
      $('login-btn').disabled = false;
    }
  }
  function friendlyAuthError(err) {
    const m = (err && (err.message || err.code)) || '';
    if (/invalid-login|wrong-password|user-not-found|INVALID_PASSWORD|EMAIL_NOT_FOUND/i.test(m))
      return 'Identifiant ou mot de passe incorrect';
    if (/too-many-requests/i.test(m)) return 'Trop de tentatives, réessayez plus tard';
    if (/network|unreachable/i.test(m)) return 'Pas de connexion — vérifiez votre réseau';
    return 'Erreur de connexion : ' + m;
  }

  async function logout() {
    try { await FB.logout(); } catch (e) { /* ignore */ }
    session = null;
    showLogin();
  }

  function showLogin() {
    $('app-view').classList.add('hidden');
    $('login-view').classList.remove('hidden');
    $('login-error').textContent = '';
  }
  function showApp() {
    $('login-view').classList.add('hidden');
    $('app-view').classList.remove('hidden');
  }

  async function enterAppFor(user) {
    showApp();
    const isAdmin = FB.isAdminUser(user);
    const isInspecteur = FB.isInspecteurUser(user);
    if (isAdmin) {
      session = { user, role: 'admin', school: null };
      $('user-label').textContent = '🛡️ Admin';
      hideAllViews();
      $('admin-view').classList.remove('hidden');
      await initAdmin();
    } else if (FB.isInspecteurUser(user)) {
      session = { user, role: 'inspecteur', school: null };
      $('user-label').textContent = '👁️ Inspecteur IEPP';
      hideAllViews();
      $('inspecteur-view').classList.remove('hidden');
      await initInspecteur();
    } else {
      const school = await FB.getMySchool(user.uid);
      if (!school) { toast('École introuvable pour ce compte', 'err'); return logout(); }
      session = { user, role: 'directeur', school };
      $('user-label').textContent = '🏫 ' + (school.directeur_nom || school.nom);
      hideAllViews();
      $('director-view').classList.remove('hidden');
      await initDirector();
    }
    updateOnlineStatus();
  }

  function hideAllViews() {
    $('director-view').classList.add('hidden');
    $('admin-view').classList.add('hidden');
    $('inspecteur-view').classList.add('hidden');
  }

  // ============================================================
  //  VUE DIRECTEUR
  // ============================================================
  async function initDirector() {
    config = buildCalendar();
    $('login-year').textContent = config.year;
    const school = session.school;
    $('school-name').textContent = school.nom;
    $('school-details').textContent =
      'Code : ' + (school.code || '—') + ' • Type : ' + (TYPE_LABELS[school.type] || school.type) +
      ' • Directeur : ' + (school.directeur_nom || '—');

    $('pre-section').classList.toggle('hidden', !school.has_prescolaire);
    $('prim-section').classList.toggle('hidden', !school.has_primaire);

    fillDateSelect();
    try {
      myReports = await FB.getMyReports(school.id);
    } catch (e) { myReports = []; }
    loadDayForm();
  }

  function fillDateSelect() {
    const sel = $('date-select');
    sel.innerHTML = '';
    for (const d of config.days) {
      const o = document.createElement('option');
      o.value = d; o.textContent = formatDateFr(d);
      sel.appendChild(o);
    }
    const today = new Date().toISOString().slice(0, 10);
    if (config.days.includes(today)) sel.value = today;
    else if (config.days.length) sel.value = config.days[config.days.length - 1];
  }

  function currentDate() { return $('date-select').value || config.days[0]; }

  function loadDayForm() {
    const d = currentDate();
    const existing = myReports.find(r => r.date === d);
    const draft = Store.getDraft(d);
    const data = existing || draft || {};
    const w = weekForDate(d);
    $('date-range').textContent = 'Jour : ' + formatDateFr(d) + (w ? ' — ' + w.label : '');

    setField('pre_enfants', data.pre_enfants);
    setField('pre_inscrits_total', data.pre_inscrits_total);
    setField('pre_inscrits_filles', data.pre_inscrits_filles);
    setField('pre_handicap_avec', data.pre_handicap_avec);
    setField('pre_handicap_sans', data.pre_handicap_sans);
    setField('pre_non_inscrits_total', data.pre_non_inscrits_total);
    setField('pre_non_inscrits_filles', data.pre_non_inscrits_filles);
    $('pre_motifs').value = data.pre_motifs || '';
    setField('prim_eleves', data.prim_eleves);
    setField('prim_inscrits_total', data.prim_inscrits_total);
    setField('prim_inscrits_filles', data.prim_inscrits_filles);
    setField('prim_handicap_avec', data.prim_handicap_avec);
    setField('prim_handicap_sans', data.prim_handicap_sans);
    setField('prim_non_inscrits_total', data.prim_non_inscrits_total);
    setField('prim_non_inscrits_filles', data.prim_non_inscrits_filles);
    $('prim_motifs').value = data.prim_motifs || '';
    $('observations').value = data.observations || '';
    $('difficultes').value = data.difficultes || '';
    $('dispositions').value = data.dispositions || '';
    computePct();

    if (existing) {
      $('report-status').textContent = '✅ Point du ' + formatDateFr(d) + ' déjà envoyé.';
      $('report-status').className = 'status-line ok';
    } else if (draft) {
      $('report-status').textContent = '📝 Brouillon local (non envoyé).';
      $('report-status').className = 'status-line';
    } else {
      $('report-status').textContent = '';
      $('report-status').className = 'status-line';
    }
  }

  function setField(id, v) { $(id).value = (v === null || v === undefined) ? '' : v; }
  function readNum(id) { const v = $(id).value.trim(); return v === '' ? null : Number(v); }
  function pctStr(part, denomA, denomB) {
    const d = denomA || (denomB + part);
    if (!d || part === null) return '';
    return (Math.round(part / d * 1000) / 10) + ' %';
  }
  function computePct() {
    const preT = readNum('pre_enfants'), preN = readNum('pre_non_inscrits_total'), preI = readNum('pre_inscrits_total');
    const primT = readNum('prim_eleves'), primN = readNum('prim_non_inscrits_total'), primI = readNum('prim_inscrits_total');
    $('pre_non_inscrits_pct').value = pctStr(preN, preT, preI);
    $('prim_non_inscrits_pct').value = pctStr(primN, primT, primI);
  }

  function collectReport() {
    return {
      year: config.year,
      date: currentDate(),
      pre_enfants: readNum('pre_enfants'),
      pre_inscrits_total: readNum('pre_inscrits_total'),
      pre_inscrits_filles: readNum('pre_inscrits_filles'),
      pre_handicap_avec: readNum('pre_handicap_avec'),
      pre_handicap_sans: readNum('pre_handicap_sans'),
      pre_non_inscrits_total: readNum('pre_non_inscrits_total'),
      pre_non_inscrits_filles: readNum('pre_non_inscrits_filles'),
      pre_motifs: $('pre_motifs').value.trim(),
      prim_eleves: readNum('prim_eleves'),
      prim_inscrits_total: readNum('prim_inscrits_total'),
      prim_inscrits_filles: readNum('prim_inscrits_filles'),
      prim_handicap_avec: readNum('prim_handicap_avec'),
      prim_handicap_sans: readNum('prim_handicap_sans'),
      prim_non_inscrits_total: readNum('prim_non_inscrits_total'),
      prim_non_inscrits_filles: readNum('prim_non_inscrits_filles'),
      prim_motifs: $('prim_motifs').value.trim(),
      observations: $('observations').value.trim(),
      difficultes: $('difficultes').value.trim(),
      dispositions: $('dispositions').value.trim()
    };
  }

  function saveDraft() {
    Store.setDraft(currentDate(), collectReport());
    $('report-status').textContent = '📝 Brouillon enregistré localement.';
    $('report-status').className = 'status-line';
    toast('Brouillon enregistré', 'ok');
  }

  async function submitReport() {
    const d = currentDate();
    const report = collectReport();
    $('report-status').textContent = navigator.onLine ? 'Envoi en cours…' : '📶 Hors ligne — sera envoyé automatiquement.';
    $('report-status').className = 'status-line';
    try {
      await FB.saveReport(session.school.id, report);
      myReports = myReports.filter(r => r.date !== d).concat([{ ...report, date: d }]);
      $('report-status').textContent = navigator.onLine
        ? '✅ Point du ' + formatDateFr(d) + ' envoyé avec succès.'
        : '📶 Hors ligne — point enregistré localement, envoi automatique dès le retour du réseau.';
      $('report-status').className = 'status-line ok';
      toast(navigator.onLine ? 'Envoyé avec succès' : 'Enregistré (hors-ligne)', 'ok');

      // 🎉 Encouragement : série de jours consécutifs
      const streak = updateStreak(d);
      if (streak > 1) {
        const msg = streakMessages[Math.min(streak, streakMessages.length - 1)];
        setTimeout(() => toast(msg, 'ok'), 800);
      }
    } catch (err) {
      $('report-status').textContent = '⚠️ Erreur : ' + (err.message || err);
      $('report-status').className = 'status-line err';
      toast('Erreur lors de l\'envoi', 'err');
    }
  }

  // 🎉 Encouragement : gestion de la série de jours
  const STREAK_KEY = 'pointinscript_streak_v1';
  const streakMessages = [
    '🎉 Premier point envoyé ! Bon début !',
    '🔥 2 jours de suite — vous êtes sur la bonne voie !',
    '💪 3 jours d\'affilée — la régularité paie !',
    '⭐ 4 jours — une vraie régularité, bravo !',
    '🏆 5 jours consécutifs — excellence !',
    '🚀 Semaine complète ! Vous assurez !',
    '🌟 Au-delà d\'une semaine — un modèle de régularité !'
  ];

  function updateStreak(todayStr) {
    try {
      const data = JSON.parse(localStorage.getItem(STREAK_KEY) || '{}');
      const last = data.lastDate;
      const streak = data.streak || 0;
      const today = new Date(todayStr + 'T00:00:00');
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);

      let newStreak = 1;
      if (last === todayStr) {
        newStreak = streak; // même jour, ne change rien
      } else if (last === yStr) {
        newStreak = streak + 1; // jour consécutif
      } else {
        newStreak = 1; // série cassée
      }
      localStorage.setItem(STREAK_KEY, JSON.stringify({ lastDate: todayStr, streak: newStreak }));
      return newStreak;
    } catch (_) {
      return 1;
    }
  }

  // ============================================================
  //  VUE ADMIN
  // ============================================================
  async function initAdmin() {
    config = buildCalendar();
    $('login-year').textContent = config.year;
    const consWeek = $('cons-week');
    consWeek.innerHTML = '<option value="">Toute la période</option>';
    for (const w of config.weeks) {
      const o = document.createElement('option');
      o.value = w.no; o.textContent = w.label + ' (' + w.from + ' → ' + w.to + ')';
      consWeek.appendChild(o);
    }

    try {
      await loadSecteurs();
      await loadEcoles();
    } catch (e) { toast('Hors ligne — affichage du cache', 'err'); }
    await renderDashboard();

    try { await renderLogins(); } catch (e) { /* dernière liste affichée */ }

    checkActivity();
    setInterval(checkActivity, 60000);
  }

  // ============================================================
  //  VUE INSPECTEUR (lecture seule)
  // ============================================================
  async function initInspecteur() {
    config = buildCalendar();
    $('login-year').textContent = config.year;

    // Semaines
    const weekSel = $('insp-cons-week');
    weekSel.innerHTML = '<option value="">Toute la période</option>';
    for (const w of config.weeks) {
      const o = document.createElement('option');
      o.value = w.no; o.textContent = w.label + ' (' + w.from + ' → ' + w.to + ')';
      weekSel.appendChild(o);
    }

    // Secteurs
    const sectSel = $('insp-cons-secteur');
    sectSel.innerHTML = '<option value="">Tous</option>';
    try {
      secteurs = await FB.getSecteurs();
      for (const s of secteurs) {
        const o = document.createElement('option');
        o.value = s.id; o.textContent = s.nom;
        $('insp-cons-secteur').appendChild(o);
      }
    } catch (e) { /* offline */ }

    await renderInspecteurDashboard();

    // Refresh buttons
    $('insp-refresh-dash').addEventListener('click', () => renderInspecteurDashboard());
    $('insp-cons-week').addEventListener('change', () => renderInspecteurDashboard());
    $('insp-cons-secteur').addEventListener('change', () => renderInspecteurDashboard());

    // Sync badge
    updateInspecteurSyncBadge();
    setInterval(updateInspecteurSyncBadge, 30000);
  }

  async function renderInspecteurDashboard() {
    const week = $('insp-cons-week').value;
    const secteur = $('insp-cons-secteur').value;
    let weekFrom, weekTo;
    if (week) { const w = config.weeks.find(x => x.no === Number(week)); weekFrom = w.from; weekTo = w.to; }
    const reports = await FB.getAllReports(weekFrom, weekTo);
    let cons = computeConsolidation(reports, week || null);
    if (secteur) {
      const ids = new Set(cons.rows.filter(r => r.secteurId === secteur).map(r => r.id));
      cons = computeConsolidation(reports.filter(r => ids.has(r.schoolId)), week || null);
    }
    renderInspecteurStats(cons);
    renderInspecteurCharts(cons);
    renderInspecteurTable(cons);
    updateInspecteurSyncBadge();
  }

  function renderInspecteurStats(cons) {
    const c = $('insp-stat-cards');
    c.innerHTML = '';
    const stats = [
      { label: 'Écoles actives', value: cons.ecoles_ayant_rapporte, color: 'accent' },
      { label: 'Total écoles', value: cons.total_ecoles, color: '' },
      { label: 'Taux remontée', value: cons.taux_remontee + ' %', color: 'green' },
      { label: 'Préscolaire — Enfants', value: cons.totaux.pre_enfants, color: '' },
      { label: 'Préscolaire — Inscrits', value: cons.totaux.pre_inscrits_total, color: 'green' },
      { label: 'Préscolaire — Non-inscrits', value: cons.totaux.pre_non_inscrits_total, color: 'accent' },
      { label: 'Primaire — Élèves', value: cons.totaux.prim_eleves, color: '' },
      { label: 'Primaire — Inscrits', value: cons.totaux.prim_inscrits_total, color: 'green' },
      { label: 'Primaire — Non-inscrits', value: cons.totaux.prim_non_inscrits_total, color: 'accent' }
    ];
    for (const s of stats) {
      const div = document.createElement('div');
      div.className = 'stat' + (s.color ? ' ' + s.color : '');
      div.innerHTML = '<div class="v">' + s.value + '</div><div class="l">' + s.label + '</div>';
      $('insp-stat-cards').appendChild(div);
    }
  }

  function renderInspecteurCharts(cons) {
    if (cons.rows.some(r => r.has_prescolaire)) {
      Charts.donut($('insp-donut-pre'), [
        { label: 'Filles inscrites', value: cons.totaux.pre_inscrits_filles, color: GREEN },
        { label: 'Garçons inscrits', value: cons.totaux.pre_inscrits_total - cons.totaux.pre_inscrits_filles, color: GREEN_LIGHT },
        { label: 'Non-inscrits', value: cons.totaux.pre_non_inscrits_total, color: GREY }
      ]);
    } else {
      $('insp-donut-pre').innerHTML = '<p class="hint">Pas de données préscolaire</p>';
    }
    if (cons.rows.some(r => r.has_primaire)) {
      Charts.donut($('insp-donut-prim'), [
        { label: 'Filles inscrites', value: cons.totaux.prim_inscrits_filles, color: ORANGE },
        { label: 'Garçons inscrits', value: cons.totaux.prim_inscrits_total - cons.totaux.prim_inscrits_filles, color: ORANGE_LIGHT },
        { label: 'Non-inscrits', value: cons.totaux.prim_non_inscrits_total, color: GREY }
      ]);
    } else {
      $('insp-donut-prim').innerHTML = '<p class="hint">Pas de données primaire</p>';
    }
    Charts.bars($('insp-bar-chart'), [
      { label: 'Préscolaire', values: [{ name: 'Inscrits', value: cons.totaux.pre_inscrits_total, color: GREEN }] },
      { label: 'Primaire', values: [{ name: 'Inscrits', value: cons.totaux.prim_inscrits_total, color: ORANGE }] }
    ]);
  }

  function renderInspecteurTable(cons) {
    const tb = $('insp-cons-table');
    const rows = cons.rows.filter(r => r.has_prescolaire || r.has_primaire);
    tb.innerHTML = '<tr><th>École</th><th>Secteur</th><th>Type</th><th>Préscolaire (Enf/Ins/Non)</th><th>Primaire (Elv/Ins/Non)</th><th>Taux remontée</th></tr>';
    for (const r of rows) {
      const tr = document.createElement('tr');
      const pre = r.has_prescolaire ? r.pre_enfants + '/' + r.pre_inscrits_total + '/' + r.pre_non_inscrits_total : '—';
      const prim = r.has_primaire ? r.prim_eleves + '/' + r.prim_inscrits_total + '/' + r.prim_non_inscrits_total : '—';
      tr.innerHTML = '<td>' + esc(r.nom) + '</td>' +
        '<td>' + esc(r.secteur_nom || '—') + '</td>' +
        '<td>' + esc(TYPE_LABELS[r.type] || r.type) + '</td>' +
        '<td class="num">' + esc(pre) + '</td>' +
        '<td class="num">' + esc(prim) + '</td>' +
        '<td class="num">' + (r.nb_jours > 0 ? (r.pre_non_inscrits_pct || r.prim_non_inscrits_pct || '0') + ' %' : '—') + '</td>';
      tb.appendChild(tr);
    }
  }

  function updateInspecteurSyncBadge() {
    const b = $('insp-sync-badge');
    b.className = 'sync-badge ' + (navigator.onLine ? 'online' : 'offline');
    b.textContent = navigator.onLine ? '● En ligne' : '○ Hors ligne';
  }

  async function loadSecteurs() {
    secteurs = await FB.getSecteurs();
    const sl = $('secteur-list');
    sl.innerHTML = '';
    for (const s of secteurs) {
      const li = document.createElement('li');
      li.innerHTML = '<span>' + esc(s.nom) + ' <span class="meta">(' + s.nb_ecoles + ' école(s))</span></span>' +
        '<button class="del" data-id="' + s.id + '" title="Supprimer">✕</button>';
      sl.appendChild(li);
    }
    const cs = $('cons-secteur');
    cs.innerHTML = '<option value="">Tous</option>';
    for (const s of secteurs) {
      const o = document.createElement('option');
      o.value = s.id; o.textContent = s.nom;
      cs.appendChild(o);
    }
  }

  async function loadEcoles() {
    ecoles = await FB.getEcoles();
    renderEcoles();
  }

  function renderEcoles() {
    const tb = $('ecoles-table');
    const q = $('ecole-search').value.toLowerCase();
    const rows = ecoles.filter(e => !q ||
      (e.nom || '').toLowerCase().includes(q) || (e.code || '').toLowerCase().includes(q) ||
      (e.directeurNom || '').toLowerCase().includes(q));
    tb.innerHTML = '<tr><th>Code</th><th>École</th><th>Type</th><th>Secteur</th><th>Directeur</th><th>Login</th><th></th></tr>';
    for (const e of rows) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + esc(e.code || '—') + '</td>' +
        '<td>' + esc(e.nom) + '</td>' +
        '<td>' + esc(TYPE_LABELS[e.type] || e.type) + '</td>' +
        '<td>' + esc(e.secteur_nom || '—') + '</td>' +
        '<td>' + esc(e.directeurNom || '—') + '</td>' +
        '<td>' + (e.username ? '<span class="tag ok">' + esc(e.username) + '</span>' : '<span class="tag miss">Aucun</span>') + '</td>' +
        '<td><button class="mini-btn gray" data-edit="' + e.id + '">✎</button> ' +
        '<button class="mini-btn" data-del="' + e.id + '" style="background:#dc2626">✕</button></td>';
      tb.appendChild(tr);
    }
  }

  // ---------- Consolidation (calcul client) ----------
  function computeConsolidation(allReports, weekFilter) {
    const ecoleById = {};
    for (const e of ecoles) ecoleById[e.id] = e;

    const bySchool = {};
    for (const r of allReports) {
      if (!bySchool[r.schoolId]) bySchool[r.schoolId] = [];
      bySchool[r.schoolId].push(r);
    }
    const gsum = (f) => allReports.reduce((a, r) => a + (r[f] || 0), 0);
    const pctF = (part, denomA, denomB) => {
      const d = denomA || (denomB + part);
      return d ? Math.round((part / d) * 1000) / 10 : null;
    };

    const rows = ecoles.map(s => {
      const rs = bySchool[s.id] || [];
      const ssum = (f) => rs.reduce((a, r) => a + (r[f] || 0), 0);
      const uniq = (f) => [...new Set(rs.filter(r => r[f]).map(r => String(r[f]).trim()).filter(Boolean))].join(' ; ');
      const last = rs.reduce((a, b) => (b.date > a.date ? b : a), rs[0] || null);
      return {
        ...s,
        type_label: TYPE_LABELS[s.type] || s.type,
        has_prescolaire: s.type === 'prescolaire' || s.type === 'primaire_prescolaire',
        has_primaire: s.type === 'primaire' || s.type === 'primaire_prescolaire',
        nb_jours: rs.length,
        derniere_maj: last ? last.date : null,
        pre_enfants: ssum('pre_enfants'),
        pre_inscrits_total: ssum('pre_inscrits_total'),
        pre_inscrits_filles: ssum('pre_inscrits_filles'),
        pre_handicap_avec: ssum('pre_handicap_avec'),
        pre_handicap_sans: ssum('pre_handicap_sans'),
        pre_non_inscrits_total: ssum('pre_non_inscrits_total'),
        pre_non_inscrits_filles: ssum('pre_non_inscrits_filles'),
        pre_motifs: uniq('pre_motifs'),
        prim_eleves: ssum('prim_eleves'),
        prim_inscrits_total: ssum('prim_inscrits_total'),
        prim_inscrits_filles: ssum('prim_inscrits_filles'),
        prim_handicap_avec: ssum('prim_handicap_avec'),
        prim_handicap_sans: ssum('prim_handicap_sans'),
        prim_non_inscrits_total: ssum('prim_non_inscrits_total'),
        prim_non_inscrits_filles: ssum('prim_non_inscrits_filles'),
        prim_motifs: uniq('prim_motifs'),
        observations: uniq('observations'),
        difficultes: uniq('difficultes'),
        dispositions: uniq('dispositions'),
        pre_non_inscrits_pct: pctF(ssum('pre_non_inscrits_total'), ssum('pre_enfants'), ssum('pre_inscrits_total')),
        prim_non_inscrits_pct: pctF(ssum('prim_non_inscrits_total'), ssum('prim_eleves'), ssum('prim_inscrits_total'))
      };
    });

    const total = ecoles.length;
    const ayant = rows.filter(r => r.nb_jours > 0).length;
    return {
      year: config.year,
      week_no: weekFilter || null,
      total_ecoles: total,
      ecoles_ayant_rapporte: ayant,
      ecoles_sans_rapport: total - ayant,
      taux_remontee: total ? Math.round((ayant / total) * 1000) / 10 : 0,
      totaux: {
        pre_enfants: gsum('pre_enfants'), pre_inscrits_total: gsum('pre_inscrits_total'),
        pre_inscrits_filles: gsum('pre_inscrits_filles'), pre_handicap_avec: gsum('pre_handicap_avec'),
        pre_handicap_sans: gsum('pre_handicap_sans'), pre_non_inscrits_total: gsum('pre_non_inscrits_total'),
        pre_non_inscrits_filles: gsum('pre_non_inscrits_filles'),
        prim_eleves: gsum('prim_eleves'), prim_inscrits_total: gsum('prim_inscrits_total'),
        prim_inscrits_filles: gsum('prim_inscrits_filles'), prim_handicap_avec: gsum('prim_handicap_avec'),
        prim_handicap_sans: gsum('prim_handicap_sans'), prim_non_inscrits_total: gsum('prim_non_inscrits_total'),
        prim_non_inscrits_filles: gsum('prim_non_inscrits_filles')
      },
      rows
    };
  }

  function computeStats(allReports, weekFilter) {
    const dayList = [];
    for (const d of config.days) {
      if (!weekFilter) dayList.push(d);
      else { const w = config.weeks.find(x => x.no === Number(weekFilter)); if (w && d >= w.from && d <= w.to) dayList.push(d); }
    }
    const map = {};
    for (const d of dayList) map[d] = { date: d, pre_inscrits: 0, pre_filles: 0, pre_non: 0, prim_inscrits: 0, prim_filles: 0, prim_non: 0 };
    const totals = { pre_inscrits: 0, pre_filles: 0, pre_non: 0, prim_inscrits: 0, prim_filles: 0, prim_non: 0 };
    for (const r of allReports) {
      if (!map[r.date]) continue;
      map[r.date].pre_inscrits += (r.pre_inscrits_total || 0);
      map[r.date].pre_filles += (r.pre_inscrits_filles || 0);
      map[r.date].pre_non += (r.pre_non_inscrits_total || 0);
      map[r.date].prim_inscrits += (r.prim_inscrits_total || 0);
      map[r.date].prim_filles += (r.prim_inscrits_filles || 0);
      map[r.date].prim_non += (r.prim_non_inscrits_total || 0);
    }
    for (const d of dayList) {
      totals.pre_inscrits += map[d].pre_inscrits; totals.pre_filles += map[d].pre_filles; totals.pre_non += map[d].pre_non;
      totals.prim_inscrits += map[d].prim_inscrits; totals.prim_filles += map[d].prim_filles; totals.prim_non += map[d].prim_non;
    }
    const fmtDay = (d) => {
      const dt = new Date(d + 'T00:00:00Z');
      const jours = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
      return jours[dt.getUTCDay()] + ' ' + d.slice(8, 10) + '/' + d.slice(5, 7);
    };
    const series = dayList.map(d => ({ ...map[d], label: fmtDay(d) }));
    return { series, totals };
  }

  async function renderDashboard() {
    const week = $('cons-week').value;
    const secteur = $('cons-secteur').value;
    let weekFrom, weekTo;
    if (week) { const w = config.weeks.find(x => x.no === Number(week)); weekFrom = w.from; weekTo = w.to; }

    let reports;
    try {
      reports = await FB.getAllReports(weekFrom, weekTo);
    } catch (e) {
      // Hors-ligne : tente le cache
      const cache = Store.getCache();
      if (cache) { renderDashboardContent(cache.cons, cache.stats, true); return; }
      toast('Impossible de charger (hors-ligne ?)', 'err');
      return;
    }
    // Filtre par secteur (dans la consolidation)
    let cons = computeConsolidation(reports, week || null);
    if (secteur) {
      const filtered = cons.rows.filter(r => r.secteurId === secteur);
      const ids = new Set(filtered.map(r => r.id));
      const rep2 = reports.filter(r => ids.has(r.schoolId));
      cons = computeConsolidation(rep2, week || null);
    }
    const stats = computeStats(reports.filter(r => {
      if (!secteur) return true;
      const e = ecoles.find(x => x.id === r.schoolId);
      return e && e.secteurId === secteur;
    }), week || null);

    Store.setCache({ cons, stats, ts: Date.now() });
    renderDashboardContent(cons, stats, false);
    Store.setLastSeen(Date.now());
    $('new-badge').classList.add('hidden');
  }

  function renderDashboardContent(cons, stats, fromCache) {
    $('stat-cards').innerHTML =
      stat('Total écoles', cons.total_ecoles, '') +
      stat('Écoles ayant remonté', cons.ecoles_ayant_rapporte, 'green') +
      stat('Taux de remontée', cons.taux_remontee + ' %', 'accent') +
      stat('Enfants présc. inscrits', cons.totaux.pre_inscrits_total, '') +
      stat('Dont filles (présc.)', cons.totaux.pre_inscrits_filles, '') +
      stat('Élèves CP1 inscrits', cons.totaux.prim_inscrits_total, '') +
      stat('Dont filles (CP1)', cons.totaux.prim_inscrits_filles, '');

    const cache = Store.getCache();
    const ts = cache ? cache.ts : null;
    $('last-sync').textContent = fromCache
      ? '📶 Hors ligne — données en cache' + (ts ? ' (dernière synchro : ' + new Date(ts).toLocaleString('fr-FR') + ')' : '')
      : '🟢 À jour' + (ts ? ' — ' + new Date(ts).toLocaleTimeString('fr-FR') : '');

    renderCharts(stats);

    const tb = $('cons-table');
    tb.innerHTML = '<tr><th>École</th><th>Type</th><th>Secteur</th>' +
      '<th class="num">Présc. Inscrits</th><th class="num">Dont filles</th>' +
      '<th class="num">CP1 Inscrits</th><th class="num">Dont filles</th><th>État</th></tr>';
    for (const r of cons.rows) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + esc(r.nom) + '</td>' +
        '<td>' + esc(r.type_label || '') + '</td>' +
        '<td>' + esc(r.secteur_nom || '—') + '</td>' +
        '<td class="num">' + fmt(r.pre_inscrits_total) + '</td>' +
        '<td class="num">' + fmt(r.pre_inscrits_filles) + '</td>' +
        '<td class="num">' + fmt(r.prim_inscrits_total) + '</td>' +
        '<td class="num">' + fmt(r.prim_inscrits_filles) + '</td>' +
        '<td>' + (r.nb_jours > 0 ? '<span class="tag ok">Remonté (' + r.nb_jours + ' j)</span>' : '<span class="tag miss">En attente</span>') + '</td>';
      tb.appendChild(tr);
    }
  }

  function renderCharts(stats) {
    const t = stats.totals;
    Charts.donut($('donut-pre'), [
      { label: 'Filles inscrites', value: t.pre_filles, color: GREEN },
      { label: 'Garçons inscrits', value: t.pre_inscrits - t.pre_filles, color: GREEN_LIGHT },
      { label: 'Non-inscrits', value: t.pre_non, color: GREY }
    ]);
    Charts.donut($('donut-prim'), [
      { label: 'Filles inscrites', value: t.prim_filles, color: ORANGE },
      { label: 'Garçons inscrits', value: t.prim_inscrits - t.prim_filles, color: ORANGE_LIGHT },
      { label: 'Non-inscrits', value: t.prim_non, color: GREY }
    ]);
    const series = (stats.series || []).map(s => ({
      label: s.label,
      values: [
        { name: 'Préscolaire', value: s.pre_inscrits, color: GREEN },
        { name: 'Primaire (CP1)', value: s.prim_inscrits, color: ORANGE }
      ]
    }));
    Charts.bars($('bar-chart'), series);
  }

  function stat(label, value, cls) {
    return '<div class="stat ' + cls + '"><div class="v">' + value + '</div><div class="l">' + label + '</div></div>';
  }

  // ---------- Badge d'activité ----------
  async function checkActivity() {
    if (!navigator.onLine) return;
    try {
      const since = Store.getLastSeen();
      const a = await FB.getActivity(since || 0);
      const badge = $('new-badge');
      if (!since) { Store.setLastSeen(a.latestMs || Date.now()); badge.classList.add('hidden'); return; }
      if (a.nouveaux > 0) {
        badge.textContent = '🔔 +' + a.nouveaux + ' nouveau' + (a.nouveaux > 1 ? 'x' : '') + ' point' + (a.nouveaux > 1 ? 's' : '');
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    } catch (e) { /* silencieux */ }
  }

  // ---------- Logins ----------
  async function renderLogins() {
    const rows = await FB.getLogins();
    $('logins-summary').textContent = rows.length + ' logins actifs sur ' + ecoles.length + ' écoles.';
    const tb = $('logins-table');
    tb.innerHTML = '<tr><th>Code</th><th>École</th><th>Type</th><th>Secteur</th><th>Directeur</th><th>Identifiant</th><th>Mot de passe</th></tr>';
    for (const r of rows) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + esc(r.code || '—') + '</td>' +
        '<td>' + esc(r.nom) + '</td>' +
        '<td>' + esc(TYPE_LABELS[r.type] || r.type) + '</td>' +
        '<td>' + esc(r.secteur_nom || '—') + '</td>' +
        '<td>' + esc(r.directeur_nom || '—') + '</td>' +
        '<td><b>' + esc(r.username) + '</b></td>' +
        '<td><b>' + esc(r.password || '—') + '</b></td>';
      tb.appendChild(tr);
    }
  }

  async function generateLogins() {
    if (!confirm('Générer un identifiant + mot de passe pour toutes les écoles qui n\'en ont pas ?')) return;
    setSyncBadge('syncing');
    const res = await FB.generateAllLogins();
    updateOnlineStatus();
    await renderLogins();
    // Affiche les mots de passe générés (à distribuer)
    if (res.created.length) {
      let msg = res.created.length + ' login(s) créé(s) :\n';
      for (const c of res.created) msg += '\n' + c.nom + ' → ' + c.username + ' / ' + c.password;
      alert(msg);
    }
    toast(res.created.length + ' logins créés' + (res.skipped ? ' (' + res.skipped + ' existaient déjà)' : ''), 'ok');
  }

  function exportLogins() {
    const rows = [];
    const table = $('logins-table');
    for (const tr of table.querySelectorAll('tr')) {
      rows.push([...tr.querySelectorAll('th,td')].slice(0, 7).map(c => c.textContent.trim()));
    }
    downloadCSV(rows, 'logins-directeurs.csv');
  }
  function downloadCSV(rows, filename) {
    const escC = v => '"' + String(v || '').replace(/"/g, '""') + '"';
    const csv = '\uFEFF' + rows.map(r => r.map(escC).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = filename;
    a.click();
  }

  // ---------- Écoles (CRUD) ----------
  function openEcoleModal(id) {
    const e = id ? ecoles.find(x => x.id === id) : null;
    $('modal-title').textContent = e ? 'Modifier l\'école' : 'Ajouter une école';
    $('ecole-id').value = e ? e.id : '';
    $('ecole-code').value = e ? (e.code || '') : '';
    $('ecole-nom').value = e ? e.nom : '';
    $('ecole-type').value = e ? (e.type || 'primaire') : 'primaire';
    $('ecole-directeur').value = e ? (e.directeurNom || '') : '';
    $('ecole-tel').value = e ? (e.directeurTelephone || '') : '';
    $('ecole-email').value = e ? (e.directeurEmail || '') : '';
    const selS = $('ecole-secteur');
    selS.innerHTML = '<option value="">— Aucun —</option>';
    for (const s of secteurs) {
      const o = document.createElement('option');
      o.value = s.id; o.textContent = s.nom;
      selS.appendChild(o);
    }
    selS.value = e ? (e.secteurId || '') : '';
    $('modal').classList.remove('hidden');
  }

  async function saveEcole(e) {
    e.preventDefault();
    const id = $('ecole-id').value;
    const body = {
      code: $('ecole-code').value.trim(), nom: $('ecole-nom').value.trim(),
      type: $('ecole-type').value,
      secteur_id: $('ecole-secteur').value || null,
      directeur_nom: $('ecole-directeur').value.trim(),
      directeur_telephone: $('ecole-tel').value.trim(),
      directeur_email: $('ecole-email').value.trim()
    };
    try {
      if (id) await FB.updateEcole(id, body);
      else await FB.addEcole(body);
      $('modal').classList.add('hidden');
      await loadEcoles(); await loadSecteurs();
      toast('École enregistrée', 'ok');
    } catch (err) { toast(err.message || err, 'err'); }
  }

  async function importEcoles() {
    const raw = $('import-json').value.trim();
    let parsed;
    if (raw.startsWith('[')) {
      try { parsed = JSON.parse(raw); } catch (e) { toast('JSON invalide', 'err'); return; }
      if (!Array.isArray(parsed)) { toast('Le JSON doit être un tableau', 'err'); return; }
    } else {
      parsed = parseCSV(raw).map(r => ({ code: r.code, nom: r.nom, secteur: r.secteur, type: r.type, directeur_nom: r.directeur_nom, directeur_telephone: r.directeur_telephone, directeur_email: r.directeur_email }));
      if (!parsed.length) { toast('Aucune ligne détectée', 'err'); return; }
    }
    const secteurByName = {};
    for (const s of secteurs) secteurByName[s.nom.toLowerCase()] = s.id;
    let ok = 0, errs = [];
    for (const e of parsed) {
      try {
        await FB.addEcole({
          code: e.code || null, nom: e.nom,
          secteur_id: e.secteur_id || (e.secteur ? secteurByName[String(e.secteur).toLowerCase()] : null),
          type: normalizeTypeLabel(e.type || (e.has_prescolaire ? '1' : '0')),
          directeur_nom: e.directeur_nom || null, directeur_telephone: e.directeur_telephone || null, directeur_email: e.directeur_email || null
        });
        ok++;
      } catch (err) { errs.push((e.nom || e.code) + ' : ' + (err.message || err)); }
    }
    $('import-status').textContent = '✅ ' + ok + ' école(s) importée(s).' + (errs.length ? ' Erreurs : ' + errs.join(' | ') : '');
    await loadEcoles(); await loadSecteurs();
  }
  function parseCSV(text) {
    const sep = (text.split('\n')[0] || '').includes(';') ? ';' : ',';
    const lines = [];
    let row = [], field = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; }
      else if (c === '"') inQ = true;
      else if (c === sep) { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); lines.push(row); row = []; field = ''; }
      else if (c !== '\r') field += c;
    }
    if (field !== '' || row.length) { row.push(field); lines.push(row); }
    if (!lines.length) return [];
    const header = lines[0].map(h => h.trim().toLowerCase());
    return lines.slice(1).filter(r => r.some(c => c.trim() !== '')).map(r => {
      const o = {}; header.forEach((h, i) => o[h] = (r[i] || '').trim()); return o;
    });
  }
  function normalizeTypeLabel(v) {
    const s = String(v || '').toLowerCase().trim();
    if (!s) return 'primaire';
    if (/prescolaire|préscolaire|pre-scolaire|maternelle|ps/.test(s) && !/primaire/.test(s)) return 'prescolaire';
    if (/mixte|primaire.*(grande section|gs)|grande section|primaire et|primaire \+/.test(s) || (s.includes('primaire') && s.includes('prescolaire'))) return 'primaire_prescolaire';
    if (s === '1' || s === 'oui' || s === 'true') return 'primaire_prescolaire';
    return 'primaire';
  }

  // ---------- Initialisation (IEPP Grabo) ----------
  async function seedData() {
    if (!confirm('Initialiser les 5 secteurs et 30 écoles (IEPP Grabo) ?\nÀ ne faire qu\'une seule fois.')) return;
    $('seed-status').textContent = 'Création en cours…';
    try {
      let nbS = 0, nbE = 0;
      // Secteurs existants → on évite les doublons
      const existing = await FB.getSecteurs();
      if (existing.length) {
        $('seed-status').textContent = '⚠️ Des secteurs existent déjà (' + existing.length + '). Supprimez-les d\'abord ou utilisez l\'ajout manuel.';
        return;
      }
      for (const s of SEED_DATA) {
        const ref = await FB.addSecteur(s.nom, null);
        const secteurId = ref.id;
        nbS++;
        for (const [nom, type] of s.ecoles) {
          await FB.addEcole({ code: null, nom, secteur_id: secteurId, type, directeur_nom: null, directeur_telephone: null, directeur_email: null });
          nbE++;
        }
      }
      $('seed-status').textContent = '✅ ' + nbS + ' secteurs et ' + nbE + ' écoles créés.';
      await loadSecteurs(); await loadEcoles();
      toast('Initialisation terminée', 'ok');
    } catch (e) {
      $('seed-status').textContent = '❌ Erreur : ' + (e.message || e);
    }
  }

  // ---------- Export Excel ----------
  async function exportExcel() {
    const week = $('cons-week').value;
    const secteur = $('cons-secteur').value;
    let weekFrom, weekTo;
    if (week) { const w = config.weeks.find(x => x.no === Number(week)); weekFrom = w.from; weekTo = w.to; }
    const reports = await FB.getAllReports(weekFrom, weekTo);
    let cons = computeConsolidation(reports, week || null);
    if (secteur) {
      const ids = new Set(cons.rows.filter(r => r.secteurId === secteur).map(r => r.id));
      cons = computeConsolidation(reports.filter(r => ids.has(r.schoolId)), week || null);
    }
    // Ne garder que les écoles qui ont remonté au moins un jour (nb_jours > 0)
    const rowsAvecDonnees = cons.rows.filter(r => r.nb_jours > 0);
    if (!rowsAvecDonnees.length) {
      toast('Aucune école n\'a remonté de données pour cette période', 'err');
      return;
    }
    // Construire une consolidation filtrée pour l'export
    const consExport = { ...cons, rows: rowsAvecDonnees, ecoles_ayant_rapporte: rowsAvecDonnees.length };
    ExcelExport.download(consExport, { week_no: week || null, secteur_id: secteur || null });
  }

  // ============================================================
  //  ÉVÉNEMENTS
  // ============================================================
  function bindEvents() {
    $('login-form').addEventListener('submit', handleLogin);
    $('logout-btn').addEventListener('click', logout);

    // Directeur
    $('date-select').addEventListener('change', loadDayForm);
    $('report-form').addEventListener('input', (e) => { if (e.target.classList.contains('num')) computePct(); });
    $('save-draft-btn').addEventListener('click', saveDraft);
    $('submit-btn').addEventListener('click', submitReport);

    // Onglets
    document.querySelectorAll('#admin-tabs .tab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('#admin-tabs .tab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        $('tab-' + t.dataset.tab).classList.add('active');
      });
    });

    $('refresh-dash').addEventListener('click', () => renderDashboard());
    $('cons-week').addEventListener('change', () => renderDashboard());
    $('cons-secteur').addEventListener('change', () => renderDashboard());
    $('export-excel-btn').addEventListener('click', exportExcel);
    $('export-btn').addEventListener('click', () => exportCSV());
    $('backup-btn').addEventListener('click', () => backupData());

    // Inspecteur
    $('insp-logout-btn').addEventListener('click', logout);
    $('insp-refresh-dash').addEventListener('click', () => renderInspecteurDashboard());
    $('insp-cons-week').addEventListener('change', () => renderInspecteurDashboard());
    $('insp-cons-secteur').addEventListener('change', () => renderInspecteurDashboard());

    $('ecole-search').addEventListener('input', renderEcoles);
    $('add-ecole-btn').addEventListener('click', () => openEcoleModal(null));
    $('ecoles-table').addEventListener('click', async (e) => {
      const edit = e.target.dataset.edit, del = e.target.dataset.del;
      if (edit) openEcoleModal(edit);
      if (del) {
        if (confirm('Supprimer cette école ?')) {
          await FB.deleteEcole(del);
          await loadEcoles(); await loadSecteurs();
          toast('École supprimée');
        }
      }
    });
    $('ecole-form').addEventListener('submit', saveEcole);
    $('modal-cancel').addEventListener('click', () => $('modal').classList.add('hidden'));

    $('secteur-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await FB.addSecteur($('secteur-nom').value.trim(), $('secteur-code').value.trim());
      $('secteur-nom').value = ''; $('secteur-code').value = '';
      await loadSecteurs(); toast('Secteur ajouté', 'ok');
    });
    $('secteur-list').addEventListener('click', async (e) => {
      if (e.target.classList.contains('del')) {
        if (confirm('Supprimer ce secteur ?')) {
          await FB.deleteSecteur(e.target.dataset.id);
          await loadSecteurs(); await loadEcoles();
        }
      }
    });

    $('gen-all-logins').addEventListener('click', generateLogins);
    $('export-logins-btn').addEventListener('click', exportLogins);

    $('import-btn').addEventListener('click', importEcoles);
    $('seed-btn').addEventListener('click', seedData);

    window.addEventListener('online', () => { updateOnlineStatus(); });
    window.addEventListener('offline', () => updateOnlineStatus());
  }

  async function exportCSV() {
    const week = $('cons-week').value;
    const secteur = $('cons-secteur').value;
    let weekFrom, weekTo;
    if (week) { const w = config.weeks.find(x => x.no === Number(week)); weekFrom = w.from; weekTo = w.to; }
    const reports = await FB.getAllReports(weekFrom, weekTo);
    const ecoleById = {}; for (const e of ecoles) ecoleById[e.id] = e;
    const rows = [['Code', 'École', 'Secteur', 'Type', 'Date', 'Pre-Inscrits', 'Pre-Filles', 'Pre-Non-Inscrits', 'Prim-Inscrits', 'Prim-Filles', 'Prim-Non-Inscrits', 'Observations']];
    for (const r of reports) {
      const e = ecoleById[r.schoolId] || {};
      if (secteur && e.secteurId !== secteur) continue;
      rows.push([e.code || '', e.nom || '', e.secteur_nom || '', TYPE_LABELS[e.type] || '', r.date,
        r.pre_inscrits_total, r.pre_inscrits_filles, r.pre_non_inscrits_total,
        r.prim_inscrits_total, r.prim_inscrits_filles, r.prim_non_inscrits_total, r.observations || '']);
    }
    downloadCSV(rows, 'pointinscript-' + config.year + '.csv');
  }

  async function backupData() {
    try {
      const reports = await FB.getAllReports();
      const data = {
        exportedAt: new Date().toISOString(),
        year: config.year,
        ecoles: ecoles.map(e => ({
          id: e.id,
          code: e.code,
          nom: e.nom,
          type: e.type,
          secteurId: e.secteurId,
          secteur_nom: e.secteur_nom,
          directeur_nom: e.directeur_nom,
          directeur_telephone: e.directeur_telephone,
          directeur_email: e.directeur_email
        })),
        rapports: reports.map(r => ({
          schoolId: r.schoolId,
          date: r.date,
          pre_enfants: r.pre_enfants,
          pre_inscrits_total: r.pre_inscrits_total,
          pre_inscrits_filles: r.pre_inscrits_filles,
          pre_handicap_avec: r.pre_handicap_avec,
          pre_handicap_sans: r.pre_handicap_sans,
          pre_non_inscrits_total: r.pre_non_inscrits_total,
          pre_non_inscrits_filles: r.pre_non_inscrits_filles,
          pre_motifs: r.pre_motifs,
          prim_eleves: r.prim_eleves,
          prim_inscrits_total: r.prim_inscrits_total,
          prim_inscrits_filles: r.prim_inscrits_filles,
          prim_handicap_avec: r.prim_handicap_avec,
          prim_handicap_sans: r.prim_handicap_sans,
          prim_non_inscrits_total: r.prim_non_inscrits_total,
          prim_non_inscrits_filles: r.prim_non_inscrits_filles,
          prim_motifs: r.prim_motifs,
          observations: r.observations,
          difficultes: r.difficultes,
          dispositions: r.dispositions
        }))
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pointinscript-backup-' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      toast('Sauvegarde complète téléchargée ✓', 'ok');
    } catch (e) {
      toast('Erreur sauvegarde : ' + e.message, 'err');
    }
  }

  // ============================================================
  //  DÉMARRAGE
  // ============================================================
  function boot() {
    bindEvents();
    updateOnlineStatus();
    if ('serviceWorker' in navigator) {
      try { navigator.serviceWorker.register('./sw.js'); } catch (e) { /* ignore */ }
    }

    // Restauration de session via Firebase Auth (persistée automatiquement)
    FB.auth.onAuthStateChanged(async (user) => {
      if (user) {
        await enterAppFor(user);
      } else {
        showLogin();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
