// ============================================================
// CONFIGURATION SUPABASE - VÉLOC'ANNECY
//
// 🔧 Instructions :
// 1. Créez un compte sur https://supabase.com
// 2. Créez un projet "veloc-annecy"
// 3. Settings → API → copiez URL + anon key
// 4. Exécutez le script SQL (voir SUPABASE_SETUP.sql)
// BDD password : cZO32WgVVGTLrobw
// ============================================================

const SUPABASE_CONFIG = {
    // 👇 REMPLACEZ par vos vraies clés Supabase
    url: 'https://kltvxgupcfscdzjorxtu.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsdHZ4Z3VwY2ZzY2R6am9yeHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMDEyNDEsImV4cCI6MjA5OTc3NzI0MX0.V4VT_xHbquzA-IeL3YOFEJYVrrcnaV9QmI-dRSiFHb8'
};

// Variable globale pour le client
window._supabase = null;

function initSupabase() {
    try {
        if (SUPABASE_CONFIG.url.includes('veloc')) {
            console.warn('⚠️ Supabase non configuré - utilisation du localStorage');
            return null;
        }

        window._supabase = supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey
        );
        console.log('✅ Supabase connecté');
        return window._supabase;
    } catch (e) {
        console.error('❌ Erreur Supabase:', e);
        return null;
    }
}

// Vérifie que la table existe
async function isSupabaseReady() {
    const client = window._supabase;
    if (!client) return false;
    try {
        const { error } = await client
            .from('reservations')
            .select('id', { count: 'exact', head: true });
        return !error;
    } catch {
        return false;
    }
}