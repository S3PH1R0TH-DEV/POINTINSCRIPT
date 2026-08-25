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

  // ---- Rôles & Comptes ----
  // Directeurs : identifiant + mot de passe → email "identifiant@pointinscript.app"
  usernameDomain: "pointinscript.app",

  // Admin : email Firebase Auth (custom claim 'admin: true')
  adminEmail: "admin@pointinscript.app",

  // Inspecteur IEPP : lecture seule dashboard (custom claim 'inspecteur: true')
  inspecteurEmail: "ieppgrabo@pointinscript.app",
  inspecteurPassword: "000204",  // temporaire pour création, à changer après 1ère connexion

  // Année scolaire (affichage)
  year: "2026-2027",

  // Période d'inscription (opération du 10 août au 11 septembre 2026)
  startDate: "2026-08-10",
  endDate: "2026-09-11"
};
