# 📱 Compiler l'APK POINTINSCRIPT (guide pas à pas)

Ce dossier (`mobile/`) transforme l'application web (`../frontend/`) en **APK Android**
grâce à [Capacitor](https://capacitorjs.com/). Voici comment compiler et tester,
avec **Android Studio** (recommandé) ou en **ligne de commande**.

---

## 1. Prérequis (à installer une seule fois)

| Outil | Version | Où l'obtenir |
|---|---|---|
| **Node.js** + npm | ≥ 18 | https://nodejs.org |
| **Android Studio** | dernière | https://developer.android.com/studio |
| **JDK 17** | 17 | (fourni avec Android Studio, ou https://adoptium.net) |

Dans **Android Studio**, lors du premier lancement, laissez-le installer le **SDK Android**
(plateforme **API 34** recommandée) et les outils de build.

Vérifiez ensuite (terminal) :

```bash
node --version      # ≥ v18
java -version       # 17.x
```

---

## 2. Vérifier la configuration Firebase (important !)

L'APK « embarqué » contient l'application en local (fonctionne hors-ligne),
et le SDK Firebase est **inclus** : il synchronisera les données vers votre projet Firebase.

Avant de compiler, assurez-vous que **`../frontend/js/config.js`** contient bien votre
**configuration Firebase** (voir `SETUP_FIREBASE.md`, étape 5) :

```js
window.APP_CONFIG = {
  firebase: {
    apiKey: "AIza............",     // ← vos valeurs
    authDomain: "pointinscript.firebaseapp.com",
    projectId: "pointinscript",
    storageBucket: "pointinscript.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:..."
  },
  usernameDomain: "pointinscript.app",
  adminEmail: "admin@pointinscript.app",
  year: "2026-2027",
  startDate: "2026-08-10",
  endDate: "2026-09-11"
};
```

> Il n'y a **rien d'autre à configurer** : l'APK communique directement avec Firebase.

---

## 3. Installer les dépendances

```bash
cd mobile
npm install
```

---

## 4. Générer le projet Android natif

```bash
npx cap add android          # une seule fois (crée le dossier android/)
npm run assets               # génère les icônes/splash à partir de resources/
npx cap sync android         # recopie le frontend dans android/
```

> Après chaque **modification du frontend** (`../frontend/`), relancez `npx cap sync android`.

---

## 5a. Compiler avec Android Studio (recommandé)

```bash
npx cap open android         # ouvre le projet dans Android Studio
```

Dans Android Studio :
1. Attendez la fin de la **synchronisation Gradle** (barre de progression en bas).
2. Connectez un téléphone Android en **mode développeur** (ou créez un **émulateur** :
   *Device Manager → Create device*).
3. Cliquez sur le bouton **▶ Run** (triangle vert) — l'app s'installe et se lance.

Pour produire un **fichier APK** :
- **Menu Build → Build Bundle(s) / APK(s) → Build APK(s)**.
- L'APK est généré dans :
  `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 5b. Compiler en ligne de commande (sans Android Studio)

```bash
cd android
./gradlew assembleDebug
```

APK généré : `android/app/build/outputs/apk/debug/app-debug.apk`

Pour un **APK de production signé** (à distribuer officiellement) :
```bash
./gradlew assembleRelease
```
*(configurez votre clé de signature : Android Studio → Build → Generate Signed Bundle / APK.)*

---

## 📦 Distribuer l'APK

Le fichier `app-debug.apk` peut être **transféré par WhatsApp / email / clé USB**
et installé sur les téléphones des directeurs. Lors de l'installation, Android demandera
d'**autoriser les sources inconnues** (réglage normal pour une app non publiée sur Play Store).

---

## 🔁 Alternative : « APK enveloppe » (mises à jour instantanées)

Si vous préférez que l'APK affiche directement le site hébergé sur Firebase Hosting
(aucune recompilation à chaque mise à jour de l'app), ajoutez dans `capacitor.config.json` :

```json
"server": { "url": "https://pointinscript.web.app", "cleartext": false }
```

> ⚠️ Différence clé :
> - **APK embarqué** (étapes ci-dessus) : l'app s'ouvre **hors-ligne**, le SDK Firebase
>   synchronise les saisies dès le retour du réseau. Il faut recompiler pour mettre à jour l'app.
> - **APK enveloppe** : charge l'écran depuis Firebase Hosting (nécessite le réseau au 1er affichage),
>   mais les mises à jour sont immédiates côté hébergement.

---

## 🧩 Dépannage rapide

| Problème | Solution |
|---|---|
| `Cannot find module ...` | `cd mobile && npm install` |
| Gradle très lent / erreur SDK | Vérifiez que le SDK Android est installé (Android Studio → Settings → SDK Manager, API 34) |
| `JAVA_HOME` incorrect | Pointez-le vers le JDK 17 (ex. `export JAVA_HOME=/usr/lib/jvm/java-17-openjdk`) |
| L'app ne trouve pas Firebase | Vérifiez la config dans `../frontend/js/config.js` puis `npx cap sync android` |
| Icône/l'logo absent | Relancez `npm run assets` puis `npx cap sync android` |
