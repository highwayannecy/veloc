// ============================================================
// ADMIN VÉLOC'ANNECY v5 - Types de vélos dynamiques
// ============================================================

const STORAGE_KEY = 'veloc_reservations';
const STORAGE_ITEMS_KEY = 'veloc_reservation_items';
const FLEET_STORAGE_KEY = 'veloc_fleet';
const BIKE_TYPES_KEY = 'veloc_bike_types';
const WALKIN_KEY = 'veloc_walkin';
const DEVICE_NAME_KEY = 'veloc_device_name';
const PIN_CODE = '2011';
const UNLOCKED_KEY = 'veloc_admin_unlocked';

function getDeviceType() {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return '📱 iPhone';
    if (/iPad/i.test(ua)) return '📱 iPad';
    if (/Android/i.test(ua)) return '📱 Android';
    if (/Mac/i.test(ua)) return '💻 Mac';
    if (/Windows/i.test(ua)) return '💻 PC Windows';
    if (/Linux/i.test(ua)) return '💻 Linux';
    return '📱 Appareil inconnu';
}

// ---- GESTION DES TYPES DE VÉLOS ----

let _bikeTypes = [];
let _fleet = {};

async function loadBikeTypes() {
    if (useSupabase && window._supabase) {
        try {
            const { data, error } = await window._supabase
                .from('bike_types')
                .select('*')
                .order('sort_order', { ascending: true });
            if (!error && data && data.length) {
                _bikeTypes = data;
                localStorage.setItem(BIKE_TYPES_KEY, JSON.stringify(data));
                return;
            }
        } catch (e) { /* fallback */ }
    }
    const local = localStorage.getItem(BIKE_TYPES_KEY);
    if (local) { _bikeTypes = JSON.parse(local); return; }
    // Fallback par défaut
    _bikeTypes = [
        { key: 'vae', label: 'VAE', icon: '⚡', description: '', default_total: 70, sort_order: 1 },
        { key: 'vtc', label: 'VTC', icon: '🚲', description: '', default_total: 70, sort_order: 2 },
        { key: 'tandem', label: 'Tandem', icon: '👫', description: '', default_total: 1, sort_order: 3 },
        { key: 'enfant-16p', label: 'Enfant 16p', icon: '🧒', description: '4 à 6 ans', default_total: 1, sort_order: 4 },
        { key: 'enfant-20p', label: 'Enfant 20p', icon: '🧒', description: '6 à 8 ans', default_total: 2, sort_order: 5 },
        { key: 'enfant-24p', label: 'Enfant 24p', icon: '🧒', description: '8 à 10 ans', default_total: 2, sort_order: 6 },
        { key: 'enfant-26p', label: 'Enfant 26p', icon: '🧒', description: '10 ans et +', default_total: 2, sort_order: 7 },
        { key: 'siege', label: 'Siège bébé', icon: '🍼', description: '', default_total: 7, sort_order: 8 }
    ];
}

function getActiveTypes() {
    return _bikeTypes.filter(t => t.is_active !== false);
}

function buildFloteeFromFleet(fleet) {
    const flotte = {};
    getActiveTypes().forEach(t => {
        flotte[t.key] = {
            label: t.label,
            icon: t.icon,
            total: fleet[t.key] !== undefined ? fleet[t.key] : (t.default_total || 0)
        };
    });
    return flotte;
}

let FLOTTE = {};
let FLOTTE_TYPES = [];

function rebuildFlotte() {
    FLOTTE = buildFloteeFromFleet(_fleet);
    FLOTTE_TYPES = Object.keys(FLOTTE);
}

// ---- CHARGEMENT FLOTTE ----

function loadFleetLocal() {
    try {
        const data = localStorage.getItem(FLEET_STORAGE_KEY);
        if (data) return JSON.parse(data);
    } catch {}
    return null;
}

async function syncFleetFromDB() {
    let fleet = null;
    if (useSupabase && window._supabase) {
        try {
            const dateStr = currentDateStr || getDateStr(new Date());
            const { data, error } = await window._supabase
                .from('fleet_history')
                .select('totals')
                .eq('date', dateStr)
                .maybeSingle();
            if (!error && data && data.totals) { fleet = data.totals; }
            if (!fleet) {
                const { data: last, error: lastErr } = await window._supabase
                    .from('fleet_history')
                    .select('totals')
                    .lte('date', dateStr)
                    .order('date', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (!lastErr && last && last.totals) fleet = last.totals;
            }
        } catch (e) { /* fallback */ }
    }
    if (!fleet) fleet = loadFleetLocal();
    if (!fleet) {
        fleet = {};
        getActiveTypes().forEach(t => { fleet[t.key] = t.default_total || 0; });
    }
    _fleet = fleet;
    localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(fleet));
    rebuildFlotte();
}

async function saveFleetToDB(fleet) {
    _fleet = fleet;
    localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(fleet));
    rebuildFlotte();
    if (useSupabase && window._supabase) {
        try {
            const dateStr = currentDateStr || getDateStr(new Date());
            await window._supabase
                .from('fleet_history')
                .upsert({ date: dateStr, totals: fleet, updated_at: new Date().toISOString() }, { onConflict: 'date' });
        } catch (e) { /* fallback */ }
    }
}

async function updateFleet(fleet) { await saveFleetToDB(fleet); }

// ---- RENDU STOCK (dynamique) ----

function renderStockBars(stock) {
    const container = document.getElementById('stock-container');
    if (!container) return;
    let html = '';
    FLOTTE_TYPES.forEach(type => {
        const cfg = FLOTTE[type];
        const available = stock ? Math.max(0, cfg.total - (stock[type]?.reserved || 0)) : cfg.total;
        const pct = cfg.total > 0 ? (available / cfg.total) * 100 : 0;
        const cls = available <= 0 ? 'critical' : available <= Math.ceil(cfg.total * 0.25) ? 'low' : '';
        html += `<div class="stock-item ${cls}" id="stock-${type}">
            <div class="label">${cfg.icon} ${cfg.label}</div>
            <div class="count"><span class="avail" id="stock-${type}-avail">${available}</span> <span class="total">/ <span id="stock-${type}-total">${cfg.total}</span></span></div>
            <div class="bar"><div class="bar-fill" id="stock-${type}-bar" style="width:${pct}%"></div></div>
        </div>`;
    });
    container.innerHTML = html;
}

async function renderStock(dateStr) {
    const stock = await computeStockForDate(dateStr);
    renderStockBars(stock);
    updateStockIndicators(stock);
}

function updateStockIndicators(stock) {
    document.querySelectorAll('.bike-qty-item:not(.walkin-item)').forEach(el => {
        const bikeType = el.dataset.bike;
        if (!bikeType || !stock?.[bikeType]) return;
        const cfg = FLOTTE[bikeType];
        if (!cfg) return;
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

// ---- RENDU FLOTTE STATIC + EDIT ----

function renderFleetStatic() {
    const el = document.getElementById('fleet-static');
    if (!el) return;
    el.textContent = FLOTTE_TYPES.map(t => `${FLOTTE[t].icon} ${FLOTTE[t].label}: ${_fleet[t] || 0}`).join(' · ');
}

function renderFleetEdit() {
    const grid = document.getElementById('fleet-edit-grid');
    if (!grid) return;
    let html = '';
    FLOTTE_TYPES.forEach(t => {
        html += `<div><label style="font-size:0.6rem;font-weight:600;">${FLOTTE[t].icon} ${FLOTTE[t].label}</label><input type="number" id="fleet-${t}-input" value="${_fleet[t] || 0}" min="0" class="fleet-input"></div>`;
    });
    grid.innerHTML = html;
}

// ---- RENDU WALKIN ----

async function renderWalkin(dateStr) {
    const grid = document.getElementById('walkin-grid');
    if (!grid) return;
    const walkin = loadWalkin(dateStr);
    const stock = await computeStockForDate(dateStr);
    let html = '';
    FLOTTE_TYPES.forEach(t => {
        const cfg = FLOTTE[t];
        const val = walkin[t] || 0;
        const baseReserved = stock[t].reserved - val;
        const maxWalkin = Math.max(0, cfg.total - baseReserved);
        const available = Math.max(0, cfg.total - stock[t].reserved);
        const atMax = val >= maxWalkin;
        const availClass = available <= 0 ? 'stock-no' : available <= Math.ceil(cfg.total * 0.25) ? 'stock-low' : 'stock-ok';
        html += `<div class="bike-qty-item walkin-item" data-bike="${t}">
            <span class="bike-icon">${cfg.icon}</span>
            <span class="bike-name">${cfg.label}</span>
            <div class="qty-control">
                <button type="button" class="qty-btn walkin-btn" data-date="${dateStr}" data-key="${t}" data-dir="-1">−</button>
                <input type="text" class="qty-value walkin-val" data-key="${t}" value="${val}" readonly>
                <button type="button" class="qty-btn walkin-btn" data-date="${dateStr}" data-key="${t}" data-dir="1" ${atMax ? 'disabled' : ''}>+</button>
            </div>
            <span class="stock-indicator ${availClass} walkin-avail">${available}</span>
        </div>`;
    });
    grid.innerHTML = html;
}

function setupWalkin() {
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.walkin-btn');
        if (!btn || btn.disabled) return;
        const dateStr = btn.dataset.date;
        const key = btn.dataset.key;
        const dir = parseInt(btn.dataset.dir);
        const walkin = loadWalkin(dateStr);
        const newVal = (walkin[key] || 0) + dir;
        if (newVal < 0) return;
        walkin[key] = newVal;
        saveWalkin(dateStr, walkin);
        const item = btn.closest('.walkin-item');
        const valEl = item?.querySelector('.walkin-val');
        if (valEl) valEl.value = newVal;
        renderDay(dateStr);
    });
    document.getElementById('walkin-reset-btn')?.addEventListener('click', () => {
        if (!confirm('🔄 Réinitialiser le flux libre du jour ?')) return;
        const walkin = {};
        FLOTTE_TYPES.forEach(t => walkin[t] = 0);
        saveWalkin(currentDateStr, walkin);
        renderDay(currentDateStr);
        showToast('🔄 Flux libre réinitialisé', 'info');
    });
}

// ---- FORMULAIRE RÉSERVATION (dynamique) ----

function getBikeDescription(key) {
    const t = _bikeTypes.find(x => x.key === key);
    return t?.description || '';
}

function renderBikeFormItems() {
    const grid = document.getElementById('bike-qty-grid');
    if (!grid) return;
    let html = '';
    FLOTTE_TYPES.forEach(t => {
        const cfg = FLOTTE[t];
        const desc = getBikeDescription(t);
        html += `<div class="bike-qty-item" data-bike="${t}" title="${escapeHtml(desc)}">
            <span class="bike-icon">${cfg.icon}</span>
            <span class="bike-name">${cfg.label}</span>
            ${desc ? `<span style="font-size:0.55rem;color:var(--text-muted);">${escapeHtml(desc)}</span>` : ''}
            <div class="qty-control">
                <button type="button" class="qty-btn qty-minus">−</button>
                <input type="text" class="qty-value" value="0" readonly>
                <button type="button" class="qty-btn qty-plus">+</button>
            </div>
            <span class="stock-indicator stock-ok">${cfg.total}</span>
        </div>`;
    });
    grid.innerHTML = html;
}

// ---- FLUX LIBRE ----

function getWalkinKey(dateStr) { return WALKIN_KEY + '_' + dateStr; }
function loadWalkin(dateStr) { try { const data = localStorage.getItem(getWalkinKey(dateStr)); if (data) return JSON.parse(data); } catch {} const w = {}; FLOTTE_TYPES.forEach(t => w[t] = 0); return w; }
function saveWalkin(dateStr, walkin) { localStorage.setItem(getWalkinKey(dateStr), JSON.stringify(walkin)); }

let useSupabase = false;
let currentDateStr = '';

function getDateStr(d) { const date = new Date(d); return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); }
function formatDateLongFR(dateStr) { const [y, m, d] = dateStr.split('-'); return `${d}/${m}/${y}`; }
function formatTime(d) { const date = new Date(d); return String(date.getHours()).padStart(2, '0') + 'h' + String(date.getMinutes()).padStart(2, '0'); }
function addDays(dateStr, n) { const d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate() + n); return getDateStr(d); }
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function showToast(msg, type = 'success') { const t = document.getElementById('toast'); if (!t) return; t.textContent = msg; t.className = 'toast ' + type + ' show'; clearTimeout(t._timeout); t._timeout = setTimeout(() => t.classList.remove('show'), 3500); }
function setDbStatus(online) { const el = document.getElementById('db-indicator'); if (!el) return; if (online) { el.className = 'db-status online'; el.textContent = '☁️ Supabase'; } else if (useSupabase) { el.className = 'db-status offline'; el.textContent = '❌ Erreur DB'; } else { el.className = 'db-status offline'; el.textContent = '📁 Local'; } }

async function loadReservations() { if (useSupabase && window._supabase) { try { const { data, error } = await window._supabase.from('reservations').select('*, reservation_items(*)').order('start_date', { ascending: false }); if (!error && data) return data; } catch (e) { /* fallback */ } } try { const data = localStorage.getItem(STORAGE_KEY); const items = localStorage.getItem(STORAGE_ITEMS_KEY); const reservations = data ? JSON.parse(data) : []; const allItems = items ? JSON.parse(items) : []; return reservations.map(r => ({ ...r, reservation_items: allItems.filter(i => i.reservation_id === r.id) })); } catch { return []; } }
async function saveReservation(reservation, items, editId = null) { if (editId) { if (useSupabase && window._supabase) { try { await window._supabase.from('reservation_items').delete().eq('reservation_id', editId); const { error } = await window._supabase.from('reservations').update({ client_name: reservation.clientName, client_phone: reservation.clientPhone, start_date: reservation.startDate, is_long_duration: reservation.isLongDuration, duration_days: reservation.durationDays || 1, end_date: reservation.endDate || null, notes: reservation.notes || '', device_name: reservation.deviceName || '' }).eq('id', editId); if (!error) { for (const item of items) { await window._supabase.from('reservation_items').insert([{ reservation_id: editId, bike_type: item.bikeType, quantity: item.quantity, bike_size: item.bikeSize || null }]); } return true; } } catch (e) { /* fallback */ } } let allRes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); let allItems = JSON.parse(localStorage.getItem(STORAGE_ITEMS_KEY) || '[]'); const idx = allRes.findIndex(r => r.id === editId); if (idx !== -1) { allRes[idx] = { ...allRes[idx], ...reservation, id: editId }; allItems = allItems.filter(i => i.reservation_id !== editId); for (const item of items) { allItems.push({ ...item, reservation_id: editId, id: generateId() }); } localStorage.setItem(STORAGE_KEY, JSON.stringify(allRes)); localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(allItems)); return true; } return false; } if (useSupabase && window._supabase) { try { const { data: resData, error: resError } = await window._supabase.from('reservations').insert([{ client_name: reservation.clientName, client_phone: reservation.clientPhone, start_date: reservation.startDate, is_long_duration: reservation.isLongDuration, duration_days: reservation.durationDays || 1, end_date: reservation.endDate || null, notes: reservation.notes || '', device_name: reservation.deviceName || '' }]).select(); if (!resError && resData && resData[0]) { const resId = resData[0].id; for (const item of items) { await window._supabase.from('reservation_items').insert([{ reservation_id: resId, bike_type: item.bikeType, quantity: item.quantity, bike_size: item.bikeSize || null }]); } return true; } } catch (e) { /* fallback */ } } const allRes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); const allItems = JSON.parse(localStorage.getItem(STORAGE_ITEMS_KEY) || '[]'); const id = generateId(); allRes.push({ ...reservation, id }); for (const item of items) { allItems.push({ ...item, reservation_id: id, id: generateId() }); } localStorage.setItem(STORAGE_KEY, JSON.stringify(allRes)); localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(allItems)); return true; }
async function updateReservationStatus(id, status) { if (useSupabase && window._supabase) { try { const { error } = await window._supabase.from('reservations').update({ status: status || null }).eq('id', id); if (!error) return true; } catch (e) { /* fallback */ } } const allRes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); const idx = allRes.findIndex(r => r.id === id); if (idx !== -1) { if (status) allRes[idx].status = status; else delete allRes[idx].status; localStorage.setItem(STORAGE_KEY, JSON.stringify(allRes)); } return true; }
async function deleteReservation(id) { if (useSupabase && window._supabase) { try { await window._supabase.from('reservation_items').delete().eq('reservation_id', id); const { error } = await window._supabase.from('reservations').delete().eq('id', id); if (!error) return true; } catch (e) { /* fallback */ } } let allRes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); let allItems = JSON.parse(localStorage.getItem(STORAGE_ITEMS_KEY) || '[]'); allRes = allRes.filter(r => r.id !== id); allItems = allItems.filter(i => i.reservation_id !== id); localStorage.setItem(STORAGE_KEY, JSON.stringify(allRes)); localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(allItems)); return true; }
async function clearAllReservations() { if (!confirm('⚠️ Supprimer TOUTES les réservations ?')) return; if (!confirm('⚠️ Confirmation finale ?')) return; if (useSupabase && window._supabase) { try { await window._supabase.from('reservation_items').delete().neq('id', '00000000-0000-0000-0000-000000000000'); await window._supabase.from('reservations').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) { /* fallback */ } } localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(STORAGE_ITEMS_KEY); await renderDay(currentDateStr); showToast('Tout effacé', 'info'); }
function getDeviceName() { const el = document.getElementById('device-name-input'); return el?.value?.trim() || ''; }
function normalize(r) { return { id: r.id, clientName: r.client_name || r.clientName, clientPhone: r.client_phone || r.clientPhone, startDate: r.start_date || r.startDate, isLongDuration: r.is_long_duration !== undefined ? r.is_long_duration : (r.isLongDuration || false), durationDays: r.duration_days || r.durationDays || 1, endDate: r.end_date || r.endDate || null, status: r.status || null, notes: r.notes || '', createdAt: r.created_at || r.createdAt || new Date().toISOString(), deviceName: r.device_name || r.deviceName || '', items: (r.reservation_items || r.items || []).map(normalizeItem) }; }
function normalizeItem(item) { let bikeType = item.bike_type || item.bikeType; const bikeSize = item.bike_size || item.bikeSize || null; if (bikeType === 'enfant' && bikeSize) bikeType = 'enfant-' + bikeSize; return { id: item.id, bikeType, quantity: item.quantity || 1, bikeSize: null }; }

async function computeStockForDate(dateStr) {
    const reservations = await loadReservations();
    const walkin = loadWalkin(dateStr);
    const stock = {};
    FLOTTE_TYPES.forEach(t => stock[t] = { total: FLOTTE[t].total, reserved: 0 });
    reservations.forEach(r => { const nr = normalize(r); if (nr.status === 'noshow') return; const resDate = getDateStr(nr.startDate); let affectedDays = [resDate]; if (nr.isLongDuration && nr.durationDays > 1) { for (let i = 0; i < nr.durationDays; i++) affectedDays.push(addDays(resDate, i)); affectedDays = [...new Set(affectedDays)]; } if (affectedDays.includes(dateStr)) { nr.items.forEach(item => { const bt = item.bikeType === 'enfant' && item.bikeSize ? 'enfant-' + item.bikeSize : item.bikeType; if (stock[bt]) stock[bt].reserved += item.quantity; }); } });
    for (const [type, qty] of Object.entries(walkin)) { if (stock[type]) stock[type].reserved += qty; }
    return stock;
}

// ---- RENDU JOUR ----

async function renderDay(dateStr) {
    if (!dateStr) dateStr = getDateStr(new Date());
    currentDateStr = dateStr;
    const displayEl = document.getElementById('date-display'); const picker = document.getElementById('date-picker');
    if (displayEl) { const today = getDateStr(new Date()); displayEl.textContent = dateStr === today ? "📅 Aujourd'hui" : '📅 ' + formatDateLongFR(dateStr); }
    if (picker) picker.value = dateStr;
    await syncFleetFromDB();
    await renderStock(dateStr);
    await renderWalkin(dateStr);
    renderFleetStatic();
    renderFleetEdit();
    const titleEl = document.getElementById('reservations-title');
    if (titleEl) { const today = getDateStr(new Date()); titleEl.textContent = dateStr === today ? 'Réservations du jour' : 'Réservations du ' + formatDateLongFR(dateStr); }
    const reservations = await loadReservations();
    const updatedReservations = await loadReservations();
    const dayReservations = updatedReservations.map(normalize).filter(r => { const resDate = getDateStr(r.startDate); if (resDate === dateStr) return true; if (r.isLongDuration && r.durationDays > 1) { for (let i = 0; i < r.durationDays; i++) { if (addDays(resDate, i) === dateStr) return true; } } return false; }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const listEl = document.getElementById('reservations-list'); const emptyEl = document.getElementById('empty-state'); const countEl = document.getElementById('reservations-count');
    if (!listEl) return;
    if (dayReservations.length === 0) { listEl.innerHTML = ''; if (emptyEl) emptyEl.style.display = 'block'; if (countEl) countEl.textContent = ''; return; }
    if (emptyEl) emptyEl.style.display = 'none'; if (countEl) countEl.textContent = dayReservations.length + ' réservation(s)';
    let html = '';
    dayReservations.forEach(r => {
        let itemsHtml = '';
        r.items.forEach(item => { const cfg = FLOTTE[item.bikeType] || { icon: '🚲', label: item.bikeType }; const longClass = r.isLongDuration ? ' long' : ''; itemsHtml += `<span class="bike-tag${longClass}">${cfg.icon} ${cfg.label} ×${item.quantity}</span>`; });
        if (r.isLongDuration) itemsHtml += `<span class="bike-tag long">📅 ${r.durationDays}j</span>`;
        const statusClass = r.status === 'arrived' ? 'status-arrived' : r.status === 'noshow' ? 'status-noshow' : '';
        const createdDate = r.createdAt ? new Date(r.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
        const deviceLabel = r.deviceName ? escapeHtml(r.deviceName) : '';
        html += `<div class="reservation-card ${statusClass}" id="res-card-${r.id}"><div class="time">${formatTime(r.startDate)}</div><div class="card-top"><div class="client-info"><span class="name">${escapeHtml(r.clientName)}</span><span class="phone">${escapeHtml(r.clientPhone)}</span></div><div class="meta-info">${createdDate ? `<span>📅 ${createdDate}</span>` : ''}${deviceLabel ? `<span>${deviceLabel}</span>` : ''}</div></div><div class="items-summary">${itemsHtml}</div><div class="action-btns"><button class="btn btn-success" onclick="handleArrived('${r.id}')" title="Venue confirmée">✅ Venu</button><button class="btn btn-warning" onclick="handleNoshow('${r.id}')" title="Pas venu">❌ Pas venu</button></div><button class="menu-btn" onclick="toggleMenu('${r.id}')" title="Plus d'actions">⋮</button><div class="context-menu" id="menu-${r.id}"><button onclick="handleEdit('${r.id}')">✏️ Modifier</button><button class="menu-danger" onclick="handleDelete('${r.id}')">🗑️ Supprimer</button></div></div>`;
    });
    listEl.innerHTML = html;
}

function toggleMenu(id) { const menu = document.getElementById('menu-' + id); if (!menu) return; const isOpen = menu.classList.contains('open'); document.querySelectorAll('.context-menu.open').forEach(m => m.classList.remove('open')); if (!isOpen) menu.classList.add('open'); }
document.addEventListener('click', (e) => { if (!e.target.closest('.menu-btn') && !e.target.closest('.context-menu')) { document.querySelectorAll('.context-menu.open').forEach(m => m.classList.remove('open')); } });

async function handleArrived(id) { const reservations = await loadReservations(); const r = reservations.map(normalize).find(x => x.id === id); if (!r) return; const newStatus = r.status === 'arrived' ? null : 'arrived'; await updateReservationStatus(id, newStatus); await renderDay(currentDateStr); showToast(newStatus === 'arrived' ? '✅ Venue confirmée' : 'Remis en attente', 'success'); }
async function handleNoshow(id) { const reservations = await loadReservations(); const r = reservations.map(normalize).find(x => x.id === id); if (!r) return; await updateReservationStatus(id, 'noshow'); await renderDay(currentDateStr); showToast('❌ Marqué pas venu', 'info'); }
async function handleDelete(id) { if (!confirm('🗑️ Supprimer cette réservation ?')) return; await deleteReservation(id); await renderDay(currentDateStr); showToast('Supprimé', 'info'); }
async function handleEdit(id) { const reservations = await loadReservations(); const r = reservations.map(normalize).find(x => x.id === id); if (!r) return; document.getElementById('edit-id').value = id; document.getElementById('client-name').value = r.clientName; document.getElementById('client-phone').value = r.clientPhone; const d = new Date(r.startDate); const offset = d.getTimezoneOffset() * 60000; document.getElementById('start-date').value = new Date(d.getTime() - offset).toISOString().slice(0, 16); const today = new Date(); const todayOffset = today.getTimezoneOffset() * 60000; document.getElementById('start-date').min = new Date(today.getTime() - todayOffset).toISOString().slice(0, 10) + 'T08:00'; setQtyValues(r.items); if (r.isLongDuration) { document.getElementById('long-duration').checked = true; document.getElementById('duration-input').classList.add('show'); document.getElementById('duration-days').value = r.durationDays; updateEndDate(); } else { document.getElementById('long-duration').checked = false; document.getElementById('duration-input').classList.remove('show'); } document.getElementById('notes').value = r.notes || ''; document.getElementById('form-title').textContent = '✏️ Modifier la réservation'; document.getElementById('submit-btn').textContent = '💾 Enregistrer les modifications'; document.getElementById('cancel-edit-btn').style.display = 'block'; showToast('✏️ Mode édition', 'info'); }
function cancelEdit() { document.getElementById('edit-id').value = ''; document.getElementById('form-title').textContent = '➕ Nouvelle réservation'; document.getElementById('submit-btn').textContent = '✅ Enregistrer'; document.getElementById('cancel-edit-btn').style.display = 'none'; document.getElementById('reservation-form').reset(); setQtyValues([]); document.getElementById('long-duration').checked = false; document.getElementById('duration-input').classList.remove('show'); const startDateInput = document.getElementById('start-date'); if (startDateInput) { const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0); const offset = tomorrow.getTimezoneOffset() * 60000; startDateInput.value = new Date(tomorrow.getTime() - offset).toISOString().slice(0, 16); startDateInput.min = new Date(tomorrow.getTime() - offset).toISOString().slice(0, 10) + 'T09:00'; } refreshFormBadges(); }
async function refreshFormBadges() {
    const stock = await computeStockForDate(currentDateStr || getDateStr(new Date()));
    document.querySelectorAll('.bike-qty-item:not(.walkin-item)').forEach(el => {
        const bikeType = el.dataset.bike;
        if (!bikeType || !stock?.[bikeType]) return;
        const cfg = FLOTTE[bikeType];
        if (!cfg) return;
        const available = Math.max(0, cfg.total - stock[bikeType].reserved);
        const indicator = el.querySelector('.stock-indicator');
        if (indicator) {
            indicator.textContent = available;
            indicator.className = 'stock-indicator';
            if (available <= 0) indicator.classList.add('stock-no');
            else if (available <= Math.ceil(cfg.total * 0.25)) indicator.classList.add('stock-low');
            else indicator.classList.add('stock-ok');
        }
    });
}
async function exportCSV() { const reservations = await loadReservations(); if (!reservations || reservations.length === 0) { showToast('Aucune donnée à exporter', 'error'); return; } const all = reservations.map(normalize); let csv = 'Client,Téléphone,Date,Heure,Vélos,Durée jours,Longue durée,Statut,Notes,Créé le\n'; all.forEach(r => { const date = new Date(r.startDate); const dateStr = date.toLocaleDateString('fr-FR'); const timeStr = formatTime(r.startDate); const itemsDesc = r.items.map(i => { const cfg = FLOTTE[i.bikeType] || { label: i.bikeType }; return cfg.label + ' ×' + i.quantity; }).join(' + '); const created = r.createdAt ? new Date(r.createdAt).toLocaleString('fr-FR') : ''; const statusLabel = r.status === 'arrived' ? 'Venu' : r.status === 'noshow' ? 'Pas venu' : 'En attente'; csv += `"${r.clientName}","${r.clientPhone}",${dateStr},${timeStr},"${itemsDesc}",${r.durationDays || 1},${r.isLongDuration ? 'Oui' : 'Non'},${statusLabel},"${(r.notes||'').replace(/"/g,'""')}",${created}\n`; }); const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `reservations_veloc_${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href); showToast('📥 CSV téléchargé', 'success'); }
function setupDateNav() { const todayBtn = document.getElementById('today-btn'); const prevBtn = document.getElementById('prev-day'); const nextBtn = document.getElementById('next-day'); const picker = document.getElementById('date-picker'); if (todayBtn) todayBtn.addEventListener('click', () => renderDay(getDateStr(new Date()))); if (prevBtn) prevBtn.addEventListener('click', () => { const d = new Date(currentDateStr + 'T12:00:00'); d.setDate(d.getDate() - 1); renderDay(getDateStr(d)); }); if (nextBtn) nextBtn.addEventListener('click', () => { const d = new Date(currentDateStr + 'T12:00:00'); d.setDate(d.getDate() + 1); renderDay(getDateStr(d)); }); if (picker) picker.addEventListener('change', () => { if (picker.value) renderDay(picker.value); }); }
function updateEndDate() { const startDateInput = document.getElementById('start-date'); const durDays = document.getElementById('duration-days'); const endDateDisplay = document.getElementById('end-date-display'); if (!startDateInput || !durDays || !endDateDisplay) return; const startVal = startDateInput.value; if (startVal && durDays.value) { const d = new Date(startVal); const days = parseInt(durDays.value) || 2; d.setDate(d.getDate() + days); const offset = d.getTimezoneOffset() * 60000; endDateDisplay.value = new Date(d.getTime() - offset).toISOString().slice(0, 10); } }

// ---- QTY CONTROLS (formulaire) ----

function setupQtyControls() {
    document.querySelectorAll('.bike-qty-item:not(.walkin-item) .qty-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.bike-qty-item');
            const valEl = item.querySelector('.qty-value');
            const badge = item.querySelector('.stock-indicator');
            let val = parseInt(valEl.value) || 0;
            if (val > 0) { val--; valEl.value = val; if (badge) { const cur = parseInt(badge.textContent) || 0; badge.textContent = cur + 1; } }
            updatePlusButtons(item);
        });
    });
    document.querySelectorAll('.bike-qty-item:not(.walkin-item) .qty-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.bike-qty-item');
            const valEl = item.querySelector('.qty-value');
            const badge = item.querySelector('.stock-indicator');
            const max = parseInt(badge?.textContent) || 0;
            let val = parseInt(valEl.value) || 0;
            if (val < max) { val++; valEl.value = val; if (badge) { const cur = parseInt(badge.textContent) || 0; badge.textContent = Math.max(0, cur - 1); } }
            updatePlusButtons(item);
        });
    });
}
function updatePlusButtons(item) { const val = parseInt(item.querySelector('.qty-value').value) || 0; const max = parseInt(item.querySelector('.stock-indicator').textContent) || 0; const plusBtn = item.querySelector('.qty-plus'); if (plusBtn) plusBtn.disabled = val >= max; }
function getQtyValues() { const items = []; document.querySelectorAll('.bike-qty-item:not(.walkin-item)').forEach(el => { const bikeType = el.dataset.bike; const qty = parseInt(el.querySelector('.qty-value').value) || 0; if (qty > 0) items.push({ bikeType, quantity: qty, bikeSize: null }); }); return items; }
function setQtyValues(items) { document.querySelectorAll('.bike-qty-item:not(.walkin-item) .qty-value').forEach(el => el.value = '0'); items.forEach(item => { const el = document.querySelector(`.bike-qty-item:not(.walkin-item)[data-bike="${item.bikeType}"]`); if (el) { const valEl = el.querySelector('.qty-value'); if (valEl) valEl.value = item.quantity; updatePlusButtons(el); } }); }
function validateDate(showError = true, allowToday = false) { const startDateInput = document.getElementById('start-date'); if (!startDateInput) return false; const val = startDateInput.value; if (!val) return false; const selected = new Date(val); const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0); if (allowToday) { if (selected < todayStart) { if (showError) showToast('❌ La date ne peut pas être dans le passé', 'error'); const now = new Date(); const offset = now.getTimezoneOffset() * 60000; startDateInput.value = new Date(now.getTime() - offset).toISOString().slice(0, 16); return false; } } else { const tomorrowStart = new Date(); tomorrowStart.setDate(tomorrowStart.getDate() + 1); tomorrowStart.setHours(0, 0, 0, 0); if (selected < tomorrowStart) { if (showError) showToast('❌ La réservation doit être pour demain au minimum', 'error'); const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0); const offset = tomorrow.getTimezoneOffset() * 60000; startDateInput.value = new Date(tomorrow.getTime() - offset).toISOString().slice(0, 16); return false; } } const hours = selected.getHours(); const minutes = selected.getMinutes(); if (hours < 8) { if (showError) showToast('⏰ Ouverture à 8h minimum', 'error'); const corrected = new Date(selected); corrected.setHours(8, 0, 0, 0); const offset = corrected.getTimezoneOffset() * 60000; startDateInput.value = new Date(corrected.getTime() - offset).toISOString().slice(0, 16); return false; } if (hours > 10 || (hours === 10 && minutes > 45)) { if (showError) showToast('⏰ Dernière réservation à 10h45 (valide 15 min)', 'error'); const corrected = new Date(selected); corrected.setHours(10, 45, 0, 0); const offset = corrected.getTimezoneOffset() * 60000; startDateInput.value = new Date(corrected.getTime() - offset).toISOString().slice(0, 16); return false; } return true; }

// ---- GESTION TYPES DE VÉLOS (CRUD) ----

function renderBikeTypesList() {
    const list = document.getElementById('bike-types-list');
    if (!list) return;
    let html = '';
    _bikeTypes.forEach(t => {
        html += `<div class="bike-type-row" data-key="${t.key}">
            <span class="bt-icon">${t.icon || '🚲'}</span>
            <span class="bt-label">${escapeHtml(t.label)}</span>
            <span class="bt-key">${t.key}</span>
            <span class="bt-default">${t.default_total || 0}</span>
            <button class="btn btn-outline btn-sm" onclick="openBikeTypeEdit('${t.key}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteBikeType('${t.key}')">🗑️</button>
        </div>`;
    });
    list.innerHTML = html;
}

function openBikeTypeEdit(key) {
    const t = _bikeTypes.find(x => x.key === key);
    if (!t) return;
    document.getElementById('bike-type-edit-original-key').value = t.key;
    document.getElementById('bike-type-edit-key').value = t.key;
    document.getElementById('bike-type-edit-label').value = t.label;
    document.getElementById('bike-type-edit-icon').value = t.icon || '🚲';
    document.getElementById('bike-type-edit-description').value = t.description || '';
    document.getElementById('bike-type-edit-default').value = t.default_total || 0;
    document.getElementById('bike-type-edit-title').textContent = '✏️ ' + t.label;
    document.getElementById('bike-type-edit-delete').style.display = 'inline-flex';
    document.getElementById('bike-type-edit-modal').classList.add('open');
}

function deleteBikeType(key) {
    if (!confirm(`🗑️ Supprimer le type "${key}" ? Les réservations existantes avec ce type seront conservées.`)) return;
    _bikeTypes = _bikeTypes.filter(t => t.key !== key);
    saveBikeTypesToDB();
    renderBikeTypesList();
    refreshAll();
}

async function saveBikeTypesToDB() {
    localStorage.setItem(BIKE_TYPES_KEY, JSON.stringify(_bikeTypes));
    if (useSupabase && window._supabase) {
        try {
            // Supprimer tous les types puis réinsérer
            await window._supabase.from('bike_types').delete().neq('key', '_');
            for (const t of _bikeTypes) {
                await window._supabase.from('bike_types').insert([{
                    key: t.key, label: t.label, icon: t.icon || '🚲',
                    description: t.description || '', default_total: t.default_total || 0, sort_order: t.sort_order || 0,
                    is_active: t.is_active !== false
                }]);
            }
        } catch (e) { /* fallback */ }
    }
}

function refreshAll() {
    rebuildFlotte();
    renderBikeFormItems();
    setupQtyControls();
    renderDay(currentDateStr || getDateStr(new Date()));
}

function setupBikeTypeManager() {
    const modal = document.getElementById('bike-types-modal');
    const editModal = document.getElementById('bike-type-edit-modal');
    document.getElementById('manage-bike-types-btn')?.addEventListener('click', () => {
        renderBikeTypesList();
        modal.classList.add('open');
    });
    document.getElementById('bike-types-modal-close')?.addEventListener('click', () => modal.classList.remove('open'));
    document.getElementById('bike-types-done-btn')?.addEventListener('click', () => modal.classList.remove('open'));
    modal?.addEventListener('click', (e) => { if (e.target === e.currentTarget) modal.classList.remove('open'); });
    editModal?.addEventListener('click', (e) => { if (e.target === e.currentTarget) editModal.classList.remove('open'); });
    document.getElementById('bike-type-edit-close')?.addEventListener('click', () => editModal.classList.remove('open'));
    document.getElementById('bike-type-edit-cancel')?.addEventListener('click', () => editModal.classList.remove('open'));

    document.getElementById('add-bike-type-btn')?.addEventListener('click', () => {
        document.getElementById('bike-type-edit-original-key').value = '';
        document.getElementById('bike-type-edit-key').value = '';
        document.getElementById('bike-type-edit-label').value = '';
        document.getElementById('bike-type-edit-icon').value = '🚲';
        document.getElementById('bike-type-edit-default').value = '0';
        document.getElementById('bike-type-edit-title').textContent = '➕ Nouveau type de vélo';
        document.getElementById('bike-type-edit-delete').style.display = 'none';
        editModal.classList.add('open');
    });

    document.getElementById('bike-type-edit-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const origKey = document.getElementById('bike-type-edit-original-key').value;
        const newKey = document.getElementById('bike-type-edit-key').value.trim();
        const label = document.getElementById('bike-type-edit-label').value.trim();
        const icon = document.getElementById('bike-type-edit-icon').value.trim() || '🚲';
        const desc = document.getElementById('bike-type-edit-description').value.trim() || '';
        const def = parseInt(document.getElementById('bike-type-edit-default').value) || 0;
        if (!newKey || !label) { showToast('Remplissez tous les champs', 'error'); return; }
        if (origKey && origKey !== newKey) {
            // Changement de clé : supprimer l'ancienne, ajouter la nouvelle
            _bikeTypes = _bikeTypes.filter(t => t.key !== origKey);
        }
        const existing = _bikeTypes.find(t => t.key === newKey);
        if (existing && existing.key !== origKey) {
            showToast('❌ Cette clé existe déjà', 'error');
            return;
        }
        if (origKey === '') {
            _bikeTypes.push({ key: newKey, label, icon, description: desc, default_total: def, sort_order: _bikeTypes.length + 1 });
        } else {
            const t = _bikeTypes.find(x => x.key === newKey);
            if (t) { t.label = label; t.icon = icon; t.description = desc; t.default_total = def; }
        }
        await saveBikeTypesToDB();
        editModal.classList.remove('open');
        renderBikeTypesList();
        refreshAll();
        showToast('✅ Type sauvegardé', 'success');
    });

    document.getElementById('bike-type-edit-delete')?.addEventListener('click', () => {
        const key = document.getElementById('bike-type-edit-original-key').value;
        editModal.classList.remove('open');
        deleteBikeType(key);
    });
}

// ---- REALTIME ----

let _realtimeSubscription = null;
function setupRealtime() {
    if (!useSupabase || !window._supabase) return;
    if (_realtimeSubscription) window._supabase.removeChannel(_realtimeSubscription);
    _realtimeSubscription = window._supabase.channel('reservations-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => { renderDay(currentDateStr); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservation_items' }, () => { renderDay(currentDateStr); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fleet_history' }, async () => { await syncFleetFromDB(); renderDay(currentDateStr); })
        .subscribe();
}

// ---- INIT ----

async function init() {
    await loadBikeTypes();
    initSupabase();
    if (window._supabase) {
        const ready = await isSupabaseReady();
        if (ready) { useSupabase = true; setDbStatus(true); setupRealtime(); } else setDbStatus(false);
    } else setDbStatus(false);
    await syncFleetFromDB();
    renderBikeFormItems();
    setupDateNav();
    setupQtyControls();
    setupWalkin();
    setupBikeTypeManager();
    const deviceInput = document.getElementById('device-name-input');
    if (deviceInput) {
        const saved = localStorage.getItem(DEVICE_NAME_KEY);
        if (saved) deviceInput.value = saved;
        else {
            const auto = getDeviceType() + ' - ' + (navigator.userAgent.match(/Chrome\/(\S+)/)?.[1] ? 'Chrome' : navigator.userAgent.match(/Safari\//) ? 'Safari' : navigator.userAgent.match(/Firefox\//) ? 'Firefox' : 'Navigateur');
            deviceInput.value = auto;
            localStorage.setItem(DEVICE_NAME_KEY, auto);
        }
        deviceInput.addEventListener('change', () => { localStorage.setItem(DEVICE_NAME_KEY, deviceInput.value); });
    }
    const startDateInput = document.getElementById('start-date');
    if (startDateInput) { const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0); const offset = tomorrow.getTimezoneOffset() * 60000; startDateInput.value = new Date(tomorrow.getTime() - offset).toISOString().slice(0, 16); startDateInput.min = new Date(tomorrow.getTime() - offset).toISOString().slice(0, 10) + 'T08:00'; }
    if (startDateInput) startDateInput.addEventListener('change', () => { const isEditing = !!document.getElementById('edit-id').value; validateDate(true, isEditing); const d = new Date(startDateInput.value); renderStock(getDateStr(d)); });
    const longDurCheck = document.getElementById('long-duration'); const durInput = document.getElementById('duration-input'); const durDays = document.getElementById('duration-days');
    if (longDurCheck && durInput) longDurCheck.addEventListener('change', () => { durInput.classList.toggle('show', longDurCheck.checked); updateEndDate(); });
    if (durDays) durDays.addEventListener('input', updateEndDate); if (startDateInput) startDateInput.addEventListener('change', updateEndDate);
    function openModal() { document.getElementById('reservation-modal').classList.add('open'); } function closeModal() { document.getElementById('reservation-modal').classList.remove('open'); }
    document.getElementById('add-reservation-btn')?.addEventListener('click', () => { cancelEdit(); openModal(); });
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('reservation-modal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
    document.getElementById('cancel-edit-btn')?.addEventListener('click', () => { cancelEdit(); closeModal(); });
    const _origHandleEdit = handleEdit; handleEdit = async (id) => { await _origHandleEdit(id); openModal(); await refreshFormBadges(); };
    const form = document.getElementById('reservation-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); const editId = document.getElementById('edit-id').value || null; const isEditing = !!editId; if (!validateDate(true, isEditing)) return;
            const name = document.getElementById('client-name').value.trim(); const phone = document.getElementById('client-phone').value.trim(); const startDate = startDateInput.value;
            const isLongDuration = longDurCheck ? longDurCheck.checked : false; const durationDays = isLongDuration ? (parseInt(durDays?.value) || 2) : 1; const notes = document.getElementById('notes').value.trim();
            if (!name || !phone || !startDate) { showToast('Remplissez tous les champs', 'error'); return; }
            const items = getQtyValues(); if (items.length === 0) { showToast('Sélectionnez au moins un vélo', 'error'); return; }
            const dateStr = getDateStr(new Date(startDate)); const stock = await computeStockForDate(dateStr);
            for (const item of items) { const cfg = FLOTTE[item.bikeType]; if (!cfg) continue; const available = Math.max(0, cfg.total - stock[item.bikeType].reserved); if (item.quantity > available) { showToast(`⚠️ Stock insuffisant pour ${cfg.label} (reste ${available})`, 'error'); return; } }
            let endDate = null; if (isLongDuration) { const d = new Date(startDate); d.setDate(d.getDate() + durationDays); endDate = d.toISOString(); }
            const reservation = { clientName: name, clientPhone: phone, startDate: new Date(startDate).toISOString(), isLongDuration, durationDays, endDate, notes, deviceName: getDeviceName() };
            await saveReservation(reservation, items, editId);
            showToast(editId ? '✅ Réservation modifiée !' : '✅ Réservation enregistrée !', 'success'); cancelEdit(); closeModal();
            if (startDateInput) { const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0); const offset = tomorrow.getTimezoneOffset() * 60000; startDateInput.value = new Date(tomorrow.getTime() - offset).toISOString().slice(0, 16); }
            await renderDay(currentDateStr);
        });
    }
    document.getElementById('toggle-fleet-edit')?.addEventListener('click', () => { const editDiv = document.getElementById('fleet-edit'); const isHidden = editDiv.style.display === 'none' || !editDiv.style.display; editDiv.style.display = isHidden ? 'block' : 'none'; if (isHidden) renderFleetEdit(); });
    document.getElementById('fleet-cancel-btn')?.addEventListener('click', () => { document.getElementById('fleet-edit').style.display = 'none'; });
    document.getElementById('fleet-save-btn')?.addEventListener('click', async () => {
        const newFleet = {};
        FLOTTE_TYPES.forEach(t => {
            const el = document.getElementById(`fleet-${t}-input`);
            newFleet[t] = parseInt(el?.value) || 0;
        });
        await updateFleet(newFleet);
        renderFleetStatic();
        document.getElementById('fleet-edit').style.display = 'none';
        showToast('✅ Flotte sauvegardée dans l\'historique', 'success');
        renderDay(currentDateStr);
    });
    renderFleetStatic();
    document.getElementById('refresh-btn')?.addEventListener('click', async () => { await renderDay(currentDateStr); showToast('🔄 Actualisé', 'success'); });
    document.getElementById('export-btn')?.addEventListener('click', exportCSV);
    await renderDay(getDateStr(new Date()));
}

// ---- PIN SCREEN ----

function setupPinScreen() {
    const overlay = document.getElementById('pin-overlay');
    if (!overlay) { init(); return; }
    if (localStorage.getItem(UNLOCKED_KEY) === '1') { overlay.classList.add('hidden'); init(); return; }
    const dots = overlay.querySelectorAll('.dot');
    const errorEl = document.getElementById('pin-error');
    const delBtn = document.getElementById('pin-delete');
    let pin = '';
    function updateDots(w) { dots.forEach((d, i) => { d.classList.remove('filled', 'wrong'); if (i < pin.length) d.classList.add('filled'); if (w) d.classList.add('wrong'); }); }
    function clearError() { if (errorEl) errorEl.textContent = ''; }
    overlay.addEventListener('click', (e) => {
        const num = e.target.dataset?.num;
        if (num !== undefined) {
            clearError();
            if (pin.length >= 4) return;
            pin += num;
            updateDots(false);
            if (pin.length === 4) {
                if (pin === PIN_CODE) { localStorage.setItem(UNLOCKED_KEY, '1'); overlay.classList.add('hidden'); init(); }
                else { if (errorEl) errorEl.textContent = '❌ Code incorrect'; updateDots(true); setTimeout(() => { pin = ''; updateDots(false); }, 600); }
            }
        }
        if (e.target === delBtn || e.target.closest('#pin-delete')) { clearError(); pin = pin.slice(0, -1); updateDots(false); }
    });
}
document.addEventListener('DOMContentLoaded', setupPinScreen);