document.addEventListener('DOMContentLoaded', () => {
    const bottomNav = document.querySelector('.bottom-nav');
    const isCommunityView = document.querySelector('.community-container') !== null;

    if (!bottomNav) return;

    // Si estamos en la vista de comunidad
    if (isCommunityView) {
        // Retrasamos la activación 100ms para que la página cargue, 
        // la barra nazca junta, y luego ocurra la animación de separación
        setTimeout(() => {
            bottomNav.classList.add('is-community');
        }, 100);
    }

    // Manejo de clics en los enlaces de la barra
    const navLinks = document.querySelectorAll('.bottom-nav-list a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const target = link.getAttribute('href');

            if (target === '#community' || target.includes('comunidad')) {
                bottomNav.classList.add('is-community');
            } else {
                bottomNav.classList.remove('is-community');
            }
        });
    });
});