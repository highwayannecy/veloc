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

## Étape 2 — Ajouter le(s) lien(s) au projet (une seule fois, 1 minute)

> Si vous avez **plusieurs calendriers** (réservations, atelier, etc.), activez le partage public sur **chacun d'eux** (répétez l'Étape 1 pour chaque calendrier) puis collez **tous les liens**, séparés par des virgules **ou des points-virgules**, dans une seule variable `CALENDAR_URLS`.

### Sur vercel.com (recommandé) :
1. Allez sur votre projet Vercel → **Settings** → **Environment Variables**
2. Ajoutez :
   - **Key** : `CALENDAR_URLS`
     - **Value** : le(s) lien(s) `webcal://...` — **plusieurs liens séparés par des virgules ou des points-virgules** :
       ```
       webcal://p01-caldav.icloud.com/published/AAA;webcal://p01-caldav.icloud.com/published/BBB
       ```
   - **Key** : `SUPABASE_URL`
     - **Value** : URL de votre projet Supabase (ex : `https://xxxx.supabase.co`)
   - **Key** : `SUPABASE_ANON_KEY`
     - **Value** : clé publique `anon` de votre projet Supabase (Settings → API)
3. Cliquez **Save** pour chacune
4. Redéployez le projet : **Deployments** → `...` → **Redeploy**

> ⚠️ Ne mettez **pas** d'espace après les séparateurs.
>
> Les deux séparateurs `,` et `;` sont acceptés. L'ancienne variable `CALENDAR_URL` (lien unique) reste supportée pour la rétro-compatibilité, mais `CALENDAR_URLS` la remplace.

### Ou en local avec le CLI Vercel :
```bash
vercel env add CALENDAR_URLS
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel redeploy
```

> ⚠️ `SUPABASE_URL` et `SUPABASE_ANON_KEY` sont **obligatoires** pour que le serveur charge :
> - Les types de vélos et leurs mots-clés (`bike_types`)
> - Le stock du jour (`fleet_history`)
>
> Sans elles, l'API fonctionne mais sans détection des types et sans stock affiché.

> Le fichier `vercel.json` contient déjà `"cleanUrls": true`, donc la page sera accessible à l'URL :
> **`https://[votre-domaine].vercel.app/resa`**

## Étape 3 — Tester

1. Sur n'importe quel smartphone (même sans votre compte iCloud) :
   - Safari / Chrome → ouvrez `https://[votre-domaine].vercel.app/resa`
2. Vous voyez :
   - **Cartes de synthèse** : nb de résa, nb d'enfants, nb de vélos
   - **Détail par catégorie** : VTC, VAE, Ville, Route, Tandem, Siège, Charrette, Charrette chien, Enfants, 16p/20p/24p/26p
   - **Liste des réservations** : chaque réservation avec son résumé (« 3 vtc · 1 enfant · 1 26p »)
3. Onglets : **Aujourd'hui** / **Demain** / **Après-demain**
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

## Gestion du stock (fleet_history)

Le stock est géré **dans Supabase** (table `fleet_history`, une ligne par date avec un JSONB `totals`), plus dans le code.

### Depuis la page mobile `/resa` :
1. Bouton **« ✏️ Stock »** dans le panneau Détail
2. Modifiez les quantités (VAE, VTC, Tandem, Enfants 16p/20p/24p/26p, Siège...)
3. **💾 Enregistrer** → `upsert` dans `fleet_history` pour la date du jour

### Directement dans Supabase :
Table Editor → `fleet_history` → modifiez la ligne de la date souhaitée → colonne `totals` (JSON).

> **⚙️ Certains types (`ville`, `route`, `charrette`, `charretteChien`) n'existaient pas à l'origine** dans `fleet_history`. Si vous voyez `–` dans la colonne stock pour ces types, ouvrez l'éditeur Stock et enregistrez une valeur : ils seront ajoutés au JSON.

## ➕ Ajouter un nouveau type de vélo (LIAISON AUTOMATIQUE)

Quand vous ajoutez un type dans `bike_types`, **tout se lie automatiquement** :
- Les **textes de réservation** sont détectés via `match_keywords`
- L'affichage dans `/resa` (label, icône, ordre) utilise `label`, `icon`, `sort_order`
- Le stock utilise `fleet_key` dans `fleet_history`
- Les types marqués `is_child_size = true` sont additionnés dans le total « Enfants »

### Exemple : ajouter un type « VTC Électrique pliant »

Dans Supabase Table Editor → `bike_types` → **New row** :

| Colonne | Valeur |
|---------|--------|
| `key` | `vae-pliant` |
| `label` | `VAE Pliant` |
| `icon` | `🧳` |
| `match_keywords` | `{pliant, pliants, vae pliant}` |
| `fleet_key` | `vae-pliant` |
| `is_child_size` | `false` |
| `require_number` | `false` |
| `sort_order` | `14` |
| `is_active` | `true` |
| `default_total` | `3` |

Puis, pour que le stock existe pour aujourd'hui :
```sql
UPDATE fleet_history
SET totals = totals || '{"vae-pliant":3}'::jsonb,
    updated_at = NOW()
WHERE date = TO_CHAR(NOW(), 'YYYY-MM-DD');
```

**Résultat sans redéploiement** : après un simple actualiser de `/resa`, les réservations contenant « pliant » seront comptées dans « VAE Pliant », et le total `/ stock` apparaîtra.

> ⚠️ Ne modifier que `default_total` ne change pas le stock du jour : la ligne `fleet_history` du jour doit contenir la clé `fleet_key`.

### Colonnes de `bike_types`

| Colonne | Rôle |
|---------|------|
| `key` | Identifiant unique (utilisé dans les comptages `detected`) |
| `label` | Nom affiché dans l'interface |
| `icon` | Emoji affiché devant le label |
| `description` | Description (optionnelle) |
| `default_total` | Valeur suggérée pour un nouveau jour (non automatique) |
| `match_keywords` | **Mots-clés détectés dans les textes de réservation** (array de textes) |
| `fleet_key` | Clé utilisée dans `fleet_history.totals` (si vide : `key`) |
| `is_child_size` | `true` = vélo enfant, additionné au total « Enfants » |
| `require_number` | `true` = le nombre avant le mot-clé est obligatoire (`2 enfant`), `false` = nombre optionnel (`26p` = 1) |
| `sort_order` | Ordre d'affichage |
| `is_active` | `false` = masqué, non détecté |

## Test de l'API seule

Pour vérifier que la fonction serveur fonctionne :
```
GET https://[votre-domaine].vercel.app/api/booking-count
```
→ Retourne un JSON complet (stock, totaux, liste des réservations avec le détail détecté).

## Dépannage

| Erreur | Cause | Solution |
|--------|-------|----------|
| `CALENDAR_URLS non configuré` | Variable d'environnement absente | Voir Étape 2 |
| `CALENDAR_URLS vide` | La variable contient des séparateurs mais aucun lien valide | Vérifiez qu'il n'y a pas d'espaces ou de séparateurs en trop |
| `Impossible de télécharger le calendrier ... (HTTP 400)` | Plusieurs liens collés ensemble sans séparateur valide | Séparez les liens par `,` ou `;` (pas d'espace) |
| `Impossible de télécharger le calendrier ... (HTTP 401)` | Un des liens publics a été révoqué ou le calendrier est privé | Réactivez « Calendrier public » pour ce calendrier et mettez à jour `CALENDAR_URLS` |
| Les réservations d'un calendrier n'apparaissent pas | Le calendrier n'est pas dans `CALENDAR_URLS` | Ajoutez le lien du calendrier manquant (séparé par `,` ou `;`) |
| `HTTP 404` sur `/resa` | La page n'est pas déployée | Poussez `resa.html` sur votre dépôt Git puis redéployez |
| Aucune réservation affichée | Les événements sont dans le passé ou un autre calendrier | Vérifiez l'onglet « Aujourd'hui » et que le bon calendrier est partagé |
