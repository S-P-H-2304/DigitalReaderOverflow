document.addEventListener('DOMContentLoaded', async () => {
    const slides = document.querySelectorAll('.chapter-slide');
    const indicators = document.querySelectorAll('.carousel-indicator');
    const carouselSection = document.querySelector('.chapter-overview');

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
        if (!window.DB) return;
        const stats = await window.DB.getChapterStats('chapter_1');
        if (!stats) return;

        if (likesEl) likesEl.textContent = stats.likesCount;
        if (viewsEl) viewsEl.textContent = stats.viewsCount;
        if (progressEl) progressEl.textContent = `${stats.panelsRead}/${stats.totalPanels}`;
        if (likesItem) likesItem.classList.toggle('active-like', Boolean(stats.hasLiked));
    }

    if (window.DB) {
        await syncOverviewMetrics();

        window.addEventListener('overflow:chapters-synced', () => {
            syncOverviewMetrics();
        });
    }
});
