document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.querySelector('.chapter-carousel');
    const cards = Array.from(carousel.querySelectorAll('article'));

    if (cards.length === 0) return;

    // --- MANEJO DE ELEMENTOS EXTRA (PLAY Y CLASES) ---
    function updateExtraElements() {
        cards.forEach(card => {
            const btn = card.querySelector('button');
            if (btn) btn.remove();
            
            const img = card.querySelector('img');
            if (img) img.classList.remove('chapter-card-active-image');
        });

        const activeCard = carousel.querySelector('.chapter-card-active');
        if (activeCard) {
            const img = activeCard.querySelector('img');
            if (img) img.classList.add('chapter-card-active-image');

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('aria-label', 'Reproducir capítulo');
            btn.innerHTML = '<img src="Images/play.png" alt="" aria-hidden="true">';
            activeCard.appendChild(btn);
        }
    }

    // --- FUNCIONES PARA ROTAR CLASES ---
    // --- FUNCIONES PARA ROTAR CLASES ---
    function moveCardsLeft() {
        const prev = carousel.querySelector('.chapter-card-prev');
        const active = carousel.querySelector('.chapter-card-active');
        const next = carousel.querySelector('.chapter-card-next');

        // Las tarjetas visibles hacen su animación normal
        if (active) active.className = 'chapter-card-prev'; 
        if (next) next.className = 'chapter-card-active'; 

        // La tarjeta que da la vuelta (prev) se oculta
        if (prev) {
            // 1. La volvemos invisible y le quitamos la transición
            prev.style.transition = 'none';
            prev.style.opacity = '0';
            prev.className = 'chapter-card-next'; 
            
            // 2. Esperamos exactamente 400ms (lo que dura tu CSS) para que reaparezca
            setTimeout(() => {
                prev.style.transition = 'all 0.4s ease-in-out';
                prev.style.opacity = ''; // Esto le devuelve el 0.6 dictado por tu CSS
            }, 100);
        }
        
        updateExtraElements();
    }

    function moveCardsRight() {
        const prev = carousel.querySelector('.chapter-card-prev');
        const active = carousel.querySelector('.chapter-card-active');
        const next = carousel.querySelector('.chapter-card-next');

        if (active) active.className = 'chapter-card-next'; 
        if (prev) prev.className = 'chapter-card-active'; 

        if (next) {
            // Ocultamos la tarjeta que viaja (next)
            next.style.transition = 'none';
            next.style.opacity = '0';
            next.className = 'chapter-card-prev'; 
            
            // La mostramos de nuevo cuando la central termine de llegar
            setTimeout(() => {
                next.style.transition = 'all 0.4s ease-in-out';
                next.style.opacity = ''; 
            }, 100);
        }
        
        updateExtraElements();
    }

    // --- CLICS EN TARJETAS ---
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            if (card.classList.contains('chapter-card-next')) moveCardsLeft();
            else if (card.classList.contains('chapter-card-prev')) moveCardsRight();
        });
    });

    // --- LÓGICA DEL ARRASTRE SINCRONIZADO (SCRUBBING) ---
    let startX = 0;
    let isDragging = false;
    
    // Calculamos el valor de 72vw en píxeles para saber el límite de distancia
    let gapPx = window.innerWidth * 0.72; 

    // Actualizamos el límite si rotan el celular
    window.addEventListener('resize', () => {
        gapPx = window.innerWidth * 0.72;
    });

    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        
        // Apagamos la transición de CSS para que el JS controle los fotogramas
        cards.forEach(card => {
            card.style.transition = 'none';
        });
    }, { passive: true });

    carousel.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        let distance = e.touches[0].clientX - startX;

        // 1. LIMITAR EL ARRASTRE: Evitamos que vaya más allá de la siguiente tarjeta
        if (distance > gapPx) distance = gapPx;
        if (distance < -gapPx) distance = -gapPx;

        // 2. CALCULAR PROGRESO (de 0 a 1)
        const progress = Math.abs(distance / gapPx); 

        const active = carousel.querySelector('.chapter-card-active');
        const prev = carousel.querySelector('.chapter-card-prev');
        const next = carousel.querySelector('.chapter-card-next');

        // 3. INTERPOLACIÓN: Matemáticas para transformar escala y opacidad progresivamente
        const activeScale = 1 - (0.12 * progress); // Se encoge de 1 a 0.88
        const sideScale = 0.88 + (0.12 * progress); // Crece de 0.88 a 1
        
        const activeOpacity = 1 - (0.4 * progress); // Se desvanece de 1 a 0.6
        const sideOpacity = 0.6 + (0.4 * progress); // Se ilumina de 0.6 a 1

        if (active) {
            active.style.transform = `translate(calc(-50% + ${distance}px), -50%) scale(${activeScale})`;
            active.style.opacity = activeOpacity;
        }

        if (distance < 0) {
            // Arrastrando a la izquierda (Acercando la tarjeta Next)
            if (next) {
                next.style.transform = `translate(calc(-50% + ${gapPx + distance}px), -50%) scale(${sideScale})`;
                next.style.opacity = sideOpacity;
            }
            if (prev) {
                // La tarjeta previa solo se empuja hacia la izquierda
                prev.style.transform = `translate(calc(-50% - ${gapPx}px + ${distance}px), -50%) scale(0.88)`;
            }
        } else {
            // Arrastrando a la derecha (Acercando la tarjeta Prev)
            if (prev) {
                prev.style.transform = `translate(calc(-50% - ${gapPx - distance}px), -50%) scale(${sideScale})`;
                prev.style.opacity = sideOpacity;
            }
            if (next) {
                // La tarjeta siguiente solo se empuja hacia la derecha
                next.style.transform = `translate(calc(-50% + ${gapPx}px + ${distance}px), -50%) scale(0.88)`;
            }
        }
    }, { passive: true });

    carousel.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        const distance = e.changedTouches[0].clientX - startX;

        // Limpiamos los estilos inyectados y reactivamos la animación CSS
        cards.forEach(card => {
            card.style.transition = 'all 0.4s ease-in-out';
            card.style.transform = ''; 
            card.style.opacity = '';
        });

        // Si arrastró más del 30% del trayecto, confirmamos el cambio
        const threshold = gapPx * 0.3;
        
        if (distance < -threshold) {
            moveCardsLeft();
        } else if (distance > threshold) {
            moveCardsRight();
        }
    });
    
    // Iniciar con todo en orden
    updateExtraElements();
});