# 🔥 Mise en place Firebase — POINTINSCRIPT (pas à pas)

Ce guide vous fait passer de « zéro » à « application en ligne » en ~15 minutes.
Il n'y a **plus aucun serveur à gérer** : tout repose sur Firebase (gratuit, plan « Spark »).

---

## Vue d'ensemble (4 étapes)

| # | Étape | Durée |
|---|---|---|
| 1 | Créer le projet Firebase | 3 min |
| 2 | Activer Authentication + Firestore | 3 min |
| 3 | Récupérer la clé de config et la coller dans `config.js` | 2 min |
| 4 | Déployer (hébergement + règles) via la ligne de commande | 5 min |

---

## Étape 1 — Créer le projet Firebase

1. Allez sur **[console.firebase.google.com](https://console.firebase.google.com)** et connectez-vous avec un compte Google.
2. Cliquez **« Créer un projet »** (ou « Add project »).
3. Nommez-le par exemple **`pointinscript`**.
4. Désactivez Google Analytics si vous n'en voulez pas (optionnel), puis **Créer**.
5. Attendez la création (~30 s).

> Le **plan Spark (gratuit)** est amplement suffisant : 30 écoles × ~30 jours de saisie =
> quelques centaines de documents, très en dessous des limites gratuites (50 000 lectures/jour).

---

## Étape 2 — Activer Authentication (email/mot de passe)

1. Dans le menu de gauche, cliquez **« Authentication »**.
2. Cliquez **« Commencer »**.
3. Onglet **« Sign-in method »** → cliquez sur **« Adresse e-mail / Mot de passe »** → **Activez** → **Enregistrer**.

---

## Étape 3 — Activer Firestore (base de données)

1. Dans le menu, cliquez **« Firestore Database »** → **« Créer une base de données »**.
2. Choisissez un emplacement proche : **`europe-west`** ou **`europe-west3`** (Europe) — ou le plus proche de la Côte d'Ivoire.
3. Mode de démarrage : choisissez **« Mode production »** (les règles de sécurité protègent les données — vous les déploierez à l'étape 4).

---

## Étape 4 — Créer le compte ADMIN (une seule fois)

1. Menu **« Authentication »** → onglet **« Users »** → **« Ajouter un utilisateur »**.
2. Email : **`admin@pointinscript.app`** (ou l'email de votre choix).
3. Mot de passe : choisissez-en un (ex. `Admin2026!`), décochez l'envoi d'email de vérification.
4. **Ajouter**.

> ⚠️ Retenez bien cet email + mot de passe : c'est **votre** accès admin dans l'application.
> Il devra correspondre exactement à ce que vous écrirez dans `config.js` et `firestore.rules`.

---

## Étape 5 — Récupérer la clé de config

1. Dans le menu, cliquez **⚙️ (engrenage) → Paramètres du projet**.
2. Faites défiler jusqu'à **« Vos applications »** → cliquez l'icône **`</>`** (Web).
3. Donnez un nom (ex. « POINTINSCRIPT »), **sans** activer Firebase Hosting pour l'instant → **Enregistrer l'application**.
4. Firebase affiche un bloc de config `firebaseConfig = { ... }`.

Copiez ces 6 valeurs dans **`frontend/js/config.js`** :

```js
window.APP_CONFIG = {
  firebase: {
    apiKey: "AIza............",            // ← apiKey
    authDomain: "pointinscript.firebaseapp.com",
    projectId: "pointinscript",
    storageBucket: "pointinscript.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef..."
  },
  usernameDomain: "pointinscript.app",
  adminEmail: "admin@pointinscript.app",   // ← l'email admin de l'étape 4
  year: "2026-2027",
  startDate: "2026-08-10",
  endDate: "2026-09-11"
};
```

---

## Étape 6 — Corriger les règles de sécurité (admin)

Ouvrez **`firestore.rules`** et remplacez l'email admin s'il est différent :

```
function isAdmin() {
  return isSignedIn() &&
    request.auth.token.email in [
      'admin@pointinscript.app'   // ← votre email admin
    ];
}
```

---

## Étape 7 — Déployer (hébergement + règles)

Sur votre ordinateur, avec **Node.js installé** :

```bash
cd app

# 1. Installer l'outil Firebase
npm install -g firebase-tools

# 2. Se connecter à Firebase
firebase login

# 3. Lier au projet (remplacez par VOTRE id de projet)
firebase use --add          # choisissez votre projet "pointinscript"

# 4. Déployer les règles Firestore
firebase deploy --only firestore:rules

# 5. Déployer l'hébergement (le site + l'app)
firebase deploy --only hosting
```

À la fin, Firebase affiche une URL du type :
**`https://pointinscript.web.app`** ← c'est **l'adresse de votre application** !

---

## ✅ Vérifier que tout marche

1. Ouvrez `https://pointinscript.web.app`.
2. Connectez-vous avec **`admin@pointinscript.app`** + votre mot de passe admin.
3. Onglet **« Logins » → « Générer les logins manquants »** : les comptes des 30 directeurs sont créés.
4. Une fenêtre s'affiche avec la liste **identifiant / mot de passe** → distribuez-la aux directeurs.

---

## 📱 Compiler l'APK (dernière étape)

1. Dans `frontend/js/config.js`, laissez la config Firebase telle quelle (l'APK la contient).
2. Compilez l'APK comme décrit dans **`mobile/README_BUILD.md`**.

L'APK **embarqué** contient l'app + le SDK Firebase : les directeurs peuvent saisir **hors-ligne**,
et Firestore **synchronise automatiquement** dès le retour du réseau. Votre APK admin reçoit
les données et affiche le badge **🔔** dès que de nouveaux points arrivent.

---

## 🧯 Dépannage rapide

| Problème | Cause probable | Solution |
|---|---|---|
| « permission denied » à la connexion | Règles Firestore non déployées | `firebase deploy --only firestore:rules` |
| « invalid API key » | Clé mal copiée dans `config.js` | Re-copier les 6 valeurs de l'étape 5 |
| Le badge 🔔 ne s'affiche pas | L'admin n'a pas rechargé le tableau | Cliquer « Actualiser » une fois |
| Export Excel sans couleurs | Normal (SheetJS gratuit ne gère pas les couleurs) | La structure est identique au canevas |
| Compte directeur déjà créé | `generateLogin` voit `username` existant | Rien à faire (déjà créé) — le mot de passe est visible dans l'onglet Logins |

---

## 🔒 Sécurité (rappel)

- Les règles Firestore empêchent un directeur de lire/écrire les données d'un autre.
- L'admin (email fixe) a tous les droits.
- Changez le mot de passe admin avant la mise en production réelle.
