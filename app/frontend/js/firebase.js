// ============================================================
//  Couche d'accès Firebase (Auth + Firestore)
//  POINTINSCRIPT — remplace l'ancien backend REST
// ============================================================
const FB = (() => {
  const CFG = window.APP_CONFIG;
  const DOMAIN = CFG.usernameDomain;
  const ADMIN_EMAIL = CFG.adminEmail;
  const YEAR = CFG.year;

  firebase.initializeApp(CFG.firebase);
  const auth = firebase.auth();
  const db = firebase.firestore();

  // Persistance hors-ligne (les écritures sont mises en file d'attente automatiquement)
  let persistenceReady = false;
  db.enablePersistence({ synchronizeTabs: true }).then(() => { persistenceReady = true; })
    .catch(err => console.warn('Persistance Firestore indisponible :', err.code));

  // ---- Helpers ----
  const secteursCol = () => db.collection('secteurs');
  const ecolesCol = () => db.collection('ecoles');
  const reportsCol = () => db.collection('reports');
  const userSchoolsCol = () => db.collection('userSchools');

  function emailForUsername(username) { return (username + '@' + DOMAIN).toLowerCase(); }

  // ---- Authentification ----
  function currentUser() { return auth.currentUser; }

  function isAdminUser(user) {
    return !!user && (user.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
  }

  // Se connecte (admin OU directeur selon l'identifiant fourni)
  async function login(username, password) {
    const u = (username || '').trim().toLowerCase();
    let email;
    if (u === ADMIN_EMAIL.toLowerCase() || u === 'admin') email = ADMIN_EMAIL;      // admin (email complet ou "admin")
    else if (u.includes('@')) email = u;                                              // email direct
    else email = emailForUsername(username);                                          // identifiant directeur
    const cred = await auth.signInWithEmailAndPassword(email, password);
    return cred.user;
  }

  async function logout() { await auth.signOut(); }

  // Crée un compte directeur SANS déconnecter l'admin (appel REST signUp)
  // Retourne l'uid Firebase du nouveau compte.
  async function createDirectorAccount(username, password) {
    const email = emailForUsername(username);
    const key = CFG.firebase.apiKey;
    const res = await fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + key,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: false }) }
    );
    const data = await res.json();
    if (data.error) {
      // EMAIL_EXISTS → le compte existe déjà : on récupère son uid via accounts:lookup
      // (sans mot de passe, sans changer la session admin)
      if (data.error.message === 'EMAIL_EXISTS') {
        const lk = await fetch(
          'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + key,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }
        );
        const ld = await lk.json();
        if (ld.users && ld.users[0]) return ld.users[0].localId;
        throw new Error('Compte existant mais introuvable');
      }
      throw new Error(data.error.message);
    }
    return data.localId;
  }

  // ---- Écoles / Secteurs ----
  async function getSecteurs() {
    const snap = await secteursCol().orderBy('nom').get();
    const out = [];
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    // compte les écoles par secteur
    const e = await ecolesCol().get();
    const count = {};
    e.forEach(d => { const s = d.data().secteurId; count[s] = (count[s] || 0) + 1; });
    out.forEach(s => s.nb_ecoles = count[s.id] || 0);
    return out;
  }
  async function addSecteur(nom, code) {
    return secteursCol().add({ nom, code: code || null });
  }
  async function updateSecteur(id, nom, code) {
    return secteursCol().doc(id).set({ nom, code: code || null }, { merge: true });
  }
  async function deleteSecteur(id) {
    return secteursCol().doc(id).delete();
  }

  async function getEcoles() {
    const snap = await ecolesCol().get();
    const secteurs = {};
    (await secteursCol().get()).forEach(d => secteurs[d.id] = d.data().nom);
    const out = [];
    snap.forEach(d => {
      const data = d.data();
      out.push({ id: d.id, ...data, secteur_nom: secteurs[data.secteurId] || null });
    });
    out.sort((a, b) => (a.secteur_nom || '').localeCompare(b.secteur_nom || '') || a.nom.localeCompare(b.nom));
    return out;
  }
  async function addEcole(e) {
    return ecolesCol().add({
      code: e.code || null, nom: e.nom, secteurId: e.secteur_id || null,
      type: e.type || 'primaire',
      directeurNom: e.directeur_nom || null,
      directeurTelephone: e.directeur_telephone || null,
      directeurEmail: e.directeur_email || null,
      uid: null, username: null
    });
  }
  async function updateEcole(id, e) {
    return ecolesCol().doc(id).set({
      code: e.code || null, nom: e.nom, secteurId: e.secteur_id || null,
      type: e.type || 'primaire',
      directeurNom: e.directeur_nom || null,
      directeurTelephone: e.directeur_telephone || null,
      directeurEmail: e.directeur_email || null
    }, { merge: true });
  }
  async function deleteEcole(id) {
    return ecolesCol().doc(id).delete();
  }

  // ---- Logins (génération) ----
  // Crée le compte + lie l'école à l'uid. Retourne {username, password}.
  async function generateLogin(ecoleId) {
    const doc = await ecolesCol().doc(ecoleId).get();
    const e = { id: ecoleId, ...doc.data() };
    if (e.username) return null; // déjà un login
    const username = makeUsername(e.nom, e.code);
    const password = randomPassword(8);
    const uid = await createDirectorAccount(username, password);
    await ecolesCol().doc(ecoleId).set({ username, uid, password }, { merge: true });
    await userSchoolsCol().doc(uid).set({ schoolId: ecoleId, username });
    return { username, password, nom: e.nom, type: e.type };
  }
  async function generateAllLogins() {
    const all = await ecolesCol().get();
    const created = [], skipped = [];
    for (const d of all.docs) {
      const e = d.data();
      if (e.username) { skipped.push(d.id); continue; }
      const r = await generateLogin(d.id);
      if (r) created.push(r);
    }
    return { created, skipped: skipped.length, total: all.size };
  }
  async function getLogins() {
    const [ecoles, secteursSnap] = await Promise.all([ecolesCol().get(), secteursCol().get()]);
    const secteurs = {};
    secteursSnap.forEach(d => secteurs[d.id] = d.data().nom);
    const out = [];
    ecoles.forEach(d => {
      const e = d.data();
      if (!e.username) return;
      out.push({ id: d.id, code: e.code, nom: e.nom, username: e.username, password: e.password,
        type: e.type, secteur_nom: secteurs[e.secteurId] || null, directeur_nom: e.directeurNom });
    });
    return out;
  }

  function makeUsername(nom, code) {
    let base = String(code || nom || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    if (!base || base === 'admin') base = 'ecole' + Math.floor(Math.random() * 1000);
    return base;
  }
  function randomPassword(len) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  // ---- École du directeur connecté ----
  async function getMySchool(uid) {
    const snap = await userSchoolsCol().doc(uid).get();
    if (!snap.exists) return null;
    const schoolId = snap.data().schoolId;
    const doc = await ecolesCol().doc(schoolId).get();
    if (!doc.exists) return null;
    return publicSchool(doc.id, doc.data());
  }
  function publicSchool(id, s) {
    return {
      id, code: s.code, nom: s.nom, secteur_id: s.secteurId, type: s.type,
      has_prescolaire: s.type === 'prescolaire' || s.type === 'primaire_prescolaire',
      has_primaire: s.type === 'primaire' || s.type === 'primaire_prescolaire',
      directeur_nom: s.directeurNom, directeur_telephone: s.directeurTelephone,
      directeur_email: s.directeurEmail, username: s.username
    };
  }

  // ---- Rapports quotidiens ----
  function reportId(schoolId, date) { return schoolId + '_' + date; }

  async function getMyReports(schoolId) {
    const snap = await reportsCol().where('schoolId', '==', schoolId).get();
    const out = [];
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }
  async function getReport(schoolId, date) {
    const doc = await reportsCol().doc(reportId(schoolId, date)).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }
  async function saveReport(schoolId, report) {
    const id = reportId(schoolId, report.date);
    return reportsCol().doc(id).set({
      schoolId, ...report,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  // ---- Lecture admin (consolidation) ----
  async function getAllReports(weekFrom, weekTo) {
    let q = reportsCol().where('year', '==', YEAR);
    const snap = await q.get();
    const out = [];
    snap.forEach(d => {
      const r = d.data();
      if (weekFrom && weekTo && (r.date < weekFrom || r.date > weekTo)) return;
      out.push(r);
    });
    return out;
  }
  // Activité (nouveaux points reçus) : compte les rapports plus récents que `sinceMs`
  async function getActivity(sinceMs) {
    const q = reportsCol().where('createdAt', '>', firebase.firestore.Timestamp.fromMillis(sinceMs || 0));
    const snap = await q.get();
    let max = 0;
    snap.forEach(d => {
      const t = d.data().createdAt;
      if (t && t.toMillis) { const m = t.toMillis(); if (m > max) max = m; }
    });
    return { nouveaux: snap.size, latestMs: max };
  }

  return {
    auth, db, YEAR, ADMIN_EMAIL, DOMAIN,
    currentUser, isAdminUser, login, logout,
    createDirectorAccount,
    getSecteurs, addSecteur, updateSecteur, deleteSecteur,
    getEcoles, addEcole, updateEcole, deleteEcole,
    generateLogin, generateAllLogins, getLogins,
    getMySchool, publicSchool,
    getMyReports, getReport, saveReport,
    getAllReports, getActivity,
    randomPassword, makeUsername
  };
})();
