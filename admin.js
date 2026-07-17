// ============================================================
// ADMIN VÉLOC'ANNECY v4
// - Boutons +/- pour les quantités
// - Tailles enfant séparées
// - Dernière réservation à 10h45
// - Statuts : aucun (attente), arrived (venu), noshow (pas venu)
// ============================================================

const STORAGE_KEY = 'veloc_reservations';
const STORAGE_ITEMS_KEY = 'veloc_reservation_items';

const FLEET_STORAGE_KEY = 'veloc_fleet';

function loadFleetLocal() {
    try {
        const data = localStorage.getItem(FLEET_STORAGE_KEY);
        if (data) return JSON.parse(data);
    } catch {}
    return null;
}

// FLOTTE initialisé avec les valeurs locales (synchrones)
const FLOTTE = (() => {
    const f = loadFleetLocal() || { vae: 20, vtc: 20, tandem: 6, 'enfant-16p': 3, 'enfant-20p': 3, 'enfant-24p': 3, 'enfant-26p': 3, siege: 10 };
    return {
        vae:    { label: 'VAE',       icon: '⚡', total: f.vae },
        vtc:    { label: 'VTC',       icon: '🚲', total: f.vtc },
        tandem: { label: 'Tandem',    icon: '👫', total: f.tandem },
        'enfant-16p': { label: 'Enfant 16p', icon: '🧒', total: f['enfant-16p'] },
        'enfant-20p': { label: 'Enfant 20p', icon: '🧒', total: f['enfant-20p'] },
        'enfant-24p': { label: 'Enfant 24p', icon: '🧒', total: f['enfant-24p'] },
        'enfant-26p': { label: 'Enfant 26p', icon: '🧒', total: f['enfant-26p'] },
        siege:  { label: 'Siège bébé', icon: '🍼', total: f.siege }
    };
})();

let _fleet = loadFleetLocal() || { vae: 20, vtc: 20, tandem: 6, 'enfant-16p': 3, 'enfant-20p': 3, 'enfant-24p': 3, 'enfant-26p': 3, siege: 10 };

function getFleet() { return _fleet; }

async function syncFleetFromDB() {
    if (useSupabase && window._supabase) {
        try {
            const { data, error } = await window._supabase
                .from('fleet')
                .select('*')
                .eq('id', 1)
                .single();
            if (!error && data) {
                const fleet = {
                    vae: data.vae, vtc: data.vtc, tandem: data.tandem,
                    'enfant-16p': data['enfant-16p'], 'enfant-20p': data['enfant-20p'],
                    'enfant-24p': data['enfant-24p'], 'enfant-26p': data['enfant-26p'],
                    siege: data.siege
                };
                _fleet = fleet;
                for (const [type, total] of Object.entries(fleet)) {
                    if (FLOTTE[type]) FLOTTE[type].total = total;
                }
                localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(fleet));
            }
        } catch (e) { /* fallback */ }
    }
}

async function saveFleetToDB(fleet) {
    localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(fleet));
    if (useSupabase && window._supabase) {
        try {
            await window._supabase
                .from('fleet')
                .upsert({ id: 1, ...fleet, updated_at: new Date().toISOString() }, { onConflict: 'id' });
        } catch (e) { /* fallback */ }
    }
}

async function updateFleet(fleet) {
    _fleet = fleet;
    for (const [type, total] of Object.entries(fleet)) {
        if (FLOTTE[type]) FLOTTE[type].total = total;
    }
    await saveFleetToDB(fleet);
}

let useSupabase = false;
let currentDateStr = '';

function getDateStr(d) {
    const date = new Date(d);
    return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
}

function formatDateLongFR(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

function formatTime(d) {
    const date = new Date(d);
    return String(date.getHours()).padStart(2, '0') + 'h' + String(date.getMinutes()).padStart(2, '0');
}

function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return getDateStr(d);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast ' + type + ' show';
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.classList.remove('show'), 3500);
}

function setDbStatus(online) {
    const el = document.getElementById('db-indicator');
    if (!el) return;
    if (online) { el.className = 'db-status online'; el.textContent = '☁️ Supabase'; }
    else if (useSupabase) { el.className = 'db-status offline'; el.textContent = '❌ Erreur DB'; }
    else { el.className = 'db-status offline'; el.textContent = '📁 Local'; }
}

// ---- COUCHE DONNÉES ----

async function loadReservations() {
    if (useSupabase && window._supabase) {
        try {
            const { data, error } = await window._supabase
                .from('reservations')
                .select('*, reservation_items(*)')
                .order('start_date', { ascending: false });
            if (!error && data) return data;
        } catch (e) { /* fallback */ }
    }
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        const items = localStorage.getItem(STORAGE_ITEMS_KEY);
        const reservations = data ? JSON.parse(data) : [];
        const allItems = items ? JSON.parse(items) : [];
        return reservations.map(r => ({ ...r, reservation_items: allItems.filter(i => i.reservation_id === r.id) }));
    } catch { return []; }
}

async function saveReservation(reservation, items, editId = null) {
    if (editId) {
        if (useSupabase && window._supabase) {
            try {
                await window._supabase.from('reservation_items').delete().eq('reservation_id', editId);
                const { error } = await window._supabase.from('reservations').update({
                    client_name: reservation.clientName,
                    client_phone: reservation.clientPhone,
                    start_date: reservation.startDate,
                    is_long_duration: reservation.isLongDuration,
                    duration_days: reservation.durationDays || 1,
                    end_date: reservation.endDate || null,
                    notes: reservation.notes || ''
                }).eq('id', editId);
                if (!error) {
                    for (const item of items) {
                        await window._supabase.from('reservation_items').insert([{
                            reservation_id: editId,
                            bike_type: item.bikeType,
                            quantity: item.quantity,
                            bike_size: item.bikeSize || null
                        }]);
                    }
                    return true;
                }
            } catch (e) { /* fallback */ }
        }
        let allRes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        let allItems = JSON.parse(localStorage.getItem(STORAGE_ITEMS_KEY) || '[]');
        const idx = allRes.findIndex(r => r.id === editId);
        if (idx !== -1) {
            allRes[idx] = { ...allRes[idx], ...reservation, id: editId };
            allItems = allItems.filter(i => i.reservation_id !== editId);
            for (const item of items) {
                allItems.push({ ...item, reservation_id: editId, id: generateId() });
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allRes));
            localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(allItems));
            return true;
        }
        return false;
    }

    if (useSupabase && window._supabase) {
        try {
            const { data: resData, error: resError } = await window._supabase
                .from('reservations')
                .insert([{
                    client_name: reservation.clientName,
                    client_phone: reservation.clientPhone,
                    start_date: reservation.startDate,
                    is_long_duration: reservation.isLongDuration,
                    duration_days: reservation.durationDays || 1,
                    end_date: reservation.endDate || null,
                    notes: reservation.notes || ''
                }])
                .select();
            if (!resError && resData && resData[0]) {
                const resId = resData[0].id;
                for (const item of items) {
                    await window._supabase.from('reservation_items').insert([{
                        reservation_id: resId,
                        bike_type: item.bikeType,
                        quantity: item.quantity,
                        bike_size: item.bikeSize || null
                    }]);
                }
                return true;
            }
        } catch (e) { /* fallback */ }
    }

    const allRes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const allItems = JSON.parse(localStorage.getItem(STORAGE_ITEMS_KEY) || '[]');
    const id = generateId();
    allRes.push({ ...reservation, id });
    for (const item of items) {
        allItems.push({ ...item, reservation_id: id, id: generateId() });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allRes));
    localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(allItems));
    return true;
}

async function updateReservationStatus(id, status) {
    if (useSupabase && window._supabase) {
        try {
            const { error } = await window._supabase.from('reservations').update({ status: status || null }).eq('id', id);
            if (!error) return true;
        } catch (e) { /* fallback */ }
    }
    const allRes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const idx = allRes.findIndex(r => r.id === id);
    if (idx !== -1) {
        if (status) allRes[idx].status = status;
        else delete allRes[idx].status;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allRes));
    }
    return true;
}

async function deleteReservation(id) {
    if (useSupabase && window._supabase) {
        try {
            await window._supabase.from('reservation_items').delete().eq('reservation_id', id);
            const { error } = await window._supabase.from('reservations').delete().eq('id', id);
            if (!error) return true;
        } catch (e) { /* fallback */ }
    }
    let allRes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    let allItems = JSON.parse(localStorage.getItem(STORAGE_ITEMS_KEY) || '[]');
    allRes = allRes.filter(r => r.id !== id);
    allItems = allItems.filter(i => i.reservation_id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allRes));
    localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(allItems));
    return true;
}

async function clearAllReservations() {
    if (!confirm('⚠️ Supprimer TOUTES les réservations ?')) return;
    if (!confirm('⚠️ Confirmation finale ?')) return;
    if (useSupabase && window._supabase) {
        try {
            await window._supabase.from('reservation_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await window._supabase.from('reservations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } catch (e) { /* fallback */ }
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_ITEMS_KEY);
    await renderDay(currentDateStr);
    showToast('Tout effacé', 'info');
}

function normalize(r) {
    return {
        id: r.id,
        clientName: r.client_name || r.clientName,
        clientPhone: r.client_phone || r.clientPhone,
        startDate: r.start_date || r.startDate,
        isLongDuration: r.is_long_duration !== undefined ? r.is_long_duration : (r.isLongDuration || false),
        durationDays: r.duration_days || r.durationDays || 1,
        endDate: r.end_date || r.endDate || null,
        status: r.status || null,
        notes: r.notes || '',
        createdAt: r.created_at || r.createdAt || new Date().toISOString(),
        items: (r.reservation_items || r.items || []).map(normalizeItem)
    };
}

// ---- NORMALISATION DES ITEMS (ancien format → nouveau) ----

function normalizeItem(item) {
    let bikeType = item.bike_type || item.bikeType;
    const bikeSize = item.bike_size || item.bikeSize || null;

    // Convertir ancien format "enfant" + size → "enfant-20p"
    if (bikeType === 'enfant' && bikeSize) {
        bikeType = 'enfant-' + bikeSize;
    }

    return {
        id: item.id,
        bikeType: bikeType,
        quantity: item.quantity || 1,
        bikeSize: null  // plus utilisé, la taille est dans le bikeType
    };
}

// ---- STOCK ----

async function computeStockForDate(dateStr) {
    const reservations = await loadReservations();
    const stock = {};
    for (const [type, cfg] of Object.entries(FLOTTE)) {
        stock[type] = { total: cfg.total, reserved: 0 };
    }
    reservations.forEach(r => {
        const nr = normalize(r);
        if (nr.status === 'noshow') return;
        const resDate = getDateStr(nr.startDate);
        let affectedDays = [resDate];
        if (nr.isLongDuration && nr.durationDays > 1) {
            for (let i = 0; i < nr.durationDays; i++) affectedDays.push(addDays(resDate, i));
            affectedDays = [...new Set(affectedDays)];
        }
        if (affectedDays.includes(dateStr)) {
            nr.items.forEach(item => {
                const bt = item.bikeType === 'enfant' && item.bikeSize ? 'enfant-' + item.bikeSize : item.bikeType;
                if (stock[bt]) stock[bt].reserved += item.quantity;
            });
        }
    });
    return stock;
}

async function renderStock(dateStr) {
    const stock = await computeStockForDate(dateStr);
    for (const [type, cfg] of Object.entries(FLOTTE)) {
        const available = Math.max(0, cfg.total - stock[type].reserved);
        const pct = cfg.total > 0 ? (available / cfg.total) * 100 : 0;
        const availEl = document.getElementById(`stock-${type}-avail`);
        const totalEl = document.getElementById(`stock-${type}-total`);
        const barEl = document.getElementById(`stock-${type}-bar`);
        const cardEl = document.getElementById(`stock-${type}`);
        if (availEl) availEl.textContent = available;
        if (totalEl) totalEl.textContent = cfg.total;
        if (barEl) barEl.style.width = pct + '%';
        if (cardEl) {
            cardEl.classList.remove('critical', 'low');
            if (available <= 0) cardEl.classList.add('critical');
            else if (available <= Math.ceil(cfg.total * 0.25)) cardEl.classList.add('low');
        }
    }
    // Barre "Enfant" principale (total des 4 tailles)
    const enfantTypes = ['enfant-16p', 'enfant-20p', 'enfant-24p', 'enfant-26p'];
    const totalEnfant = enfantTypes.reduce((sum, t) => sum + FLOTTE[t].total, 0);
    const reservedEnfant = enfantTypes.reduce((sum, t) => sum + (stock[t]?.reserved || 0), 0);
    const availEnfant = Math.max(0, totalEnfant - reservedEnfant);
    const pctEnfant = totalEnfant > 0 ? (availEnfant / totalEnfant) * 100 : 0;
    const enfantAvailEl = document.getElementById('stock-enfant-avail');
    const enfantTotalEl = document.getElementById('stock-enfant-total');
    const enfantBarEl = document.getElementById('stock-enfant-bar');
    const enfantCardEl = document.getElementById('stock-enfant');
    if (enfantAvailEl) enfantAvailEl.textContent = availEnfant;
    if (enfantTotalEl) enfantTotalEl.textContent = totalEnfant;
    if (enfantBarEl) enfantBarEl.style.width = pctEnfant + '%';
    if (enfantCardEl) {
        enfantCardEl.classList.remove('critical', 'low');
        if (availEnfant <= 0) enfantCardEl.classList.add('critical');
        else if (availEnfant <= Math.ceil(totalEnfant * 0.25)) enfantCardEl.classList.add('low');
    }

    updateStockIndicators(stock);
}

function updateStockIndicators(stock) {
    document.querySelectorAll('.bike-qty-item').forEach(el => {
        const bikeType = el.dataset.bike;
        if (!bikeType || !stock[bikeType]) return;
        const cfg = FLOTTE[bikeType];
        const available = Math.max(0, cfg.total - stock[bikeType].reserved);
        const indicator = el.querySelector('.stock-indicator');
        if (indicator) {
            indicator.textContent = available;
            indicator.className = 'stock-indicator';
            if (available <= 0) indicator.classList.add('stock-no');
            else if (available <= Math.ceil(cfg.total * 0.25)) indicator.classList.add('stock-low');
            else indicator.classList.add('stock-ok');
        }
        const plusBtn = el.querySelector('.qty-plus');
        const val = parseInt(el.querySelector('.qty-value').value) || 0;
        if (plusBtn) plusBtn.disabled = val >= available;
    });
}

// ---- CONTROLES +/- ----

function setupQtyControls() {
    document.querySelectorAll('.qty-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.bike-qty-item');
            const valEl = item.querySelector('.qty-value');
            let val = parseInt(valEl.value) || 0;
            if (val > 0) { val--; valEl.value = val; }
            updatePlusButtons(item);
        });
    });
    document.querySelectorAll('.qty-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.bike-qty-item');
            const valEl = item.querySelector('.qty-value');
            const max = parseInt(item.querySelector('.stock-indicator').textContent) || 0;
            let val = parseInt(valEl.value) || 0;
            if (val < max) { val++; valEl.value = val; }
            updatePlusButtons(item);
        });
    });
}

function updatePlusButtons(item) {
    const val = parseInt(item.querySelector('.qty-value').value) || 0;
    const max = parseInt(item.querySelector('.stock-indicator').textContent) || 0;
    const plusBtn = item.querySelector('.qty-plus');
    if (plusBtn) plusBtn.disabled = val >= max;
}

function getQtyValues() {
    const items = [];
    document.querySelectorAll('.bike-qty-item').forEach(el => {
        const bikeType = el.dataset.bike;
        const qty = parseInt(el.querySelector('.qty-value').value) || 0;
        if (qty > 0) items.push({ bikeType, quantity: qty, bikeSize: null });
    });
    return items;
}

function setQtyValues(items) {
    document.querySelectorAll('.qty-value').forEach(el => el.value = '0');
    items.forEach(item => {
        const el = document.querySelector(`.bike-qty-item[data-bike="${item.bikeType}"]`);
        if (el) {
            const valEl = el.querySelector('.qty-value');
            if (valEl) valEl.value = item.quantity;
            updatePlusButtons(el);
        }
    });
}

// ---- VALIDATION DATE + HEURE ----

function validateDate(showError = true) {
    const startDateInput = document.getElementById('start-date');
    if (!startDateInput) return false;
    const val = startDateInput.value;
    if (!val) return false;

    const selected = new Date(val);
    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    if (selected < tomorrowStart) {
        if (showError) showToast('❌ La réservation doit être pour demain au minimum', 'error');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        const offset = tomorrow.getTimezoneOffset() * 60000;
        startDateInput.value = new Date(tomorrow.getTime() - offset).toISOString().slice(0, 16);
        return false;
    }

    const hours = selected.getHours();
    const minutes = selected.getMinutes();

    if (hours > 10 || (hours === 10 && minutes > 45)) {
        if (showError) showToast('⏰ Dernière réservation à 10h45 (valide 15 min)', 'error');
        const corrected = new Date(selected);
        corrected.setHours(10, 45, 0, 0);
        const offset = corrected.getTimezoneOffset() * 60000;
        startDateInput.value = new Date(corrected.getTime() - offset).toISOString().slice(0, 16);
        return false;
    }

    return true;
}

// ---- RENDU VUE RÉSERVATIONS ----

async function renderDay(dateStr) {
    if (!dateStr) dateStr = getDateStr(new Date());
    currentDateStr = dateStr;

    const displayEl = document.getElementById('date-display');
    const picker = document.getElementById('date-picker');
    if (displayEl) {
        const today = getDateStr(new Date());
        displayEl.textContent = dateStr === today ? "📅 Aujourd'hui" : '📅 ' + formatDateLongFR(dateStr);
    }
    if (picker) picker.value = dateStr;

    await renderStock(dateStr);

    const titleEl = document.getElementById('reservations-title');
    if (titleEl) {
        const today = getDateStr(new Date());
        titleEl.textContent = dateStr === today ? 'Réservations du jour' : 'Réservations du ' + formatDateLongFR(dateStr);
    }

    const reservations = await loadReservations();
    const dayReservations = reservations
        .map(normalize)
        .filter(r => {
            const resDate = getDateStr(r.startDate);
            if (resDate === dateStr) return true;
            if (r.isLongDuration && r.durationDays > 1) {
                for (let i = 0; i < r.durationDays; i++) {
                    if (addDays(resDate, i) === dateStr) return true;
                }
            }
            return false;
        })
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    const listEl = document.getElementById('reservations-list');
    const emptyEl = document.getElementById('empty-state');
    const countEl = document.getElementById('reservations-count');
    if (!listEl) return;

    if (dayReservations.length === 0) {
        listEl.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'block';
        if (countEl) countEl.textContent = '';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (countEl) countEl.textContent = dayReservations.length + ' réservation(s)';

    let html = '';
    dayReservations.forEach(r => {
        let itemsHtml = '';
        r.items.forEach(item => {
            const cfg = FLOTTE[item.bikeType] || { icon: '🚲', label: item.bikeType };
            const longClass = r.isLongDuration ? ' long' : '';
            itemsHtml += `<span class="bike-tag${longClass}">${cfg.icon} ${cfg.label} ×${item.quantity}</span>`;
        });
        if (r.isLongDuration) {
            itemsHtml += `<span class="bike-tag long">📅 ${r.durationDays}j</span>`;
        }

        const statusClass = r.status === 'arrived' ? 'status-arrived' :
                           r.status === 'noshow' ? 'status-noshow' : '';

        html += `
            <div class="reservation-card ${statusClass}" id="res-card-${r.id}">
                <div class="time">${formatTime(r.startDate)}</div>
                <div class="client-info">
                    <span class="name">${escapeHtml(r.clientName)}</span>
                    <span class="phone">${escapeHtml(r.clientPhone)}</span>
                </div>
                <div class="items-summary">${itemsHtml}</div>
                <div class="action-btns">
                    <button class="btn btn-success btn-sm" onclick="handleArrived('${r.id}')" title="Venue confirmée">✅</button>
                    <button class="btn btn-warning btn-sm" onclick="handleNoshow('${r.id}')" title="Pas venu">❌</button>
                    <button class="edit-btn" onclick="handleEdit('${r.id}')" title="Modifier">✏️</button>
                </div>
                <button class="delete-btn" onclick="handleDelete('${r.id}')" title="Supprimer">✕</button>
            </div>
        `;
    });

    listEl.innerHTML = html;
}

// ---- HANDLERS ----

async function handleArrived(id) {
    const reservations = await loadReservations();
    const r = reservations.map(normalize).find(x => x.id === id);
    if (!r) return;
    const newStatus = r.status === 'arrived' ? null : 'arrived';
    await updateReservationStatus(id, newStatus);
    await renderDay(currentDateStr);
    showToast(newStatus === 'arrived' ? '✅ Venue confirmée' : 'Remis en attente', 'success');
}

async function handleNoshow(id) {
    const reservations = await loadReservations();
    const r = reservations.map(normalize).find(x => x.id === id);
    if (!r) return;
    await updateReservationStatus(id, 'noshow');
    await renderDay(currentDateStr);
    showToast('❌ Marqué pas venu', 'info');
}

async function handleDelete(id) {
    if (!confirm('🗑️ Supprimer cette réservation ?')) return;
    await deleteReservation(id);
    await renderDay(currentDateStr);
    showToast('Supprimé', 'info');
}

async function handleEdit(id) {
    const reservations = await loadReservations();
    const r = reservations.map(normalize).find(x => x.id === id);
    if (!r) return;

    document.getElementById('edit-id').value = id;
    document.getElementById('client-name').value = r.clientName;
    document.getElementById('client-phone').value = r.clientPhone;

    const d = new Date(r.startDate);
    const offset = d.getTimezoneOffset() * 60000;
    document.getElementById('start-date').value = new Date(d.getTime() - offset).toISOString().slice(0, 16);

    setQtyValues(r.items);

    if (r.isLongDuration) {
        document.getElementById('long-duration').checked = true;
        document.getElementById('duration-input').classList.add('show');
        document.getElementById('duration-days').value = r.durationDays;
        updateEndDate();
    } else {
        document.getElementById('long-duration').checked = false;
        document.getElementById('duration-input').classList.remove('show');
    }

    document.getElementById('notes').value = r.notes || '';
    document.getElementById('form-title').textContent = '✏️ Modifier la réservation';
    document.getElementById('submit-btn').textContent = '💾 Enregistrer les modifications';
    document.getElementById('cancel-edit-btn').style.display = 'block';

    showToast('✏️ Mode édition', 'info');
}

function cancelEdit() {
    document.getElementById('edit-id').value = '';
    document.getElementById('form-title').textContent = '➕ Nouvelle réservation';
    document.getElementById('submit-btn').textContent = '✅ Enregistrer';
    document.getElementById('cancel-edit-btn').style.display = 'none';
    document.getElementById('reservation-form').reset();
    setQtyValues([]);
    document.getElementById('long-duration').checked = false;
    document.getElementById('duration-input').classList.remove('show');
    const startDateInput = document.getElementById('start-date');
    if (startDateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        const offset = tomorrow.getTimezoneOffset() * 60000;
        startDateInput.value = new Date(tomorrow.getTime() - offset).toISOString().slice(0, 16);
    }
}

// ---- EXPORT CSV ----

async function exportCSV() {
    const reservations = await loadReservations();
    if (!reservations || reservations.length === 0) {
        showToast('Aucune donnée à exporter', 'error');
        return;
    }
    const all = reservations.map(normalize);
    let csv = 'Client,Téléphone,Date,Heure,Vélos,Durée jours,Longue durée,Statut,Notes,Créé le\n';
    all.forEach(r => {
        const date = new Date(r.startDate);
        const dateStr = date.toLocaleDateString('fr-FR');
        const timeStr = formatTime(r.startDate);
        const itemsDesc = r.items.map(i => {
            const cfg = FLOTTE[i.bikeType] || { label: i.bikeType };
            return (i.bikeSize ? i.bikeSize + ' ' : '') + cfg.label + ' ×' + i.quantity;
        }).join(' + ');
        const created = r.createdAt ? new Date(r.createdAt).toLocaleString('fr-FR') : '';
        const statusLabel = r.status === 'arrived' ? 'Venu' : r.status === 'noshow' ? 'Pas venu' : 'En attente';
        csv += `"${r.clientName}","${r.clientPhone}",${dateStr},${timeStr},"${itemsDesc}",${r.durationDays || 1},${r.isLongDuration ? 'Oui' : 'Non'},${statusLabel},"${(r.notes||'').replace(/"/g,'""')}",${created}\n`;
    });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reservations_veloc_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('📥 CSV téléchargé', 'success');
}

// ---- DATE NAVIGATION ----

function setupDateNav() {
    const todayBtn = document.getElementById('today-btn');
    const prevBtn = document.getElementById('prev-day');
    const nextBtn = document.getElementById('next-day');
    const picker = document.getElementById('date-picker');
    if (todayBtn) todayBtn.addEventListener('click', () => renderDay(getDateStr(new Date())));
    if (prevBtn) prevBtn.addEventListener('click', () => {
        const d = new Date(currentDateStr + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        renderDay(getDateStr(d));
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
        const d = new Date(currentDateStr + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        renderDay(getDateStr(d));
    });
    if (picker) picker.addEventListener('change', () => { if (picker.value) renderDay(picker.value); });
}

function updateEndDate() {
    const startDateInput = document.getElementById('start-date');
    const durDays = document.getElementById('duration-days');
    const endDateDisplay = document.getElementById('end-date-display');
    if (!startDateInput || !durDays || !endDateDisplay) return;
    const startVal = startDateInput.value;
    if (startVal && durDays.value) {
        const d = new Date(startVal);
        const days = parseInt(durDays.value) || 2;
        d.setDate(d.getDate() + days);
        const offset = d.getTimezoneOffset() * 60000;
        endDateDisplay.value = new Date(d.getTime() - offset).toISOString().slice(0, 10);
    }
}

// ---- GESTION FLOTTE (accessible depuis Realtime) ----
const _fleetInputs = [
    { id: 'fleet-vae-input', key: 'vae' },
    { id: 'fleet-vtc-input', key: 'vtc' },
    { id: 'fleet-tandem-input', key: 'tandem' },
    { id: 'fleet-enfant-16p-input', key: 'enfant-16p' },
    { id: 'fleet-enfant-20p-input', key: 'enfant-20p' },
    { id: 'fleet-enfant-24p-input', key: 'enfant-24p' },
    { id: 'fleet-enfant-26p-input', key: 'enfant-26p' },
    { id: 'fleet-siege-input', key: 'siege' }
];

function refreshFleetDisplay() {
    const f = getFleet();
    const enfantTotal = (f['enfant-16p'] || 0) + (f['enfant-20p'] || 0) + (f['enfant-24p'] || 0) + (f['enfant-26p'] || 0);
    const vaeEl = document.getElementById('fleet-vae');
    if (vaeEl) vaeEl.textContent = f.vae || 0;
    const vtcEl = document.getElementById('fleet-vtc');
    if (vtcEl) vtcEl.textContent = f.vtc || 0;
    const tandemEl = document.getElementById('fleet-tandem');
    if (tandemEl) tandemEl.textContent = f.tandem || 0;
    const enfantEl = document.getElementById('fleet-enfant');
    if (enfantEl) enfantEl.textContent = enfantTotal;
    const siegeEl = document.getElementById('fleet-siege');
    if (siegeEl) siegeEl.textContent = f.siege || 0;
    _fleetInputs.forEach(({ id, key }) => {
        const el = document.getElementById(id);
        if (el) el.value = f[key] || 0;
    });
}

// ---- INIT ----

let _realtimeSubscription = null;

function setupRealtime() {
    if (!useSupabase || !window._supabase) return;
    // Nettoyer l'ancienne souscription si elle existe
    if (_realtimeSubscription) {
        window._supabase.removeChannel(_realtimeSubscription);
    }
    _realtimeSubscription = window._supabase
        .channel('reservations-changes')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'reservations' },
            () => { renderDay(currentDateStr); }
        )
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'reservation_items' },
            () => { renderDay(currentDateStr); }
        )
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'fleet' },
            async () => {
                await syncFleetFromDB();
                refreshFleetDisplay();
                renderDay(currentDateStr);
            }
        )
        .subscribe();
}

async function init() {
    initSupabase();
    if (window._supabase) {
        const ready = await isSupabaseReady();
        if (ready) { useSupabase = true; setDbStatus(true); setupRealtime(); } else setDbStatus(false);
    } else setDbStatus(false);

    setupDateNav();
    setupQtyControls();

    // Synchroniser la flotte depuis Supabase (si connecté)
    await syncFleetFromDB();

    const startDateInput = document.getElementById('start-date');
    if (startDateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        const offset = tomorrow.getTimezoneOffset() * 60000;
        startDateInput.value = new Date(tomorrow.getTime() - offset).toISOString().slice(0, 16);
        startDateInput.min = new Date(tomorrow.getTime() - offset).toISOString().slice(0, 10) + 'T08:00';
    }

    if (startDateInput) {
        startDateInput.addEventListener('change', () => {
            validateDate(true);
            const d = new Date(startDateInput.value);
            renderStock(getDateStr(d));
        });
    }

    const longDurCheck = document.getElementById('long-duration');
    const durInput = document.getElementById('duration-input');
    const durDays = document.getElementById('duration-days');
    if (longDurCheck && durInput) {
        longDurCheck.addEventListener('change', () => {
            durInput.classList.toggle('show', longDurCheck.checked);
            updateEndDate();
        });
    }
    if (durDays) durDays.addEventListener('input', updateEndDate);
    if (startDateInput) startDateInput.addEventListener('change', updateEndDate);

    // ---- MODAL POPUP ----
    function openModal() {
        document.getElementById('reservation-modal').classList.add('open');
    }
    function closeModal() {
        document.getElementById('reservation-modal').classList.remove('open');
    }

    document.getElementById('add-reservation-btn')?.addEventListener('click', () => {
        cancelEdit();
        openModal();
    });
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('reservation-modal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
        cancelEdit();
        closeModal();
    });

    // Modifier handleEdit pour ouvrir le modal
    const _origHandleEdit = handleEdit;
    handleEdit = async (id) => {
        await _origHandleEdit(id);
        openModal();
    };

    const form = document.getElementById('reservation-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!validateDate(true)) return;

            const editId = document.getElementById('edit-id').value || null;
            const name = document.getElementById('client-name').value.trim();
            const phone = document.getElementById('client-phone').value.trim();
            const startDate = startDateInput.value;
            const isLongDuration = longDurCheck ? longDurCheck.checked : false;
            const durationDays = isLongDuration ? (parseInt(durDays?.value) || 2) : 1;
            const notes = document.getElementById('notes').value.trim();

            if (!name || !phone || !startDate) {
                showToast('Remplissez tous les champs', 'error');
                return;
            }

            const items = getQtyValues();
            if (items.length === 0) {
                showToast('Sélectionnez au moins un vélo', 'error');
                return;
            }

            const dateStr = getDateStr(new Date(startDate));
            const stock = await computeStockForDate(dateStr);
            for (const item of items) {
                const cfg = FLOTTE[item.bikeType];
                if (!cfg) continue;
                const available = Math.max(0, cfg.total - stock[item.bikeType].reserved);
                if (item.quantity > available) {
                    showToast(`⚠️ Stock insuffisant pour ${cfg.label} (reste ${available})`, 'error');
                    return;
                }
            }

            let endDate = null;
            if (isLongDuration) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + durationDays);
                endDate = d.toISOString();
            }

            const reservation = {
                clientName: name,
                clientPhone: phone,
                startDate: new Date(startDate).toISOString(),
                isLongDuration,
                durationDays,
                endDate,
                notes
            };

            await saveReservation(reservation, items, editId);
            showToast(editId ? '✅ Réservation modifiée !' : '✅ Réservation enregistrée !', 'success');
            cancelEdit();
            closeModal();

            if (startDateInput) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(9, 0, 0, 0);
                const offset = tomorrow.getTimezoneOffset() * 60000;
                startDateInput.value = new Date(tomorrow.getTime() - offset).toISOString().slice(0, 16);
            }

            await renderDay(currentDateStr);
        });
    }

    document.getElementById('toggle-fleet-edit')?.addEventListener('click', () => {
        const editDiv = document.getElementById('fleet-edit');
        const isHidden = editDiv.style.display === 'none' || !editDiv.style.display;
        editDiv.style.display = isHidden ? 'block' : 'none';
        if (isHidden) refreshFleetDisplay();
    });

    document.getElementById('fleet-cancel-btn')?.addEventListener('click', () => {
        document.getElementById('fleet-edit').style.display = 'none';
    });

    document.getElementById('fleet-save-btn')?.addEventListener('click', () => {
        const newFleet = {};
        _fleetInputs.forEach(({ id, key }) => {
            const el = document.getElementById(id);
            newFleet[key] = parseInt(el?.value) || 0;
        });
        updateFleet(newFleet);
        refreshFleetDisplay();
        document.getElementById('fleet-edit').style.display = 'none';
        showToast('✅ Flotte mise à jour', 'success');
        renderDay(currentDateStr);
    });

    refreshFleetDisplay();

    // ----
    document.getElementById('refresh-btn')?.addEventListener('click', async () => {
        await renderDay(currentDateStr);
        showToast('🔄 Actualisé', 'success');
    });
    document.getElementById('export-btn')?.addEventListener('click', exportCSV);
    document.getElementById('clear-all-btn')?.addEventListener('click', clearAllReservations);

    await renderDay(getDateStr(new Date()));
}

document.addEventListener('DOMContentLoaded', init);