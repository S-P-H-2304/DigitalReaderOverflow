/**
 * Splash Screen Controller (splash.js)
 * 
 * Gestiona la animación de entrada, llenado con oleaje líquido y transición
 * de salida del logo vectorial SVG de Overflow sobre el fondo dinámico del capítulo activo.
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'overflow_splash_shown';
    const splashEl = document.getElementById('splash-screen');
    if (!splashEl) return;

    // Verificar si se fuerza la visualización mediante URL (?splash=true o ?splash)
    const urlParams = new URLSearchParams(window.location.search);
    const forceSplash = urlParams.has('splash');

    // Si ya se mostró en esta sesión y no se fuerza por URL, ocultar y remover
    if (sessionStorage.getItem(STORAGE_KEY) && !forceSplash) {
        splashEl.classList.add('splash-hidden');
        splashEl.remove();
        return;
    }

    let isExiting = false;
    let waveTween = null;

    function finishSplash() {
        if (isExiting) return;
        isExiting = true;

        try {
            sessionStorage.setItem(STORAGE_KEY, 'true');
        } catch (e) {
            // Silencioso en modo incógnito estricto
        }

        if (waveTween) {
            waveTween.kill();
            waveTween = null;
        }

        if (window.gsap) {
            gsap.killTweensOf(splashEl);
            gsap.to(splashEl, {
                opacity: 0,
                scale: 1.05,
                duration: 0.45,
                ease: 'power2.out',
                onComplete: () => {
                    splashEl.classList.add('splash-hidden');
                    splashEl.remove();
                }
            });
        } else {
            splashEl.classList.add('splash-fading');
            setTimeout(() => {
                splashEl.classList.add('splash-hidden');
                splashEl.remove();
            }, 450);
        }
    }

    // Permitir al usuario saltar la animación con un toque o clic
    splashEl.addEventListener('click', finishSplash);
    splashEl.addEventListener('touchend', (e) => {
        // Prevenir scroll accidental durante splash
        finishSplash();
    }, { passive: true });

    // Utilidad global para probar la splash screen las veces deseadas desde la consola o navegador
    window.resetSplash = function () {
        sessionStorage.removeItem(STORAGE_KEY);
        const url = new URL(window.location);
        url.searchParams.set('splash', 'true');
        window.location.href = url.href;
    };

    function startSplashAnimation() {
        const logoContainer = splashEl.querySelector('.splash-logo-container');
        const waveRiseGroup = document.getElementById('splash-wave-rise-group');
        const waveShape = document.getElementById('splash-wave-shape');
        const fillLayer = splashEl.querySelector('.splash-layer-fill');

        if (!window.gsap || !waveRiseGroup || !waveShape) {
            // Fallback con CSS puro si no carga GSAP
            splashEl.classList.add('splash-css-fallback');
            setTimeout(() => {
                if (fillLayer) fillLayer.classList.add('splash-fill-complete');
            }, 2050);
            setTimeout(finishSplash, 2700);
            return;
        }

        // Timeline de GSAP para precisión exacta a 60-120 FPS
        const tl = gsap.timeline({
            onComplete: finishSplash
        });

        // 1. Entrada sutil del contenedor del logo (0.0s - 0.35s)
        tl.fromTo(logoContainer, 
            { scale: 0.92, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.out' }
        );

        // 2. Oleaje continuo horizontal (loop infinito fluido)
        waveTween = gsap.to(waveShape, {
            x: -800,
            duration: 1.35,
            ease: 'none',
            repeat: -1
        });

        // 3. Ascenso vertical del nivel del agua líquida (3600 -> -120) en ~2.05 segundos
        tl.fromTo(waveRiseGroup,
            { y: 3600 },
            { 
                y: -120, 
                duration: 2.05, 
                ease: 'power1.inOut' 
            },
            '-=0.15'
        );

        // 4. Al completarse el llenado, sutil resplandor de culminación
        tl.to(fillLayer, {
            filter: 'drop-shadow(0 0 24px rgba(255, 255, 255, 0.75))',
            duration: 0.2,
            ease: 'power2.out'
        });

        // Breve pausa para contemplar el logo completo antes de desvanecer
        tl.to({}, { duration: 0.18 });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startSplashAnimation);
    } else {
        startSplashAnimation();
    }
})();
