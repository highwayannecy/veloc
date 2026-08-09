/**
 * API Vercel — Comptage des réservations depuis un ou plusieurs calendriers iCloud publics
 *
 * 🔗 LIEN AUTOMATIQUE ENTRE LES 3 SOURCES
 *   - bike_types   : SOURCE UNIQUE (mots-clés, label, clé flotte, type enfant...)
 *   - CALENDAR     : textes de réservation parsés selon les match_keywords de bike_types
 *   - fleet_history: stock lu par fleet_key (et modifiable depuis resa.html)
 *
 * Variables d'environnement requises (Vercel → Settings → Environment Variables) :
 *   CALENDAR_URLS      = liens publics des calendriers iCloud, séparés par ; ou ,
 *                        (ex: webcal://p01-caldav.icloud.com/published/AAA;webcal://p01-caldav.icloud.com/published/BBB)
 *   CALENDAR_URL       = (rétro-compatible) lien unique d'un seul calendrier
 *   SUPABASE_URL       = URL du projet Supabase (ex: https://xxxx.supabase.co)
 *   SUPABASE_ANON_KEY  = clé anon publique Supabase
 *
 * Déploiement : ce fichier dans le dossier /api est automatiquement
 * détecté par Vercel comme une Serverless Function.
 */

// ============================================================
// 1. HELPERS GÉNÉRAUX
// ============================================================

/**
 * Clés Supabase de secours (clés publiques "anon", identiques à supabase.js).
 * Utilisées si les variables d'environnement Vercel ne sont pas configurées,
 * afin que l'API puisse TOUJOURS lire la table réelle bike_types.
 */
const SUPABASE_FALLBACK = {
    url: 'https://kltvxgupcfscdzjorxtu.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsdHZ4Z3VwY2ZzY2R6am9yeHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMDEyNDEsImV4cCI6MjA5OTc3NzI0MX0.V4VT_xHbquzA-IeL3YOFEJYVrrcnaV9QmI-dRSiFHb8'
};

/**
 * Requête REST simple vers Supabase (sans SDK, compatible API Vercel).
 */
async function supabaseFetch(path, query = {}) {
    const url = process.env.SUPABASE_URL || SUPABASE_FALLBACK.url;
    const anonKey = process.env.SUPABASE_ANON_KEY || SUPABASE_FALLBACK.anonKey;
    if (!url || !anonKey) {
        throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY non configurés');
    }
    const params = new URLSearchParams(query);
    const qs = params.toString();
    const response = await fetch(`${url}/rest/v1/${path}${qs ? '?' + qs : ''}`, {
        headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`Supabase ${path} (HTTP ${response.status})`);
    }
    return response.json();
}

/**
 * Échappe les caractères spéciaux regex d'une chaîne.
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Configuration de SECOURS utilisée quand Supabase n'est pas disponible
 * (variables d'env absentes, colonnes manquantes, etc.).
 * Miroir de la table bike_types de SUPABASE_SETUP.sql.
 */
const DEFAULT_BIKE_TYPES = [
    { key: 'enfant',         label: 'Enfants (total)', icon: '🧒', description: 'Synthèse automatique : somme des tailles enfants', match_keywords: [], fleet_key: 'enfant', is_child_size: false, sort_order: 14 },
    { key: 'vae',            label: 'VAE',                    icon: '⚡', description: 'ex : 1 vae', match_keywords: ['vae','électrique','electrique','ebike','elec'], fleet_key: 'vae', is_child_size: false, sort_order: 2 },
    { key: 'vtc',            label: 'VTC',                    icon: '🚲', description: 'ex : 1 vtc', match_keywords: ['vtc','classique','mecanique','mécanique'], fleet_key: 'vtc', is_child_size: false, sort_order: 3 },
    { key: 'ville',          label: 'Ville',                  icon: '🏙️', description: 'ex : 1 ville', match_keywords: ['ville'], fleet_key: 'ville', is_child_size: false, sort_order: 4 },
    { key: 'route',          label: 'Route',                  icon: '🏁', description: 'ex : 1 route', match_keywords: ['route'], fleet_key: 'route', is_child_size: false, sort_order: 5 },
    { key: 'tandem',         label: 'Tandem',                 icon: '👫', description: 'ex : 1 tandem', match_keywords: ['tandem'], fleet_key: 'tandem', is_child_size: false, sort_order: 6 },
    { key: 'siege',          label: 'Siège',             icon: '🍼', description: 'ex : 1 siège', match_keywords: ['siege','siège','siege enfant','siège enfant','siege bebe','siège bébé','bebe','bébé'], fleet_key: 'siege', is_child_size: false, sort_order: 7 },
    { key: 'charretteChien', label: 'Charrette chien',        icon: '🐕', description: 'ex : 1 chien', match_keywords: ['charrette chien','charrettes chien','remorque chien'], fleet_key: 'charretteChien', is_child_size: false, sort_order: 8 },
    { key: 'charrette',      label: 'Charrette',   icon: '🛞', description: 'ex : 1 charrette', match_keywords: ['charrette','charrettes','charette','carette','remorque'], fleet_key: 'charrette', is_child_size: false, sort_order: 9 },
    { key: 'enfant-16p',     label: '16p',             icon: '🧒', description: '4 à 6 ans, ex : 1 16p', match_keywords: ['16p','16 pouces','16pouces','16 p'], fleet_key: 'enfant-16p', is_child_size: true, sort_order: 10 },
    { key: 'enfant-20p',     label: '20p',             icon: '🧒', description: '6 à 8 ans, ex : 1 20p', match_keywords: ['20p','20 pouces','20pouces','20 p'], fleet_key: 'enfant-20p', is_child_size: true, sort_order: 11 },
    { key: 'enfant-24p',     label: '24p',             icon: '🧒', description: '8 à 10 ans, ex : 1 24p', match_keywords: ['24p','24 pouces','24pouces','24 p'], fleet_key: 'enfant-24p', is_child_size: true, sort_order: 12 },
    { key: 'enfant-26p',     label: '26p',             icon: '🧒', description: '10 ans et +, ex : 1 26p', match_keywords: ['26p','26 pouces','26pouces','26 p'], fleet_key: 'enfant-26p', is_child_size: true, sort_order: 13 },
];

/**
 * Construit le pattern regex pour un type à partir de ses mots-clés.
 *
 * @param {Object} bt - Ligne bike_types
 * @returns {RegExp|null}
 */
function buildPattern(bt) {
    const keywords = (bt.match_keywords || []).filter(k => k && k.trim());
    if (keywords.length === 0) return null;

    // Alternance des mots-clés échappés, du plus long au plus court
    const alts = keywords
        .map(k => escapeRegex(k.trim().toLowerCase()))
        .sort((a, b) => b.length - a.length)
        .join('|');

    if (bt.require_number) {
        // "2 enfant", "1 vélo enfant" → nombre obligatoire avant le mot-clé
        return new RegExp(`(\\d+)\\s*(?:${alts})`, 'gi');
    }

    // Nombre optionnel avant le mot-clé :
    //   "2 26p"   → count = 2
    //   "26p"     → count = 1
    //   "2vae"    → count = 2
    // Le groupe 1 = nombre (ou absent → 1), le groupe 2 = mot-clé.
    // L'alternative (?:^|[^\w]) + (?=$|[^\d]) évite de matcher
    // dans un mot plus long ("126p" ne matche pas "26p" quand il
    // est précédé d'un chiffre sans espace séparateur).
    return new RegExp(`(?:^|[^\\w])(?:(\\d+)\\s*)?(${alts})(?=$|[^\\d])`, 'gi');
}

/**
 * Construit la liste des patterns + infos d'affichage depuis bike_types.
 */
function buildTypes(bikeTypes) {
    return (bikeTypes || [])
        .filter(bt => bt.is_active !== false)
        .map(bt => {
            // Fusion avec les valeurs par défaut : descriptions, mots-clés,
            // fleet_key et ordre si la base n'est pas encore migrée.
            const def = DEFAULT_BIKE_TYPES.find(d => d.key === bt.key) || {};
            const keywords = (bt.match_keywords && bt.match_keywords.length > 0)
                ? bt.match_keywords
                : (def.match_keywords || []);
            return {
                key: bt.key,
                label: bt.label || bt.key,
                icon: bt.icon || '🚲',
                // Description : on RESPECTE la valeur en base quand elle existe
                // (même vide). Le défaut n'est utilisé que si la colonne n'existe
                // pas dans la table (structure non migrée ⇒ description undefined).
                description: bt.description !== undefined && bt.description !== null
                    ? bt.description
                    : (def.description || ''),
                fleetKey: bt.fleet_key || def.fleet_key || bt.key,
                isChildSize: bt.is_child_size !== undefined ? !!bt.is_child_size : !!def.is_child_size,
                // "enfant" toujours en dernier quel que soit la base
                sortOrder: bt.key === 'enfant' ? 999 : (bt.sort_order || def.sort_order || 0),
                hasKeywords: (keywords || []).length > 0,
                regex: buildPattern({ ...bt, match_keywords: keywords }),
                requireNumber: !!bt.require_number,
            };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Extrait les compteurs d'un texte de réservation.
 */
function extractCount(text, regex) {
    if (!regex) return 0;
    let match;
    let total = 0;
    // reset lastIndex à chaque appel
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
        const count = match[1] !== undefined && match[1] !== '' ? parseInt(match[1], 10) : 1;
        total += count;
        if (match.index === regex.lastIndex) regex.lastIndex++;
    }
    return total;
}

/**
 * Analyse un texte de réservation et retourne les compteurs détectés.
 * @returns {Object} { key: count }
 */
function detectText(text, types) {
    const detected = {};
    for (const t of types) {
        if (!t.regex) continue;
        const count = extractCount(text, t.regex);
        if (count > 0) detected[t.key] = count;
    }
    return detected;
}

// ============================================================
// 2. PARSING ICS
// ============================================================

/**
 * Dernier dimanche d'un mois donné (en UTC).
 */
function lastSundayUTC(year, monthIndex) {
    const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
    const day = lastDay.getUTCDay(); // 0 = dimanche
    return new Date(Date.UTC(year, monthIndex, lastDay.getUTCDate() - day));
}

/**
 * Décalage Europe/Paris (minutes) pour une date locale donnée.
 * Été (fin mars → fin octobre) : UTC+2. Hiver : UTC+1.
 */
function parisOffsetMinutes(y, mo, d) {
    const startDst = lastSundayUTC(y, 2);  // dernier dimanche de mars
    const endDst = lastSundayUTC(y, 9);    // dernier dimanche d'octobre
    const ts = Date.UTC(y, mo, d);
    return (ts >= startDst.getTime() && ts < endDst.getTime()) ? 120 : 60;
}

/**
 * Parse une date ICS (DTSTART) en objet Date JS (instant UTC correct).
 *
 * - Date avec "Z" (UTC explicite) → interprétée en UTC.
 * - Date SANS fuseau (flottante, cas des calendriers iCloud) → interprétée
 *   comme heure locale Europe/Paris (UTC+2 en été, UTC+1 en hiver).
 *   L'instant UTC renvoyé est alors correct quel que soit le fuseau du serveur.
 */
function parseICSDate(str) {
    if (!str) return null;
    const colonIdx = str.indexOf(':');
    let value = colonIdx >= 0 ? str.slice(colonIdx + 1) : str;
    const hasZ = /Z$/.test(value);
    value = value.replace(/Z$/, '');
    const isAllDay = /^\d{8}$/.test(value);
    let y, mo, d, h = 0, mi = 0, s = 0;
    if (isAllDay) {
        y = +value.slice(0, 4);
        mo = +value.slice(4, 6) - 1;
        d = +value.slice(6, 8);
    } else {
        if (value.length < 15) return null;
        y = +value.slice(0, 4);
        mo = +value.slice(4, 6) - 1;
        d = +value.slice(6, 8);
        h = +value.slice(9, 11) || 0;
        mi = +value.slice(11, 13) || 0;
        s = +value.slice(13, 15) || 0;
    }

    let date;
    if (hasZ) {
        date = new Date(Date.UTC(y, mo, d, h, mi, s));
    } else {
        // Heure locale flottante → heure Europe/Paris
        date = new Date(Date.UTC(y, mo, d, h, mi, s) - parisOffsetMinutes(y, mo, d) * 60000);
    }
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Extrait un champ ICS simple.
 */
function getICSField(block, fieldName) {
    const match = block.match(new RegExp(`^${fieldName}[^:]*:(.*)$`, 'm'));
    if (!match) return null;
    const value = match[1].trim();
    return value.length > 0 ? value : null;
}

/**
 * Parse le contenu ICS.
 */
function parseICS(ics) {
    const unfolded = ics.replace(/\r?\n[ \t]/g, '');
    const events = [];
    const blocks = unfolded.split('BEGIN:VEVENT');
    for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        if (/STATUS:CANCELLED/i.test(block)) continue;
        const summaryMatch = block.match(/^SUMMARY[^:]*:(.*)$/m);
        if (!summaryMatch) continue;

        const startRaw = getICSField(block, 'DTSTART');
        const endRaw = getICSField(block, 'DTEND');
        const createdRaw = getICSField(block, 'CREATED');
        const lastModifiedRaw = getICSField(block, 'LAST-MODIFIED');
        const uid = getICSField(block, 'UID');
        const location = getICSField(block, 'LOCATION');
        const description = getICSField(block, 'DESCRIPTION');
        const status = getICSField(block, 'STATUS');

        events.push({
            summary: summaryMatch[1].trim(),
            startDate: startRaw ? parseICSDate(startRaw) : null,
            endDate: endRaw ? parseICSDate(endRaw) : null,
            createdDate: createdRaw ? parseICSDate(createdRaw) : null,
            lastModifiedDate: lastModifiedRaw ? parseICSDate(lastModifiedRaw) : null,
            uid,
            location,
            description,
            status,
        });
    }
    return events;
}

// ============================================================
// 3. FONCTION PRINCIPALE
// ============================================================

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');

    // ---------- CALENDRIERS ----------
    const calendarUrlsRaw = process.env.CALENDAR_URLS || process.env.CALENDAR_URL;
    if (!calendarUrlsRaw) {
        return res.status(500).json({
            error: 'CALENDAR_URLS non configuré',
            hint: "Ajoutez les liens publics des calendriers iCloud (séparés par ; ou ,) dans les variables d'environnement Vercel."
        });
    }
    const calendarUrls = calendarUrlsRaw
        .split(/[,;]/)
        .map(u => u.trim())
        .filter(u => u.length > 0);

    if (calendarUrls.length === 0) {
        return res.status(500).json({ error: 'CALENDAR_URLS vide' });
    }

    try {
        // ---------- BIKE_TYPES : SOURCE UNIQUE ----------
        // select=* : PostgREST renvoie toutes les colonnes EXISTANTES de la table
        // sans erreur, quelle que soit sa structure (migrée ou non).
        // Les colonnes manquantes (match_keywords, fleet_key...) seront juste
        // undefined dans les objets → la fusion buildTypes les complète.
        let bikeTypes = [];
        let supabaseAvailable = true;
        try {
            // Pas d'order ici : si la colonne sort_order n'existe pas encore,
            // PostgREST renvoie une erreur. Le tri est déjà fait dans buildTypes.
            bikeTypes = await supabaseFetch('bike_types', {
                select: '*',
            });
        } catch (supaErr) {
            // Table absente ou Supabase indisponible → mode dégradé
            console.warn('⚠️ bike_types non chargés:', supaErr.message);
            supabaseAvailable = false;
        }

        // Fallback UNIQUEMENT si Supabase est indisponible ou la table est vide.
        // Si la connexion est OK, on GARDE les types de la table : la fusion
        // dans buildTypes complète mots-clés, descriptions et fleet_key depuis
        // DEFAULT_BIKE_TYPES pour les types existants, SANS ajouter de types
        // absents de la base (ex : charrette n'apparaîtra pas si elle n'y est pas).
        const hasAnyRow = Array.isArray(bikeTypes) && bikeTypes.length > 0;
        if (!supabaseAvailable || !hasAnyRow) {
            console.warn('⚠️ Utilisation des types par défaut (Supabase indisponible ou table vide)');
            bikeTypes = DEFAULT_BIKE_TYPES;
        }

        const types = buildTypes(bikeTypes);

        // ---------- STOCK DEPUIS fleet_history ----------
        let stock = null;
        try {
            const todayStr = new Date().toISOString().slice(0, 10);
            const rows = await supabaseFetch('fleet_history', {
                select: 'date,totals',
                date: `eq.${todayStr}`,
                limit: '1',
            });
            if (rows && rows.length > 0) stock = rows[0].totals || null;
        } catch (supaErr) {
            console.warn('⚠️ fleet_history non chargé:', supaErr.message);
        }

        // ---------- TÉLÉCHARGEMENT DES CALENDRIERS ----------
        const events = [];
        for (const calendarUrl of calendarUrls) {
            const icsUrl = calendarUrl.replace(/^webcal:\/\//i, 'https://');
            const response = await fetch(icsUrl);
            if (!response.ok) {
                throw new Error(`Impossible de télécharger le calendrier ${calendarUrl} (HTTP ${response.status})`);
            }
            const ics = await response.text();
            const parsedEvents = parseICS(ics);
            for (const e of parsedEvents) {
                e.calendar = calendarUrl;
            }
            events.push(...parsedEvents);
        }

        // ---------- DÉTECTION PAR TEXTE ----------
        const bookings = events.map(e => ({
            summary: e.summary,
            start: e.startDate ? e.startDate.toISOString() : null,
            end: e.endDate ? e.endDate.toISOString() : null,
            created: e.createdDate ? e.createdDate.toISOString() : null,
            lastModified: e.lastModifiedDate ? e.lastModifiedDate.toISOString() : null,
            uid: e.uid,
            location: e.location,
            description: e.description,
            status: e.status,
            calendar: e.calendar,
            detected: detectText(e.summary.toLowerCase(), types),
        }));

        // ---------- TOTAUX ----------
        function computeTotals(list) {
            const totals = {};
            for (const t of types) totals[t.key] = 0;
            for (const b of list) {
                for (const k in b.detected) {
                    if (totals[k] !== undefined) totals[k] += b.detected[k];
                }
                // Les vélos pouces et le type "enfant" synthèse :
                // si enfant = is_child_size, on additionne les enfants au type enfant
                for (const t of types) {
                    if (t.isChildSize && b.detected[t.key]) {
                        totals['enfant'] = (totals['enfant'] || 0) + b.detected[t.key];
                    }
                }
            }
            return totals;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalsAll = computeTotals(bookings);
        const upcomingBookings = bookings.filter(b => {
            if (!b.start) return true;
            return new Date(b.start) >= today;
        });
        const totalsUpcoming = computeTotals(upcomingBookings);

        return res.status(200).json({
            generatedAt: new Date().toISOString(),
            eventsCount: events.length,
            types,
            stock,
            totalsAll,
            totalsUpcoming,
            bookings,
            // DIAGNOSTIC : données brutes reçues de la table bike_types.
            // Ouvre /api/booking-count pour comparer les descriptions réelles
            // de la BDD (bikeTypesRaw) avec celles transformées (types).
            bikeTypesRaw: bikeTypes,
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};