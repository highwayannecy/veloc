/**
 * API Vercel — Temps de lecture des procédures par les employés
 *
 * Endpoints :
 *   GET /api/employee-time                       → toutes les lectures
 *   GET /api/employee-time?employee=Jean         → filtre par employé
 *   GET /api/employee-time?procedure=ouverture   → filtre par procédure (clé)
 *   GET /api/employee-time?from=2026-08-01       → lectures depuis une date
 *   GET /api/employee-time?to=2026-08-17         → lectures jusqu'à une date
 *   GET /api/employee-time?today=1               → lectures du jour uniquement
 *
 * Variables d'environnement requises (Vercel → Settings → Environment Variables) :
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
 * Formate une durée (secondes) en "Xh YYmin" ou "YYmin" ou "Xs".
 */
function formatDuration(totalSeconds) {
    totalSeconds = Math.max(0, Math.round(totalSeconds || 0));
    if (totalSeconds === 0) return '0s';
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes < 60) {
        return seconds > 0 ? `${minutes}min ${seconds}s` : `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return remMinutes > 0 ? `${hours}h ${remMinutes}min` : `${hours}h`;
}

/**
 * Calcule le temps actif total à partir des secondes.
 */
function computeActiveSeconds(row) {
    return Math.max(0, Math.round(row.active_seconds || 0));
}

// ============================================================
// 2. FONCTION PRINCIPALE
// ============================================================

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');

    const { employee, procedure, from, to, today, limit = '100' } = req.query;

    try {
        // ---------- CONSTRUCTION DE LA REQUÊTE ----------
        const query = {
            select: 'id,employee_name,procedure_key,procedure_title,view_start,view_end,active_seconds,device_name,created_at',
            order: 'view_start.desc',
            limit: String(Math.min(parseInt(limit, 10) || 100, 500)),
        };

        if (employee) {
            query['employee_name'] = `ilike.${employee}`;
        }

        if (procedure) {
            query['procedure_key'] = `ilike.${procedure}`;
        }

        if (today === '1') {
            // Lectures du jour (fuseau serveur UTC — bonne approximation)
            const todayStr = new Date().toISOString().slice(0, 10);
            query['view_start'] = `gte.${todayStr}T00:00:00Z`;
        }

        if (from) {
            const fromDate = new Date(from);
            if (isNaN(fromDate.getTime())) {
                return res.status(400).json({ error: 'Paramètre "from" invalide. Format: YYYY-MM-DD' });
            }
            query['view_start'] = `gte.${fromDate.toISOString()}`;
        }

        if (to) {
            const toDate = new Date(to);
            if (isNaN(toDate.getTime())) {
                return res.status(400).json({ error: 'Paramètre "to" invalide. Format: YYYY-MM-DD' });
            }
            // Fin de journée inclusive
            toDate.setHours(23, 59, 59, 999);
            query['view_start'] = query['view_start']
                ? `${query['view_start']}&view_start=lte.${toDate.toISOString()}`
                : `lte.${toDate.toISOString()}`;
        }

        // ---------- EXÉCUTION ----------
        const views = await supabaseFetch('employee_procedure_views', query);

        // ---------- AGRÉGATION ----------
        const formattedViews = views.map(v => ({
            id: v.id,
            employee: v.employee_name || '',
            procedureKey: v.procedure_key || '',
            procedureTitle: v.procedure_title || v.procedure_key || '',
            viewStart: v.view_start,
            viewEnd: v.view_end,
            activeSeconds: computeActiveSeconds(v),
            activeDuration: formatDuration(computeActiveSeconds(v)),
            device: v.device_name || '',
            createdAt: v.created_at,
        }));

        // Totaux par (employé × procédure)
        const totalsByRow = {};
        formattedViews.forEach(v => {
            const key = v.employee.toLowerCase() + '||' + v.procedureKey.toLowerCase();
            if (!totalsByRow[key]) {
                totalsByRow[key] = {
                    employee: v.employee,
                    procedureKey: v.procedureKey,
                    procedureTitle: v.procedureTitle,
                    openCount: 0,
                    totalActiveSeconds: 0,
                    totalActiveDuration: '',
                    lastView: v.viewStart || null,
                };
            }
            totalsByRow[key].openCount++;
            totalsByRow[key].totalActiveSeconds += v.activeSeconds;
            if (v.viewStart && (!totalsByRow[key].lastView || new Date(v.viewStart) > new Date(totalsByRow[key].lastView))) {
                totalsByRow[key].lastView = v.viewStart;
            }
        });
        Object.values(totalsByRow).forEach(t => {
            t.totalActiveDuration = formatDuration(t.totalActiveSeconds);
        });

        // Totaux par employé
        const totalsByEmployee = {};
        formattedViews.forEach(v => {
            const key = v.employee.toLowerCase();
            if (!totalsByEmployee[key]) {
                totalsByEmployee[key] = {
                    employee: v.employee,
                    procedureCount: 0,
                    totalActiveSeconds: 0,
                    totalActiveDuration: '',
                };
            }
            totalsByEmployee[key].procedureCount++;
            totalsByEmployee[key].totalActiveSeconds += v.activeSeconds;
        });
        Object.values(totalsByEmployee).forEach(t => {
            t.totalActiveDuration = formatDuration(t.totalActiveSeconds);
        });

        const totalActiveAll = formattedViews.reduce((acc, v) => acc + v.activeSeconds, 0);

        return res.status(200).json({
            generatedAt: new Date().toISOString(),
            count: formattedViews.length,
            totalActiveSeconds: totalActiveAll,
            totalActiveDuration: formatDuration(totalActiveAll),
            totalsByEmployee: Object.values(totalsByEmployee).sort((a, b) =>
                b.totalActiveSeconds - a.totalActiveSeconds
            ),
            totalsByProcedure: Object.values(totalsByRow).sort((a, b) =>
                b.totalActiveSeconds - a.totalActiveSeconds
            ),
            views: formattedViews,
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};