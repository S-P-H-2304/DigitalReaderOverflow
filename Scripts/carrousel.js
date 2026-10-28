document.addEventListener('DOMContentLoaded', () => {

    const carousel = document.querySelector('.chapter-carousel');

    const cards = Array.from(carousel.querySelectorAll('article'));



    if (cards.length === 0) return;



        // --- RESTAURACIÓN INICIAL SILENCIOSA DEL CAPÍTULO GUARDADO ---
    function restoreActiveChapterQuietly(targetChapterId) {
        const id = String(targetChapterId);
        const chapters = ['1', '2', '3', '4'];
        const targetIndex = chapters.indexOf(id);
        if (targetIndex === -1) return;

        const prevId = chapters[(targetIndex - 1 + chapters.length) % chapters.length];
        const nextId = chapters[(targetIndex + 1) % chapters.length];
        const hiddenId = chapters[(targetIndex + 2) % chapters.length];

        cards.forEach(card => {
            const cId = card.getAttribute('data-chapter-id');
            card.style.transition = 'none';
            if (cId === id) {
                card.className = 'chapter-card-active';
            } else if (cId === prevId) {
                card.className = 'chapter-card-prev';
            } else if (cId === nextId) {
                card.className = 'chapter-card-next';
            } else {
                card.className = 'chapter-card-hidden';
            }
        });

        requestAnimationFrame(() => {
            cards.forEach(card => {
                card.style.transition = '';
            });
        });
    }

    // --- NOTIFICACIÓN FLOTANTE SUPERIOR Y FEEDBACK SHAKE PARA CAPÍTULOS NO DISPONIBLES ---
    let lockedToastTimeout = null;

    function showChapterLockedToast(chapterNum) {
        let toast = document.getElementById('chapter-locked-toast');
        let toastText = document.getElementById('chapter-locked-toast-text');

        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'chapter-locked-toast';
            toast.className = 'chapter-locked-toast';
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'assertive');
            toast.innerHTML = `
                <div class="chapter-locked-toast-icon" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.8"/>
                        <path d="M6.5 6.5L13.5 13.5M6.5 13.5L13.5 6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                </div>
                <span id="chapter-locked-toast-text" class="chapter-locked-toast-text"></span>
                <div class="chapter-locked-toast-progress-track" aria-hidden="true">
                    <div class="chapter-locked-toast-progress-bar"></div>
                </div>
            `;
            document.body.appendChild(toast);
            toastText = toast.querySelector('#chapter-locked-toast-text');
        }

        if (toastText) {
            toastText.textContent = `Capítulo ${chapterNum} próximamente disponible`;
        }

        // Forzar reflow para reiniciar la animación si se pulsa repetidamente
        toast.classList.remove('is-visible');
        void toast.offsetWidth;
        toast.classList.add('is-visible');
        toast.setAttribute('aria-hidden', 'false');

        if (lockedToastTimeout) clearTimeout(lockedToastTimeout);
        lockedToastTimeout = setTimeout(() => {
            toast.classList.remove('is-visible');
            toast.setAttribute('aria-hidden', 'true');
        }, 2800);
    }

    function triggerRestrictedShake(element) {
        if (!element) return;
        element.classList.remove('shake-restricted');
        void element.offsetWidth;
        element.classList.add('shake-restricted');
        setTimeout(() => {
            element.classList.remove('shake-restricted');
        }, 500);
    }

    const existingLockedToast = document.getElementById('chapter-locked-toast');
    if (existingLockedToast) {
        existingLockedToast.addEventListener('click', () => {
            existingLockedToast.classList.remove('is-visible');
            existingLockedToast.setAttribute('aria-hidden', 'true');
            if (lockedToastTimeout) clearTimeout(lockedToastTimeout);
        });
    }

    // --- MANEJO DE ELEMENTOS EXTRA (PLAY Y CLASES) ---
    const playButton = carousel.querySelector('.chapter-card-active button')
        || carousel.querySelector('button');

    if (playButton) {
        playButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const activeCard = carousel.querySelector('.chapter-card-active');
            const chapterId = activeCard ? activeCard.getAttribute('data-chapter-id') : '1';

            if (chapterId === '1') {
                window.location.href = 'chapterReader.html';
            } else {
                triggerRestrictedShake(playButton);
                showChapterLockedToast(chapterId);
            }
        });
    }



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
                fader.style.height = '100dvh';

                fader.style.background = oldBg;

                fader.style.zIndex = '-1'; // Detrás de todo

                fader.style.pointerEvents = 'none';

                fader.style.transition = 'opacity 0.6s ease';

                document.body.appendChild(fader);

                

                // 3. Aplicamos el nuevo tema (el body cambiará su fondo instantáneamente detrás del fader)

                document.documentElement.setAttribute('data-chapter', chapterId);

                if (window.DB) {
                    window.DB.setActiveChapter(chapterId);
                } else {
                    localStorage.setItem('activeChapter', chapterId);
                }

                

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

            if (card.classList.contains('chapter-card-next')) {
                moveCardsLeft();
            } else if (card.classList.contains('chapter-card-prev')) {
                moveCardsRight();
            } else if (card.classList.contains('chapter-card-active')) {
                if (hasDragged) {
                    hasDragged = false;
                    return;
                }
                const chapterId = card.getAttribute('data-chapter-id') || '1';
                if (chapterId === '1') {
                    window.location.href = 'chapterOneOverview.html';
                } else {
                    if (playButton) triggerRestrictedShake(playButton);
                    showChapterLockedToast(chapterId);
                }
            }

        });

    });



    // --- LOGICA DEL ARRASTRE SINCRONIZADO (SCRUBBING) ---

    let startX = 0;

    let isDragging = false;

    let hasDragged = false;

    

    // 75vw es lo que se usa en CSS (calc(-50% - 75vw)). 72vw era el valor en JS antes.

    // Usaremos el valor que mejor empareje con el CSS.

    let gapPx = window.innerWidth * 0.75; 



    window.addEventListener('resize', () => {

        gapPx = window.innerWidth * 0.75;

    });



    carousel.addEventListener('touchstart', (e) => {

        startX = e.touches[0].clientX;

        isDragging = true;

        hasDragged = false;

        

        cards.forEach(card => {

            card.style.transition = 'none';

        });

    }, { passive: true });



    carousel.addEventListener('touchmove', (e) => {

        if (!isDragging) return;

        

        let distance = e.touches[0].clientX - startX;

        if (Math.abs(distance) > 10) {
            hasDragged = true;
        }



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

        if (Math.abs(distance) > 10) {
            hasDragged = true;
            setTimeout(() => { hasDragged = false; }, 250);
        }



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
    async function initCarousel() {
        const savedChapter = window.DB 
            ? (await window.DB.getActiveChapter()) 
            : (localStorage.getItem('activeChapter') || '1');

        if (savedChapter && savedChapter !== '1') {
            restoreActiveChapterQuietly(savedChapter);
        }
        updateExtraElements();
        updateTheme();
    }

    initCarousel();

});





