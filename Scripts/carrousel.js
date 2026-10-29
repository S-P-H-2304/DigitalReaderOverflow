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

    // --- MANEJO DE ELEMENTOS EXTRA (PLAY / LOCK Y CLASES) ---
    const PLAY_ICON_SVG = `<svg viewBox="0 0 40 45" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M37.9781 25.9831L6.1647 44.4405C3.46483 46.0053 0 44.1106 0 40.956V4.04117C0 0.891615 3.45983 -1.00812 6.1647 0.561661L37.9781 19.0191C38.5923 19.3696 39.1028 19.8764 39.4579 20.4879C39.813 21.0994 40 21.794 40 22.5011C40 23.2082 39.813 23.9027 39.4579 24.5143C39.1028 25.1258 38.5923 25.6325 37.9781 25.9831Z" fill="#D4DBE4" fill-opacity="0.85"/>
    </svg>`;

    const LOCK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-lock" viewBox="0 0 16 16">
        <path fill-rule="evenodd" d="M8 0a4 4 0 0 1 4 4v2.05a2.5 2.5 0 0 1 2 2.45v5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 13.5v-5a2.5 2.5 0 0 1 2-2.45V4a4 4 0 0 1 4-4M4.5 7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7zM8 1a3 3 0 0 0-3 3v2h6V4a3 3 0 0 0-3-3"/>
    </svg>`;

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

            const chapterId = activeCard.getAttribute('data-chapter-id') || '1';
            if (playButton) {
                if (playButton.parentNode !== activeCard) {
                    activeCard.appendChild(playButton);
                }
                const isLocked = chapterId !== '1';
                playButton.classList.toggle('is-locked-chapter', isLocked);
                playButton.setAttribute('aria-label', isLocked ? `Capítulo ${chapterId} bloqueado` : `Reproducir capítulo ${chapterId}`);
                playButton.innerHTML = isLocked ? LOCK_ICON_SVG : PLAY_ICON_SVG;
            }
        }
    }



    // --- ACTUALIZACION DEL TEMA ---
    function syncActiveChapterStorage(chapterId) {
        if (!chapterId) return;
        const id = String(chapterId);
        localStorage.setItem('activeChapter', id);
        localStorage.setItem('overflow_active_chapter', id);
        if (window.DB && typeof window.DB.setActiveChapter === 'function') {
            window.DB.setActiveChapter(id);
        }
    }

    function updateTheme() {
        const activeCard = carousel.querySelector('.chapter-card-active');
        if (!activeCard) return;

        const chapterId = activeCard.getAttribute('data-chapter-id');
        if (!chapterId) return;

        if (document.documentElement.getAttribute('data-chapter') !== chapterId) {
            // Limpiar faders previos si se deslizó rápido
            document.querySelectorAll('.theme-bg-fader').forEach(el => el.remove());

            // 1. Capturamos el fondo viejo antes del cambio
            const oldBg = getComputedStyle(document.body).background;

            // 2. Creamos un elemento para el crossfade manual del fondo
            const fader = document.createElement('div');
            fader.className = 'theme-bg-fader';
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

            // 3. Aplicamos el nuevo tema instantáneamente detrás del fader
            document.documentElement.setAttribute('data-chapter', chapterId);
            syncActiveChapterStorage(chapterId);

            // 4. Hacemos que el fader desaparezca suavemente
            void fader.offsetHeight;
            fader.style.opacity = '0';

            // 5. Limpiamos el DOM una vez terminada la transición
            setTimeout(() => {
                if (fader.parentNode) fader.remove();
            }, 600);
        } else {
            syncActiveChapterStorage(chapterId);
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
                document.documentElement.setAttribute('data-chapter', chapterId);
                syncActiveChapterStorage(chapterId);
                window.location.href = `chapterOneOverview.html?chapter=${chapterId}`;
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

    

    // Iniciar de forma síncrona para evitar cualquier parpadeo o desfase de paleta
    function initCarousel() {
        const savedChapter = localStorage.getItem('activeChapter')
            || localStorage.getItem('overflow_active_chapter')
            || '1';

        restoreActiveChapterQuietly(savedChapter);
        document.documentElement.setAttribute('data-chapter', savedChapter);
        syncActiveChapterStorage(savedChapter);
        updateExtraElements();
    }

    initCarousel();

    window.addEventListener('pageshow', () => {
        initCarousel();
    });

});





