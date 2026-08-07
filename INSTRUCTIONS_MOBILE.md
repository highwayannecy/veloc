# 📱 Accès mobile au comptage des réservations

## Objectif
Accéder au comptage des réservations depuis **n'importe quel smartphone**, sans être connecté à votre compte iCloud, ni avoir à lancer un script dans une console.

## Principe
Votre calendrier de réservations iCloud est partagé **publiquement** via un lien `webcal://...`.
Ce projet Vercel contient maintenant :

| Fichier | Rôle |
|---------|------|
| `api/booking-count.js` | Fonction serveur : télécharge le calendrier public, applique la logique regex de comptage, retourne le JSON |
| `resa.html` | Page mobile : affiche le comptage (aujourd'hui / à venir / toutes) avec le détail par réservation |

## Étape 1 — Activer le calendrier public iCloud (30 secondes)

### Sur iPhone ou Mac (application Calendrier, sur iOS 15+/macOS 12+) :
1. Ouvrez l'application **Calendrier**
2. Ouvrez **Réglages** (iPhone : en bas de l'écran, ou bouton `Calendriers` en bas au centre)
3. Appuyez sur l'icône **ℹ️** à côté de votre calendrier de réservations
4. Activez **« Calendrier public »**
5. Un lien apparaît : `webcal://pXX-caldav.icloud.com/published/XXXXXXXXXX`
6. Copiez ce lien

> ⚠️ **Important** : ce lien rend le calendrier visible par toute personne qui le possède. Les noms des clients seront visibles. C'est généralement acceptable pour une boutique, mais sachez-le.

### Sur Mac (méthode classique) :
1. Ouvrez **Calendrier** sur votre Mac
2. Sélectionnez le calendrier à gauche
3. Menu **Fichier** → **Calendrier partagé** → **Partage public du calendrier**
4. Copiez le lien `webcal://...` affiché

## Étape 2 — Ajouter le lien au projet (une seule fois, 1 minute)

### Sur vercel.com (recommandé) :
1. Allez sur votre projet Vercel → **Settings** → **Environment Variables**
2. Ajoutez :
   - **Key** : `CALENDAR_URL`
   - **Value** : le lien `webcal://...` copié
3. Cliquez **Save**
4. Redéployez le projet : **Deployments** → `...` → **Redeploy**

### Ou en local avec le CLI Vercel :
```bash
vercel env add CALENDAR_URL
# Collez le lien webcal://... puis validez
vercel redeploy
```

> Le fichier `vercel.json` contient déjà `"cleanUrls": true`, donc la page sera accessible à l'URL :
> **`https://[votre-domaine].vercel.app/resa`**

## Étape 3 — Tester

1. Sur n'importe quel smartphone (même sans votre compte iCloud) :
   - Safari / Chrome → ouvrez `https://[votre-domaine].vercel.app/resa`
2. Vous voyez :
   - **Cartes de synthèse** : nb de résa, nb d'enfants, nb de vélos
   - **Détail par catégorie** : VTC, VAE, Ville, Route, Tandem, Siège, Charrette, Charrette chien, Enfants, 16p/20p/24p/26p
   - **Liste des réservations** : chaque réservation avec son résumé (« 3 vtc · 1 enfant · 1 26p »)
3. Onglets : **Aujourd'hui** / **À venir** / **Toutes**
4. Rechargement automatique toutes les 5 min + bouton **⟳ Actualiser**

## Étape 4 (optionnel) — Raccourci sur l'écran d'accueil

Pour un accès en 1 tap :

### iPhone (Safari) :
1. Ouvrez `https://[votre-domaine].vercel.app/resa`
2. Bouton **Partager** (carré avec flèche ↑)
3. **Sur l'écran d'accueil**
4. Renommez « Réservations » → **Ajouter**

### Android (Chrome) :
1. Ouvrez `https://[votre-domaine].vercel.app/resa`
2. Menu ⋮ > **Ajouter à l'écran d'accueil**
3. **Ajouter**

## Réglages du stock en cas de changement

Les totaux du stock sont définis dans `api/booking-count.js` :
```js
const STOCK = {
    vtc: 76,
    vae: 65,
    ville: 0,
    route: 0,
    tandem: 1,
    siege: 6,
    charrette: 0,
    charretteChien: 0,
    p16: 1,
    p20: 2,
    p24: 2,
    p26: 2,
    enfant: 7,
};
```
Modifiez ces valeurs puis redéployez.

## Test de l'API seule

Pour vérifier que la fonction serveur fonctionne :
```
GET https://[votre-domaine].vercel.app/api/booking-count
```
→ Retourne un JSON complet (stock, totaux, liste des réservations avec le détail détecté).

## Dépannage

| Erreur | Cause | Solution |
|--------|-------|----------|
| `CALENDAR_URL non configuré` | Variable d'environnement absente | Voir Étape 2 |
| `Impossible de télécharger le calendrier (HTTP 401)` | Le lien public a été révoqué ou le calendrier est privé | Réactivez « Calendrier public » et mettez à jour `CALENDAR_URL` |
| `HTTP 404` sur `/resa` | La page n'est pas déployée | Poussez `resa.html` sur votre dépôt Git puis redéployez |
| Aucune réservation affichée | Les événements sont dans le passé ou un autre calendrier | Vérifiez l'onglet « Toutes » et que le bon calendrier est partagé |