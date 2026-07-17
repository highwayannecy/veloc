-- ============================================================
-- SCRIPT D'INSTALLATION - BASE DE DONNÉES VÉLOC'ANNECY
-- Exécutez dans SQL Editor de Supabase
-- Statuts : NULL (attente), 'arrived' (venu), 'noshow' (pas venu)
-- ============================================================

DROP TABLE IF EXISTS reservation_items;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS fleet;

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

-- Table flotte (1 seule ligne avec les totaux)
CREATE TABLE fleet (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    vae INTEGER NOT NULL DEFAULT 20,
    vtc INTEGER NOT NULL DEFAULT 20,
    tandem INTEGER NOT NULL DEFAULT 6,
    "enfant-16p" INTEGER NOT NULL DEFAULT 3,
    "enfant-20p" INTEGER NOT NULL DEFAULT 3,
    "enfant-24p" INTEGER NOT NULL DEFAULT 3,
    "enfant-26p" INTEGER NOT NULL DEFAULT 3,
    siege INTEGER NOT NULL DEFAULT 10,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ligne initiale
INSERT INTO fleet (vae, vtc, tandem, "enfant-16p", "enfant-20p", "enfant-24p", "enfant-26p", siege)
VALUES (20, 20, 6, 3, 3, 3, 3, 10);

CREATE INDEX idx_reservations_date ON reservations (start_date);
CREATE INDEX idx_reservations_status ON reservations (status);
CREATE INDEX idx_reservation_items_reservation ON reservation_items (reservation_id);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accès complet réservations" ON reservations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Accès complet items" ON reservation_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Accès complet flotte" ON fleet FOR ALL TO anon USING (true) WITH CHECK (true);

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