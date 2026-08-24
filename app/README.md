# 📋 POINTINSCRIPT

Application de **remontée quotidienne des inscriptions** au préscolaire et au CP1,
avec **compilation hebdomadaire automatique** et **tableau de bord statistique** (donut + barres),
conforme au canevas de la **DELC (Direction des Écoles, Lycées et Collèges)** —
Ministère de l'Éducation Nationale et de l'Alphabétisation, Côte d'Ivoire.

> Opération d'inscription du **10 août au 11 septembre 2026** — année scolaire **2026-2027**.
>
> 🔥 **Backend 100 % Firebase** (Firestore + Auth + Hosting) — **aucun serveur à gérer**.

---

## 🧭 Fonctionnement global

```
 ┌────────────────────┐                         ┌──────────────────────────┐
 │  APK DIRECTEURS     │   synchronisation      │   FIREBASE (Google)       │
 │  saisie QUOTIDIENNE │  ───────────────▶      │   • Firestore (données)   │
 │  + hors-ligne OK    │  ◀───────────────      │   • Auth (comptes)        │
 └────────────────────┘   (Firestore native)    │   • Hosting (site/app)    │
                                                 └────────────┬─────────────┘
 ┌────────────────────┐                         ┌─────────────▼─────────────┐
 │  APK / WEB ADMIN    │  ───────────────▶      │  Console d'administration │
 │  (écoles, secteurs, │  ◀───────────────      │  compilation hebdo,        │
 │   logins, graphiques│                         │  statistiques, exports     │
 └────────────────────┘                         └────────────────────────────┘
```

**Deux rôles (identifiés au login) :**
- **Directeur** → saisit chaque jour les **nouvelles inscriptions du jour**.
  Le SDK Firestore gère le **hors-ligne nativement** : les saisies sont enregistrées localement
  puis **synchronisées automatiquement** dès le retour du réseau.
- **Administrateur** → gère écoles/secteurs, génère les logins, consulte la **compilation hebdomadaire**
  et les **graphiques**, exporte en Excel/CSV. Le tableau de bord est **mis en cache localement**
  (consultable hors-ligne), avec un **badge 🔔** dès que de nouveaux points arrivent.

---

## 📁 Arborescence

```
app/
├── frontend/           Application web (PWA) — sert aussi d'APK
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── config.js   ⚙️ Config Firebase + période (À REMPLIR)
│   │   ├── firebase.js Couche Auth + Firestore
│   │   ├── app.js      Logique (directeur + admin, consolidation, graphiques)
│   │   ├── charts.js   Graphiques SVG (donut + barres)
│   │   ├── excel.js    Export Excel côté client (SheetJS)
│   │   ├── seed.js     Données IEPP Grabo (5 secteurs, 30 écoles)
│   │   ├── store.js    Brouillons + cache local
│   │   └── vendor/     SDK Firebase + SheetJS (embarqués pour le hors-ligne)
│   ├── sw.js           Service Worker (hors-ligne)
│   ├── manifest.json
│   └── icons/          logo.png · icon-192.png · icon-512.png (logo Grabo)
├── firebase.json       Config Firebase Hosting
├── firestore.rules     ⚙️ Règles de sécurité (À REMPLIR : email admin)
├── firestore.indexes.json
├── SETUP_FIREBASE.md   📘 Guide de mise en place pas à pas
└── mobile/             Projet Capacitor → compilation APK Android
    ├── README_BUILD.md 📘 Guide de compilation Android Studio
    └── resources/      icon.png (1024) + splash.png (launcher APK)
```

---

## 🚀 Mise en ligne (Firebase)

> 📘 **Guide détaillé pas à pas : voir [`SETUP_FIREBASE.md`](SETUP_FIREBASE.md).**

Résumé en 4 étapes :

1. **Créer un projet Firebase** (console.firebase.google.com) — plan gratuit « Spark ».
2. **Activer** Authentication (email/mot de passe) + Firestore Database.
3. **Créer le compte admin** (Authentication → Users) et **coller la clé** dans `frontend/js/config.js`.
4. **Déployer** :
   ```bash
   cd app
   npm install -g firebase-tools
   firebase login
   firebase use --add
   firebase deploy --only firestore:rules
   firebase deploy --only hosting
   ```

L'application est alors en ligne sur `https://VOTRE-PROJET.web.app`.

---

## 📱 Compilation de l'APK (application Android)

> 📘 **Guide complet pas à pas (avec Android Studio) : voir [`mobile/README_BUILD.md`](mobile/README_BUILD.md).**

```bash
cd app/mobile
npm install
npx cap add android          # une seule fois
npm run assets               # icônes à partir de resources/
npx cap sync android         # recopie le frontend
npx cap open android         # → Android Studio → bouton ▶ Run
```

APK de test : `app/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

> 🔌 L'APK **embarqué** contient l'app + le SDK Firebase : il fonctionne **hors-ligne** et
> synchronise automatiquement. Il n'y a **rien à changer** dans `config.js` pour l'APK
> (la config Firebase y est déjà incluse).

---

## 👩‍🏫 Mise en route administrative (une seule fois)

### 1. Les 3 types d'écoles
Le formulaire d'une école s'adapte automatiquement à son **type** :

| Type | Classes | Sections affichées au directeur |
|---|---|---|
| **Primaire** | CP1 → CM2 | Primaire uniquement |
| **Primaire + Grande Section** | GS + CP1 → CM2 | Préscolaire **et** Primaire |
| **Préscolaire** | Petite / Moyenne / Grande Section | Préscolaire uniquement |

### 2. Initialiser les données IEPP Grabo (5 secteurs, 30 écoles)
Au **premier démarrage**, la base est **vide**. Pour la pré-remplir :

1. Connectez-vous en admin.
2. Onglet **« Import » → « 🌱 Initialiser secteurs + écoles »**.
3. Cela crée les **5 secteurs** et les **30 écoles** de Grabo, avec les types auto-affectés :

| Secteur | Écoles |
|---|---|
| GNATO | Deobako, Gbapet 1, Gbapet 2, Gnato 1, Gnato 2, Maternelle UNICEF Gnato, UNICEF Gnato (7) |
| GRABO-EST | Grabo 1, Grabo 2, Grabo 3 + Matern, Maternelle Dougbo, Maternelle UAI Gbapet, Maternelle Grabo 1, UAI Gbapet (7) |
| GRABO-EST 2 | Alloukro, Bohoussoukro, Watinoma, Yassouakro, UNICEF de Binsaï, E. Dioulabougou (6) |
| GRABO-OUEST | Alassane Ouattara, Fétaï, Jules Hie Nea, Podoué, Soto (5) |
| GRABO OUEST2 | Abraham Dihoké, Deblablaï, Deblablaï 2, Negbatchi, Siahé (5) |

> ✏️ **Tout reste modifiable** : renommez une école, changez son **type** ou son **secteur**,
> ou **ajoutez de nouvelles écoles** à tout moment (onglet « Écoles » ou import CSV/JSON).

### 3. Générer les logins des directeurs
1. Onglet **« Logins » → « Générer les logins manquants »**.
2. Un **identifiant + mot de passe** est créé pour chaque école (Firebase Auth).
3. Une fenêtre affiche la liste → **distribuez-la** (SMS, WhatsApp, papier…).

---

## 🏫 Utilisation par le directeur

1. Ouvre l'APK, se connecte avec son identifiant/mot de passe.
2. Choisit la **date** (par défaut aujourd'hui), remplit les **nouvelles inscriptions du jour**.
3. **« Envoyer au serveur »** → les données arrivent dans la console admin.
4. **Sans réseau** : le point est **enregistré localement** et synchronisé automatiquement ensuite.
5. Le **% de non-inscrits** est calculé automatiquement.

---

## 📊 Consolidation (côté admin)

- **Tableau de bord** : totaux cumulés (inscrits, dont filles, handicap, non-inscrits), taux de remontée.
- **Graphiques** : donut Préscolaire + donut Primaire (filles/garçons/non-inscrits) et barres d'évolution quotidienne.
- Filtres par **semaine** et **secteur** (tout se met à jour, exports compris).
- **Hors-ligne** : dernier point consolidé en cache local (mention « dernière synchro »).
- **Badge 🔔** : notifie les nouveaux points (vérification toutes les 60 s).
- **Export Excel** conforme au canevas (tableaux Préscolaire + Primaire + TOTAL + Observations).
- **Export CSV** du détail quotidien.

> ℹ️ L'export Excel est généré **côté app** (bibliothèque SheetJS gratuite) : la structure est
> identique au canevas, mais **sans couleurs** de fond (limite de la version gratuite).

---

## 🧩 Personnalisation

| Besoin | Où |
|---|---|
| Config Firebase / période / email admin | `frontend/js/config.js` |
| Règles de sécurité (qui peut lire/écrire) | `firestore.rules` |
| Données IEPP Grabo (avant initialisation) | `frontend/js/seed.js` |
| Champs du formulaire | `frontend/index.html` + `js/app.js` |
| Colonnes d'import | `js/app.js` (parseCSV / import) |
| Couleurs / logo | `css/style.css`, `icons/` |

---

## 🔐 Sécurité

- **Firebase Auth** gère les comptes (email/mot de passe ; l'identifiant directeur est transformé
  en email `identifiant@<domaine>`).
- **Règles Firestore** (`firestore.rules`) : un directeur ne peut lire/écrire que les rapports de
  **son** école ; seul l'admin (email fixe) a tous les droits.
- Le mot de passe généré est affiché **une seule fois** à l'admin pour distribution.
- Changez le **mot de passe admin** avant la mise en production.
