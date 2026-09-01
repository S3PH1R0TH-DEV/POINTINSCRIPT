// ============================================================
//  Export Excel (.xlsx) conforme au canevas DELC — côté client
//  Reproduction exacte du document DELC 2026-2027 avec champs
//  Avec extrait / Sans extrait + Dont filles
// ============================================================
const ExcelExport = (() => {

  function num(x) { return (x === null || x === undefined || x === '') ? null : Number(x); }
  function pctOf(part, total) {
    if (!total) return null;
    return Math.round((part / total) * 1000) / 10;
  }

  // Construit une feuille "POINT INSCRIPTIONS" à partir de la consolidation
  function build(cons, opts = {}) {
    const aoa = [];
    const merges = [];

    // --- En-tête ministère ---
    aoa.push(['MINISTÈRE DE L\'ÉDUCATION NATIONALE, DE L\'ALPHABÉTISATION ET DE L\'ENSEIGNEMENT TECHNIQUE']);
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } });
    aoa.push(['DIRECTION DES ÉCOLES, LYCÉES ET COLLÈGES']);
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 11 } });
    // logo et contacts laissés en texte libre (non bloquant)
    aoa.push(['04 BP 717 Abidjan 04  |  Tél: 27 20 22 88 47  Fax: 27 20 22 96 37  |  E-mail: delcmencourrier@gmail.com']);
    merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 11 } });

    let titleRow = 'POINT DES INSCRIPTIONS ' + cons.year;
    let context = '';
    if (opts.week_no) context += 'Semaine ' + opts.week_no;
    if (opts.secteur_id) {
      const sec = (cons.rows[0] && cons.rows[0].secteur_nom) || '';
      if (sec) context += (context ? ' — ' : '') + 'Secteur : ' + sec;
    }
    if (context) context += '  |  Écoles ayant remonté : ' + cons.ecoles_ayant_rapporte + '/' + cons.total_ecoles;

    const head = [titleRow, '', '', '', '', '', '', '', '', '', '', ''];
    head[11] = 'RÉPUBLIQUE DE CÔTE D\'IVOIRE — Union · Discipline · Travail';
    aoa.push(head);
    if (context) { aoa.push([context]); merges.push({ s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 11 } }); }
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
    merges.push({ s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 11 } });
    const notes = [];
    for (const row of cons.rows) {
      if (row.observations) notes.push((row.code || row.nom) + ' : ' + row.observations);
      if (row.difficultes) notes.push((row.code || row.nom) + ' — Difficultés : ' + row.difficultes);
      if (row.dispositions) notes.push((row.code || row.nom) + ' — Dispositions : ' + row.dispositions);
    }
    if (!notes.length) notes.push('Néant');
    for (const n of notes) { aoa.push(['• ' + n]); merges.push({ s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 11 } }); }

    aoa.push([]);
    aoa.push(['Document généré par POINTINSCRIPT le ' + new Date().toLocaleString('fr-FR') + ' — Année scolaire ' + cons.year]);
    merges.push({ s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 11 } });

    // --- Feuille ---
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 28 }, // École
      { wch: 12 }, // Nombre d'enfants/élèves
      { wch: 11 }, // Total inscrits
      { wch: 12 }, // Avec extrait
      { wch: 11 }, // Dont filles (avec)
      { wch: 12 }, // Sans extrait
      { wch: 11 }, // Dont filles (sans)
      { wch: 11 }, // Handicap Total
      { wch: 11 }, // Handicap Dont filles
      { wch: 13 }, // Nombre de non-inscrits
      { wch: 11 }, // % Non-inscrits
      { wch: 36 }  // Motifs
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'POINT INSCRIPTIONS');
    return wb;
  }

  // Rend un tableau du canevas avec le détail par école — reproduction exacte 12 colonnes
  function renderTable(aoa, merges, title, rows, field, cntLabel) {
    // Titre bande noire
    const t = aoa.length;
    aoa.push([title]);
    merges.push({ s: { r: t, c: 0 }, e: { r: t, c: 11 } });

    // En-tête niveau 1 (avec fusions)
    const h1 = aoa.length;
    aoa.push([
      '', // École
      'Nombre ' + (cntLabel === 'enfants' ? 'd\'enfants' : 'd\'élèves'),
      'Nombre d\'inscrits', '', '', '', '',
      'Élèves en Situation de Handicap', '',
      'Nombre de non-inscrits', '% Non-inscrits', 'Motifs de non-inscription'
    ]);
    merges.push({ s: { r: h1, c: 2 }, e: { r: h1, c: 6 } }); // Nombre d'inscrits sur 5 colonnes
    merges.push({ s: { r: h1, c: 7 }, e: { r: h1, c: 8 } }); // Handicap sur 2 colonnes

    // En-tête niveau 2
    aoa.push(['', '', 'Total', 'Avec extrait', 'Dont filles', 'Sans extrait', 'Dont filles', 'Total', 'Dont filles', '', '', '']);

    // Détail par école
    for (const row of rows) {
      const cntKey = field + '_' + cntLabel;
      const motifs = row[field + '_motifs'] || '';
      aoa.push([
        row.nom,
        num(row[cntKey]) || 0,
        num(row[field + '_inscrits_total']) || 0,
        num(row[field + '_avec_extrait']) || 0,
        num(row[field + '_avec_extrait_filles']) || 0,
        num(row[field + '_sans_extrait']) || 0,
        num(row[field + '_sans_extrait_filles']) || 0,
        num(row[field + '_handicap_avec']) || 0,
        num(row[field + '_handicap_sans']) || 0,
        num(row[field + '_non_inscrits_total']) || 0,
        pctOf(num(row[field + '_non_inscrits_total']) || 0, num(row[cntKey]) || 0) === null ? '' : (pctOf(num(row[field + '_non_inscrits_total']) || 0, num(row[cntKey]) || 0) + ' %'),
        motifs
      ]);
    }

    // TOTAL (cumul de toutes les écoles)
    const add = (key) => rows.reduce((a, row) => a + (num(row[field + '_' + key]) || 0), 0);
    const cntKey = field + '_' + cntLabel;
    const motifs = [...new Set(rows.map(r => r[field + '_motifs']).filter(Boolean))].join(' ; ');
    aoa.push([
      'TOTAL',
      add(cntKey),
      add('inscrits_total'),
      add('avec_extrait'),
      add('avec_extrait_filles'),
      add('sans_extrait'),
      add('sans_extrait_filles'),
      add('handicap_avec'),
      add('handicap_sans'),
      add('non_inscrits_total'),
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
