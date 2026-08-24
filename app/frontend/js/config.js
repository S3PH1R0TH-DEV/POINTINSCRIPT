// ============================================================
//  CONFIGURATION POINTINSCRIPT — Firebase
//  ✅ Configurée avec le projet "pointinscript"
// ============================================================
window.APP_CONFIG = {

  // ---- Configuration Firebase ----
  firebase: {
    apiKey: "AIzaSyDy_hXAG0SxOXtoBF6XDIiEpEm6bocLYR4",
    authDomain: "pointinscript.firebaseapp.com",
    projectId: "pointinscript",
    storageBucket: "pointinscript.firebasestorage.app",
    messagingSenderId: "601695622697",
    appId: "1:601695622697:web:50d173bb1b680a6be1ee38"
  },

  // ---- Domaine des comptes directeurs ----
  // Chaque directeur a un identifiant ("deobako") + mot de passe.
  // Techniquement, on en fait un email "deobako@<usernameDomain>".
  usernameDomain: "pointinscript.app",

  // ---- Compte administrateur ----
  // L'email du compte admin (à créer dans Firebase → Authentication).
  // DOIT correspondre exactement à ce qui est écrit dans firestore.rules.
  adminEmail: "admin@pointinscript.app",

  // Année scolaire (affichage)
  year: "2026-2027",

  // Période d'inscription (opération du 10 août au 11 septembre 2026)
  startDate: "2026-08-10",
  endDate: "2026-09-11"
};
