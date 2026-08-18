// ============================================================
// SUIVI DU TEMPS DE LECTURE PAR PROCÉDURE — VÉLOC'ANNECY
// Utilisé par procedure.html (page unique paramétrée ?id=xxx)
// ============================================================

(function () {
    // --- Constantes ---
    const SESSION_KEY = 'veloc_employee_session';
    const VIEWS_KEY_PREFIX = 'veloc_proc_view_';

    // Session de connexion (shared avec connexion.html / procedures.html)
    function getSession() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            const session = JSON.parse(raw);
            if (!session.employeeName) return null;
            return session;
        } catch {
            return null;
        }
    }

    const session = getSession();

    // --- État ---
    let activeSeconds = 0;
    let lastTick = Date.now();
    let isPageVisible = document.visibilityState === 'visible';
    let syncInProgress = false;
    let lastSyncSeconds = -1;
    let lastSync = false;
    let viewId = null;
    let timersStarted = false;

    // Identifiants de la procédure lue
    const procId = new URLSearchParams(window.location.search).get('id') || '';
    const procTitle = document.title;

    if (!session || !session.employeeName) {
        // Pas de session → redirection vers la connexion
        window.location.href = 'connexion.html';
        return;
    }

    // --- Initialisation Supabase ---
    initSupabase();

    // --- Helpers ---
    function detectDevice() {
        const ua = navigator.userAgent;
        if (/iPhone/i.test(ua)) return '📱 iPhone';
        if (/iPad/i.test(ua)) return '📱 iPad';
        if (/Android/i.test(ua)) return '📱 Android';
        if (/Mac/i.test(ua)) return '💻 Mac';
        if (/Windows/i.test(ua)) return '💻 PC Windows';
        if (/Linux/i.test(ua)) return '💻 Linux';
        return '📱 Appareil inconnu';
    }

    function computeElapsed() {
        if (!isPageVisible) return 0;
        const now = Date.now();
        const elapsed = Math.floor((now - lastTick) / 1000);
        lastTick = now;
        return elapsed;
    }

    // --- Création de la vue (ligne dans employee_procedure_views) ---
    async function createView() {
        if (!window._supabase) {
            try { initSupabase(); } catch (e) { /* déjà init */ }
        }
        if (!window._supabase) {
            viewId = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            return;
        }
        try {
            const { data, error } = await window._supabase
                .from('employee_procedure_views')
                .insert([{
                    employee_name: session.employeeName,
                    procedure_key: procId,
                    procedure_title: procTitle,
                    device_name: detectDevice()
                }])
                .select('id')
                .single();
            if (!error && data) {
                viewId = data.id;
            } else {
                viewId = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            }
        } catch (e) {
            viewId = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        }
        localStorage.setItem(VIEWS_KEY_PREFIX + procId + '_viewId', viewId || '');
    }

    // --- Synchronisation du temps ---
    async function syncView(force = false) {
        if (syncInProgress || !viewId) return;
        if (!force && activeSeconds - lastSyncSeconds < 5) return;

        syncInProgress = true;
        try {
            if (window._supabase && !String(viewId).startsWith('local_')) {
                const { error } = await window._supabase
                    .from('employee_procedure_views')
                    .update({
                        active_seconds: activeSeconds,
                        view_end: new Date().toISOString()
                    })
                    .eq('id', viewId);
                if (!error) lastSyncSeconds = activeSeconds;
            }
        } catch (e) {
            console.warn('⚠️ Sync vue procédure impossible:', e.message);
        } finally {
            syncInProgress = false;
        }
    }

    // --- Finalisation ---
    function finalizeView() {
        if (!viewId) return;
        activeSeconds += computeElapsed();

        if (window._supabase && !String(viewId).startsWith('local_')) {
            window._supabase
                .from('employee_procedure_views')
                .update({
                    active_seconds: activeSeconds,
                    view_end: new Date().toISOString()
                })
                .eq('id', viewId)
                .then(() => { /* ok */ })
                .catch(() => { /* silencieux */ });
        }
    }

    // --- Démarre les timers (une seule fois) ---
    function startTimers() {
        if (timersStarted) return;
        timersStarted = true;

        // Timer : 1 tick / s, sync toutes les 30s, première sync après 5s
        setInterval(() => {
            activeSeconds += computeElapsed();

            if (!lastSync && activeSeconds >= 5 && viewId) {
                lastSync = true;
                syncView(true);
                return;
            }
            if (activeSeconds > 0 && activeSeconds % 30 === 0) {
                syncView();
            }
        }, 1000);

        // Visibilité : pause quand onglet masqué, reprise quand visible
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                isPageVisible = true;
                lastTick = Date.now();
                syncView(true);
            } else {
                activeSeconds += computeElapsed();
                isPageVisible = false;
                syncView(true);
            }
        });

        // Fermeture / navigation
        window.addEventListener('beforeunload', () => {
            finalizeView();
        });
    }

    // --- Expose l'API publique ---
    window.ProcedureTracker = {
        getViewId: () => viewId,
        getActiveSeconds: () => activeSeconds,
        finalize: finalizeView,

        // Appelé par procedure.html une fois le DOM prêt
        init: async function () {
            const storedId = localStorage.getItem(VIEWS_KEY_PREFIX + procId + '_viewId');

            // Tentative de reprise d'une vue existante (si elle existe côté serveur)
            if (storedId && !String(storedId).startsWith('local_')) {
                try {
                    const { data, error } = await window._supabase
                        .from('employee_procedure_views')
                        .select('id')
                        .eq('id', storedId)
                        .maybeSingle();
                    if (!error && data) {
                        viewId = storedId;
                        // Reprise de la vue existante → on démarre les timers
                        startTimers();
                        return;
                    }
                } catch (e) { /* fallback */ }
            }

            // Sinon créer une nouvelle vue, puis démarrer les timers
            localStorage.removeItem(VIEWS_KEY_PREFIX + procId + '_viewId');
            await createView();
            startTimers();
        }
    };
})();