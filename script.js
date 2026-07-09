// =================================================================
// LOGIQUE COMPLÈTE DES SIMULATEURS DE TARIFS (COURT & LONGUE DURÉE)
// =================================================================

// ==========================================
// 1. SIMULATEUR 1 : COURTE DURÉE (LA JAUGE)
// ==========================================
const bikeSelect = document.getElementById('bike-select');
const sliderStart = document.getElementById('slider-start');
const sliderEnd = document.getElementById('slider-end');

const timeStartDisplay = document.getElementById('time-start');
const timeEndDisplay = document.getElementById('time-end');
const calcDurationDisplay = document.getElementById('calc-duration');
const warningDisplay = document.getElementById('simulator-warning');

const simBikeTitle = document.getElementById('sim-bike-title');
const simFinalPrice = document.getElementById('sim-final-price');
const simBikeTag = document.getElementById('sim-bike-tag');

const bikeInfos = {
    vae: {
        title: "Vélo électrique - VAE",
        tag: "80 km d'autonomie"
    },
    vtc: {
        title: "Vélo classique - VTC",
        tag: "Léger et réactif"
    },
    tandem: {
        title: "Tandem",
        tag: "Idéal couples / amis"
    },
    enfant: {
        title: "Vélo enfant",
        tag: "Pour les petits"
    }
};

// Convertit les minutes (ex: 550) en chaîne lisible (ex: "09h10")
function formatMinutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours.toString().padStart(2, '0') + "h" + minutes.toString().padStart(2, '0');
}

// Calcule le prix basé sur la durée exacte en heures
function calculatePrice(bikeType, durationInHours) {
    if (durationInHours <= 0) return 0;

    if (bikeType === 'vae') {
        if (durationInHours <= 2) return 26; // 0 à 2h
        if (durationInHours <= 4) return 34; // 2 à 4h
        if (durationInHours <= 6) return 46; // 4 à 6h
        return 50; // + de 6h
    }
    if (bikeType === 'vtc') {
        if (durationInHours <= 2) return 14; 
        if (durationInHours <= 4) return 18; 
        if (durationInHours <= 6) return 24; 
        return 27; 
    }
    if (bikeType === 'tandem') {
        if (durationInHours <= 4) return 45; // 0 à 4h
        return 60; // + de 4h
    }
    if (bikeType === 'enfant') {
        if (durationInHours <= 2) return 8; 
        if (durationInHours <= 4) return 12; 
        if (durationInHours <= 6) return 18; 
        return 22; 
    }
    return 0;
}

function updateShortDurationSimulator() {
    if (!sliderStart || !sliderEnd) return;
    
    let startMinutes = parseInt(sliderStart.value);
    let endMinutes = parseInt(sliderEnd.value);
    let selectedBike = bikeSelect.value;

    if (simBikeTitle) simBikeTitle.innerText = bikeInfos[selectedBike].title;
    if (simBikeTag) simBikeTag.innerText = bikeInfos[selectedBike].tag;

    // Sécurité : Validation de la cohérence temporelle
    if (startMinutes >= endMinutes) {
        warningDisplay.style.display = 'block';
        warningDisplay.innerText = "⚠️ L'heure de retour doit être supérieure à l'heure de départ.";
        calcDurationDisplay.innerText = "0 min";
        simFinalPrice.innerText = "-";
        return;
    } else {
        warningDisplay.style.display = 'none';
    }

    // Affichage des heures au format HHhMM
    timeStartDisplay.innerText = formatMinutesToTime(startMinutes);
    timeEndDisplay.innerText = formatMinutesToTime(endMinutes);

    // Calcul de la durée totale en minutes
    let diffMinutes = endMinutes - startMinutes;

    // Formatage de l'affichage de la durée (ex: "2h40" ou "50 min")
    if (diffMinutes < 60) {
        calcDurationDisplay.innerText = diffMinutes + " min";
    } else {
        let h = Math.floor(diffMinutes / 60);
        let m = diffMinutes % 60;
        calcDurationDisplay.innerText = h + "h" + (m > 0 ? m.toString().padStart(2, '0') : "");
    }

    // Passage de la durée en heures décimales pour le calcul tarifaire
    let durationInHours = diffMinutes / 60;
    let finalPrice = calculatePrice(selectedBike, durationInHours);
    simFinalPrice.innerText = finalPrice + " €";
}

if (bikeSelect) bikeSelect.addEventListener('change', updateShortDurationSimulator);

if (sliderStart) {
    sliderStart.addEventListener('input', () => {
        if (parseInt(sliderStart.value) >= parseInt(sliderEnd.value)) {
            sliderStart.value = sliderEnd.value - 10; // Maintient 10 min d'écart minimum
        }
        updateShortDurationSimulator();
    });
}

if (sliderEnd) {
    sliderEnd.addEventListener('input', () => {
        if (parseInt(sliderEnd.value) <= parseInt(sliderStart.value)) {
            sliderEnd.value = parseInt(sliderStart.value) + 10; // Maintient 10 min d'écart minimum
        }
        updateShortDurationSimulator();
    });
}


// ==========================================
// 2. SIMULATEUR 2 : LONGUE DURÉE (DATE PICKER)
// ==========================================
const ldBikeSelect = document.getElementById('bike-select-ld');
const ldStart = document.getElementById('ld-start');
const ldEnd = document.getElementById('ld-end');
const ldDurationDisplay = document.getElementById('ld-calc-duration');
const ldWarning = document.getElementById('ld-warning');
const ldBikeTitle = document.getElementById('ld-bike-title');
const ldBikeTag = document.getElementById('ld-bike-tag');
const ldFinalPrice = document.getElementById('ld-final-price');

// TARIFS OFFICIELS ISSUS DE VOTRE STRATÉGIE
const longDurationGrid = {
    vtc: { base24h: 40, sup12h: 18, week: 190 },
    vae: { base24h: 80, sup12h: 35, week: 390 },
    enfant: { base24h: 30, sup12h: 12, week: 150 }
};

function initDefaultDates() {
    if (!ldStart || !ldEnd) return;
    
    const today = new Date();

    const nextMonday = new Date();
    nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
    nextMonday.setHours(9, 0, 0, 0);

    const mondayAfter = new Date(nextMonday);
    mondayAfter.setDate(nextMonday.getDate() + 7);
    mondayAfter.setHours(17, 0, 0, 0);

    const formatForInput = (d) => {
        let offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    };

    ldStart.value = formatForInput(nextMonday);
    ldEnd.value = formatForInput(mondayAfter);
}

function calculateLongDurationPrice(bikeType, totalHours) {
    if (totalHours <= 0) return 0;

    const grid = longDurationGrid[bikeType];
    if (!grid) return 0; // Sécurité si un modèle n'est pas dans la grille LLD (ex: tandem)

    // 1. Décomposition : combien de semaines complètes de 168h ?
    let weeksCount = Math.floor(totalHours / 168);
    let remainingHours = totalHours % 168;

    let extraPrice = 0;

    // 2. Calcul du prix pour les heures restantes (hors semaines complètes)
    if (remainingHours > 0) {
        if (weeksCount === 0) {
            if (remainingHours <= 24) {
                extraPrice = grid.base24h;
            } else {
                let hoursAfter24h = remainingHours - 24;
                let blocksOf12h = Math.ceil(hoursAfter24h / 12);
                extraPrice = grid.base24h + (blocksOf12h * grid.sup12h);
            }
        } 
        // Si le client a fait au moins 1 semaine, tranches de 12h d'office dès la 1ère heure
        else {
            let blocksOf12h = Math.ceil(remainingHours / 12);
            extraPrice = blocksOf12h * grid.sup12h;
        }

        // 3. Règle du plafonnement à la semaine supérieure
        if (extraPrice > grid.week) {
            extraPrice = grid.week;
        }
    }

    // 4. Total final
    return (weeksCount * grid.week) + extraPrice;
}

function updateLongDurationSimulator() {
    if (!ldStart || !ldEnd) return;
    
    let start = new Date(ldStart.value);
    let end = new Date(ldEnd.value);
    let selectedBike = ldBikeSelect.value;

    if (ldBikeTitle) ldBikeTitle.innerText = bikeInfos[selectedBike].title;
    if (ldBikeTag) ldBikeTag.innerText = bikeInfos[selectedBike].tag;

    if (start >= end) {
        ldWarning.style.display = 'block';
        ldWarning.innerText = "⚠️ La date de fin doit être postérieure à la date de début.";
        ldDurationDisplay.innerText = "0 jour";
        ldFinalPrice.innerText = "-";
        return;
    } else {
        ldWarning.style.display = 'none';
    }

    let diffInMs = end - start;
    let diffInHours = diffInMs / (1000 * 60 * 60);

    let days = Math.floor(diffInHours / 24);
    let remainingHours = Math.round(diffInHours % 24);

    if (days === 0) {
        ldDurationDisplay.innerText = remainingHours + "h";
    } else {
        ldDurationDisplay.innerText = days + " jour(s) " + (remainingHours > 0 ? "et " + remainingHours + "h" : "");
    }

    let finalPrice = calculateLongDurationPrice(selectedBike, diffInHours);
    
    if (finalPrice === 0 && selectedBike === 'tandem') {
        ldFinalPrice.innerText = "Sur devis"; // Gère le cas du tandem non répertorié en longue durée
    } else {
        ldFinalPrice.innerText = finalPrice + " €";
    }
}

if (ldBikeSelect) ldBikeSelect.addEventListener('change', updateLongDurationSimulator);
if (ldStart) ldStart.addEventListener('change', updateLongDurationSimulator);
if (ldEnd) ldEnd.addEventListener('change', updateLongDurationSimulator);


// ==========================================
// 3. GESTION DE L'OUVERTURE DES ACCORDÉONS
// ==========================================
const btnToggleShort = document.getElementById('btn-toggle-short');
const boxShort = document.getElementById('box-short');
const btnToggleLong = document.getElementById('btn-toggle-long');
const boxLong = document.getElementById('box-long');

function setupAccordion(button, box) {
    button.addEventListener('click', () => {
        const isHidden = box.style.display === 'none';

        if (isHidden) {
            box.style.display = 'block';
            button.classList.add('active');
        } else {
            box.style.display = 'none';
            button.classList.remove('active');
        }
    });
}

if (btnToggleShort && boxShort) setupAccordion(btnToggleShort, boxShort);
if (btnToggleLong && boxLong) setupAccordion(btnToggleLong, boxLong);


// ==========================================
// 4. GESTION DU MENU BURGER MOBILE
// ==========================================
const burgerBtn = document.getElementById('burger-btn');
const navMenu = document.getElementById('nav-menu');
const navLinks = document.querySelectorAll('#nav-menu a');

if (burgerBtn && navMenu) {
    burgerBtn.addEventListener('click', () => {
        burgerBtn.classList.toggle('open');
        navMenu.classList.toggle('active');
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            burgerBtn.classList.remove('open');
            navMenu.classList.remove('active');
        });
    });
}


//POPUP
document.addEventListener("DOMContentLoaded", () => {
    const popup = document.getElementById("promo-popup");
    const closeBtn = document.getElementById("close-popup");
    const slides = document.querySelectorAll(".popup-slide");
    const prevBtn = document.getElementById("popup-prev");
    const nextBtn = document.getElementById("popup-next");
    let currentSlide = 0;

    // 1. Afficher la popup automatiquement après 2 secondes
    setTimeout(() => {
        popup.classList.add("show");
    }, 2000);

    // 2. Fermer la popup
    closeBtn.addEventListener("click", () => {
        popup.classList.remove("show");
    });

    // Fermer si on clique en dehors du carré blanc
    popup.addEventListener("click", (e) => {
        if (e.target === popup) popup.classList.remove("show");
    });

    // AJOUT : Fermer la popup quand on clique sur un bouton de lien à l'intérieur
    const actionButtons = popup.querySelectorAll(".btn-primary");
    actionButtons.forEach(button => {
        button.addEventListener("click", () => {
            popup.classList.remove("show");
        });
    });

    // 3. Logique du Carrousel (Changement de slide)
    function showSlide(index) {
        slides[currentSlide].classList.remove("active");
        currentSlide = (index + slides.length) % slides.length; // Permet de boucler à l'infini
        slides[currentSlide].classList.add("active");
    }

    nextBtn.addEventListener("click", () => showSlide(currentSlide + 1));
    prevBtn.addEventListener("click", () => showSlide(currentSlide - 1));
});


// ==========================================
// 5. LANCEMENT INITIAL DES MODULES
// ==========================================
initDefaultDates();
updateLongDurationSimulator();
updateShortDurationSimulator();