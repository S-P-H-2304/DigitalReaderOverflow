document.addEventListener('DOMContentLoaded', async () => {
    // =========================================================================
    // 0. REFERENCIAS PRINCIPALES DEL LECTOR Y HUD DINÁMICO
    // =========================================================================
    const visor = document.getElementById('visor');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const topBar = document.querySelector('header.reader-header');
    const downBar = document.getElementById('down-bar');

    let isHudVisible = true;
    let isProgrammaticScroll = false;
    let programmaticScrollTimer = null;

    // =========================================================================
    // 1. CONTROLES DE DESPLAZAMIENTO (INTACTOS)
    // =========================================================================
    if (visor && btnPrev && btnNext) {
        const getScrollStep = () => Math.round(window.innerHeight * 0.75);

        const markProgrammaticScroll = () => {
            isProgrammaticScroll = true;
            if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
            programmaticScrollTimer = setTimeout(() => {
                isProgrammaticScroll = false;
            }, 650);
        };

        btnNext.addEventListener('click', () => {
            markProgrammaticScroll();
            visor.scrollBy({
                top: getScrollStep(),
                left: 0,
                behavior: 'smooth'
            });
        });

        btnPrev.addEventListener('click', () => {
            markProgrammaticScroll();
            visor.scrollBy({
                top: -getScrollStep(),
                left: 0,
                behavior: 'smooth'
            });
        });
    }

    // =========================================================================
    // 2. BOTÓN DE LIKE GLOBAL DEL CAPÍTULO, VISTAS Y PROGRESO EN FIRESTORE
    // =========================================================================
    const likesInteraction = document.getElementById('likes-interaction');
    const likeBtn = document.getElementById('btn-chapter-like')
        || document.querySelector('#likes-interaction .reader-icons-interactions');
    const likesCountEl = document.getElementById('chapter-likes-count')
        || document.querySelector('#likes-interaction span');

    function applyChapterLikeState(likesCount, hasLiked) {
        if (likesCountEl) {
            likesCountEl.textContent = likesCount;
        }
        if (likeBtn) {
            likeBtn.classList.toggle('active-like', Boolean(hasLiked));
            likeBtn.setAttribute('aria-pressed', hasLiked ? 'true' : 'false');
        }
        if (likesInteraction) {
            likesInteraction.classList.toggle('active-like', Boolean(hasLiked));
        }
    }

    if (window.DB) {
        // Registrar visualización del capítulo en Firestore y obtener estadísticas actuales
        const initialStats = await window.DB.incrementChapterView('chapter_1');
        if (initialStats) {
            applyChapterLikeState(initialStats.likesCount, initialStats.hasLiked);
        }

        window.addEventListener('overflow:chapters-synced', async (e) => {
            const chapters = e.detail;
            if (chapters && chapters['chapter_1']) {
                const ch = chapters['chapter_1'];
                const uid = await window.DB.getCurrentUserId();
                const hasLiked = Array.isArray(ch.likes) && ch.likes.includes(uid);
                applyChapterLikeState(ch.likesCount ?? 1200, hasLiked);
            }
        });
    }

    // =========================================================================
    // 2. SISTEMA DE AUDIO AMBIENTAL Y EFECTOS INTERACTIVOS (READER AUDIO MANAGER)
    // =========================================================================
    // Ajusta aquí los volúmenes individuales (de 0.0 a 1.0 respecto al volumen general):
    const CHAPTER_AUDIO_CONFIG = {
        tracks: {
            rain:  { src: 'Audio/Rain.wav',  attenuation: 0.30 }, // Págs: 1-5, 13-16, 27-32
            barco: { src: 'Audio/Barco.WAV', attenuation: 0.30 }  // Págs: 6-12, 17-26
        },
        hotspotVolumes: {
            'Audio/Canica.WAV':     1.0, // Hotspot página 7 (Canica)
            'Audio/alarm call.wav': 1.0  // Hotspot página 18 (Alarma)
        },
        duckingFactor: 0.20,       // Atenuación adicional del ambiente cuando suena un hotspot
        crossfadeDurationSec: 1.2, // Duración del crossfade suave entre Lluvia y Barco
        getTrackKeyForPage(pageNum) {
            const p = Number(pageNum) || 1;
            if (p >= 6 && p <= 12) return 'barco';
            if (p >= 17 && p <= 26) return 'barco';
            return 'rain'; // 1-5, 13-16, 27-32
        }
    };

    const ReaderAudioManager = (() => {
        const ambientPlayers = {};
        const fadeTokens = {};

        Object.keys(CHAPTER_AUDIO_CONFIG.tracks).forEach((key) => {
            const audio = new Audio(CHAPTER_AUDIO_CONFIG.tracks[key].src);
            audio.loop = true;
            audio.preload = 'auto';
            audio.volume = 0;
            ambientPlayers[key] = audio;
            fadeTokens[key] = 0;
        });

        let currentTrackKey = 'rain';
        let isDucking = false;
        let masterVolumeRatio = 0.8;
        let isAudioUnlocked = false;

        let activeHotspotAudio = null;
        let activeHotspotBtn = null;
        let activeHotspotSrc = null;
        let hotspotTimeout = null;

        function getTargetAmbientVolume(trackKey = currentTrackKey) {
            if (masterVolumeRatio <= 0) return 0;
            const trackCfg = CHAPTER_AUDIO_CONFIG.tracks[trackKey];
            const attenuation = trackCfg ? trackCfg.attenuation : 0.30;
            const base = masterVolumeRatio * attenuation;
            return isDucking ? (base * CHAPTER_AUDIO_CONFIG.duckingFactor) : base;
        }

        function getTargetHotspotVolume(btn, soundSrc) {
            if (masterVolumeRatio <= 0) return 0;
            const attrVol = btn ? parseFloat(btn.getAttribute('data-volume')) : NaN;
            const cfgVol = CHAPTER_AUDIO_CONFIG.hotspotVolumes[soundSrc];
            const individualRatio = !isNaN(attrVol)
                ? attrVol
                : (typeof cfgVol === 'number' ? cfgVol : 1.0);
            return Math.max(0, Math.min(1, masterVolumeRatio * individualRatio));
        }

        function fadeTrack(trackKey, targetVol, durationSec, onComplete) {
            const audio = ambientPlayers[trackKey];
            if (!audio) return;

            const token = ++fadeTokens[trackKey];
            const startVol = audio.volume;
            const target = Math.max(0, Math.min(1, targetVol));
            const startTime = performance.now();
            const durationMs = Math.max(50, durationSec * 1000);

            function step(now) {
                if (fadeTokens[trackKey] !== token) return;
                const elapsed = now - startTime;
                const progress = Math.min(1, elapsed / durationMs);
                audio.volume = Math.max(0, Math.min(1, startVol + (target - startVol) * progress));
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else if (onComplete) {
                    onComplete();
                }
            }
            requestAnimationFrame(step);
        }

        function unlockAndStartAudio() {
            if (isAudioUnlocked) return;
            isAudioUnlocked = true;

            window.removeEventListener('touchstart', unlockAndStartAudio);
            window.removeEventListener('click', unlockAndStartAudio);
            if (visor) visor.removeEventListener('scroll', unlockAndStartAudio);

            const activeAudio = ambientPlayers[currentTrackKey];
            if (!activeAudio) return;

            activeAudio.volume = 0;
            const p = activeAudio.play();
            if (p !== undefined) {
                p.then(() => {
                    fadeTrack(currentTrackKey, getTargetAmbientVolume(currentTrackKey), CHAPTER_AUDIO_CONFIG.crossfadeDurationSec);
                }).catch((err) => {
                    console.warn('[ReaderAudio] Autoplay en espera de interacción:', err);
                    isAudioUnlocked = false;
                });
            }
        }

        function setMasterVolume(ratio) {
            masterVolumeRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
            const activeAudio = ambientPlayers[currentTrackKey];
            if (activeAudio) {
                fadeTokens[currentTrackKey]++;
                activeAudio.volume = getTargetAmbientVolume(currentTrackKey);
                if (isAudioUnlocked && masterVolumeRatio > 0 && activeAudio.paused && !document.hidden) {
                    activeAudio.play().catch(() => {});
                }
            }
            if (activeHotspotAudio) {
                activeHotspotAudio.volume = getTargetHotspotVolume(activeHotspotBtn, activeHotspotSrc);
            }
        }

        function applyDucking(enable) {
            isDucking = Boolean(enable);
            if (isAudioUnlocked && ambientPlayers[currentTrackKey]) {
                fadeTrack(currentTrackKey, getTargetAmbientVolume(currentTrackKey), 0.35);
            }
        }

        function stopHotspotSound() {
            if (activeHotspotAudio) {
                try {
                    activeHotspotAudio.pause();
                    activeHotspotAudio.currentTime = 0;
                } catch (e) {}
                activeHotspotAudio = null;
            }
            if (activeHotspotBtn) {
                activeHotspotBtn.classList.remove('is-playing');
                activeHotspotBtn.setAttribute('aria-pressed', 'false');
                const defaultLabel = activeHotspotBtn.dataset.defaultLabel || 'Reproducir efecto sonoro';
                activeHotspotBtn.setAttribute('aria-label', defaultLabel);
                activeHotspotBtn = null;
            }
            activeHotspotSrc = null;
            if (hotspotTimeout) {
                clearTimeout(hotspotTimeout);
                hotspotTimeout = null;
            }
            applyDucking(false);
        }

        function toggleHotspotSound(btn, soundSrc) {
            if (!soundSrc) return;

            if (btn && !btn.dataset.defaultLabel) {
                btn.dataset.defaultLabel = btn.getAttribute('aria-label') || 'Reproducir efecto sonoro';
            }

            // Si el botón ya está reproduciéndose, detenerlo inmediatamente
            if (activeHotspotBtn === btn && activeHotspotAudio) {
                stopHotspotSound();
                return;
            }

            // Si había otro sonido activo, detenerlo limpiamente antes de iniciar el nuevo
            stopHotspotSound();

            unlockAndStartAudio();

            // Asegurar codificación limpia de la ruta del archivo (ej. alarm call.wav o Canica.WAV)
            const safeSrc = encodeURI(soundSrc).replace(/%2520/g, '%20');
            const sfx = new Audio(safeSrc);
            sfx.volume = getTargetHotspotVolume(btn, soundSrc);

            activeHotspotAudio = sfx;
            activeHotspotBtn = btn;
            activeHotspotSrc = soundSrc;

            btn.classList.add('is-playing');
            btn.setAttribute('aria-pressed', 'true');
            const stopLabel = (btn.dataset.defaultLabel || 'Reproducir efecto sonoro').replace(/^Reproducir/i, 'Detener');
            btn.setAttribute('aria-label', stopLabel);
            applyDucking(true);

            const cleanup = () => {
                if (activeHotspotAudio === sfx) {
                    stopHotspotSound();
                }
            };

            sfx.addEventListener('ended', cleanup, { once: true });
            sfx.addEventListener('error', cleanup, { once: true });
            // Tiempo límite de seguridad
            hotspotTimeout = setTimeout(cleanup, 12000);

            const p = sfx.play();
            if (p !== undefined) {
                p.catch(() => {
                    cleanup();
                });
            }
        }

        function onPageChanged(pageNum) {
            const nextTrackKey = CHAPTER_AUDIO_CONFIG.getTrackKeyForPage(pageNum);
            if (nextTrackKey === currentTrackKey) return;

            const prevTrackKey = currentTrackKey;
            currentTrackKey = nextTrackKey;

            if (!isAudioUnlocked) return;

            const outgoingAudio = ambientPlayers[prevTrackKey];
            const incomingAudio = ambientPlayers[nextTrackKey];
            const fadeSec = CHAPTER_AUDIO_CONFIG.crossfadeDurationSec;

            if (outgoingAudio && !outgoingAudio.paused) {
                fadeTrack(prevTrackKey, 0, fadeSec, () => {
                    if (currentTrackKey !== prevTrackKey) {
                        outgoingAudio.pause();
                    }
                });
            }

            if (incomingAudio) {
                if (incomingAudio.paused) {
                    incomingAudio.volume = 0;
                    const p = incomingAudio.play();
                    if (p !== undefined) {
                        p.then(() => {
                            fadeTrack(nextTrackKey, getTargetAmbientVolume(nextTrackKey), fadeSec);
                        }).catch(() => {});
                    }
                } else {
                    fadeTrack(nextTrackKey, getTargetAmbientVolume(nextTrackKey), fadeSec);
                }
            }
        }

        function pauseAll() {
            Object.keys(ambientPlayers).forEach((key) => {
                fadeTokens[key]++;
                ambientPlayers[key].pause();
            });
            stopHotspotSound();
        }

        function resumeAmbient() {
            const activeAudio = ambientPlayers[currentTrackKey];
            if (isAudioUnlocked && activeAudio && activeAudio.paused && masterVolumeRatio > 0) {
                activeAudio.volume = getTargetAmbientVolume(currentTrackKey);
                activeAudio.play().catch(() => {});
            }
        }

        // Desbloqueo silencioso al primer toque o scroll
        window.addEventListener('touchstart', unlockAndStartAudio, { passive: true });
        window.addEventListener('click', unlockAndStartAudio, { passive: true });
        if (visor) visor.addEventListener('scroll', unlockAndStartAudio, { passive: true });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                pauseAll();
            } else {
                resumeAmbient();
            }
        });

        return {
            setMasterVolume,
            playHotspotSound: toggleHotspotSound,
            toggleHotspotSound,
            stopHotspotSound,
            onPageChanged,
            pauseAll,
            resumeAmbient
        };
    })();

    // Conectar hotspots interactivos existentes
    const audioHotspots = Array.from(document.querySelectorAll('.audio-hotspot'));
    audioHotspots.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const soundSrc = btn.getAttribute('data-sound');
            ReaderAudioManager.toggleHotspotSound(btn, soundSrc);
            if (window.Motion && window.Motion.popReaderControl) {
                window.Motion.popReaderControl(btn);
            }
        });
    });

    // Seguimiento de paneles leídos y actualización dinámica de audio por página
    if (visor) {
        const panels = Array.from(visor.querySelectorAll('.page-container'));
        const totalPanels = panels.length || 12;

        const updateReadingProgress = () => {
            if (!panels.length) return;
            const viewportBottom = visor.scrollTop + visor.clientHeight;
            const visorRect = visor.getBoundingClientRect();
            let readCount = 1;
            let mostVisiblePage = 1;
            let maxVisibleHeight = 0;

            panels.forEach((panel, idx) => {
                const panelMid = panel.offsetTop + (panel.offsetHeight * 0.35);
                if (viewportBottom >= panelMid) {
                    readCount = idx + 1;
                }

                // Determinar qué panel ocupa la mayor proporción de la pantalla para el audio
                const rect = panel.getBoundingClientRect();
                const visibleTop = Math.max(visorRect.top, rect.top);
                const visibleBottom = Math.min(visorRect.bottom, rect.bottom);
                const visibleHeight = Math.max(0, visibleBottom - visibleTop);
                if (visibleHeight > maxVisibleHeight) {
                    maxVisibleHeight = visibleHeight;
                    const pNum = parseInt(panel.getAttribute('data-page'), 10);
                    if (!isNaN(pNum)) mostVisiblePage = pNum;
                }
            });

            if (visor.scrollTop + visor.clientHeight >= visor.scrollHeight - 40) {
                readCount = totalPanels;
            }

            if (window.DB) {
                window.DB.saveChapterProgress('chapter_1', readCount, totalPanels);
            }
            ReaderAudioManager.onPageChanged(mostVisiblePage);
        };

        // Registrar primer panel al abrir
        updateReadingProgress();
        visor.addEventListener('scroll', updateReadingProgress, { passive: true });
    }

    if (likeBtn) {
        likeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (window.DB) {
                const res = await window.DB.toggleChapterLike('chapter_1');
                if (res) {
                    applyChapterLikeState(res.likesCount, res.hasLiked);
                }
            } else {
                const nextLiked = !likeBtn.classList.contains('active-like');
                const currentVal = parseInt(likesCountEl ? likesCountEl.textContent : '1200', 10) || 1200;
                applyChapterLikeState(nextLiked ? currentVal + 1 : Math.max(0, currentVal - 1), nextLiked);
            }

            if (window.Motion) {
                window.Motion.popLike(likeBtn);
            }
        });
    }

    // =========================================================================
    // 3. BOTONES SUPERIORES: VOLUMEN VERTICAL, ACCESO RÁPIDO A CAPÍTULOS Y 3 PUNTOS
    // =========================================================================
    const btnVolume = document.getElementById('btn-reader-volume');
    const volumePopover = document.getElementById('volume-popover');
    const volumeTrack = document.getElementById('volume-slider-track');
    const volumeFill = document.getElementById('volume-slider-fill');
    const volumeThumb = document.getElementById('volume-slider-thumb');
    const volumeLabel = document.getElementById('volume-value-label');
    const btnVolumeMute = document.getElementById('btn-volume-mute');

    const btnChapters = document.getElementById('btn-reader-chapters');
    const chaptersPopover = document.getElementById('chapters-popover');
    const chaptersToast = document.getElementById('chapters-unavailable-toast');

    let currentVolume = 80;
    let lastNonZeroVolume = 80;
    let toastTimer = null;

    function updateVolumeUI(vol) {
        const clamped = Math.min(100, Math.max(0, Math.round(Number(vol) || 0)));
        currentVolume = clamped;
        if (clamped > 0) lastNonZeroVolume = clamped;

        if (volumeFill) volumeFill.style.height = `${clamped}%`;
        if (volumeThumb) volumeThumb.style.bottom = `${clamped}%`;
        if (volumeLabel) volumeLabel.textContent = `${clamped}%`;
        if (volumeTrack) volumeTrack.setAttribute('aria-valuenow', String(clamped));

        if (btnVolumeMute) {
            btnVolumeMute.classList.toggle('is-muted', clamped === 0);
        }

        if (btnVolume) {
            const waveHigh = btnVolume.querySelector('.vol-wave-high');
            const waveMid = btnVolume.querySelector('.vol-wave-mid');
            if (waveHigh) waveHigh.style.opacity = clamped >= 65 ? '1' : '0.22';
            if (waveMid) waveMid.style.opacity = clamped >= 25 ? '1' : '0.22';
            btnVolume.classList.toggle('is-muted-volume', clamped === 0);
        }

        // Sincronizar con el motor de audio en tiempo real
        ReaderAudioManager.setMasterVolume(clamped / 100);
    }

    if (window.DB) {
        const savedVol = await window.DB.getVolumePreference();
        updateVolumeUI(savedVol);
    } else {
        updateVolumeUI(80);
    }

    function isAnyPopoverOpen() {
        return Boolean(
            (volumePopover && volumePopover.classList.contains('is-open')) ||
            (chaptersPopover && chaptersPopover.classList.contains('is-open'))
        );
    }

    function closeAllPopovers() {
        if (volumePopover && volumePopover.classList.contains('is-open')) {
            volumePopover.classList.remove('is-open');
            volumePopover.setAttribute('aria-hidden', 'true');
            if (btnVolume) {
                btnVolume.classList.remove('active-control');
                btnVolume.setAttribute('aria-expanded', 'false');
            }
        }
        if (chaptersPopover && chaptersPopover.classList.contains('is-open')) {
            chaptersPopover.classList.remove('is-open');
            chaptersPopover.setAttribute('aria-hidden', 'true');
            if (btnChapters) {
                btnChapters.classList.remove('active-control');
                btnChapters.setAttribute('aria-expanded', 'false');
            }
        }
    }

    // --- 3.1. Toggle del Popover Vertical de Volumen ---
    if (btnVolume && volumePopover) {
        btnVolume.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.Motion) window.Motion.popReaderControl(btnVolume);

            const willOpen = !volumePopover.classList.contains('is-open');
            closeAllPopovers();

            if (willOpen) {
                volumePopover.classList.add('is-open');
                volumePopover.setAttribute('aria-hidden', 'false');
                btnVolume.classList.add('active-control');
                btnVolume.setAttribute('aria-expanded', 'true');
            }
        });

        volumePopover.addEventListener('click', (e) => e.stopPropagation());
    }

    if (volumeTrack) {
        let isDraggingVolume = false;

        const setVolumeFromPointer = (clientY) => {
            const rect = volumeTrack.getBoundingClientRect();
            if (!rect.height) return;
            const relativeY = rect.bottom - clientY;
            const ratio = Math.min(1, Math.max(0, relativeY / rect.height));
            const newVol = Math.round(ratio * 100);
            updateVolumeUI(newVol);
            if (window.DB) window.DB.setVolumePreference(newVol);
        };

        volumeTrack.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            isDraggingVolume = true;
            volumeTrack.classList.add('is-dragging');
            if (volumeTrack.setPointerCapture) {
                try { volumeTrack.setPointerCapture(e.pointerId); } catch (_) {}
            }
            setVolumeFromPointer(e.clientY);
        });

        volumeTrack.addEventListener('pointermove', (e) => {
            if (!isDraggingVolume) return;
            setVolumeFromPointer(e.clientY);
        });

        const endVolumeDrag = (e) => {
            if (!isDraggingVolume) return;
            isDraggingVolume = false;
            volumeTrack.classList.remove('is-dragging');
            if (volumeTrack.releasePointerCapture && e && e.pointerId !== undefined) {
                try { volumeTrack.releasePointerCapture(e.pointerId); } catch (_) {}
            }
        };

        volumeTrack.addEventListener('pointerup', endVolumeDrag);
        volumeTrack.addEventListener('pointercancel', endVolumeDrag);

        volumeTrack.addEventListener('keydown', (e) => {
            let nextVol = currentVolume;
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                e.preventDefault();
                nextVol = Math.min(100, currentVolume + 5);
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                e.preventDefault();
                nextVol = Math.max(0, currentVolume - 5);
            } else if (e.key === 'Home') {
                e.preventDefault();
                nextVol = 0;
            } else if (e.key === 'End') {
                e.preventDefault();
                nextVol = 100;
            } else {
                return;
            }
            updateVolumeUI(nextVol);
            if (window.DB) window.DB.setVolumePreference(nextVol);
        });
    }

    if (btnVolumeMute) {
        btnVolumeMute.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetVol = currentVolume > 0 ? 0 : (lastNonZeroVolume || 80);
            updateVolumeUI(targetVol);
            if (window.DB) window.DB.setVolumePreference(targetVol);
            if (window.Motion) window.Motion.popReaderControl(btnVolumeMute);
        });
    }

    // --- 3.2. Toggle del Menú de Acceso Rápido a Capítulos ---
    if (btnChapters && chaptersPopover) {
        btnChapters.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.Motion) window.Motion.popReaderControl(btnChapters);

            const willOpen = !chaptersPopover.classList.contains('is-open');
            closeAllPopovers();

            if (willOpen) {
                chaptersPopover.classList.add('is-open');
                chaptersPopover.setAttribute('aria-hidden', 'false');
                btnChapters.classList.add('active-control');
                btnChapters.setAttribute('aria-expanded', 'true');

                if (window.gsap) {
                    const items = chaptersPopover.querySelectorAll('.chapter-quick-item');
                    gsap.fromTo(items,
                        { y: 8, opacity: 0 },
                        { y: 0, opacity: 1, duration: 0.22, stagger: 0.04, ease: 'power2.out', clearProps: 'transform,opacity' }
                    );
                }
            }
        });

        chaptersPopover.addEventListener('click', (e) => e.stopPropagation());

        const chapterItems = chaptersPopover.querySelectorAll('.chapter-quick-item');
        chapterItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const isAvailable = item.getAttribute('data-available') === 'true';
                const chNum = item.getAttribute('data-chapter-num') || '';

                if (isAvailable) {
                    closeAllPopovers();
                    if (visor) {
                        isProgrammaticScroll = true;
                        if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
                        programmaticScrollTimer = setTimeout(() => { isProgrammaticScroll = false; }, 650);
                        visor.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                } else {
                    if (window.Motion) window.Motion.shakeLocked(item);
                    if (chaptersToast) {
                        chaptersToast.textContent = `Capítulo ${chNum}: Contenido no disponible`;
                        chaptersToast.classList.add('is-visible');
                        if (toastTimer) clearTimeout(toastTimer);
                        toastTimer = setTimeout(() => {
                            chaptersToast.classList.remove('is-visible');
                        }, 2200);
                    }
                }
            });
        });
    }

    // =========================================================================
    // 4. MENÚ / HUD DINÁMICO INMERSIVO (OCULTAR AL DESLIZAR, MOSTRAR AL TOCAR)
    // =========================================================================
    function showReaderHUD() {
        if (isHudVisible) return;
        isHudVisible = true;
        if (topBar) topBar.classList.remove('hud-hidden');
        if (downBar) downBar.classList.remove('hud-hidden');
    }

    function hideReaderHUD() {
        if (!isHudVisible) return;
        isHudVisible = false;
        closeAllPopovers();
        if (topBar) topBar.classList.add('hud-hidden');
        if (downBar) downBar.classList.add('hud-hidden');
    }

    function toggleReaderHUD() {
        if (isHudVisible) {
            if (isAnyPopoverOpen()) {
                closeAllPopovers();
            } else {
                hideReaderHUD();
            }
        } else {
            showReaderHUD();
        }
    }

    if (visor) {
        let lastScrollTop = visor.scrollTop;
        let scrollTicking = false;

        visor.addEventListener('scroll', () => {
            if (scrollTicking) return;
            scrollTicking = true;

            requestAnimationFrame(() => {
                const currentScrollTop = visor.scrollTop;
                const delta = Math.abs(currentScrollTop - lastScrollTop);

                if (!isProgrammaticScroll && delta > 7) {
                    hideReaderHUD();
                }

                lastScrollTop = currentScrollTop;
                scrollTicking = false;
            });
        }, { passive: true });

        let pointerStartX = 0;
        let pointerStartY = 0;
        let pointerStartTime = 0;
        let pointerMoved = false;

        visor.addEventListener('pointerdown', (e) => {
            pointerStartX = e.clientX;
            pointerStartY = e.clientY;
            pointerStartTime = Date.now();
            pointerMoved = false;
        }, { passive: true });

        visor.addEventListener('pointermove', (e) => {
            if (pointerMoved) return;
            const dist = Math.hypot(e.clientX - pointerStartX, e.clientY - pointerStartY);
            if (dist > 10) {
                pointerMoved = true;
            }
        }, { passive: true });

        visor.addEventListener('pointerup', (e) => {
            const elapsed = Date.now() - pointerStartTime;
            const dist = Math.hypot(e.clientX - pointerStartX, e.clientY - pointerStartY);
            if (!pointerMoved && dist <= 10 && elapsed < 450) {
                toggleReaderHUD();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllPopovers();
    });
});
