/**
 * API Vercel — Comptage des réservations depuis un calendrier iCloud public
 *
 * Récupère le calendrier public iCloud (fichier ICS) et applique la même
 * logique regex que le script booking_count.js.
 *
 * Variable d'environnement requise (Vercel → Settings → Environment Variables) :
 *   CALENDAR_URL = lien public du calendrier iCloud
 *                  (ex: webcal://pXX-caldav.icloud.com/published/...)
 *
 * Déploiement : ce fichier dans le dossier /api est automatiquement
 * détecté par Vercel comme une Serverless Function.
 */

/**
 * Extrait le nombre associé à un mot-clé dans un texte.
 * Si aucun nombre trouvé, retourne 1 (implicite : "1 vtc" = "vtc").
 */
function extractCount(text, regex) {
    let match;
    let total = 0;
    const re = new RegExp(regex.source, 'gi');
    while ((match = re.exec(text)) !== null) {
        const count = match[1] !== undefined && match[1] !== '' ? parseInt(match[1], 10) : 1;
        total += count;
        if (match.index === re.lastIndex) re.lastIndex++;
    }
    return total;
}

// Patterns identiques à booking_count.js
const PATTERNS = [
    { key: 'charretteChien', regex: /(\d+)\s*(?:charrettes?\s+chien|remorque\s+chien)/i },
    { key: 'charrette',      regex: /(\d+)\s*(?:ch[ae]rettes?|remorque|carette)(?!\s+chien)/i },
    { key: 'siege',          regex: /(\d+)\s*(?:si[eè]ge(?:\s+(?:enfant|b[eé]b[eé]))?|b[eé]b[eé]\s*(?:si[eè]ge)?)/i },
    { key: 'enfant',         regex: /(\d+)\s*(?:v[eé]lo\s+(?:enfant|junior)|enfant|junior)/i },
    { key: 'tandem',         regex: /(\d+)\s*tandem/i },
    { key: 'vtc',            regex: /(\d+)\s*(?:vtc|classique|m[eé]canique)/i },
    { key: 'vae',            regex: /(\d+)\s*(?:vae|[eé]lectrique|ebike|elec)/i },
    { key: 'ville',          regex: /(\d+)\s*ville/i },
    { key: 'route',          regex: /(\d+)\s*route/i },
    { key: 'p16',            regex: /(?:\b|[^\d])(?:(\d+)\s*)?16\s*(?:p|pouces)\b/i },
    { key: 'p20',            regex: /(?:\b|[^\d])(?:(\d+)\s*)?20\s*(?:p|pouces)\b/i },
    { key: 'p24',            regex: /(?:\b|[^\d])(?:(\d+)\s*)?24\s*(?:p|pouces)\b/i },
    { key: 'p26',            regex: /(?:\b|[^\d])(?:(\d+)\s*)?26\s*(?:p|pouces)\b/i },
];

// Stock total de vélos (à ajuster si besoin)
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

/**
 * Analyse un texte de réservation et retourne les compteurs locaux détectés.
 */
function processBookingText(text) {
    const local = {};
    for (const pattern of PATTERNS) {
        const count = extractCount(text, pattern.regex);
        if (count > 0) {
            local[pattern.key] = (local[pattern.key] || 0) + count;
        }
    }
    return local;
}

/**
 * Parse une date ICS (DTSTART) en objet Date JS.
 * Formats gérés :
 *   - 20260807               (journée entière)
 *   - 20260807T090000        (heure locale)
 *   - 20260807T090000Z       (heure UTC)
 *   - ;TZID=...:20260807T090000
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
 * Parse le contenu ICS et retourne la liste des événements non annulés.
 */
function parseICS(ics) {
    // Dépliage des lignes longues (continuations débutant par espace)
    const unfolded = ics.replace(/\r?\n[ \t]/g, '');
    const events = [];
    const blocks = unfolded.split('BEGIN:VEVENT');
    for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        if (/STATUS:CANCELLED/i.test(block)) continue;
        const summaryMatch = block.match(/^SUMMARY[^:]*:(.*)$/m);
        if (!summaryMatch) continue;
        const startMatch = block.match(/^DTSTART[^:]*:(.*)$/m);
        events.push({
            summary: summaryMatch[1].trim(),
            startDate: startMatch ? parseICSDate(startMatch[1]) : null,
        });
    }
    return events;
}

/**
 * Calcule les totaux globaux. Les vélos pouces (16p/20p/24p/26p)
 * sont aussi comptés dans enfant, comme dans le script d'origine.
 */
function computeTotals(bookings) {
    const totals = {};
    for (const k of Object.keys(STOCK)) totals[k] = 0;
    for (const b of bookings) {
        for (const k in b.detected) {
            if (totals[k] !== undefined) totals[k] += b.detected[k];
            if (['p16', 'p20', 'p24', 'p26'].includes(k)) totals.enfant += b.detected[k];
        }
    }
    return totals;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');

    const calendarUrl = process.env.CALENDAR_URL;
    if (!calendarUrl) {
        return res.status(500).json({
            error: 'CALENDAR_URL non configuré',
            hint: "Ajoutez le lien public du calendrier iCloud dans les variables d'environnement Vercel. Voir INSTRUCTIONS_MOBILE.md"
        });
    }

    try {
        // webcal:// → https:// pour pouvoir télécharger le fichier
        const icsUrl = calendarUrl.replace(/^webcal:\/\//i, 'https://');
        const response = await fetch(icsUrl);
        if (!response.ok) {
            throw new Error(`Impossible de télécharger le calendrier (HTTP ${response.status})`);
        }
        const ics = await response.text();

        const events = parseICS(ics);
        const bookings = events.map(e => ({
            summary: e.summary,
            start: e.startDate ? e.startDate.toISOString() : null,
            detected: processBookingText(e.summary.toLowerCase()),
        }));

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalsAll = computeTotals(bookings);
        const upcomingBookings = bookings.filter(b => {
            if (!b.start) return true; // date inconnue → on la compte
            return new Date(b.start) >= today;
        });
        const totalsUpcoming = computeTotals(upcomingBookings);

        return res.status(200).json({
            generatedAt: new Date().toISOString(),
            eventsCount: events.length,
            stock: STOCK,
            totalsAll,
            totalsUpcoming,
            bookings,
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};