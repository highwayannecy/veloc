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
const WALKIN_KEY = 'veloc_walkin';
const DEVICE_NAME_KEY = 'veloc_device_name';
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

function loadFleetLocal() {
    try {
        const data = localStorage.getItem(FLEET_STORAGE_KEY);
        if (data) return JSON.parse(data);
    } catch {}
    return null;
}

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
const FLOTTE_TYPES = ['vae', 'vtc', 'tandem', 'enfant-16p', 'enfant-20p', 'enfant-24p', 'enfant-26p', 'siege'];

let _fleet = loadFleetLocal() || { vae: 20, vtc: 20, tandem: 6, 'enfant-16p': 3, 'enfant-20p': 3, 'enfant-24p': 3, 'enfant-26p': 3, siege: 10 };

function getFleet() { return _fleet; }

async function syncFleetFromDB() { if (useSupabase && window._supabase) { try { const { data, error } = await window._supabase.from('fleet').select('*').eq('id', 1).single(); if (!error && data) { const fleet = { vae: data.vae, vtc: data.vtc, tandem: data.tandem, 'enfant-16p': data['enfant-16p'], 'enfant-20p': data['enfant-20p'], 'enfant-24p': data['enfant-24p'], 'enfant-26p': data['enfant-26p'], siege: data.siege }; _fleet = fleet; for (const [type, total] of Object.entries(fleet)) { if (FLOTTE[type]) FLOTTE[type].total = total; } localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(fleet)); } } catch (e) { /* fallback */ } } }
async function saveFleetToDB(fleet) { localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(fleet)); if (useSupabase && window._supabase) { try { await window._supabase.from('fleet').upsert({ id: 1, ...fleet, updated_at: new Date().toISOString() }, { onConflict: 'id' }); } catch (e) { /* fallback */ } } }
async function updateFleet(fleet) { _fleet = fleet; for (const [type, total] of Object.entries(fleet)) { if (FLOTTE[type]) FLOTTE[type].total = total; } await saveFleetToDB(fleet); }

// ---- FLUX LIBRE (walk-in) ----

function getWalkinKey(dateStr) { return WALKIN_KEY + '_' + dateStr; }
function loadWalkin(dateStr) { try { const data = localStorage.getItem(getWalkinKey(dateStr)); if (data) return JSON.parse(data); } catch {} return { vae: 0, vtc: 0, tandem: 0, 'enfant-16p': 0, 'enfant-20p': 0, 'enfant-24p': 0, 'enfant-26p': 0, siege: 0 }; }
function saveWalkin(dateStr, walkin) { localStorage.setItem(getWalkinKey(dateStr), JSON.stringify(walkin)); }

async function renderWalkin(dateStr) {
    const grid = document.getElementById('walkin-grid');
    if (!grid) return;
    const walkin = loadWalkin(dateStr);
    const stock = await computeStockForDate(dateStr);
    const types = [
        { key: 'vae', icon: '⚡', label: 'VAE' }, { key: 'vtc', icon: '🚲', label: 'VTC' },
        { key: 'tandem', icon: '👫', label: 'Tandem' }, { key: 'enfant-16p', icon: '🧒', label: '16p' },
        { key: 'enfant-20p', icon: '🧒', label: '20p' }, { key: 'enfant-24p', icon: '🧒', label: '24p' },
        { key: 'enfant-26p', icon: '🧒', label: '26p' }, { key: 'siege', icon: '🍼', label: 'Siège' }
    ];
    let html = '';
    types.forEach(t => {
        const val = walkin[t.key] || 0;
        const total = FLOTTE[t.key].total || 0;
        // baseReserved = réservations uniquement (sans le walkin)
        const baseReserved = stock[t.key].reserved - val;
        // maxWalkin = maximum qu'on peut donner en walkin (total - réservations)
        const maxWalkin = Math.max(0, total - baseReserved);
        // available = ce qu'il reste sur la flotte (total - réservations - walkin)
        const available = Math.max(0, total - stock[t.key].reserved);
        const atMax = val >= maxWalkin;
        const availClass = available <= 0 ? 'stock-no' : available <= Math.ceil(total * 0.25) ? 'stock-low' : 'stock-ok';
        html += `
            <div class="bike-qty-item walkin-item" data-bike="${t.key}">
                <span class="bike-icon">${t.icon}</span>
                <span class="bike-name">${t.label}</span>
                <div class="qty-control">
                    <button type="button" class="qty-btn walkin-btn" data-date="${dateStr}" data-key="${t.key}" data-dir="-1">−</button>
                    <input type="text" class="qty-value walkin-val" data-key="${t.key}" value="${val}" readonly>
                    <button type="button" class="qty-btn walkin-btn" data-date="${dateStr}" data-key="${t.key}" data-dir="1" ${atMax ? 'disabled' : ''}>+</button>
                </div>
                <span class="stock-indicator ${availClass} walkin-avail">${available}</span>
            </div>
        `;
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
        // Mise à jour directe du DOM
        const item = btn.closest('.walkin-item');
        // Valeur du compteur
        const valEl = item?.querySelector('.walkin-val');
        if (valEl) valEl.value = newVal;
        // Refresh complet asynchrone (barres + walkin + formulaire)
        renderDay(dateStr);
    });
    document.getElementById('walkin-reset-btn')?.addEventListener('click', () => {
        if (!confirm('🔄 Réinitialiser le flux libre du jour ?')) return;
        const walkin = { vae: 0, vtc: 0, tandem: 0, 'enfant-16p': 0, 'enfant-20p': 0, 'enfant-24p': 0, 'enfant-26p': 0, siege: 0 };
        saveWalkin(currentDateStr, walkin);
        renderDay(currentDateStr);
        showToast('🔄 Flux libre réinitialisé', 'info');
    });
}

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
    for (const [type, cfg] of Object.entries(FLOTTE)) stock[type] = { total: cfg.total, reserved: 0 };
    reservations.forEach(r => { const nr = normalize(r); if (nr.status === 'noshow') return; const resDate = getDateStr(nr.startDate); let affectedDays = [resDate]; if (nr.isLongDuration && nr.durationDays > 1) { for (let i = 0; i < nr.durationDays; i++) affectedDays.push(addDays(resDate, i)); affectedDays = [...new Set(affectedDays)]; } if (affectedDays.includes(dateStr)) { nr.items.forEach(item => { const bt = item.bikeType === 'enfant' && item.bikeSize ? 'enfant-' + item.bikeSize : item.bikeType; if (stock[bt]) stock[bt].reserved += item.quantity; }); } });
    for (const [type, qty] of Object.entries(walkin)) { if (stock[type]) stock[type].reserved += qty; }
    return stock;
}

async function renderStock(dateStr) {
    const stock = await computeStockForDate(dateStr);
    for (const [type, cfg] of Object.entries(FLOTTE)) {
        const available = Math.max(0, cfg.total - stock[type].reserved);
        const pct = cfg.total > 0 ? (available / cfg.total) * 100 : 0;
        const availEl = document.getElementById(`stock-${type}-avail`); const totalEl = document.getElementById(`stock-${type}-total`); const barEl = document.getElementById(`stock-${type}-bar`); const cardEl = document.getElementById(`stock-${type}`);
        if (availEl) availEl.textContent = available; if (totalEl) totalEl.textContent = cfg.total; if (barEl) barEl.style.width = pct + '%';
        if (cardEl) { cardEl.classList.remove('critical', 'low'); if (available <= 0) cardEl.classList.add('critical'); else if (available <= Math.ceil(cfg.total * 0.25)) cardEl.classList.add('low'); }
    }
    const enfantTypes = ['enfant-16p', 'enfant-20p', 'enfant-24p', 'enfant-26p'];
    const totalEnfant = enfantTypes.reduce((sum, t) => sum + FLOTTE[t].total, 0); const reservedEnfant = enfantTypes.reduce((sum, t) => sum + (stock[t]?.reserved || 0), 0); const availEnfant = Math.max(0, totalEnfant - reservedEnfant); const pctEnfant = totalEnfant > 0 ? (availEnfant / totalEnfant) * 100 : 0;
    if (document.getElementById('stock-enfant-avail')) document.getElementById('stock-enfant-avail').textContent = availEnfant; if (document.getElementById('stock-enfant-total')) document.getElementById('stock-enfant-total').textContent = totalEnfant; if (document.getElementById('stock-enfant-bar')) document.getElementById('stock-enfant-bar').style.width = pctEnfant + '%';
    if (document.getElementById('stock-enfant')) { const el = document.getElementById('stock-enfant'); el.classList.remove('critical', 'low'); if (availEnfant <= 0) el.classList.add('critical'); else if (availEnfant <= Math.ceil(totalEnfant * 0.25)) el.classList.add('low'); }
    updateStockIndicators(stock);
}

function updateStockIndicators(stock) { document.querySelectorAll('.bike-qty-item:not(.walkin-item)').forEach(el => { const bikeType = el.dataset.bike; if (!bikeType || !stock[bikeType]) return; const cfg = FLOTTE[bikeType]; const available = Math.max(0, cfg.total - stock[bikeType].reserved); const indicator = el.querySelector('.stock-indicator'); if (indicator) { indicator.textContent = available; indicator.className = 'stock-indicator'; if (available <= 0) indicator.classList.add('stock-no'); else if (available <= Math.ceil(cfg.total * 0.25)) indicator.classList.add('stock-low'); else indicator.classList.add('stock-ok'); } const plusBtn = el.querySelector('.qty-plus'); const val = parseInt(el.querySelector('.qty-value').value) || 0; if (plusBtn) plusBtn.disabled = val >= available; }); }
function setupQtyControls() { document.querySelectorAll('.bike-qty-item:not(.walkin-item) .qty-minus').forEach(btn => { btn.addEventListener('click', () => { const item = btn.closest('.bike-qty-item'); const valEl = item.querySelector('.qty-value'); const badge = item.querySelector('.stock-indicator'); let val = parseInt(valEl.value) || 0; if (val > 0) { val--; valEl.value = val; if (badge) { const cur = parseInt(badge.textContent) || 0; badge.textContent = cur + 1; } } updatePlusButtons(item); }); }); document.querySelectorAll('.bike-qty-item:not(.walkin-item) .qty-plus').forEach(btn => { btn.addEventListener('click', () => { const item = btn.closest('.bike-qty-item'); const valEl = item.querySelector('.qty-value'); const badge = item.querySelector('.stock-indicator'); const max = parseInt(badge?.textContent) || 0; let val = parseInt(valEl.value) || 0; if (val < max) { val++; valEl.value = val; if (badge) { const cur = parseInt(badge.textContent) || 0; badge.textContent = Math.max(0, cur - 1); } } updatePlusButtons(item); }); }); }
function updatePlusButtons(item) { const val = parseInt(item.querySelector('.qty-value').value) || 0; const max = parseInt(item.querySelector('.stock-indicator').textContent) || 0; const plusBtn = item.querySelector('.qty-plus'); if (plusBtn) plusBtn.disabled = val >= max; }
function getQtyValues() { const items = []; document.querySelectorAll('.bike-qty-item').forEach(el => { const bikeType = el.dataset.bike; const qty = parseInt(el.querySelector('.qty-value').value) || 0; if (qty > 0) items.push({ bikeType, quantity: qty, bikeSize: null }); }); return items; }
function setQtyValues(items) { document.querySelectorAll('.qty-value').forEach(el => el.value = '0'); items.forEach(item => { const el = document.querySelector(`.bike-qty-item[data-bike="${item.bikeType}"]`); if (el) { const valEl = el.querySelector('.qty-value'); if (valEl) valEl.value = item.quantity; updatePlusButtons(el); } }); }
function validateDate(showError = true) { const startDateInput = document.getElementById('start-date'); if (!startDateInput) return false; const val = startDateInput.value; if (!val) return false; const selected = new Date(val); const tomorrowStart = new Date(); tomorrowStart.setDate(tomorrowStart.getDate() + 1); tomorrowStart.setHours(0, 0, 0, 0); if (selected < tomorrowStart) { if (showError) showToast('❌ La réservation doit être pour demain au minimum', 'error'); const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0); const offset = tomorrow.getTimezoneOffset() * 60000; startDateInput.value = new Date(tomorrow.getTime() - offset).toISOString().slice(0, 16); return false; } const hours = selected.getHours(); const minutes = selected.getMinutes(); if (hours > 10 || (hours === 10 && minutes > 45)) { if (showError) showToast('⏰ Dernière réservation à 10h45 (valide 15 min)', 'error'); const corrected = new Date(selected); corrected.setHours(10, 45, 0, 0); const offset = corrected.getTimezoneOffset() * 60000; startDateInput.value = new Date(corrected.getTime() - offset).toISOString().slice(0, 16); return false; } return true; }

async function renderDay(dateStr) {
    if (!dateStr) dateStr = getDateStr(new Date());
    currentDateStr = dateStr;
    const displayEl = document.getElementById('date-display'); const picker = document.getElementById('date-picker');
    if (displayEl) { const today = getDateStr(new Date()); displayEl.textContent = dateStr === today ? "📅 Aujourd'hui" : '📅 ' + formatDateLongFR(dateStr); }
    if (picker) picker.value = dateStr;
    await renderStock(dateStr);
    await renderWalkin(dateStr);
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
        html += `<div class="reservation-card ${statusClass}" id="res-card-${r.id}"><div class="time">${formatTime(r.startDate)}</div><div class="card-top"><div class="client-info"><span class="name">${escapeHtml(r.clientName)}</span><span class="phone">${escapeHtml(r.clientPhone)}</span></div><div class="meta-info">${createdDate ? `<span>📅 ${createdDate}</span>` : ''}${deviceLabel ? `<span>📱 ${deviceLabel}</span>` : ''}</div></div><div class="items-summary">${itemsHtml}</div><div class="action-btns"><button class="btn btn-success" onclick="handleArrived('${r.id}')" title="Venue confirmée">✅ Venu</button><button class="btn btn-warning" onclick="handleNoshow('${r.id}')" title="Pas venu">❌ Pas venu</button></div><button class="menu-btn" onclick="toggleMenu('${r.id}')" title="Plus d'actions">⋮</button><div class="context-menu" id="menu-${r.id}"><button onclick="handleEdit('${r.id}')">✏️ Modifier</button><button class="menu-danger" onclick="handleDelete('${r.id}')">🗑️ Supprimer</button></div></div>`;
    });
    listEl.innerHTML = html;
}

function toggleMenu(id) { const menu = document.getElementById('menu-' + id); if (!menu) return; const isOpen = menu.classList.contains('open'); document.querySelectorAll('.context-menu.open').forEach(m => m.classList.remove('open')); if (!isOpen) menu.classList.add('open'); }
document.addEventListener('click', (e) => { if (!e.target.closest('.menu-btn') && !e.target.closest('.context-menu')) { document.querySelectorAll('.context-menu.open').forEach(m => m.classList.remove('open')); } });

async function handleArrived(id) { const reservations = await loadReservations(); const r = reservations.map(normalize).find(x => x.id === id); if (!r) return; const newStatus = r.status === 'arrived' ? null : 'arrived'; await updateReservationStatus(id, newStatus); await renderDay(currentDateStr); showToast(newStatus === 'arrived' ? '✅ Venue confirmée' : 'Remis en attente', 'success'); }
async function handleNoshow(id) { const reservations = await loadReservations(); const r = reservations.map(normalize).find(x => x.id === id); if (!r) return; await updateReservationStatus(id, 'noshow'); await renderDay(currentDateStr); showToast('❌ Marqué pas venu', 'info'); }
async function handleDelete(id) { if (!confirm('🗑️ Supprimer cette réservation ?')) return; await deleteReservation(id); await renderDay(currentDateStr); showToast('Supprimé', 'info'); }
async function handleEdit(id) { const reservations = await loadReservations(); const r = reservations.map(normalize).find(x => x.id === id); if (!r) return; document.getElementById('edit-id').value = id; document.getElementById('client-name').value = r.clientName; document.getElementById('client-phone').value = r.clientPhone; const d = new Date(r.startDate); const offset = d.getTimezoneOffset() * 60000; document.getElementById('start-date').value = new Date(d.getTime() - offset).toISOString().slice(0, 16); setQtyValues(r.items); if (r.isLongDuration) { document.getElementById('long-duration').checked = true; document.getElementById('duration-input').classList.add('show'); document.getElementById('duration-days').value = r.durationDays; updateEndDate(); } else { document.getElementById('long-duration').checked = false; document.getElementById('duration-input').classList.remove('show'); } document.getElementById('notes').value = r.notes || ''; document.getElementById('form-title').textContent = '✏️ Modifier la réservation'; document.getElementById('submit-btn').textContent = '💾 Enregistrer les modifications'; document.getElementById('cancel-edit-btn').style.display = 'block'; showToast('✏️ Mode édition', 'info'); }
function cancelEdit() { document.getElementById('edit-id').value = ''; document.getElementById('form-title').textContent = '➕ Nouvelle réservation'; document.getElementById('submit-btn').textContent = '✅ Enregistrer'; document.getElementById('cancel-edit-btn').style.display = 'none'; document.getElementById('reservation-form').reset(); setQtyValues([]); document.getElementById('long-duration').checked = false; document.getElementById('duration-input').classList.remove('show'); const startDateInput = document.getElementById('start-date'); if (startDateInput) { const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0); const offset = tomorrow.getTimezoneOffset() * 60000; startDateInput.value = new Date(tomorrow.getTime() - offset).toISOString().slice(0, 16); } refreshFormBadges(); }
async function refreshFormBadges() {
    const stock = await computeStockForDate(currentDateStr || getDateStr(new Date()));
    document.querySelectorAll('.bike-qty-item:not(.walkin-item)').forEach(el => {
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
    });
}
async function exportCSV() { const reservations = await loadReservations(); if (!reservations || reservations.length === 0) { showToast('Aucune donnée à exporter', 'error'); return; } const all = reservations.map(normalize); let csv = 'Client,Téléphone,Date,Heure,Vélos,Durée jours,Longue durée,Statut,Notes,Créé le\n'; all.forEach(r => { const date = new Date(r.startDate); const dateStr = date.toLocaleDateString('fr-FR'); const timeStr = formatTime(r.startDate); const itemsDesc = r.items.map(i => { const cfg = FLOTTE[i.bikeType] || { label: i.bikeType }; return (i.bikeSize ? i.bikeSize + ' ' : '') + cfg.label + ' ×' + i.quantity; }).join(' + '); const created = r.createdAt ? new Date(r.createdAt).toLocaleString('fr-FR') : ''; const statusLabel = r.status === 'arrived' ? 'Venu' : r.status === 'noshow' ? 'Pas venu' : 'En attente'; csv += `"${r.clientName}","${r.clientPhone}",${dateStr},${timeStr},"${itemsDesc}",${r.durationDays || 1},${r.isLongDuration ? 'Oui' : 'Non'},${statusLabel},"${(r.notes||'').replace(/"/g,'""')}",${created}\n`; }); const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `reservations_veloc_${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href); showToast('📥 CSV téléchargé', 'success'); }
function setupDateNav() { const todayBtn = document.getElementById('today-btn'); const prevBtn = document.getElementById('prev-day'); const nextBtn = document.getElementById('next-day'); const picker = document.getElementById('date-picker'); if (todayBtn) todayBtn.addEventListener('click', () => renderDay(getDateStr(new Date()))); if (prevBtn) prevBtn.addEventListener('click', () => { const d = new Date(currentDateStr + 'T12:00:00'); d.setDate(d.getDate() - 1); renderDay(getDateStr(d)); }); if (nextBtn) nextBtn.addEventListener('click', () => { const d = new Date(currentDateStr + 'T12:00:00'); d.setDate(d.getDate() + 1); renderDay(getDateStr(d)); }); if (picker) picker.addEventListener('change', () => { if (picker.value) renderDay(picker.value); }); }
function updateEndDate() { const startDateInput = document.getElementById('start-date'); const durDays = document.getElementById('duration-days'); const endDateDisplay = document.getElementById('end-date-display'); if (!startDateInput || !durDays || !endDateDisplay) return; const startVal = startDateInput.value; if (startVal && durDays.value) { const d = new Date(startVal); const days = parseInt(durDays.value) || 2; d.setDate(d.getDate() + days); const offset = d.getTimezoneOffset() * 60000; endDateDisplay.value = new Date(d.getTime() - offset).toISOString().slice(0, 10); } }

const _fleetInputs = [{ id: 'fleet-vae-input', key: 'vae' }, { id: 'fleet-vtc-input', key: 'vtc' }, { id: 'fleet-tandem-input', key: 'tandem' }, { id: 'fleet-enfant-16p-input', key: 'enfant-16p' }, { id: 'fleet-enfant-20p-input', key: 'enfant-20p' }, { id: 'fleet-enfant-24p-input', key: 'enfant-24p' }, { id: 'fleet-enfant-26p-input', key: 'enfant-26p' }, { id: 'fleet-siege-input', key: 'siege' }];
function refreshFleetDisplay() { const f = getFleet(); const enfantTotal = (f['enfant-16p'] || 0) + (f['enfant-20p'] || 0) + (f['enfant-24p'] || 0) + (f['enfant-26p'] || 0); if (document.getElementById('fleet-vae')) document.getElementById('fleet-vae').textContent = f.vae || 0; if (document.getElementById('fleet-vtc')) document.getElementById('fleet-vtc').textContent = f.vtc || 0; if (document.getElementById('fleet-tandem')) document.getElementById('fleet-tandem').textContent = f.tandem || 0; if (document.getElementById('fleet-enfant')) document.getElementById('fleet-enfant').textContent = enfantTotal; if (document.getElementById('fleet-siege')) document.getElementById('fleet-siege').textContent = f.siege || 0; _fleetInputs.forEach(({ id, key }) => { const el = document.getElementById(id); if (el) el.value = f[key] || 0; }); }

let _realtimeSubscription = null;
function setupRealtime() { if (!useSupabase || !window._supabase) return; if (_realtimeSubscription) window._supabase.removeChannel(_realtimeSubscription); _realtimeSubscription = window._supabase.channel('reservations-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => { renderDay(currentDateStr); }).on('postgres_changes', { event: '*', schema: 'public', table: 'reservation_items' }, () => { renderDay(currentDateStr); }).on('postgres_changes', { event: '*', schema: 'public', table: 'fleet' }, async () => { await syncFleetFromDB(); refreshFleetDisplay(); renderDay(currentDateStr); }).subscribe(); }

async function init() {
    initSupabase(); if (window._supabase) { const ready = await isSupabaseReady(); if (ready) { useSupabase = true; setDbStatus(true); setupRealtime(); } else setDbStatus(false); } else setDbStatus(false);
    setupDateNav(); setupQtyControls(); setupWalkin(); await syncFleetFromDB();
    // Détection auto de l'appareil + sauvegarde localStorage
    const deviceInput = document.getElementById('device-name-input');
    if (deviceInput) {
        const saved = localStorage.getItem(DEVICE_NAME_KEY);
        if (saved) {
            deviceInput.value = saved;
        } else {
            const auto = getDeviceType() + ' - ' + (navigator.userAgent.match(/Chrome\/(\S+)/)?.[1] ? 'Chrome' : navigator.userAgent.match(/Safari\//) ? 'Safari' : navigator.userAgent.match(/Firefox\//) ? 'Firefox' : 'Navigateur');
            deviceInput.value = auto;
            localStorage.setItem(DEVICE_NAME_KEY, auto);
        }
        deviceInput.addEventListener('change', () => { localStorage.setItem(DEVICE_NAME_KEY, deviceInput.value); });
    }
    const startDateInput = document.getElementById('start-date');
    if (startDateInput) { const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0); const offset = tomorrow.getTimezoneOffset() * 60000; startDateInput.value = new Date(tomorrow.getTime() - offset).toISOString().slice(0, 16); startDateInput.min = new Date(tomorrow.getTime() - offset).toISOString().slice(0, 10) + 'T08:00'; }
    if (startDateInput) startDateInput.addEventListener('change', () => { validateDate(true); const d = new Date(startDateInput.value); renderStock(getDateStr(d)); });
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
            e.preventDefault(); if (!validateDate(true)) return;
            const editId = document.getElementById('edit-id').value || null; const name = document.getElementById('client-name').value.trim(); const phone = document.getElementById('client-phone').value.trim(); const startDate = startDateInput.value;
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
    document.getElementById('toggle-fleet-edit')?.addEventListener('click', () => { const editDiv = document.getElementById('fleet-edit'); const isHidden = editDiv.style.display === 'none' || !editDiv.style.display; editDiv.style.display = isHidden ? 'block' : 'none'; if (isHidden) refreshFleetDisplay(); });
    document.getElementById('fleet-cancel-btn')?.addEventListener('click', () => { document.getElementById('fleet-edit').style.display = 'none'; });
    document.getElementById('fleet-save-btn')?.addEventListener('click', () => { const newFleet = {}; _fleetInputs.forEach(({ id, key }) => { const el = document.getElementById(id); newFleet[key] = parseInt(el?.value) || 0; }); updateFleet(newFleet); refreshFleetDisplay(); document.getElementById('fleet-edit').style.display = 'none'; showToast('✅ Flotte mise à jour', 'success'); renderDay(currentDateStr); });
    refreshFleetDisplay();
    document.getElementById('refresh-btn')?.addEventListener('click', async () => { await renderDay(currentDateStr); showToast('🔄 Actualisé', 'success'); });
    document.getElementById('export-btn')?.addEventListener('click', exportCSV);
    document.getElementById('clear-all-btn')?.addEventListener('click', clearAllReservations);
    await renderDay(getDateStr(new Date()));
}
document.addEventListener('DOMContentLoaded', init);