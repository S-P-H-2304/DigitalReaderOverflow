/**
 * Overflow Bottom Navigation & Page Optimization (navigation.js)
 * 
 * Funcionalidades clave:
 * 1. Resalta coherentemente el ítem activo en la barra inferior (aria-current="page", .active-nav-item).
 * 2. Optimización UX: Si el usuario pulsa sobre el ícono de la pantalla en la que ya está 
 *    (ej. pulsa Inicio mientras está en Inicio), previene la recarga completa del navegador 
 *    y realiza un scroll suave hacia el tope superior (patrón estándar en apps móviles nativas).
 * 3. Mantiene la coherencia de estados y animaciones en vista de comunidad.
 */

document.addEventListener('DOMContentLoaded', () => {
    const bottomNav = document.querySelector('.bottom-nav');
    if (!bottomNav) return;

    const navLinks = bottomNav.querySelectorAll('.bottom-nav-list a');
    if (!navLinks.length) return;

    // 1. Identificar la vista actual normalizando la ruta
    const currentPath = window.location.pathname.toLowerCase();
    let currentPage = 'index.html';

    if (currentPath.endsWith('community.html')) {
        currentPage = 'community.html';
    } else if (currentPath.endsWith('myprofile.html') || currentPath.endsWith('otherprofile.html')) {
        currentPage = 'myprofile.html';
    } else if (currentPath.endsWith('index.html') || currentPath === '/' || currentPath.endsWith('/')) {
        currentPage = 'index.html';
    } else {
        const fileMatch = currentPath.match(/\/([^\/]+\.html)/);
        if (fileMatch) {
            currentPage = fileMatch[1];
        }
    }

    function isSamePage(href) {
        if (!href) return false;
        const cleanHref = href.toLowerCase().split('?')[0].split('#')[0];
        
        if (currentPage === 'index.html') {
            return cleanHref === 'index.html' || cleanHref === './' || cleanHref === '/' || cleanHref === '';
        }
        if (currentPage === 'community.html') {
            return cleanHref === 'community.html';
        }
        if (currentPage === 'myprofile.html') {
            return cleanHref === 'myprofile.html';
        }
        return cleanHref === currentPage;
    }

    // 2. Marcar visualmente el ítem activo
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        const active = isSamePage(href);

        if (active) {
            link.classList.add('active-nav-item');
            link.setAttribute('aria-current', 'page');
        } else {
            link.classList.remove('active-nav-item');
            link.removeAttribute('aria-current');
        }

        // 3. Manejo optimizado de clics y transición fluida del navbar
        link.addEventListener('click', (e) => {
            const clickedHref = link.getAttribute('href');
            if (isSamePage(clickedHref)) {
                e.preventDefault();
                // Desplazamiento suave hacia arriba si hay scroll
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            } else if (currentPage === 'community.html') {
                // Al salir de Comunidad hacia Inicio o Perfil:
                // Colapsar el botón '+' y re-centrar el navbar suavemente durante 200ms antes de cambiar de página
                e.preventDefault();
                bottomNav.classList.remove('is-community');
                bottomNav.classList.add('is-leaving');
                setTimeout(() => {
                    window.location.href = clickedHref;
                }, 200);
            }
        });
    });

    // 4. Animación contextual elástica al entrar a comunidad
    if (currentPage === 'community.html') {
        // Breve retraso para que el usuario aprecie el deslizamiento a la izquierda y el brote del botón a la derecha
        setTimeout(() => {
            requestAnimationFrame(() => {
                bottomNav.classList.add('is-community');
            });
        }, 60);
    }
});