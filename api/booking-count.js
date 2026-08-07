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
 * Requête REST simple vers Supabase (sans SDK, compatible API Vercel).
 */
async function supabaseFetch(path, query = {}) {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
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
        .map(bt => ({
            key: bt.key,
            label: bt.label || bt.key,
            icon: bt.icon || '🚲',
            fleetKey: bt.fleet_key || bt.key,
            isChildSize: !!bt.is_child_size,
            sortOrder: bt.sort_order || 0,
            hasKeywords: (bt.match_keywords || []).length > 0,
            regex: buildPattern(bt), // null si aucun mot-clé (interne uniquement, non sérialisé)
            requireNumber: !!bt.require_number,
        }))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
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
 * Parse une date ICS (DTSTART) en objet Date JS.
 */
function parseICSDate(str) {
    if (!str) return null;
    const colonIdx = str.indexOf(':');
    const value = colonIdx >= 0 ? str.slice(colonIdx + 1) : str;
    const isAllDay = /^\d{8}$/.test(value);
    let y, mo, d, h = 0, mi = 0, s = 0;
    if (isAllDay) {
        y = +value.slice(0, 4);
        mo = +value.slice(4, 6) - 1;
        d = +value.slice(6, 8);
    } else {
        const main = value.replace(/Z$/, '');
        if (main.length < 15) return null;
        y = +main.slice(0, 4);
        mo = +main.slice(4, 6) - 1;
        d = +main.slice(6, 8);
        h = +main.slice(9, 11) || 0;
        mi = +main.slice(11, 13) || 0;
        s = +main.slice(13, 15) || 0;
    }
    const date = new Date(y, mo, d, h, mi, s);
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
        // Les regex sont générées depuis bike_types.match_keywords
        let bikeTypes = [];
        try {
            bikeTypes = await supabaseFetch('bike_types', {
                select: 'key,label,icon,match_keywords,fleet_key,is_child_size,require_number,sort_order,is_active',
                order: 'sort_order.asc',
            });
        } catch (supaErr) {
            // Si Supabase n'est pas configuré, on fonctionne en mode dégradé
            console.warn('⚠️ bike_types non chargés:', supaErr.message);
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
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};