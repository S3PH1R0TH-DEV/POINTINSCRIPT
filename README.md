# 📋 POINTINSCRIPT

Application de **remontée quotidienne des inscriptions** au préscolaire et au CP1, avec **compilation hebdomadaire automatique** et **tableau de bord statistique** (donut + barres), conforme au canevas de la **DELC (Direction des Écoles, Lycées et Collèges)** — Ministère de l'Éducation Nationale et de l'Alphabétisation, Côte d'Ivoire.

> Opération d'inscription du **10 août au 11 septembre 2026** — année scolaire **2026-2027**.
>
> 🔥 **Backend 100 % Firebase** (Firestore + Auth + Hosting) — **aucun serveur à gérer**.

---

## 🌐 Démo en ligne

**Web App (PWA)** : https://pointinscript.web.app

**APK Release (signé)** : Téléchargeable depuis les [Releases](https://github.com/S3PH1R0TH-DEV/POINTINSCRIPT/releases) → dernière version `pointinscript.apk`

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
- **Directeur** → saisit chaque jour les **nouvelles inscriptions du jour**. Le SDK Firestore gère le **hors-ligne nativement** : les saisies sont enregistrées localement puis **synchronisées automatiquement** dès le retour du réseau.
- **Administrateur** → gère écoles/secteurs, génère les logins, consulte la **compilation hebdomadaire** et les **graphiques**, exporte en Excel/CSV. Le tableau de bord est **mis en cache localement** (consultable hors-ligne), avec un **badge 🔔** dès que de nouveaux points arrivent.

---

## 📁 Structure du projet

```
POINTINSCRIPT/
├── .github/workflows/      CI/CD GitHub Actions
│   ├── build-apk.yml       Build APK release signé à chaque push sur main
│   └── release-apk.yml     Release GitHub automatique sur tags v*
├── app/
│   ├── frontend/           Application web (PWA) — sert aussi d'APK
│   │   ├── index.html
│   │   ├── css/style.css
│   │   ├── js/
│   │   │   ├── config.js   ⚙️ Config Firebase + période
│   │   │   ├── firebase.js Couche Auth + Firestore
│   │   │   ├── app.js      Logique (directeur + admin, consolidation, graphiques)
│   │   │   ├── charts.js   Graphiques SVG (donut + barres)
│   │   │   ├── excel.js    Export Excel côté client (SheetJS)
│   │   │   ├── seed.js     Données IEPP Grabo (5 secteurs, 30 écoles)
│   │   │   ├── store.js    Brouillons + cache local
│   │   │   └── vendor/     SDK Firebase + SheetJS (embarqués pour le hors-ligne)
│   │   ├── sw.js           Service Worker (hors-ligne)
│   │   ├── manifest.json
│   │   └── icons/          logo.png · icon-192.png · icon-512.png (logo Grabo)
│   ├── firebase.json       Config Firebase Hosting
│   ├── firestore.rules     ⚙️ Règles de sécurité (email admin à configurer)
│   ├── firestore.indexes.json
│   ├── SETUP_FIREBASE.md   📘 Guide de mise en place pas à pas
│   └── mobile/             Projet Capacitor → compilation APK Android
│       ├── README_BUILD.md 📘 Guide de compilation Android Studio
│       └── resources/      icon.png (1024) + splash.png (launcher APK)
└── README.md               Ce fichier
```

---

## 🚀 Déploiement continu (CI/CD)

### Build APK Release (à chaque push sur `main`)

Le workflow `.github/workflows/build-apk.yml` :
1. Installe Node.js, JDK 17, Android SDK
2. Sync Capacitor (copie frontend → Android)
3. **Signe l'APK** avec le keystore (secrets GitHub)
4. Génère `pointinscript.apk` (release, signé, aligné)
5. Upload en **artifact GitHub** (rétention 30 jours)

### Release GitHub automatique (sur tag `v*`)

Le workflow `.github/workflows/release-apk.yml` (sur `git tag v1.0.0 && git push origin v1.0.0`) :
- Build l'APK release signé
- Crée une **GitHub Release** avec l'APK attaché
- Génère les release notes automatiquement

---

## 🔐 Configuration des secrets GitHub (une seule fois)

Settings → Secrets and variables → Actions → **New repository secret** :

| Secret | Description | Exemple |
|--------|-------------|---------|
| `KEYSTORE_BASE64` | Keystore encodé base64 | `base64 -i pointinscript-release.keystore` |
| `KEYSTORE_PASSWORD` | Mot de passe du keystore (storepass) | `********` |
| `KEY_ALIAS` | Alias de la clé | `pointinscript` |
| `KEY_PASSWORD` | Mot de passe de la clé (keypass) | `********` |

**Générer le keystore localement :**
```bash
keytool -genkeypair -v \
  -keystore pointinscript-release.keystore \
  -alias pointinscript \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass VOTRE_MDP_KEYSTORE -keypass VOTRE_MDP_KEY \
  -dname "CN=S3ph1r0th-DEK, OU=POINTINSCRIPT, O=DELC, L=Grabo, ST=Gbokle, C=CI"

# Encoder en base64
base64 -i pointinscript-release.keystore   # Linux/macOS/Git Bash
# PowerShell : [Convert]::ToBase64String([IO.File]::ReadAllBytes("pointinscript-release.keystore"))
```

⚠️ **Gardez le fichier `.keystore` et les 2 mots de passe en lieu sûr** (hors repo) — indispensables pour les futures mises à jour sur Play Store.

---

## 🛠️ Installation locale (développement)

### Web / PWA
```bash
cd app/frontend
npm install
npx serve . -l 5000   # http://localhost:5000
```

### APK Android (via Android Studio)
```bash
cd app/mobile
npm install
npx cap add android          # une seule fois
npm run assets               # génère icônes/splash depuis resources/
npx cap sync android
npx cap open android         # ouvre Android Studio
# Build → Build Bundle(s) / APK(s) → Build APK(s)
```

---

## 📱 Mise en route administrative (une seule fois)

1. **Initialiser les données** : Admin → onglet Import → « 🌱 Initialiser secteurs + écoles » (crée 5 secteurs, 30 écoles IEPP Grabo)
2. **Générer les logins** : Admin → onglet Logins → « Générer les logins manquants » (un compte par école)
3. **Distribuer** : donnez identifiant/mot de passe à chaque directeur

---

## 🏫 Utilisation par le directeur

1. Ouvre l'APK / PWA, se connecte
2. Choisit la date, remplit les **nouvelles inscriptions du jour**
3. « Envoyer au serveur » → données synchronisées vers Firebase
4. **Sans réseau** : sauvegarde locale + sync auto au retour réseau

---

## 📊 Fonctionnalités Admin

- **Dashboard** : totaux cumulés, taux de remontée, filtres semaine/secteur
- **Graphiques** : donuts (filles/garçons/non-inscrits) + barres évolution quotidienne
- **Export Excel** : conforme canevas DELC (Préscolaire + Primaire + TOTAL + Observations + Liste écoles)
- **Export CSV** : détail quotidien
- **Hors-ligne** : cache local + badge 🔔 notifications temps réel

---

## 🔐 Sécurité

- **Firebase Auth** : comptes email/mot de passe (identifiant → `identifiant@domaine`)
- **Règles Firestore** (`firestore.rules`) : directeur = lecture/écriture **son école** seulement ; admin = tout
- **Mots de passe** : affichés **une seule fois** à l'admin pour distribution
- **Keystore** : jamais commité, géré via GitHub Secrets

---

## 👨‍💻 Auteur & Signature

**Développé par S3ph1r0th-DEK Builds**  
Pour la DELC — Ministère de l'Éducation Nationale et de l'Alphabétisation, Côte d'Ivoire

> « Propulsé par S3ph1r0th-DEK Builds © 2026 »

---

## 📄 Licence

MIT — Libre d'utilisation, modification et distribution pour l'éducation.