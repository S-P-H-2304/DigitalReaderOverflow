/**
 * Overflow Motion & GSAP Animation Controller (motion.js)
 * 
 * Centraliza las animaciones de alta fidelidad:
 * 1. Reacciones táctiles elásticas (Like, Dislike, Repost, Comentario, Corazón del Lector).
 * 2. Cascada (Stagger) de aparición de publicaciones en el feed y menús flotantes.
 * 3. Revelación coreografiada de la pantalla de Overview y micro-interacciones del lector.
 */

window.Motion = {
    /**
     * Efecto Pop/Heartbeat al dar Like (Publicaciones y Capítulo del Lector)
     * @param {HTMLElement} btnElement 
     */
    popLike(btnElement) {
        if (!btnElement) return;
        const icon = btnElement.querySelector('svg');
        const count = btnElement.querySelector('.count-like')
            || (btnElement.parentElement && btnElement.parentElement.querySelector('.count-like'));
        const fillLayer = icon ? icon.querySelector('.heart-fill-layer') : null;
        const isLiked = btnElement.classList.contains('active-like')
            || (btnElement.parentElement && btnElement.parentElement.classList.contains('active-like'));

        if (window.gsap && icon) {
            gsap.killTweensOf(icon);
            if (isLiked) {
                gsap.fromTo(icon, 
                    { scale: 0.65, rotation: -8 },
                    { scale: 1.38, rotation: 4, duration: 0.24, ease: 'back.out(3.2)', onComplete: () => {
                        gsap.to(icon, { scale: 1, rotation: 0, duration: 0.2, ease: 'power2.out' });
                    }}
                );
            } else {
                gsap.fromTo(icon,
                    { scale: 0.82 },
                    { scale: 1, duration: 0.2, ease: 'back.out(2)' }
                );
            }
        }

        if (window.gsap && fillLayer) {
            gsap.killTweensOf(fillLayer);
            gsap.set(fillLayer, { transformOrigin: '50% 50%' });
            if (isLiked) {
                gsap.fromTo(fillLayer,
                    { scale: 0.2, opacity: 0 },
                    { scale: 1, opacity: 1, duration: 0.28, ease: 'back.out(2.5)' }
                );
            } else {
                gsap.to(fillLayer, { scale: 0.3, opacity: 0, duration: 0.18, ease: 'power2.in' });
            }
        }

        if (window.gsap && count) {
            gsap.killTweensOf(count);
            gsap.fromTo(count,
                { y: isLiked ? -5 : 4, opacity: 0.6 },
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
     * Rebote táctil para botones de controles del lector
     * @param {HTMLElement} btnElement 
     */
    popReaderControl(btnElement) {
        if (!btnElement) return;
        const icon = btnElement.querySelector('svg') || btnElement;
        if (window.gsap && icon) {
            gsap.killTweensOf(icon);
            gsap.fromTo(icon,
                { scale: 0.78 },
                { scale: 1.16, duration: 0.18, ease: 'back.out(2.8)', onComplete: () => {
                    gsap.to(icon, { scale: 1, duration: 0.15, ease: 'power2.out' });
                }}
            );
        }
    },

    /**
     * Vibración horizontal sutil al tocar contenido bloqueado ("Contenido no disponible")
     * @param {HTMLElement} element 
     */
    shakeLocked(element) {
        if (!element || !window.gsap) return;
        gsap.killTweensOf(element);
        gsap.timeline()
            .to(element, { x: -5, duration: 0.06, ease: 'power1.inOut' })
            .to(element, { x: 5, duration: 0.06, ease: 'power1.inOut' })
            .to(element, { x: -3, duration: 0.06, ease: 'power1.inOut' })
            .to(element, { x: 3, duration: 0.06, ease: 'power1.inOut' })
            .to(element, { x: 0, duration: 0.08, ease: 'power2.out' });
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
