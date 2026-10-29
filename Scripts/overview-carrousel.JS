document.addEventListener('DOMContentLoaded', async () => {
    const slides = document.querySelectorAll('.chapter-slide');
    const indicators = document.querySelectorAll('.carousel-indicator');
    const carouselSection = document.querySelector('.chapter-overview');

    const LOCK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-lock cta-lock-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path fill-rule="evenodd" d="M8 0a4 4 0 0 1 4 4v2.05a2.5 2.5 0 0 1 2 2.45v5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 13.5v-5a2.5 2.5 0 0 1 2-2.45V4a4 4 0 0 1 4-4M4.5 7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7zM8 1a3 3 0 0 0-3 3v2h6V4a3 3 0 0 0-3-3"/>
    </svg>`;

    const CHAPTERS_DATA = {
        '1': {
            id: 'chapter_1',
            number: '1',
            title: 'Capítulo 1: A la deriva',
            cover: 'Images/portada1.jpg',
            locked: false,
            synopsis: 'En un mundo donde la lluvia no cesa y los océanos cubren todo el horizonte, Dimitri emerge a la superficie con vida, pero completamente solo. Sin un hogar al cual volver y con sus recuerdos a cuestas, deberá soportar la inmensidad del mar y el peso de su propia paranoia, con su diario como único testigo de lo que alguna vez fue.',
            creditsHtml: `
                <div class="credits-group">
                    <p><strong>Guionista:</strong> Sebastián Pérez Henao</p>
                    <p><strong>Ilustradora:</strong> Nathalia Muñoz Padilla</p>
                    <p><strong>Agradecimientos especiales:</strong> A nuestros patrocinadores por hacer posible el financiamiento de este primer capítulo y brindarnos como empresa la oportunidad de publicarlo al público de manera gratuita.</p>
                </div>
                <div class="credits-copyright">
                    <p>© 2026 <em>Overflow: Diarios de un prófugo</em>. Todos los derechos reservados.</p>
                    <p>Queda prohibida la reproducción, distribución, comunicación pública o transformación total o parcial de esta obra gráfica, literaria y multimedia sin la autorización expresa de sus titulares de derechos de autor.</p>
                </div>
            `
        },
        '2': {
            id: 'chapter_2',
            number: '2',
            title: 'Capítulo 2: Carroñeros del mar',
            cover: 'Images/Portada2.jpg',
            locked: true,
            synopsis: 'Atrapado en un inmenso islote flotante de chatarra y desechos, Dimitri se ve forzado a ocultar su verdadera identidad bajo el nombre de Ren Takahashi. En medio de un entorno hostil y lleno de sospechas, solo el inesperado vínculo con Copper, un niño huérfano del asentamiento, le brindará un motivo real de esperanza.',
            creditsHtml: `
                <div class="credits-group">
                    <p><strong>Guionista:</strong> Sebastián Pérez Henao</p>
                    <p><strong>Ilustradora:</strong> Nathalia Muñoz Padilla</p>
                </div>
                <div class="credits-copyright">
                    <p>© 2026 <em>Overflow: Diarios de un prófugo</em>. Todos los derechos reservados.</p>
                    <p>Obra protegida por las leyes de propiedad intelectual y derechos de autor. Prohibida su reproducción o distribución sin autorización previa.</p>
                </div>
            `
        },
        '3': {
            id: 'chapter_3',
            number: '3',
            title: 'Capítulo 3: El evangelio del diluvio',
            cover: 'Images/Portada3.jpg',
            locked: true,
            synopsis: 'Vendido a los devotos del Arca 4, Dimitri descubre un lugar insólito donde la comunidad y la superficie parecen sacadas de otro tiempo. Sin embargo, su llegada altera la paz del navío cuando El Apóstol reconoce su rostro y saca a la luz un oscuro secreto.',
            creditsHtml: `
                <div class="credits-group">
                    <p><strong>Guionista:</strong> Sebastián Pérez Henao</p>
                    <p><strong>Ilustradora:</strong> Nathalia Muñoz Padilla</p>
                </div>
                <div class="credits-copyright">
                    <p>© 2026 <em>Overflow: Diarios de un prófugo</em>. Todos los derechos reservados.</p>
                    <p>Obra protegida por las leyes de propiedad intelectual y derechos de autor. Prohibida su reproducción o distribución sin autorización previa.</p>
                </div>
            `
        },
        '4': {
            id: 'chapter_4',
            number: '4',
            title: 'Capítulo 4: El valor del planeta',
            cover: 'Images/Portada4.jpg',
            locked: true,
            synopsis: 'Tras los reveladores descubrimientos sobre el Proyecto ARCA, Kael decide respaldar a su amigo y huir con él hacia la megaciudad flotante. Ocultos en la marginalidad de la urbe, ambos enfrentarán el peligro mientras Dimitri comprende que después de tanto aislamiento, ya no está solo.',
            creditsHtml: `
                <div class="credits-group">
                    <p><strong>Guionista:</strong> Sebastián Pérez Henao</p>
                    <p><strong>Ilustradora:</strong> Nathalia Muñoz Padilla</p>
                </div>
                <div class="credits-copyright">
                    <p>© 2026 <em>Overflow: Diarios de un prófugo</em>. Todos los derechos reservados.</p>
                    <p>Obra protegida por las leyes de propiedad intelectual y derechos de autor. Prohibida su reproducción o distribución sin autorización previa.</p>
                </div>
            `
        }
    };

    // --- Determinar capítulo activo de forma síncrona e inmediata ---
    function resolveCurrentChapterNum() {
        const urlParams = new URLSearchParams(window.location.search);
        const chapterParam = urlParams.get('chapter')
            || localStorage.getItem('activeChapter')
            || localStorage.getItem('overflow_active_chapter')
            || '1';
        return CHAPTERS_DATA[chapterParam] ? String(chapterParam) : '1';
    }

    const currentChapterNum = resolveCurrentChapterNum();
    const chapterMeta = CHAPTERS_DATA[currentChapterNum];

    function enforceChapterPalette(chNum) {
        document.documentElement.setAttribute('data-chapter', chNum);
        localStorage.setItem('activeChapter', chNum);
        localStorage.setItem('overflow_active_chapter', chNum);
        if (window.DB && typeof window.DB.setActiveChapter === 'function') {
            window.DB.setActiveChapter(chNum);
        }
    }

    enforceChapterPalette(currentChapterNum);

    window.addEventListener('pageshow', () => {
        enforceChapterPalette(resolveCurrentChapterNum());
    });

    // --- Poblar contenido dinámico del capítulo ---
    const coverImg = document.getElementById('overview-cover-img') || document.querySelector('.chapter-card-overview');
    const titleEl = document.getElementById('overview-chapter-title') || document.querySelector('.chapter-title');
    const synopsisTextEl = document.getElementById('overview-sinopsis-text');
    const creditsBodyEl = document.getElementById('overview-credits-body');
    const ctaBtn = document.getElementById('overview-cta-btn') || document.querySelector('.cta-button');

    document.title = chapterMeta.title;
    if (coverImg) {
        coverImg.src = chapterMeta.cover;
        coverImg.alt = `Portada de ${chapterMeta.title}`;
    }
    if (titleEl) {
        titleEl.textContent = chapterMeta.title;
    }
    if (synopsisTextEl) {
        synopsisTextEl.textContent = chapterMeta.synopsis;
    }
    if (creditsBodyEl) {
        creditsBodyEl.innerHTML = chapterMeta.creditsHtml;
    }

    // --- Notificación flotante y shake para capítulos bloqueados (2, 3 y 4) ---
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
            toast.addEventListener('click', () => {
                toast.classList.remove('is-visible');
                toast.setAttribute('aria-hidden', 'true');
                if (lockedToastTimeout) clearTimeout(lockedToastTimeout);
            });
        }

        if (toastText) {
            toastText.textContent = `Capítulo ${chapterNum} próximamente disponible`;
        }

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
        element.classList.remove('shake-restricted-cta');
        void element.offsetWidth;
        element.classList.add('shake-restricted-cta');
        setTimeout(() => {
            element.classList.remove('shake-restricted-cta');
        }, 500);
    }

    if (ctaBtn) {
        if (chapterMeta.locked) {
            ctaBtn.classList.add('is-locked-cta');
            ctaBtn.setAttribute('href', '#');
            ctaBtn.setAttribute('aria-label', `Capítulo ${currentChapterNum} bloqueado`);
            ctaBtn.innerHTML = `${LOCK_ICON_SVG}<span>Empezar a leer</span>`;
            ctaBtn.addEventListener('click', (e) => {
                e.preventDefault();
                triggerRestrictedShake(ctaBtn);
                showChapterLockedToast(currentChapterNum);
            });
        } else {
            ctaBtn.classList.remove('is-locked-cta');
            ctaBtn.setAttribute('href', 'chapterReader.html');
            ctaBtn.textContent = 'Empezar a leer';
        }
    }

    // --- Carrusel interno de diapositivas (Portada / Sinopsis / Créditos) ---
    let currentIndex = 0;

    function goToSlide(index) {
        if (!slides.length) return;
        if (index < 0) {
            currentIndex = slides.length - 1;
        } else if (index >= slides.length) {
            currentIndex = 0;
        } else {
            currentIndex = index;
        }

        slides.forEach((slide, i) => {
            slide.classList.toggle('active-slide', i === currentIndex);
        });

        indicators.forEach((dot, i) => {
            const isActive = (i === currentIndex);
            dot.classList.toggle('active-carousel-indicator', isActive);
            if (isActive) {
                dot.setAttribute('aria-current', 'true');
            } else {
                dot.removeAttribute('aria-current');
            }
        });
    }

    indicators.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            goToSlide(index);
        });
    });

    let touchStartX = 0;
    let touchEndX = 0;

    if (carouselSection) {
        carouselSection.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        carouselSection.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
    }

    function handleSwipe() {
        const swipeDistance = touchEndX - touchStartX;
        const minSwipeDistance = 50;

        if (swipeDistance < -minSwipeDistance) {
            goToSlide(currentIndex + 1);
        } else if (swipeDistance > minSwipeDistance) {
            goToSlide(currentIndex - 1);
        }
    }

    // --- VINCULACIÓN CON FIRESTORE: LIKES DEL CAPÍTULO, VISTAS Y PROGRESO ---
    const likesEl = document.getElementById('overview-chapter-likes') || document.querySelector('.js-chapter-likes');
    const viewsEl = document.getElementById('overview-chapter-views') || document.querySelector('.js-views');
    const progressEl = document.getElementById('overview-chapter-progress') || document.querySelector('.js-progress');
    const likesItem = document.getElementById('overview-likes-item');

    async function syncOverviewMetrics() {
        if (chapterMeta.locked) {
            if (likesEl) likesEl.textContent = '0';
            if (viewsEl) viewsEl.textContent = '0';
            if (progressEl) progressEl.textContent = '0/0';
            if (likesItem) likesItem.classList.remove('active-like');
            return;
        }
        if (!window.DB) return;
        const stats = await window.DB.getChapterStats(chapterMeta.id);
        if (!stats) return;

        if (likesEl) likesEl.textContent = stats.likesCount;
        if (viewsEl) viewsEl.textContent = stats.viewsCount;
        if (progressEl) progressEl.textContent = `${stats.panelsRead}/${stats.totalPanels}`;
        if (likesItem) likesItem.classList.toggle('active-like', Boolean(stats.hasLiked));
    }

    await syncOverviewMetrics();

    if (window.DB && !chapterMeta.locked) {
        window.addEventListener('overflow:chapters-synced', () => {
            syncOverviewMetrics();
        });
    }
});
