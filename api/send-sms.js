/**
 * API Vercel — Envoi d'un SMS de confirmation via Twilio
 *
 * Appelée par reservation.html après l'enregistrement d'une réservation.
 * Non bloquante : si le SMS échoue, la réservation reste enregistrée.
 *
 * Variables d'environnement requises (Vercel → Settings → Environment Variables) :
 *   TWILIO_ACCOUNT_SID   = SID du compte Twilio
 *   TWILIO_AUTH_TOKEN    = Token d'authentification Twilio
 *   TWILIO_PHONE_NUMBER  = Numéro expéditeur (format E.164, ex: +33612345678)
 *
 * Body POST attendu :
 *   {
 *     phone:      "0612345678",          // téléphone du client
 *     clientName: "Jean",
 *     startDate:  "2026-08-10T09:00:00", // date/heure de début (ISO)
 *     summary:    "2 VTC + 1 VAE"        // détail des vélos (optionnel)
 *   }
 */

/**
 * Normalise un numéro français vers le format E.164 (+33...).
 * Gère : 0612345678, +33612345678, 0033612345678, avec espaces/tirets.
 */
function toE164(phone) {
    if (!phone) return null;
    let p = String(phone).replace(/[\s.\-()]/g, '');
    if (p.startsWith('00')) p = '+' + p.slice(2);
    else if (p.startsWith('0')) p = '+33' + p.slice(1);
    else if (p && !p.startsWith('+')) p = '+' + p;
    return p;
}

/**
 * Formate la date/heure en français (ex : "mar. 10/08 à 9h00").
 */
function formatDateFR(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const day = d.toLocaleDateString('fr-FR', { weekday: 'short' });
    const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${day} ${date} à ${h}h${m}`;
}

/**
 * Construit le message SMS (≤ 160 caractères).
 */
function buildMessage(data) {
    const name = (data.clientName || '').trim();
    const when = formatDateFR(data.startDate);
    const summary = (data.summary || '').trim();

    let msg = `Bonjour ${name}, votre réservation Véloc est confirmée.`;
    if (when) msg += ` RDV ${when}.`;
    if (summary) msg += ` ${summary}.`;
    msg += ' A bientôt !';

    // Limite SMS 160 caractères
    if (msg.length > 160) {
        msg = `Bonjour ${name}, votre réservation Véloc est confirmée.`;
        if (when) msg += ` RDV ${when}.`;
        msg = msg.slice(0, 157) + '...';
    }
    return msg;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
    }

    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
        return res.status(500).json({
            ok: false,
            error: 'Twilio non configuré (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER)',
        });
    }

    const data = req.body || {};
    const to = toE164(data.phone);
    if (!to) {
        return res.status(400).json({ ok: false, error: 'Téléphone manquant ou invalide' });
    }

    const message = buildMessage(data);

    try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const body = new URLSearchParams({
            To: to,
            From: TWILIO_PHONE_NUMBER,
            Body: message,
        }).toString();

        const twilioRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
        });

        const result = await twilioRes.json();

        if (!twilioRes.ok) {
            console.warn('⚠️ SMS Twilio en échec:', result.message || result.code);
            return res.status(502).json({ ok: false, error: result.message || 'Erreur Twilio' });
        }

        return res.status(200).json({ ok: true, sid: result.sid });
    } catch (err) {
        console.warn('⚠️ Erreur envoi SMS:', err.message);
        return res.status(500).json({ ok: false, error: err.message });
    }
};