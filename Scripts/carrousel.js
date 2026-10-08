document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.querySelector('.chapter-carousel');
    const cards = Array.from(carousel.querySelectorAll('article'));

    if (cards.length === 0) return;

    // --- MANEJO DE ELEMENTOS EXTRA (PLAY Y CLASES) ---
    // Guardamos UNA sola vez el boton original del HTML (con su SVG).
    // En vez de destruirlo y recrearlo, solo lo movemos a la tarjeta activa,
    // asi se conserva el SVG y cualquier listener que tenga.
    const playButton = carousel.querySelector('.chapter-card-active button')
        || carousel.querySelector('button');

    function updateExtraElements() {
        cards.forEach(card => {
            const img = card.querySelector('img');
            if (img) img.classList.remove('chapter-card-active-image');
        });

        const activeCard = carousel.querySelector('.chapter-card-active');
        if (activeCard) {
            const img = activeCard.querySelector('img');
            if (img) img.classList.add('chapter-card-active-image');

            // appendChild mueve el nodo existente (no lo duplica)
            if (playButton && playButton.parentNode !== activeCard) {
                activeCard.appendChild(playButton);
            }
        }
    }

    // --- ACTUALIZACION DEL TEMA ---
    function updateTheme() {
        const activeCard = carousel.querySelector('.chapter-card-active');
        if (activeCard) {
            const chapterId = activeCard.getAttribute('data-chapter-id');
            if (chapterId && document.documentElement.getAttribute('data-chapter') !== chapterId) {
                
                // 1. Capturamos el fondo viejo antes del cambio
                const oldBg = getComputedStyle(document.body).background;
                
                // 2. Creamos un elemento para el crossfade manual del fondo
                const fader = document.createElement('div');
                fader.style.position = 'fixed';
                fader.style.top = '0';
                fader.style.left = '0';
                fader.style.width = '100vw';
                fader.style.height = '100vh';
                fader.style.background = oldBg;
                fader.style.zIndex = '-1'; // Detrás de todo
                fader.style.pointerEvents = 'none';
                fader.style.transition = 'opacity 0.6s ease';
                document.body.appendChild(fader);
                
                // 3. Aplicamos el nuevo tema (el body cambiará su fondo instantáneamente detrás del fader)
                document.documentElement.setAttribute('data-chapter', chapterId);
                localStorage.setItem('activeChapter', chapterId);
                
                // 4. Hacemos que el fader desaparezca suavemente
                // Forzamos reflow para que la transición funcione
                fader.offsetHeight; 
                fader.style.opacity = '0';
                
                // 5. Limpiamos el DOM una vez terminada la transición
                setTimeout(() => {
                    if(fader.parentNode) fader.remove();
                }, 600);
            }
        }
    }

    // --- FUNCIONES PARA ROTAR CLASES ---
    function moveCardsLeft() {
        const prev = carousel.querySelector('.chapter-card-prev');
        const active = carousel.querySelector('.chapter-card-active');
        const next = carousel.querySelector('.chapter-card-next');
        const hidden = carousel.querySelector('.chapter-card-hidden');

        if (active) active.className = 'chapter-card-prev'; 
        if (next) next.className = 'chapter-card-active'; 
        if (hidden) hidden.className = 'chapter-card-next';
        
        if (prev) {
            prev.style.transition = 'none';
            prev.className = 'chapter-card-hidden';
            setTimeout(() => {
                prev.style.transition = 'all 0.4s ease-in-out';
            }, 50);
        }
        
        updateExtraElements();
        updateTheme();
    }

    function moveCardsRight() {
        const prev = carousel.querySelector('.chapter-card-prev');
        const active = carousel.querySelector('.chapter-card-active');
        const next = carousel.querySelector('.chapter-card-next');
        const hidden = carousel.querySelector('.chapter-card-hidden');

        if (active) active.className = 'chapter-card-next'; 
        if (prev) prev.className = 'chapter-card-active'; 
        if (hidden) hidden.className = 'chapter-card-prev';

        if (next) {
            next.style.transition = 'none';
            next.className = 'chapter-card-hidden';
            setTimeout(() => {
                next.style.transition = 'all 0.4s ease-in-out';
            }, 50);
        }
        
        updateExtraElements();
        updateTheme();
    }

    // --- CLICS EN TARJETAS ---
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            if (card.classList.contains('chapter-card-next')) moveCardsLeft();
            else if (card.classList.contains('chapter-card-prev')) moveCardsRight();
        });
    });

    // --- LOGICA DEL ARRASTRE SINCRONIZADO (SCRUBBING) ---
    let startX = 0;
    let isDragging = false;
    
    // 75vw es lo que se usa en CSS (calc(-50% - 75vw)). 72vw era el valor en JS antes.
    // Usaremos el valor que mejor empareje con el CSS.
    let gapPx = window.innerWidth * 0.75; 

    window.addEventListener('resize', () => {
        gapPx = window.innerWidth * 0.75;
    });

    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        
        cards.forEach(card => {
            card.style.transition = 'none';
        });
    }, { passive: true });

    carousel.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        let distance = e.touches[0].clientX - startX;

        if (distance > gapPx) distance = gapPx;
        if (distance < -gapPx) distance = -gapPx;

        const progress = Math.abs(distance / gapPx); 

        const active = carousel.querySelector('.chapter-card-active');
        const prev = carousel.querySelector('.chapter-card-prev');
        const next = carousel.querySelector('.chapter-card-next');
        const hidden = carousel.querySelector('.chapter-card-hidden');

        const activeScale = 1 - (0.12 * progress);
        const sideScale = 0.88 + (0.12 * progress);
        
        const activeOpacity = 1 - (0.4 * progress);
        const sideOpacity = 0.6 + (0.4 * progress);

        if (active) {
            active.style.transform = `translate(calc(-50% + ${distance}px), -50%) scale(${activeScale})`;
            active.style.opacity = activeOpacity;
        }

        if (distance < 0) {
            // Arrastrando izq
            if (next) {
                next.style.transform = `translate(calc(-50% + ${gapPx + distance}px), -50%) scale(${sideScale})`;
                next.style.opacity = sideOpacity;
            }
            if (prev) {
                prev.style.transform = `translate(calc(-50% - ${gapPx}px + ${distance}px), -50%) scale(0.88)`;
            }
        } else {
            // Arrastrando der
            if (prev) {
                prev.style.transform = `translate(calc(-50% - ${gapPx - distance}px), -50%) scale(${sideScale})`;
                prev.style.opacity = sideOpacity;
            }
            if (next) {
                next.style.transform = `translate(calc(-50% + ${gapPx}px + ${distance}px), -50%) scale(0.88)`;
            }
        }
    }, { passive: true });

    carousel.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        const distance = e.changedTouches[0].clientX - startX;

        cards.forEach(card => {
            card.style.transition = 'all 0.4s ease-in-out';
            card.style.transform = ''; 
            card.style.opacity = '';
        });

        const threshold = gapPx * 0.3;
        
        if (distance < -threshold) {
            moveCardsLeft();
        } else if (distance > threshold) {
            moveCardsRight();
        } else {
            // Si no pasó el threshold, forzamos reflow para que vuelva a su lugar animado
            updateExtraElements();
        }
    });
    
    // Iniciar
    updateExtraElements();
    updateTheme();
});


