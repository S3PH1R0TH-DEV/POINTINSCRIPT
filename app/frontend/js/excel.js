// ============================================================
//  Export Excel (.xlsx) conforme au canevas DELC — côté client
//  Utilise SheetJS (XLSX) embarqué. Structure identique à l'ancien serveur.
// ============================================================
const ExcelExport = (() => {

  function v(n) { return (n === null || n === undefined || n === '') ? null : n; }
  function num(x) { return (x === null || x === undefined || x === '') ? null : Number(x); }
  function pctOf(part, total) {
    if (!total) return null;
    return Math.round((part / total) * 1000) / 10;
  }

  // Construit une feuille "POINT INSCRIPTIONS" à partir de la consolidation
  function build(cons, opts = {}) {
    const aoa = [];       // array of arrays (cellules)
    const merges = [];    // {s:{r,c}, e:{r,c}}

    // --- En-tête ministère ---
    aoa.push(['MINISTÈRE DE L\'ÉDUCATION NATIONALE, DE L\'ALPHABÉTISATION ET DE L\'ENSEIGNEMENT TECHNIQUE']);
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } });
    aoa.push(['DIRECTION DES ÉCOLES, LYCÉES ET COLLÈGES']);
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 9 } });

    let titleRow = 'POINT DES INSCRIPTIONS ' + cons.year;
    let context = '';
    if (opts.week_no) context += 'Semaine ' + opts.week_no;
    if (opts.secteur_id) {
      const sec = (cons.rows[0] && cons.rows[0].secteur_nom) || '';
      if (sec) context += (context ? ' — ' : '') + 'Secteur : ' + sec;
    }
    if (context) context += '  |  Écoles ayant remonté : ' + cons.ecoles_ayant_rapporte + '/' + cons.total_ecoles;

    const head = [titleRow, '', '', '', '', '', '', '', '', ''];
    head[9] = 'RÉPUBLIQUE DE CÔTE D\'IVOIRE — Union · Discipline · Travail';
    aoa.push(head);
    if (context) { aoa.push([context]); merges.push({ s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 9 } }); }
    aoa.push([]); // ligne vide

    // --- Tableau PRESCOLAIRE ---
    renderTable(aoa, merges, 'POINT DES INSCRIPTIONS AU PRESCOLAIRE ' + cons.year,
      cons.rows.filter(x => x.has_prescolaire), 'pre', 'enfants');

    aoa.push([]);

    // --- Tableau PRIMAIRE ---
    renderTable(aoa, merges, 'POINT DES INSCRIPTIONS AU PRIMAIRE ' + cons.year,
      cons.rows.filter(x => x.has_primaire), 'prim', 'eleves');

    aoa.push([]);

    // --- OBSERVATIONS ---
    aoa.push(['OBSERVATIONS']);
    merges.push({ s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 9 } });
    const notes = [];
    for (const row of cons.rows) {
      if (row.observations) notes.push((row.code || row.nom) + ' : ' + row.observations);
      if (row.difficultes) notes.push((row.code || row.nom) + ' — Difficultés : ' + row.difficultes);
      if (row.dispositions) notes.push((row.code || row.nom) + ' — Dispositions : ' + row.dispositions);
    }
    if (!notes.length) notes.push('Néant');
    for (const n of notes) { aoa.push(['• ' + n]); merges.push({ s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 9 } }); }

    aoa.push([]);
    aoa.push(['Document généré par POINTINSCRIPT le ' + new Date().toLocaleString('fr-FR') + ' — Année scolaire ' + cons.year]);
    merges.push({ s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 0 } });

    // --- Feuille ---
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 34 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 13 }, { wch: 13 }, { wch: 11 }, { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'POINT INSCRIPTIONS');
    return wb;
  }

  // Rend un tableau du canevas avec le détail par école
  function renderTable(aoa, merges, title, rows, field, cntLabel) {
    // Titre
    const t = aoa.length;
    aoa.push([title]);
    merges.push({ s: { r: t, c: 0 }, e: { r: t, c: 9 } });

    // En-tête niveau 1 (avec fusions)
    const h1 = aoa.length;
    aoa.push(['', 'Nombre ' + (cntLabel === 'enfants' ? 'd\'enfants' : 'd\'élèves'),
      'Nombre d\'inscrits', '', 'Élèves en Situation de Handicap', '',
      'Nombre de non-inscrits', '', '% Non-inscrits', 'Motifs de non-inscription']);
    merges.push({ s: { r: h1, c: 2 }, e: { r: h1, c: 3 } });
    merges.push({ s: { r: h1, c: 4 }, e: { r: h1, c: 5 } });
    merges.push({ s: { r: h1, c: 6 }, e: { r: h1, c: 7 } });

    // En-tête niveau 2
    aoa.push(['', '', 'Total', 'Dont filles', 'Avec', 'Sans', 'Total', 'Dont filles', '', '']);

    // Détail par école
    for (const row of rows) {
      const cntKey = field + '_' + cntLabel;
      const motifs = row[field + '_motifs'] || '';
      aoa.push([
        row.nom,
        num(row[cntKey]) || 0,
        num(row[field + '_inscrits_total']) || 0,
        num(row[field + '_inscrits_filles']) || 0,
        num(row[field + '_handicap_avec']) || 0,
        num(row[field + '_handicap_sans']) || 0,
        num(row[field + '_non_inscrits_total']) || 0,
        num(row[field + '_non_inscrits_filles']) || 0,
        pctOf(num(row[field + '_non_inscrits_total']) || 0, num(row[cntKey]) || 0) === null ? '' : (pctOf(num(row[field + '_non_inscrits_total']) || 0, num(row[cntKey]) || 0) + ' %'),
        motifs
      ]);
    }

    // TOTAL (cumul de toutes les écoles)
    const add = (key) => rows.reduce((a, row) => a + (num(row[field + '_' + key]) || 0), 0);
    const cntKey = field + '_' + cntLabel;
    const motifs = [...new Set(rows.map(r => r[field + '_motifs']).filter(Boolean))].join(' ; ');
    aoa.push([
      'TOTAL', add(cntKey), add('inscrits_total'), add('inscrits_filles'),
      add('handicap_avec'), add('handicap_sans'), add('non_inscrits_total'), add('non_inscrits_filles'),
      pctOf(add('non_inscrits_total'), add(cntKey)) === null ? '' : (pctOf(add('non_inscrits_total'), add(cntKey)) + ' %'),
      motifs
    ]);
  }

  // Télécharge le fichier
  function download(cons, opts) {
    const wb = build(cons, opts);
    const weekPart = opts.week_no ? '-S' + opts.week_no : '';
    const secteurPart = opts.secteur_id ? '-Secteur' + opts.secteur_id : '';
    const ecolesPart = cons.rows.length + 'ecoles';
    XLSX.writeFile(wb, 'POINTINSCRIPT-' + cons.year + weekPart + secteurPart + '-' + ecolesPart + '.xlsx');
  }

  return { build, download };
})();
