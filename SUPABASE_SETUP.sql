-- ============================================================
-- SCRIPT D'INSTALLATION - BASE DE DONNÉES VÉLOC'ANNECY
-- Exécutez dans SQL Editor de Supabase
-- Statuts : NULL (attente), 'arrived' (venu), 'noshow' (pas venu)
-- ============================================================

DROP TABLE IF EXISTS employee_sessions;
DROP TABLE IF EXISTS reservation_items;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS fleet_history;
DROP TABLE IF EXISTS walkin_history;
DROP TABLE IF EXISTS bike_types;

CREATE TABLE reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_long_duration BOOLEAN DEFAULT FALSE,
    duration_days INTEGER DEFAULT 1,
    end_date TIMESTAMP WITH TIME ZONE,
    status TEXT CHECK (status IN ('arrived', 'noshow')),
    notes TEXT DEFAULT '',
    device_name TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE reservation_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    bike_type TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    bike_size TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE bike_types : SOURCE UNIQUE de configuration
-- Chaque ligne lie :
--   - key               : identifiant du type (utilisé dans detected)
--   - label             : nom affiché dans l'interface
--   - match_keywords    : mots-clés reconnus dans les textes de réservation
--   - fleet_key         : clé utilisée dans fleet_history.totals (NULL = key)
--   - is_child_size     : TRUE si c'est un vélo enfant (compté dans "Enfants")
--   - require_number    : TRUE si un nombre est obligatoire avant le mot-clé
-- ============================================================
CREATE TABLE bike_types (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    icon TEXT DEFAULT '🚲',
    description TEXT DEFAULT '',
    default_total INTEGER DEFAULT 0,
    match_keywords TEXT[] DEFAULT '{}',
    fleet_key TEXT,
    is_child_size BOOLEAN DEFAULT FALSE,
    require_number BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO bike_types (key, label, icon, description, default_total, match_keywords, fleet_key, is_child_size, require_number, sort_order) VALUES
    -- "enfant" est une SYNTHÈSE calculée automatiquement (somme des is_child_size).
    -- Il n'a pas de mots-clés propres et n'est pas lui-même is_child_size,
    -- sinon il serait additionné à lui-même (double comptage).
    ('enfant',         'Enfants (total)', '🧒',  'Synthèse automatique : somme des tailles enfants', 2,   '{}',                    'enfant',                 FALSE, FALSE, 14),
    ('vae',            'VAE',                   '⚡',  'ex : 1 vae', 70, '{vae, électrique, electrique, ebike, elec}',                              'vae',                     FALSE, FALSE, 2),
    ('vtc',            'VTC',                   '🚲',  'ex : 1 vtc', 70, '{vtc, classique, mecanique, mécanique}',                                    'vtc',                     FALSE, FALSE, 3),
    ('ville',          'Ville',                 '🏙️', 'ex : 1 ville', 10, '{ville}',                                                                  'ville',                   FALSE, FALSE, 4),
    ('route',          'Route',                 '🏁',  'ex : 1 route', 5,  '{route}',                                                                  'route',                   FALSE, FALSE, 5),
    ('tandem',         'Tandem',                '👫',  'ex : 1 tandem', 1,  '{tandem}',                                                                 'tandem',                  FALSE, FALSE, 6),
    ('siege',          'Siège',            '🍼',  'ex : 1 siège', 7,  '{siege, siège, siege enfant, siège enfant, siege bebe, siège bébé, bebe, bébé, porte}', 'siege', FALSE, FALSE, 7),
    ('charretteChien', 'Charrette chien',       '🐕',  'ex : 1 chien', 1,  '{charrette chien, charrettes chien, remorque chien}',                       'charretteChien',          FALSE, FALSE, 8),
    ('charrette',      'Charrette',  '🛞',  'ex : 1 charrette', 3,  '{charrette, charrettes, charette, carette, remorque}',                       'charrette',               FALSE, FALSE, 9),
    ('enfant-16p',     '16p',            '🧒',  '4 à 6 ans, ex : 1 16p', 1,  '{16p, 16 pouces, 16pouces, 16 p, 16 pouce, 16pouce}',                                 'enfant-16p',              TRUE,  FALSE, 10),
    ('enfant-20p',     '20p',            '🧒',  '6 à 8 ans, ex : 1 20p', 2,  '{20p, 20 pouces, 20pouces, 20 p, 20 pouce, 20pouce}',                                 'enfant-20p',              TRUE,  FALSE, 11),
    ('enfant-24p',     '24p',            '🧒',  '8 à 10 ans, ex : 1 24p', 2,  '{24p, 24 pouces, 24pouces, 24 p, 24 pouce, 24pouce}',                               'enfant-24p',              TRUE,  FALSE, 12),
    ('enfant-26p',     '26p',            '🧒',  '10 ans et +, ex : 1 26p', 2,  '{26p, 26 pouces, 26pouces, 26 p, 26 pouce, 26pouce}',                               'enfant-26p',              TRUE,  FALSE, 13);

-- Table flotte avec historique : une ligne par date, JSONB pour les totaux
CREATE TABLE fleet_history (
    date TEXT PRIMARY KEY,
    totals JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table flux libre (walk-in) : une ligne par date, JSONB pour les totaux anonymes
CREATE TABLE walkin_history (
    date TEXT PRIMARY KEY,
    totals JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ligne initiale pour aujourd'hui (clés = fleet_key des bike_types)
INSERT INTO fleet_history (date, totals)
VALUES (TO_CHAR(NOW(), 'YYYY-MM-DD'), '{"vae":70,"vtc":70,"ville":4,"route":1,"tandem":0,"siege":6,"charretteChien":1,"charrette":2,"enfant":10,"enfant-16p":1,"enfant-20p":4,"enfant-24p":1,"enfant-26p":4}');

CREATE INDEX idx_reservations_date ON reservations (start_date);
CREATE INDEX idx_reservations_status ON reservations (status);
CREATE INDEX idx_reservation_items_reservation ON reservation_items (reservation_id);
CREATE INDEX idx_fleet_history_date ON fleet_history (date);

CREATE TABLE employee_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_name TEXT NOT NULL,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_time TIMESTAMP WITH TIME ZONE,
    active_seconds INTEGER DEFAULT 0,
    device_name TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_employee_sessions_name ON employee_sessions (employee_name);
CREATE INDEX idx_employee_sessions_login ON employee_sessions (login_time);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE walkin_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bike_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accès complet réservations" ON reservations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Accès complet items" ON reservation_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Accès complet historique flotte" ON fleet_history FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Accès complet flux libre" ON walkin_history FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Accès complet types vélos" ON bike_types FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Accès complet sessions employés" ON employee_sessions FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- REALTIME : active la réplication temps réel pour les abonnements
-- postgres_changes (admin.js, resa.html s'abonnent déjà)
-- ============================================================
-- ⚠️ Si la publication n'existe pas (très rare) :
--    CREATE PUBLICATION supabase_realtime;
-- ⚠️ Si une table est déjà dans la publication, la commande
--    renvoie une erreur "already member" : la table est déjà activée.
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE reservation_items;
ALTER PUBLICATION supabase_realtime ADD TABLE fleet_history;
ALTER PUBLICATION supabase_realtime ADD TABLE walkin_history;
ALTER PUBLICATION supabase_realtime ADD TABLE bike_types;
ALTER PUBLICATION supabase_realtime ADD TABLE employee_sessions;

-- ============================================================
-- OPTIONNEL : recevoir les lignes complètes (anciennes + nouvelles)
-- sur UPDATE/DELETE dans les événements temps réel.
-- Défaut = seuls les clés primaires sont envoyées sur UPDATE.
-- ============================================================
-- ALTER TABLE reservations REPLICA IDENTITY FULL;
-- ALTER TABLE reservation_items REPLICA IDENTITY FULL;
-- ALTER TABLE fleet_history REPLICA IDENTITY FULL;

-- ============================================================
-- MISE À JOUR D'UNE BASE EXISTANTE
-- Si vos tables existent déjà, exécutez UNIQUEMENT ce bloc :
-- ============================================================
-- ALTER TABLE bike_types ADD COLUMN IF NOT EXISTS match_keywords TEXT[] DEFAULT '{}';
-- ALTER TABLE bike_types ADD COLUMN IF NOT EXISTS fleet_key TEXT;
-- ALTER TABLE bike_types ADD COLUMN IF NOT EXISTS is_child_size BOOLEAN DEFAULT FALSE;
-- ALTER TABLE bike_types ADD COLUMN IF NOT EXISTS require_number BOOLEAN DEFAULT FALSE;

-- INSERT INTO bike_types (key, label, icon, description, default_total, match_keywords, fleet_key, is_child_size, require_number, sort_order) VALUES
--     ('enfant', 'Enfants (total équipe)', '🧒', 'Synthèse', 2, '{enfant, junior, vélo enfant, vélo junior, velo enfant, velo junior}', 'enfant', TRUE, TRUE, 1)
-- ON CONFLICT (key) DO UPDATE SET
--     match_keywords = EXCLUDED.match_keywords,
--     fleet_key = EXCLUDED.fleet_key,
--     is_child_size = EXCLUDED.is_child_size,
--     require_number = EXCLUDED.require_number,
--     sort_order = EXCLUDED.sort_order;
-- ... (répéter pour chaque type, voir les INSERT ci-dessus)
--
-- Puis ajouter les nouvelles clés au stock du jour :
-- UPDATE fleet_history
-- SET totals = totals || '{"ville":10,"route":5,"charretteChien":1,"charrette":3,"enfant":2}'::jsonb,
--     updated_at = NOW()
-- WHERE date = TO_CHAR(NOW(), 'YYYY-MM-DD');

-- Activer le Realtime sur une base EXISTANTE :
-- ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE reservation_items;
-- ALTER PUBLICATION supabase_realtime ADD TABLE fleet_history;
-- ALTER PUBLICATION supabase_realtime ADD TABLE walkin_history;
-- ALTER PUBLICATION supabase_realtime ADD TABLE bike_types;
-- (Si "already member" → la table est déjà activée, aucune action)

-- ============================================================
-- Données de démo
-- ============================================================
-- INSERT INTO reservations (client_name, client_phone, start_date, is_long_duration, duration_days)
-- VALUES
--     ('Jean', '0612345678', NOW() + INTERVAL '1 day' + INTERVAL '9 hours', FALSE, 1),
--     ('Marie', '0678901234', NOW() + INTERVAL '1 day' + INTERVAL '10 hours', FALSE, 1),
--     ('Pierre', '0645678901', NOW() + INTERVAL '2 days' + INTERVAL '14 hours', TRUE, 3),
--     ('Sophie', '0611122233', NOW() + INTERVAL '1 day' + INTERVAL '9 hours', FALSE, 1);

-- INSERT INTO reservation_items (reservation_id, bike_type, quantity)
-- SELECT id, 'vae', 2 FROM reservations WHERE client_name = 'Jean';
-- INSERT INTO reservation_items (reservation_id, bike_type, quantity)
-- SELECT id, 'vtc', 1 FROM reservations WHERE client_name = 'Marie';
-- INSERT INTO reservation_items (reservation_id, bike_type, quantity)
-- SELECT id, 'tandem', 1 FROM reservations WHERE client_name = 'Pierre';
-- INSERT INTO reservation_items (reservation_id, bike_type, quantity, bike_size)
-- SELECT id, 'enfant-20p', 2, '20p' FROM reservations WHERE client_name = 'Sophie';
-- INSERT INTO reservation_items (reservation_id, bike_type, quantity, bike_size)
-- SELECT id, 'enfant-24p', 1, '24p' FROM reservations WHERE client_name = 'Sophie';