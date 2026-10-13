/**
 * Overflow Motion & GSAP Animation Controller (motion.js)
 * 
 * Centraliza las animaciones de alta fidelidad:
 * 1. Reacciones táctiles elásticas (Like, Dislike, Repost, Comentario).
 * 2. Cascada (Stagger) de aparición de publicaciones en el feed.
 * 3. Revelación coreografiada de la pantalla de Overview.
 */

window.Motion = {
    /**
     * Efecto Pop/Heartbeat al dar Like
     * @param {HTMLElement} btnElement 
     */
    popLike(btnElement) {
        if (!btnElement) return;
        const icon = btnElement.querySelector('svg');
        const count = btnElement.querySelector('.count-like');

        if (window.gsap && icon) {
            gsap.fromTo(icon, 
                { scale: 0.7 },
                { scale: 1.35, duration: 0.25, ease: 'back.out(3)', onComplete: () => {
                    gsap.to(icon, { scale: 1, duration: 0.2, ease: 'power2.out' });
                }}
            );
        }

        if (window.gsap && count) {
            gsap.fromTo(count,
                { y: -3, opacity: 0.7 },
                { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' }
            );
        }
    },

    /**
     * Micro-inclinación táctil al dar Dislike
     * @param {HTMLElement} btnElement 
     */
    tiltDislike(btnElement) {
        if (!btnElement) return;
        const icon = btnElement.querySelector('svg');

        if (window.gsap && icon) {
            gsap.timeline()
                .to(icon, { rotation: -12, scale: 0.9, duration: 0.1, ease: 'power1.out' })
                .to(icon, { rotation: 8, duration: 0.1, ease: 'power1.out' })
                .to(icon, { rotation: 0, scale: 1, duration: 0.15, ease: 'back.out(2)' });
        }
    },

    /**
     * Rotación de 180° con rebote al dar Repost
     * @param {HTMLElement} btnElement 
     */
    spinRepost(btnElement) {
        if (!btnElement) return;
        const icon = btnElement.querySelector('svg');

        if (window.gsap && icon) {
            gsap.fromTo(icon,
                { rotation: 0, scale: 0.85 },
                { rotation: 180, scale: 1, duration: 0.4, ease: 'back.out(2)' }
            );
        }
    },

    /**
     * Pop elástico al abrir Comentarios
     * @param {HTMLElement} btnElement 
     */
    popComment(btnElement) {
        if (!btnElement) return;
        const icon = btnElement.querySelector('svg');

        if (window.gsap && icon) {
            gsap.fromTo(icon,
                { scale: 0.8 },
                { scale: 1.2, duration: 0.18, ease: 'back.out(2)', onComplete: () => {
                    gsap.to(icon, { scale: 1, duration: 0.15, ease: 'power1.out' });
                }}
            );
        }
    },

    /**
     * Cascada escalonada (Stagger) de aparición de tarjetas en el Feed
     * @param {HTMLElement|string} container 
     */
    animateFeedEntrance(container) {
        if (!window.gsap) return;
        const parent = typeof container === 'string' ? document.querySelector(container) : container;
        if (!parent) return;

        const cards = parent.querySelectorAll('.post-card');
        if (!cards.length) return;

        gsap.from(cards, {
            y: 28,
            opacity: 0,
            duration: 0.42,
            stagger: 0.07,
            ease: 'power2.out',
            clearProps: 'transform,opacity'
        });
    },

    /**
     * Entrada fluida y secuencial del Overview del capítulo
     */
    animateOverviewEntrance() {
        if (!window.gsap) return;

        const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

        const cover = document.querySelector('.slides-container');
        const title = document.querySelector('.chapter-content');
        const cta = document.querySelector('.chapter-interactions-container');

        if (cover) tl.from(cover, { scale: 0.94, opacity: 0, duration: 0.45 });
        if (title) tl.from(title, { y: 18, opacity: 0, duration: 0.35 }, '-=0.25');
        if (cta) tl.from(cta, { y: 15, opacity: 0, duration: 0.35 }, '-=0.2');
    }
};
