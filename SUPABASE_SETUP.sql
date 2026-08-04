-- ============================================================
-- SCRIPT D'INSTALLATION - BASE DE DONNÉES VÉLOC'ANNECY
-- Exécutez dans SQL Editor de Supabase
-- Statuts : NULL (attente), 'arrived' (venu), 'noshow' (pas venu)
-- ============================================================

DROP TABLE IF EXISTS reservation_items;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS fleet_history;
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

-- Table des types de vélos (modifiable par l'admin)
CREATE TABLE bike_types (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    icon TEXT DEFAULT '🚲',
    description TEXT DEFAULT '',
    default_total INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO bike_types (key, label, icon, description, default_total, sort_order) VALUES
    ('vae', 'VAE', '⚡', '', 70, 1),
    ('vtc', 'VTC', '🚲', '', 70, 2),
    ('tandem', 'Tandem', '👫', '', 1, 3),
    ('enfant-16p', 'Enfant 16p', '🧒', '4 à 6 ans', 1, 4),
    ('enfant-20p', 'Enfant 20p', '🧒', '6 à 8 ans', 2, 5),
    ('enfant-24p', 'Enfant 24p', '🧒', '8 à 10 ans', 2, 6),
    ('enfant-26p', 'Enfant 26p', '🧒', '10 ans et +', 2, 7),
    ('siege', 'Siège bébé', '🍼', '', 7, 8);

-- Table flotte avec historique : une ligne par date, JSONB pour les totaux
CREATE TABLE fleet_history (
    date TEXT PRIMARY KEY,
    totals JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ligne initiale pour aujourd'hui
INSERT INTO fleet_history (date, totals)
VALUES (TO_CHAR(NOW(), 'YYYY-MM-DD'), '{"vae":70,"vtc":70,"tandem":1,"enfant-16p":1,"enfant-20p":2,"enfant-24p":2,"enfant-26p":2,"siege":7}');

CREATE INDEX idx_reservations_date ON reservations (start_date);
CREATE INDEX idx_reservations_status ON reservations (status);
CREATE INDEX idx_reservation_items_reservation ON reservation_items (reservation_id);
CREATE INDEX idx_fleet_history_date ON fleet_history (date);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bike_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accès complet réservations" ON reservations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Accès complet items" ON reservation_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Accès complet historique flotte" ON fleet_history FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Accès complet types vélos" ON bike_types FOR ALL TO anon USING (true) WITH CHECK (true);

-- Données de démo
INSERT INTO reservations (client_name, client_phone, start_date, is_long_duration, duration_days)
VALUES
    ('Jean', '0612345678', NOW() + INTERVAL '1 day' + INTERVAL '9 hours', FALSE, 1),
    ('Marie', '0678901234', NOW() + INTERVAL '1 day' + INTERVAL '10 hours', FALSE, 1),
    ('Pierre', '0645678901', NOW() + INTERVAL '2 days' + INTERVAL '14 hours', TRUE, 3),
    ('Sophie', '0611122233', NOW() + INTERVAL '1 day' + INTERVAL '9 hours', FALSE, 1);

INSERT INTO reservation_items (reservation_id, bike_type, quantity)
SELECT id, 'vae', 2 FROM reservations WHERE client_name = 'Jean';
INSERT INTO reservation_items (reservation_id, bike_type, quantity)
SELECT id, 'vtc', 1 FROM reservations WHERE client_name = 'Marie';
INSERT INTO reservation_items (reservation_id, bike_type, quantity)
SELECT id, 'tandem', 1 FROM reservations WHERE client_name = 'Pierre';
INSERT INTO reservation_items (reservation_id, bike_type, quantity, bike_size)
SELECT id, 'enfant-20p', 2, '20p' FROM reservations WHERE client_name = 'Sophie';
INSERT INTO reservation_items (reservation_id, bike_type, quantity, bike_size)
SELECT id, 'enfant-24p', 1, '24p' FROM reservations WHERE client_name = 'Sophie';