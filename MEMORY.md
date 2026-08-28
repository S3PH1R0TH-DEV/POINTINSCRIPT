# POINTINSCRIPT — MEMORY (28/08/2026)

## 📍 État actuel
- **Web** : https://pointinscript.web.app (Firebase Hosting, redéployé 28/08)
- **Repo** : https://github.com/S3PH1R0TH-DEV/POINTINSCRIPT (main à jour, dernier commit `79aa88e` fix inspecteur + `f2d7e3f` login)
- **Projet Firebase** : `pointinscript` (601695622697)
- **APK** : build via GitHub Actions `release-apk.yml` (workflow intact)

## 👥 Comptes & Rôles
| Rôle | Login | MDP | Email Firebase | Statut |
|------|-------|-----|----------------|--------|
| Admin | `admin` | *ton mdp* | `admin@pointinscript.app` | ✅ Actif |
| Inspecteur | `ieppgrabo` | `000204` | `ieppgrabo@pointinscript.app` | ✅ Créé 28/08 localId OS0pFTj... |
| Directeurs | `nom_ecole` | générés | `xxx@pointinscript.app` | ✅ Via Admin > Logins |

## 🎯 Fonctionnalités
- **Admin** : Dashboard (stats, 2 donuts, bar evolution, table détail), Exports Excel/CSV/JSON, CRUD Écoles/Secteurs, Logins, Import JSON/CSV, Seed 5 secteurs + 30 écoles
- **Inspecteur** : Dashboard lecture seule identique admin (stats + 2 donuts + barres + table), filtres semaine/secteur, pas d'exports — **corrigé 28/08** (firestore rules + Charts.donut/bars + double header)
- **Directeur** : Saisie quotidienne offline-first (Préscolaire + Primaire CP1), Sync auto, streak gamification (7 messages 1→7 jours)

## 🔧 Corrections 28/08
1. **SyntaxError app.js:507** `await FB.getSecteurs()` hors async + doublon `updateInspecteurSyncBadge()` → `node --check` OK → login de nouveau fonctionnel (commit `dd8c51d`)
2. **Doublon login()** dans `firebase.js` (2x `async function login`) → supprimé 2e (gardé admin+ieppgrabo+directeur)
3. **Firestore rules** : ajouté `isInspecteur()` pour `ecoles` (list/get), `reports` (read all), `userSchools` → inspecteur voit tout
4. **Charts inspecteur** : `drawDonut` undefined → `Charts.donut` + `Charts.bars` via `computeStats` (commit `79aa88e`)
5. **Double header** : `enterAppFor` ne cachait pas `app-view` pour inspecteur + `showLogin/showApp` → fixé (commit `f2d7e3f`), HTML `inspecteur-view` passé en `<div class="screen"><header><main class="container">`
6. **Footer WebView** : `position:absolute` → `static` + `flex-direction:column` + `pointer-events:none` (commit `d2fe008` puis `1e4f41b`, workflow intact)

## 📁 Fichiers clés
```
app/frontend/index.html          # inspecteur-view en screen
app/frontend/js/app.js           # fix loadSecteurs, login, inspecteur charts, header
app/frontend/js/firebase.js      # 1 seul login()
app/frontend/js/config.js        # projectId pointinscript
app/frontend/css/style.css       # footer static WebView fix
app/firestore.rules              # isInspecteur lecture
app/mobile/capacitor.config.json # appId ci.men.delc.pointinscript
.github/workflows/release-apk.yml # intact
```

## 🔑 Secrets GitHub
`KEYSTORE_BASE64` (pointinscript-release.keystore 2806b, base64 3744), `KEYSTORE_PASSWORD`, `KEY_ALIAS=pointinscript`, `KEY_PASSWORD`

## 🚀 Prochaines actions
- Tester APK après nouveau tag (footer + login + inspecteur)
- Vérifier règles Firestore en prod (inspecteur read ok)
- Retours terrain directeurs

**Dernier deploy hosting** : 28/08 09:14 UTC (22 fichiers)
**Dernier commit** : `79aa88e` + `f2d7e3f` + `dd8c51d`
