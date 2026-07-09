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