/**
 * Overflow Database & Authentication Service (db.js)
 * Conectado a Firebase Authentication (Google Sign-In + Cuentas propias Usuario/Contraseña) y Cloud Firestore
 * Proyecto: overflow-digital-reader
 * Optimizado con hidratación síncrona (0ms antes del primer pintado) + Real-time Cloud Sync
 */

(function (window) {
    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyAmBvQ2Tq0BGMP06MD8J0232S0DyujUKZo",
        authDomain: "overflow-digital-reader.firebaseapp.com",
        projectId: "overflow-digital-reader",
        storageBucket: "overflow-digital-reader.firebasestorage.app",
        messagingSenderId: "544338732245",
        appId: "1:544338732245:web:5aa66b574f2a24239d6e5c"
    };

    const STORAGE_KEYS = {
        ACTIVE_CHAPTER: 'overflow_active_chapter',
        CURRENT_USER_ID: 'overflow_current_user_id',
        USERS: 'overflow_users',
        POSTS: 'overflow_posts',
        CHAPTERS: 'overflow_chapters',
        VOLUME_PREF: 'overflow_volume_pref'
    };

    const DEFAULT_AVATAR = 'Images/default-avatar.svg';
    const DEFAULT_BANNER = 'Images/default-banner.svg';
    const DEFAULT_CURRENT_USER_ID = 'user_mclovin';
    const TOTAL_CHAPTER_1_PANELS = 32;
    const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,20}$/;

    function getChapterPanelCount(chapter) {
        return Math.max(
            typeof chapter.totalPanels === 'number' ? chapter.totalPanels : 0,
            TOTAL_CHAPTER_1_PANELS
        );
    }

    function validateUsernameFormat(username) {
        const clean = String(username || '').trim();
        if (clean.length < 3 || clean.length > 20) {
            return {
                valid: false,
                error: 'El nombre de usuario debe tener entre 3 y 20 caracteres.'
            };
        }
        if (!USERNAME_REGEX.test(clean)) {
            return {
                valid: false,
                error: 'El nombre de usuario solo puede contener letras, números, guion bajo (_) y punto (.), sin espacios ni símbolos especiales.'
            };
        }
        return { valid: true, clean };
    }

    const SEED_CHAPTERS = {
        'chapter_1': {
            id: 'chapter_1',
            title: 'Capítulo 1: A la deriva',
            likes: ['user_other'],
            likesCount: 1200,
            viewsCount: 2700,
            totalPanels: TOTAL_CHAPTER_1_PANELS
        }
    };

    const SEED_USERS = {
        'user_mclovin': {
            id: 'user_mclovin',
            username: 'Lector_Overflow',
            nombres: 'Alex',
            apellidos: 'Vega',
            email: 'alex@overflow.com',
            password: '••••••••',
            authProvider: 'password',
            usernameConfirmed: true,
            bio: 'Lector veterano del cómic Overflow y explorador de capítulos.',
            avatar: DEFAULT_AVATAR,
            banner: DEFAULT_BANNER,
            customAvatar: false,
            customBanner: false,
            activeChapter: '1',
            notificationsEnabled: true,
            volume: 80,
            followersCount: 322,
            followingCount: 540,
            following: [],
            reposts: [],
            chapterProgress: { chapter_1: 0 }
        },
        'user_other': {
            id: 'user_other',
            username: 'Usuario 1',
            nombres: 'Carlos',
            apellidos: 'Lector',
            email: 'carlos@overflow.com',
            password: '••••••••',
            authProvider: 'password',
            usernameConfirmed: true,
            bio: 'Fanático del cómic Overflow y coleccionista de viñetas.',
            avatar: DEFAULT_AVATAR,
            banner: DEFAULT_BANNER,
            customAvatar: false,
            customBanner: false,
            activeChapter: '1',
            notificationsEnabled: false,
            volume: 80,
            followersCount: 120,
            followingCount: 85,
            following: [],
            reposts: [],
            chapterProgress: { chapter_1: 12 }
        }
    };

    const SEED_POSTS = [
        {
            id: 'post_1001',
            authorId: 'user_other',
            authorUsername: 'Usuario 1',
            authorAvatar: DEFAULT_AVATAR,
            createdAt: Date.now() - (10 * 60 * 60 * 1000),
            content: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod. Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod.',
            media: null,
            likes: ['user_other'],
            dislikes: [],
            reposts: [],
            comments: [
                {
                    id: 'c_1',
                    authorId: 'user_mclovin',
                    authorUsername: 'Lector_Overflow',
                    authorAvatar: DEFAULT_AVATAR,
                    text: '¡Totalmente de acuerdo con esta teoría del capítulo!',
                    createdAt: Date.now() - (8 * 60 * 60 * 1000)
                }
            ]
        },
        {
            id: 'post_1002',
            authorId: 'user_mclovin',
            authorUsername: 'Lector_Overflow',
            authorAvatar: DEFAULT_AVATAR,
            createdAt: Date.now() - (2 * 60 * 60 * 1000),
            content: '¡Acabo de releer el Capítulo 1: A la deriva! El cambio de paleta es brutal. ¿Qué esperan del próximo capítulo?',
            media: {
                type: 'image',
                url: 'Images/portada1.jpg'
            },
            likes: ['user_other'],
            dislikes: [],
            reposts: ['user_other'],
            comments: []
        }
    ];

    function getStoredJSON(key, defaultVal) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : defaultVal;
        } catch (e) {
            return defaultVal;
        }
    }

    function setStoredJSON(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {
            console.warn('[DB Cache Warning]', key, e);
        }
    }

    function isGoogleDefaultPhotoUrl(url) {
        if (!url || typeof url !== 'string') return false;
        return url.includes('googleusercontent.com') || url.includes('lh3.google.com');
    }

    // Limpia cualquier referencia antigua a Maclovin o fotos por defecto de Google no personalizadas
    function sanitizeLegacyPlaceholders() {
        const users = getStoredJSON(STORAGE_KEYS.USERS, null);
        if (users) {
            let modified = false;
            Object.keys(users).forEach(uid => {
                const u = users[uid];
                if (!u) return;
                if (
                    !u.avatar ||
                    u.avatar === 'Images/Maclovin.png' ||
                    (!u.customAvatar && isGoogleDefaultPhotoUrl(u.avatar))
                ) {
                    u.avatar = DEFAULT_AVATAR;
                    modified = true;
                }
                if (!u.banner || u.banner === 'Images/MaclovinMaGrande.png') {
                    u.banner = DEFAULT_BANNER;
                    modified = true;
                }
            });
            if (modified) setStoredJSON(STORAGE_KEYS.USERS, users);
        }

        const posts = getStoredJSON(STORAGE_KEYS.POSTS, null);
        if (Array.isArray(posts)) {
            let modified = false;
            posts.forEach(p => {
                if (!p.authorAvatar || p.authorAvatar === 'Images/Maclovin.png' || isGoogleDefaultPhotoUrl(p.authorAvatar)) {
                    const authorUser = users && users[p.authorId];
                    p.authorAvatar = (authorUser && authorUser.customAvatar && authorUser.avatar) ? authorUser.avatar : DEFAULT_AVATAR;
                    modified = true;
                }
                if (Array.isArray(p.comments)) {
                    p.comments.forEach(c => {
                        if (!c.authorAvatar || c.authorAvatar === 'Images/Maclovin.png' || isGoogleDefaultPhotoUrl(c.authorAvatar)) {
                            const commentUser = users && users[c.authorId];
                            c.authorAvatar = (commentUser && commentUser.customAvatar && commentUser.avatar) ? commentUser.avatar : DEFAULT_AVATAR;
                            modified = true;
                        }
                    });
                }
            });
            if (modified) setStoredJSON(STORAGE_KEYS.POSTS, posts);
        }
    }

    function initLocalCache() {
        const urlChapter = new URLSearchParams(window.location.search).get('chapter');
        const activeCh = urlChapter
            || localStorage.getItem('activeChapter')
            || localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAPTER)
            || '1';
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAPTER, activeCh);
        localStorage.setItem('activeChapter', activeCh);
        document.documentElement.setAttribute('data-chapter', activeCh);
        if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.POSTS)) {
            localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(SEED_POSTS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.CHAPTERS)) {
            localStorage.setItem(STORAGE_KEYS.CHAPTERS, JSON.stringify(SEED_CHAPTERS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.VOLUME_PREF)) {
            localStorage.setItem(STORAGE_KEYS.VOLUME_PREF, '80');
        }
        sanitizeLegacyPlaceholders();
    }

    initLocalCache();

    function cacheUserProfileLocally(profile) {
        if (!profile || !profile.id) return;
        if (
            !profile.avatar ||
            profile.avatar === 'Images/Maclovin.png' ||
            (!profile.customAvatar && isGoogleDefaultPhotoUrl(profile.avatar))
        ) {
            profile.avatar = DEFAULT_AVATAR;
        }
        if (!profile.banner || profile.banner === 'Images/MaclovinMaGrande.png') {
            profile.banner = DEFAULT_BANNER;
        }
        const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
        users[profile.id] = profile;
        setStoredJSON(STORAGE_KEYS.USERS, users);
    }

    function isGoogleAccount(user) {
        if (!user) return false;
        if (user.authProvider === 'google') return true;
        if (user.authProvider === 'password') return false;
        // Fallback heurístico para cuentas Google previas cuyo ID no empieza por user_
        return Boolean(user.id && !String(user.id).startsWith('user_'));
    }

    // =========================================================================
    // HIDRATACIÓN SÍNCRONA INSTANTÁNEA (0ms ANTES DEL PRIMER PINTADO DEL NAVEGADOR)
    // =========================================================================
    function applyProfileToDOMSynchronously(user) {
        if (!user) return;
        const avatarSrc = (user.customAvatar && user.avatar) ? user.avatar : (isGoogleDefaultPhotoUrl(user.avatar) ? DEFAULT_AVATAR : (user.avatar || DEFAULT_AVATAR));
        const bannerSrc = user.banner || DEFAULT_BANNER;

        // 1. Vista Mi Perfil (myprofile.html)
        const profileAvatar = document.getElementById('profile-avatar');
        const profileBanner = document.getElementById('profile-banner');
        const profileUsername = document.getElementById('profile-username');
        const profileBio = document.getElementById('profile-bio');
        const followersCount = document.getElementById('profile-followers-count');
        const followingCount = document.getElementById('profile-following-count');

        if (profileAvatar) {
            profileAvatar.referrerPolicy = 'no-referrer';
            profileAvatar.src = avatarSrc;
        }
        if (profileBanner) profileBanner.src = bannerSrc;
        if (profileUsername && user.username) profileUsername.textContent = user.username;
        if (profileBio) profileBio.textContent = user.bio || '';
        if (followersCount) followersCount.textContent = user.followersCount || 0;
        if (followingCount) followingCount.textContent = user.followingCount || 0;

        // 2. Vista Ajustes (settings.html)
        const settingsPic = document.getElementById('settings-user-pic');
        const settingsHeader = document.getElementById('settings-user-header');
        const notifToggle = document.getElementById('notifications-toggle');
        const passwordRow = document.querySelector('.settings-panels-content[data-field="password"]');

        if (settingsPic) {
            settingsPic.referrerPolicy = 'no-referrer';
            settingsPic.src = avatarSrc;
        }
        if (settingsHeader && user.username) settingsHeader.textContent = user.username;
        if (notifToggle && typeof user.notificationsEnabled === 'boolean') {
            notifToggle.checked = user.notificationsEnabled;
        }
        if (passwordRow) {
            passwordRow.style.display = isGoogleAccount(user) ? 'none' : '';
        }

        ['username', 'bio', 'nombres', 'apellidos', 'email', 'password'].forEach(key => {
            const row = document.querySelector(`.settings-panels-content[data-field="${key}"]`);
            if (!row) return;
            const pElem = row.querySelector('.settings-icon-container p');
            if (pElem && user[key] !== undefined) {
                pElem.textContent = (key === 'password')
                    ? '••••••••'
                    : (user[key] || '—');
            }
        });

        // 3. Vista Comunidad Overlay (community.html)
        const publishAvatar = document.getElementById('publish-user-avatar');
        if (publishAvatar) {
            publishAvatar.referrerPolicy = 'no-referrer';
            publishAvatar.src = avatarSrc;
        }

        // 4. Progreso de lectura en chapterOneOverview.html
        const overviewProgressEl = document.getElementById('overview-chapter-progress') || document.querySelector('.js-progress');
        if (overviewProgressEl) {
            const chapters = getStoredJSON(STORAGE_KEYS.CHAPTERS, SEED_CHAPTERS);
            const ch = chapters['chapter_1'] || SEED_CHAPTERS['chapter_1'];
            const totalPanels = getChapterPanelCount(ch);
            const readPanels = (user.chapterProgress && typeof user.chapterProgress['chapter_1'] === 'number')
                ? Math.min(totalPanels, Math.max(0, user.chapterProgress['chapter_1']))
                : 0;
            overviewProgressEl.textContent = `${readPanels}/${totalPanels}`;
        }
    }

    function applyChapterMetricsToDOMSynchronously() {
        const cachedUid = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
        const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
        const chapters = getStoredJSON(STORAGE_KEYS.CHAPTERS, SEED_CHAPTERS);
        const ch = chapters['chapter_1'] || SEED_CHAPTERS['chapter_1'];
        const activeUid = cachedUid || DEFAULT_CURRENT_USER_ID;
        const hasLiked = Array.isArray(ch.likes) && ch.likes.includes(activeUid);
        const likesCount = typeof ch.likesCount === 'number' ? ch.likesCount : 1200;
        const viewsCount = typeof ch.viewsCount === 'number' ? ch.viewsCount : 2700;
        const totalPanels = getChapterPanelCount(ch);

        // En chapterReader.html
        const chapterLikesCountEl = document.getElementById('chapter-likes-count');
        const chapterLikeBtn = document.getElementById('btn-chapter-like');
        const likesInteractionBox = document.getElementById('likes-interaction');
        if (chapterLikesCountEl) {
            chapterLikesCountEl.textContent = likesCount;
            if (chapterLikeBtn) chapterLikeBtn.classList.toggle('active-like', hasLiked);
            if (likesInteractionBox) likesInteractionBox.classList.toggle('active-like', hasLiked);
        }

        // En chapterOneOverview.html
        const overviewLikesEl = document.getElementById('overview-chapter-likes') || document.querySelector('.js-chapter-likes');
        const overviewViewsEl = document.getElementById('overview-chapter-views') || document.querySelector('.js-views');
        const overviewProgressEl = document.getElementById('overview-chapter-progress') || document.querySelector('.js-progress');

        if (overviewLikesEl) overviewLikesEl.textContent = likesCount;
        if (overviewViewsEl) overviewViewsEl.textContent = viewsCount;
        if (overviewProgressEl) {
            const activeUser = (cachedUid && users[cachedUid]) ? users[cachedUid] : null;
            const readPanels = (activeUser && activeUser.chapterProgress && typeof activeUser.chapterProgress['chapter_1'] === 'number')
                ? Math.min(totalPanels, Math.max(0, activeUser.chapterProgress['chapter_1']))
                : 0;
            overviewProgressEl.textContent = `${readPanels}/${totalPanels}`;
        }
    }

    function hydrateCurrentViewSynchronously() {
        const cachedUid = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
        const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);

        if (cachedUid && users[cachedUid]) {
            applyProfileToDOMSynchronously(users[cachedUid]);
        }

        // Si estamos en otherprofile.html, pre-hidratar también el perfil visitado desde caché
        const otherAvatar = document.getElementById('other-avatar');
        if (otherAvatar) {
            const urlParams = new URLSearchParams(window.location.search);
            const targetUid = urlParams.get('uid') || 'user_other';
            const targetUser = users[targetUid];
            if (targetUser) {
                otherAvatar.referrerPolicy = 'no-referrer';
                otherAvatar.src = targetUser.avatar || DEFAULT_AVATAR;
                const otherBanner = document.getElementById('other-banner');
                const otherUsername = document.getElementById('other-username');
                const otherBio = document.getElementById('other-bio');
                const otherFollowers = document.getElementById('other-followers-count');
                const otherFollowing = document.getElementById('other-following-count');
                if (otherBanner) otherBanner.src = targetUser.banner || DEFAULT_BANNER;
                if (otherUsername) otherUsername.textContent = targetUser.username || '';
                if (otherBio) otherBio.textContent = targetUser.bio || '';
                if (otherFollowers) otherFollowers.textContent = targetUser.followersCount || 0;
                if (otherFollowing) otherFollowing.textContent = targetUser.followingCount || 0;
            }
        }

        applyChapterMetricsToDOMSynchronously();
    }

    // Ejecutar pre-hidratación inmediatamente al evaluar este script (0ms)
    hydrateCurrentViewSynchronously();

    // --- ESTADO DE FIREBASE ---
    let fbApp = null;
    let fbAuth = null;
    let fbDb = null;
    let googleProvider = null;
    let authModRef = null;
    let fsModRef = null;
    let currentAuthUser = null;
    let firebaseReady = false;
    let initPromise = null;
    let realtimeListenersAttached = false;

    function initFirebase() {
        if (initPromise) return initPromise;

        initPromise = (async () => {
            try {
                const [appMod, authMod, fsMod] = await Promise.all([
                    import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js'),
                    import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js'),
                    import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js')
                ]);

                authModRef = authMod;
                fsModRef = fsMod;

                fbApp = appMod.initializeApp(FIREBASE_CONFIG);
                fbAuth = authMod.getAuth(fbApp);
                fbDb = fsMod.getFirestore(fbApp);
                googleProvider = new authMod.GoogleAuthProvider();
                googleProvider.setCustomParameters({ prompt: 'select_account' });

                await new Promise((resolve) => {
                    let firstCheck = true;
                    authMod.onAuthStateChanged(fbAuth, async (user) => {
                        currentAuthUser = user || null;
                        if (user) {
                            localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.uid);
                            ensureUserProfileInFirestore(user).then(syncedProfile => {
                                if (syncedProfile) {
                                    applyProfileToDOMSynchronously(syncedProfile);
                                }
                            }).catch(err => {
                                console.warn('[Firebase Profile Sync Warning]', err);
                            });
                        } else {
                            // Respetar sesiones activas iniciadas con Usuario y Contraseña (sin Google)
                            const cachedUid = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
                            const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
                            const cachedUser = cachedUid ? users[cachedUid] : null;
                            const isCustomPasswordSession = Boolean(
                                cachedUser && (cachedUser.authProvider === 'password' || String(cachedUid).startsWith('user_'))
                            );

                            if (!isCustomPasswordSession && sessionStorage.getItem('overflow_demo_mode') !== 'true') {
                                localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
                            } else if (isCustomPasswordSession && fbDb && fsModRef) {
                                // Sincronizar perfil propio desde Firestore en segundo plano
                                fsModRef.getDoc(fsModRef.doc(fbDb, 'users', cachedUid)).then(snap => {
                                    if (snap.exists()) {
                                        const cloudData = snap.data();
                                        cacheUserProfileLocally(cloudData);
                                        applyProfileToDOMSynchronously(cloudData);
                                    }
                                }).catch(() => {});
                            }
                        }
                        if (firstCheck) {
                            firstCheck = false;
                            resolve();
                        }
                    });
                });

                firebaseReady = true;

                // Sembrar datos iniciales y activar sincronización en tiempo real
                ensureSeedDataInFirestore().catch(() => {});
                syncPostsFromFirestoreInBackground().catch(() => {});
                syncChaptersFromFirestoreInBackground().catch(() => {});
                attachRealtimeFirestoreListeners();

                return true;
            } catch (err) {
                console.warn('[Firebase Init Fallback a LocalStorage]', err);
                firebaseReady = false;
                return false;
            }
        })();

        return initPromise;
    }

    initFirebase();

    function attachRealtimeFirestoreListeners() {
        if (realtimeListenersAttached || !fbDb || !fsModRef || !fsModRef.onSnapshot) return;
        realtimeListenersAttached = true;

        try {
            // Suscripción en tiempo real a capítulos (likes globales y vistas)
            const chaptersCol = fsModRef.collection(fbDb, 'chapters');
            fsModRef.onSnapshot(chaptersCol, (snap) => {
                const cloudChapters = getStoredJSON(STORAGE_KEYS.CHAPTERS, SEED_CHAPTERS);
                let hasDocs = false;
                snap.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data && data.id) {
                        cloudChapters[data.id] = {
                            ...SEED_CHAPTERS[data.id],
                            ...data
                        };
                        hasDocs = true;
                    }
                });
                if (hasDocs) {
                    setStoredJSON(STORAGE_KEYS.CHAPTERS, cloudChapters);
                    applyChapterMetricsToDOMSynchronously();
                    window.dispatchEvent(new CustomEvent('overflow:chapters-synced', { detail: cloudChapters }));
                }
            }, () => {});

            // Suscripción en tiempo real a publicaciones de comunidad
            const postsCol = fsModRef.collection(fbDb, 'posts');
            fsModRef.onSnapshot(postsCol, (snap) => {
                const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
                const cloudPosts = [];
                snap.forEach(docSnap => {
                    const p = docSnap.data();
                    if (!p.authorAvatar || p.authorAvatar === 'Images/Maclovin.png' || isGoogleDefaultPhotoUrl(p.authorAvatar)) {
                        const u = users[p.authorId];
                        p.authorAvatar = (u && u.customAvatar && u.avatar) ? u.avatar : DEFAULT_AVATAR;
                    }
                    if (Array.isArray(p.comments)) {
                        p.comments.forEach(c => {
                            if (!c.authorAvatar || c.authorAvatar === 'Images/Maclovin.png' || isGoogleDefaultPhotoUrl(c.authorAvatar)) {
                                const cu = users[c.authorId];
                                c.authorAvatar = (cu && cu.customAvatar && cu.avatar) ? cu.avatar : DEFAULT_AVATAR;
                            }
                        });
                    }
                    cloudPosts.push(p);
                });
                cloudPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                if (cloudPosts.length > 0) {
                    const prevRaw = localStorage.getItem(STORAGE_KEYS.POSTS);
                    const nextRaw = JSON.stringify(cloudPosts);
                    if (prevRaw !== nextRaw) {
                        localStorage.setItem(STORAGE_KEYS.POSTS, nextRaw);
                        window.dispatchEvent(new CustomEvent('overflow:posts-synced', { detail: cloudPosts }));
                    }
                }
            }, () => {});
        } catch (e) {}
    }

    async function syncPostsFromFirestoreInBackground() {
        if (!fbDb || !fsModRef) return null;
        try {
            const postsCol = fsModRef.collection(fbDb, 'posts');
            const snap = await fsModRef.getDocs(postsCol);
            const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
            const cloudPosts = [];
            snap.forEach(docSnap => {
                const p = docSnap.data();
                if (!p.authorAvatar || p.authorAvatar === 'Images/Maclovin.png' || isGoogleDefaultPhotoUrl(p.authorAvatar)) {
                    const u = users[p.authorId];
                    p.authorAvatar = (u && u.customAvatar && u.avatar) ? u.avatar : DEFAULT_AVATAR;
                }
                if (Array.isArray(p.comments)) {
                    p.comments.forEach(c => {
                        if (!c.authorAvatar || c.authorAvatar === 'Images/Maclovin.png' || isGoogleDefaultPhotoUrl(c.authorAvatar)) {
                            const cu = users[c.authorId];
                            c.authorAvatar = (cu && cu.customAvatar && cu.avatar) ? cu.avatar : DEFAULT_AVATAR;
                        }
                    });
                }
                cloudPosts.push(p);
            });
            cloudPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            if (cloudPosts.length > 0) {
                const prevRaw = localStorage.getItem(STORAGE_KEYS.POSTS);
                const nextRaw = JSON.stringify(cloudPosts);
                if (prevRaw !== nextRaw) {
                    localStorage.setItem(STORAGE_KEYS.POSTS, nextRaw);
                    window.dispatchEvent(new CustomEvent('overflow:posts-synced', { detail: cloudPosts }));
                }
            }
            return cloudPosts;
        } catch (e) {
            return null;
        }
    }

    async function syncChaptersFromFirestoreInBackground() {
        if (!fbDb || !fsModRef) return null;
        try {
            const chaptersCol = fsModRef.collection(fbDb, 'chapters');
            const snap = await fsModRef.getDocs(chaptersCol);
            const cloudChapters = getStoredJSON(STORAGE_KEYS.CHAPTERS, SEED_CHAPTERS);
            let hasDocs = false;
            snap.forEach(docSnap => {
                const data = docSnap.data();
                if (data && data.id) {
                    cloudChapters[data.id] = {
                        ...SEED_CHAPTERS[data.id],
                        ...data
                    };
                    hasDocs = true;
                }
            });
            if (hasDocs) {
                const prevRaw = localStorage.getItem(STORAGE_KEYS.CHAPTERS);
                const nextRaw = JSON.stringify(cloudChapters);
                if (prevRaw !== nextRaw) {
                    localStorage.setItem(STORAGE_KEYS.CHAPTERS, nextRaw);
                    applyChapterMetricsToDOMSynchronously();
                    window.dispatchEvent(new CustomEvent('overflow:chapters-synced', { detail: cloudChapters }));
                }
            }
            return cloudChapters;
        } catch (e) {
            return null;
        }
    }

    async function ensureUserProfileInFirestore(authUser) {
        if (!fbDb || !fsModRef || !authUser) return null;

        const userRef = fsModRef.doc(fbDb, 'users', authUser.uid);
        const snap = await fsModRef.getDoc(userRef);

        if (snap.exists()) {
            const data = snap.data();
            let needsUpdate = false;
            const updates = {};

            // Regla estricta: Nunca usar la imagen de Google como avatar por defecto; usar siempre el placeholder a menos que haya subido una foto propia (customAvatar)
            if (
                !data.avatar ||
                data.avatar === 'Images/Maclovin.png' ||
                (!data.customAvatar && isGoogleDefaultPhotoUrl(data.avatar))
            ) {
                updates.avatar = DEFAULT_AVATAR;
                data.avatar = DEFAULT_AVATAR;
                needsUpdate = true;
            }

            if (!data.banner || data.banner === 'Images/MaclovinMaGrande.png') {
                updates.banner = DEFAULT_BANNER;
                data.banner = DEFAULT_BANNER;
                needsUpdate = true;
            }

            if (!data.authProvider) {
                updates.authProvider = 'google';
                data.authProvider = 'google';
                needsUpdate = true;
            }

            const urlChapter = new URLSearchParams(window.location.search).get('chapter');
            const localChapter = urlChapter
                || localStorage.getItem('activeChapter')
                || localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAPTER);

            if (localChapter) {
                const ch = String(localChapter);
                localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAPTER, ch);
                localStorage.setItem('activeChapter', ch);
                document.documentElement.setAttribute('data-chapter', ch);
                if (String(data.activeChapter || '') !== ch) {
                    updates.activeChapter = ch;
                    data.activeChapter = ch;
                    needsUpdate = true;
                }
            } else if (data.activeChapter) {
                const ch = String(data.activeChapter);
                localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAPTER, ch);
                localStorage.setItem('activeChapter', ch);
                document.documentElement.setAttribute('data-chapter', ch);
            }

            if (needsUpdate) {
                await fsModRef.setDoc(userRef, updates, { merge: true });
            }

            if (typeof data.volume === 'number') {
                localStorage.setItem(STORAGE_KEYS.VOLUME_PREF, String(Math.round(data.volume)));
            } else {
                const localVol = Number(localStorage.getItem(STORAGE_KEYS.VOLUME_PREF) || 80);
                data.volume = localVol;
            }

            cacheUserProfileLocally(data);
            return data;
        }

        const displayName = (authUser.displayName || '').trim();
        const nameParts = displayName ? displayName.split(/\s+/) : ['Lector', 'Overflow'];
        const nombres = nameParts[0] || 'Lector';
        const apellidos = nameParts.slice(1).join(' ') || '';

        const emailPrefix = authUser.email ? authUser.email.split('@')[0].slice(0, 14) : 'lector';
        const suggestedUsername = emailPrefix.replace(/[^a-zA-Z0-9_]/g, '_') || `lector_${authUser.uid.slice(0, 4)}`;

        const currentLocalChapter = localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAPTER)
            || localStorage.getItem('activeChapter')
            || '1';

        const currentLocalVolume = Number(localStorage.getItem(STORAGE_KEYS.VOLUME_PREF) || 80);

        const newProfile = {
            id: authUser.uid,
            username: suggestedUsername,
            nombres: nombres,
            apellidos: apellidos,
            email: authUser.email || '',
            password: '',
            authProvider: 'google',
            usernameConfirmed: false, // Se pedirá confirmar/elegir username en el modal
            bio: '¡Hola! Soy lector de Overflow: Diarios de un prófugo.',
            avatar: DEFAULT_AVATAR,
            banner: DEFAULT_BANNER,
            customAvatar: false,
            customBanner: false,
            activeChapter: String(currentLocalChapter),
            notificationsEnabled: true,
            volume: currentLocalVolume,
            followersCount: 0,
            followingCount: 0,
            following: [],
            reposts: [],
            chapterProgress: { chapter_1: 0 },
            createdAt: Date.now()
        };

        await fsModRef.setDoc(userRef, newProfile);
        cacheUserProfileLocally(newProfile);
        return newProfile;
    }

    async function ensureSeedDataInFirestore() {
        if (!fbDb || !fsModRef) return;

        for (const seedId of Object.keys(SEED_USERS)) {
            const uRef = fsModRef.doc(fbDb, 'users', seedId);
            const uSnap = await fsModRef.getDoc(uRef);
            if (!uSnap.exists()) {
                await fsModRef.setDoc(uRef, SEED_USERS[seedId]);
            }
            const sUser = SEED_USERS[seedId];
            if (sUser && sUser.username) {
                const uKeyRef = fsModRef.doc(fbDb, 'usernames', sUser.username.trim().toLowerCase());
                const uKeySnap = await fsModRef.getDoc(uKeyRef);
                if (!uKeySnap.exists()) {
                    await fsModRef.setDoc(uKeyRef, { uid: seedId, createdAt: Date.now() });
                }
            }
        }

        const postsCol = fsModRef.collection(fbDb, 'posts');
        const q = fsModRef.query(postsCol, fsModRef.limit(1));
        const snap = await fsModRef.getDocs(q);
        if (snap.empty) {
            for (const post of SEED_POSTS) {
                const pRef = fsModRef.doc(fbDb, 'posts', post.id);
                await fsModRef.setDoc(pRef, post);
            }
        }

        for (const chId of Object.keys(SEED_CHAPTERS)) {
            const cRef = fsModRef.doc(fbDb, 'chapters', chId);
            const cSnap = await fsModRef.getDoc(cRef);
            if (!cSnap.exists()) {
                await fsModRef.setDoc(cRef, SEED_CHAPTERS[chId]);
            } else {
                const cData = cSnap.data();
                if (typeof cData.viewsCount !== 'number' || typeof cData.totalPanels !== 'number' || cData.totalPanels < TOTAL_CHAPTER_1_PANELS) {
                    await fsModRef.setDoc(cRef, {
                        viewsCount: typeof cData.viewsCount === 'number' ? cData.viewsCount : 2700,
                        totalPanels: Math.max(typeof cData.totalPanels === 'number' ? cData.totalPanels : 0, TOTAL_CHAPTER_1_PANELS)
                    }, { merge: true });
                }
            }
        }
    }

    // =========================================================================
    // MODAL DE AUTENTICACIÓN DUAL (USUARIO/CONTRASEÑA + GOOGLE CON @USERNAME)
    // =========================================================================
    function showAuthModal(initialStep = 'auth', preloadedProfile = null) {
        return new Promise((resolve) => {
            let modal = document.getElementById('overflow-auth-modal');
            if (modal) modal.remove();

            modal = document.createElement('div');
            modal.id = 'overflow-auth-modal';
            modal.className = 'auth-modal-backdrop';
            modal.innerHTML = `
                <article class="auth-modal-card" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
                    <div class="auth-modal-logo-badge" aria-hidden="true">
                        <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 2C8.26801 2 2 8.26801 2 16C2 23.732 8.26801 30 16 30C23.732 30 30 23.732 30 16C30 8.26801 23.732 2 16 2ZM16 10.5C18.7614 10.5 21 12.7386 21 15.5C21 18.2614 18.7614 20.5 16 20.5C13.2386 20.5 11 18.2614 11 15.5C11 12.7386 13.2386 10.5 16 10.5ZM16 27.2C12.2 27.2 8.85 25.28 6.88 22.35C8.15 19.98 11.75 18.5 16 18.5C20.25 18.5 23.85 19.98 25.12 22.35C23.15 25.28 19.8 27.2 16 27.2Z" fill="#D4DBE4"/>
                        </svg>
                    </div>
                    <h2 id="auth-modal-title" class="auth-modal-title">Bienvenido a Overflow</h2>
                    <p id="auth-modal-subtitle" class="auth-modal-subtitle">
                        Inicia sesión o crea tu cuenta personal para participar en la comunidad y guardar tu progreso.
                    </p>

                    <div id="auth-modal-error" class="auth-modal-error" role="alert"></div>

                    <!-- VISTA 1: TABS DE LOGIN / REGISTRO + GOOGLE -->
                    <div id="auth-step-main" class="auth-step-container">
                        <div class="auth-tabs" role="tablist" aria-label="Método de acceso">
                            <button type="button" class="auth-tab-btn active" id="tab-auth-login" role="tab" aria-selected="true">Iniciar Sesión</button>
                            <button type="button" class="auth-tab-btn" id="tab-auth-register" role="tab" aria-selected="false">Crear Cuenta</button>
                        </div>

                        <!-- FORMULARIO: INICIAR SESIÓN CON USUARIO Y CONTRASEÑA -->
                        <form id="form-auth-login" class="auth-form" novalidate>
                            <div class="auth-field-group">
                                <label for="login-username" class="auth-field-label">Usuario o Correo</label>
                                <input type="text" id="login-username" name="username" class="auth-input" placeholder="Ingresa tu usuario" autocomplete="username" spellcheck="false" autocorrect="off" autocapitalize="none" enterkeyhint="next" maxlength="60" required />
                            </div>
                            <div class="auth-field-group">
                                <label for="current-password" class="auth-field-label">Contraseña</label>
                                <input type="password" id="current-password" name="current-password" class="auth-input" placeholder="Ingresa tu contraseña" autocomplete="current-password" enterkeyhint="done" required />
                            </div>
                            <button type="submit" id="btn-submit-login" class="btn-auth-primary">
                                <span>Entrar con Usuario</span>
                            </button>
                        </form>

                        <!-- FORMULARIO: CREAR CUENTA SIN VINCULAR GOOGLE -->
                        <form id="form-auth-register" class="auth-form" style="display: none;" novalidate>
                            <div class="auth-field-group">
                                <label for="reg-username" class="auth-field-label">Nombre de usuario (@username)</label>
                                <input type="text" id="reg-username" name="username" class="auth-input" placeholder="Ej. alex_99 o lector.overflow" autocomplete="username" spellcheck="false" autocorrect="off" autocapitalize="none" enterkeyhint="next" maxlength="20" required />
                                <span class="auth-field-hint">3 a 20 caracteres: solo letras, números, guion bajo (_) y punto (.). Sin espacios ni símbolos especiales.</span>
                            </div>
                            <div class="auth-field-row">
                                <div class="auth-field-group">
                                    <label for="reg-nombres" class="auth-field-label">Nombre</label>
                                    <input type="text" id="reg-nombres" name="given-name" class="auth-input" placeholder="Tu nombre" autocomplete="given-name" enterkeyhint="next" maxlength="50" required />
                                </div>
                                <div class="auth-field-group">
                                    <label for="reg-apellidos" class="auth-field-label">Apellido</label>
                                    <input type="text" id="reg-apellidos" name="family-name" class="auth-input" placeholder="Tu apellido" autocomplete="family-name" enterkeyhint="next" maxlength="50" required />
                                </div>
                            </div>
                            <div class="auth-field-group">
                                <label for="reg-email" class="auth-field-label">Correo electrónico</label>
                                <input type="email" id="reg-email" name="email" class="auth-input" placeholder="tucorreo@ejemplo.com" autocomplete="email" inputmode="email" spellcheck="false" autocapitalize="none" enterkeyhint="next" maxlength="120" required />
                            </div>
                            <div class="auth-field-group">
                                <label for="new-password" class="auth-field-label">Contraseña</label>
                                <input type="password" id="new-password" name="new-password" class="auth-input" placeholder="Mínimo 4 caracteres" autocomplete="new-password" enterkeyhint="done" required />
                            </div>
                            <button type="submit" id="btn-submit-register" class="btn-auth-primary">
                                <span>Crear Cuenta</span>
                            </button>
                        </form>

                        <div class="auth-divider">
                            <span>o continúa con</span>
                        </div>

                        <button type="button" id="btn-google-signin" class="btn-google-login">
                            <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                            </svg>
                            <span id="btn-google-signin-text">Continuar con Google</span>
                        </button>

                        <button type="button" id="btn-auth-back-home" class="btn-auth-secondary">
                            Volver al Inicio
                        </button>
                    </div>

                    <!-- VISTA 2: PASO OBLIGATORIO PARA ELEGIR @USERNAME TRAS INICIAR CON GOOGLE -->
                    <form id="form-google-username" class="auth-form auth-step-container" style="display: none;" novalidate>
                        <div class="auth-field-group">
                            <label for="google-custom-username" class="auth-field-label">Elige tu nombre de usuario</label>
                            <input type="text" id="google-custom-username" name="username" class="auth-input" placeholder="Ej. sebas_99 o lector.overflow" spellcheck="false" autocorrect="off" autocapitalize="none" enterkeyhint="next" maxlength="20" required />
                            <span class="auth-field-hint">3 a 20 caracteres: solo letras, números, guion bajo (_) y punto (.). Sin espacios ni símbolos especiales.</span>
                        </div>
                        <div class="auth-field-row">
                            <div class="auth-field-group">
                                <label for="google-custom-nombres" class="auth-field-label">Nombre</label>
                                <input type="text" id="google-custom-nombres" name="given-name" class="auth-input" placeholder="Tu nombre" enterkeyhint="next" maxlength="50" required />
                            </div>
                            <div class="auth-field-group">
                                <label for="google-custom-apellidos" class="auth-field-label">Apellido</label>
                                <input type="text" id="google-custom-apellidos" name="family-name" class="auth-input" placeholder="Tu apellido" enterkeyhint="done" maxlength="50" />
                            </div>
                        </div>
                        <button type="submit" id="btn-save-google-username" class="btn-auth-primary">
                            <span>Guardar y Continuar</span>
                        </button>
                    </form>
                </article>
            `;
            document.body.appendChild(modal);

            requestAnimationFrame(() => {
                modal.classList.add('active');
            });

            const titleEl = modal.querySelector('#auth-modal-title');
            const subtitleEl = modal.querySelector('#auth-modal-subtitle');
            const errorBox = modal.querySelector('#auth-modal-error');
            const stepMain = modal.querySelector('#auth-step-main');
            const formLogin = modal.querySelector('#form-auth-login');
            const formRegister = modal.querySelector('#form-auth-register');
            const formGoogleUsername = modal.querySelector('#form-google-username');
            const tabLogin = modal.querySelector('#tab-auth-login');
            const tabRegister = modal.querySelector('#tab-auth-register');
            const btnGoogle = modal.querySelector('#btn-google-signin');
            const btnGoogleText = modal.querySelector('#btn-google-signin-text');
            const btnBackHome = modal.querySelector('#btn-auth-back-home');

            let pendingGoogleProfile = preloadedProfile;

            function showError(msg) {
                errorBox.textContent = msg;
                errorBox.style.display = 'block';
            }

            function hideError() {
                errorBox.textContent = '';
                errorBox.style.display = 'none';
            }

            function openGoogleUsernameStep(profile) {
                pendingGoogleProfile = profile;
                hideError();
                stepMain.style.display = 'none';
                formGoogleUsername.style.display = 'flex';
                titleEl.textContent = 'Elige tu @username';
                subtitleEl.textContent = 'Personaliza un nombre de usuario corto para mostrar en tu perfil y en la comunidad.';

                const inputUser = modal.querySelector('#google-custom-username');
                const inputNombres = modal.querySelector('#google-custom-nombres');
                const inputApellidos = modal.querySelector('#google-custom-apellidos');

                const shortSuggestion = (profile.username || '').slice(0, 16);
                inputUser.value = shortSuggestion;
                inputNombres.value = profile.nombres || '';
                inputApellidos.value = profile.apellidos || '';
                setTimeout(() => {
                    inputUser.focus();
                    inputUser.select();
                }, 80);
            }

            if (initialStep === 'google-username' && preloadedProfile) {
                openGoogleUsernameStep(preloadedProfile);
            }

            tabLogin.addEventListener('click', () => {
                hideError();
                tabLogin.classList.add('active');
                tabLogin.setAttribute('aria-selected', 'true');
                tabRegister.classList.remove('active');
                tabRegister.setAttribute('aria-selected', 'false');
                formLogin.style.display = 'flex';
                formRegister.style.display = 'none';
            });

            tabRegister.addEventListener('click', () => {
                hideError();
                tabRegister.classList.add('active');
                tabRegister.setAttribute('aria-selected', 'true');
                tabLogin.classList.remove('active');
                tabLogin.setAttribute('aria-selected', 'false');
                formRegister.style.display = 'flex';
                formLogin.style.display = 'none';
            });

            // 1. Login con Usuario y Contraseña
            formLogin.addEventListener('submit', async (e) => {
                e.preventDefault();
                hideError();
                const identifier = modal.querySelector('#login-username').value.trim();
                const password = modal.querySelector('#current-password').value;

                if (!identifier || !password) {
                    showError('Por favor ingresa tu nombre de usuario y tu contraseña.');
                    return;
                }

                const submitBtn = modal.querySelector('#btn-submit-login');
                submitBtn.disabled = true;
                submitBtn.querySelector('span').textContent = 'Verificando...';

                try {
                    const profile = await DB.loginWithCredentials(identifier, password);
                    applyProfileToDOMSynchronously(profile);
                    modal.classList.remove('active');
                    setTimeout(() => modal.remove(), 300);
                    resolve(profile);
                } catch (err) {
                    submitBtn.disabled = false;
                    submitBtn.querySelector('span').textContent = 'Entrar con Usuario';
                    showError(err.message || 'Usuario o contraseña incorrectos.');
                }
            });

            // 2. Registro con Usuario, Nombre, Apellido, Correo y Contraseña
            formRegister.addEventListener('submit', async (e) => {
                e.preventDefault();
                hideError();

                const username = modal.querySelector('#reg-username').value.trim();
                const nombres = modal.querySelector('#reg-nombres').value.trim();
                const apellidos = modal.querySelector('#reg-apellidos').value.trim();
                const email = modal.querySelector('#reg-email').value.trim();
                const password = modal.querySelector('#new-password').value;

                const validation = validateUsernameFormat(username);
                if (!validation.valid) {
                    showError(validation.error);
                    return;
                }
                if (!nombres) {
                    showError('Por favor ingresa tu nombre.');
                    return;
                }
                if (!email || !email.includes('@')) {
                    showError('Por favor ingresa un correo electrónico válido.');
                    return;
                }
                if (!password || password.length < 4) {
                    showError('La contraseña debe tener al menos 4 caracteres.');
                    return;
                }

                const submitBtn = modal.querySelector('#btn-submit-register');
                submitBtn.disabled = true;
                submitBtn.querySelector('span').textContent = 'Creando cuenta...';

                try {
                    const profile = await DB.registerWithCredentials({
                        username,
                        nombres,
                        apellidos,
                        email,
                        password
                    });
                    applyProfileToDOMSynchronously(profile);
                    modal.classList.remove('active');
                    setTimeout(() => modal.remove(), 300);
                    resolve(profile);
                } catch (err) {
                    submitBtn.disabled = false;
                    submitBtn.querySelector('span').textContent = 'Crear Cuenta';
                    showError(err.message || 'No se pudo crear la cuenta.');
                }
            });

            // 3. Login con Google + Paso de elección de @username
            btnGoogle.addEventListener('click', async () => {
                hideError();
                btnGoogle.disabled = true;
                btnGoogleText.textContent = 'Conectando con Google...';

                try {
                    const profile = await DB.loginWithGoogle();
                    if (!profile.usernameConfirmed) {
                        btnGoogle.disabled = false;
                        btnGoogleText.textContent = 'Continuar con Google';
                        openGoogleUsernameStep(profile);
                        return;
                    }
                    applyProfileToDOMSynchronously(profile);
                    modal.classList.remove('active');
                    setTimeout(() => modal.remove(), 300);
                    resolve(profile);
                } catch (err) {
                    btnGoogle.disabled = false;
                    btnGoogleText.textContent = 'Continuar con Google';

                    let msg = 'No se pudo iniciar sesión con Google. ';
                    if (err && err.code === 'auth/popup-closed-by-user') {
                        msg = 'Cerraste la ventana de Google antes de completar el acceso.';
                    } else if (err && err.message) {
                        msg += err.message;
                    }
                    showError(msg);
                }
            });

            // 4. Confirmación del @username para cuentas de Google
            formGoogleUsername.addEventListener('submit', async (e) => {
                e.preventDefault();
                hideError();

                const chosenUsername = modal.querySelector('#google-custom-username').value.trim();
                const chosenNombres = modal.querySelector('#google-custom-nombres').value.trim();
                const chosenApellidos = modal.querySelector('#google-custom-apellidos').value.trim();

                const validation = validateUsernameFormat(chosenUsername);
                if (!validation.valid) {
                    showError(validation.error);
                    return;
                }
                if (!chosenNombres) {
                    showError('Por favor ingresa tu nombre.');
                    return;
                }

                const btnSave = modal.querySelector('#btn-save-google-username');
                btnSave.disabled = true;
                btnSave.querySelector('span').textContent = 'Guardando...';

                try {
                    const updated = await DB.updateProfile({
                        username: chosenUsername,
                        nombres: chosenNombres,
                        apellidos: chosenApellidos,
                        authProvider: 'google',
                        usernameConfirmed: true,
                        avatar: (pendingGoogleProfile && pendingGoogleProfile.customAvatar) ? pendingGoogleProfile.avatar : DEFAULT_AVATAR
                    }, pendingGoogleProfile ? pendingGoogleProfile.id : null);

                    applyProfileToDOMSynchronously(updated);
                    modal.classList.remove('active');
                    setTimeout(() => modal.remove(), 300);
                    resolve(updated);
                } catch (err) {
                    btnSave.disabled = false;
                    btnSave.querySelector('span').textContent = 'Guardar y Continuar';
                    showError(err.message || 'Error al guardar el nombre de usuario.');
                }
            });

            btnBackHome.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        });
    }

    // --- REPOSITORIO DB PÚBLICO ---
    const DB = {
        DEFAULT_AVATAR,
        DEFAULT_BANNER,
        isGoogleAccount,

        validateUsername(username) {
            return validateUsernameFormat(username);
        },

        async isUsernameAvailable(username, excludeUid = null) {
            const validation = validateUsernameFormat(username);
            if (!validation.valid) {
                return { available: false, error: validation.error };
            }
            const clean = validation.clean;
            const lowerKey = clean.toLowerCase();

            // 1. Verificación instantánea en caché local
            const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
            const localConflict = Object.values(users).find(u =>
                u && u.username &&
                u.username.toLowerCase() === lowerKey &&
                (!excludeUid || u.id !== excludeUid)
            );
            if (localConflict) {
                return {
                    available: false,
                    error: `El nombre de usuario "@${clean}" ya está en uso. Por favor elige otro.`
                };
            }

            // 2. Verificación en Cloud Firestore
            await initFirebase();
            if (fbDb && fsModRef) {
                try {
                    // Consulta O(1) directa en usernames/{usernameLower}
                    const usernameRef = fsModRef.doc(fbDb, 'usernames', lowerKey);
                    const snap = await fsModRef.getDoc(usernameRef);
                    if (snap.exists()) {
                        const data = snap.data();
                        if (data && data.uid && (!excludeUid || data.uid !== excludeUid)) {
                            return {
                                available: false,
                                error: `El nombre de usuario "@${clean}" ya está en uso. Por favor elige otro.`
                            };
                        }
                    }

                    // Por retrocompatibilidad con usuarios previos a la colección usernames
                    const usersCol = fsModRef.collection(fbDb, 'users');
                    const usersSnap = await fsModRef.getDocs(usersCol);
                    for (const docSnap of usersSnap.docs) {
                        const uData = docSnap.data();
                        if (uData && uData.username && uData.username.toLowerCase() === lowerKey) {
                            if (!excludeUid || docSnap.id !== excludeUid) {
                                return {
                                    available: false,
                                    error: `El nombre de usuario "@${clean}" ya está en uso. Por favor elige otro.`
                                };
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[isUsernameAvailable Warning]', e);
                }
            }

            return { available: true, clean };
        },

        // ==========================================
        // 0. AUTENTICACIÓN DUAL (GOOGLE + USUARIO/CONTRASEÑA)
        // ==========================================
        async loginWithGoogle() {
            await initFirebase();
            if (!fbAuth || !authModRef || !googleProvider) {
                throw new Error('Firebase Auth no pudo inicializarse. Verifica tu conexión a internet.');
            }

            const result = await authModRef.signInWithPopup(fbAuth, googleProvider);
            currentAuthUser = result.user;
            sessionStorage.removeItem('overflow_demo_mode');
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentAuthUser.uid);

            const profile = await ensureUserProfileInFirestore(currentAuthUser);
            return profile;
        },

        async registerWithCredentials({ username, nombres, apellidos, email, password }) {
            await initFirebase();
            const availCheck = await this.isUsernameAvailable(username);
            if (!availCheck.available) {
                throw new Error(availCheck.error);
            }
            const cleanUsername = availCheck.clean;
            const cleanEmail = String(email || '').trim().toLowerCase();

            if (fbAuth && authModRef && currentAuthUser) {
                try { await authModRef.signOut(fbAuth); } catch (e) {}
                currentAuthUser = null;
            }

            const newUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
            const currentLocalChapter = localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAPTER)
                || localStorage.getItem('activeChapter')
                || '1';
            const currentLocalVolume = Number(localStorage.getItem(STORAGE_KEYS.VOLUME_PREF) || 80);

            const newProfile = {
                id: newUserId,
                username: cleanUsername,
                nombres: String(nombres || '').trim(),
                apellidos: String(apellidos || '').trim(),
                email: cleanEmail,
                password: String(password),
                authProvider: 'password',
                usernameConfirmed: true,
                bio: '¡Hola! Soy lector de Overflow: Diarios de un prófugo.',
                avatar: DEFAULT_AVATAR,
                banner: DEFAULT_BANNER,
                customAvatar: false,
                customBanner: false,
                activeChapter: String(currentLocalChapter),
                notificationsEnabled: true,
                volume: currentLocalVolume,
                followersCount: 0,
                followingCount: 0,
                following: [],
                reposts: [],
                chapterProgress: { chapter_1: 0 },
                createdAt: Date.now()
            };

            cacheUserProfileLocally(newProfile);
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, newUserId);
            sessionStorage.removeItem('overflow_demo_mode');

            if (fbDb && fsModRef) {
                try {
                    await fsModRef.setDoc(fsModRef.doc(fbDb, 'users', newUserId), newProfile);
                    // Reservar en la colección de usernames únicos
                    await fsModRef.setDoc(fsModRef.doc(fbDb, 'usernames', cleanUsername.toLowerCase()), {
                        uid: newUserId,
                        createdAt: Date.now()
                    });
                } catch (e) {
                    console.warn('[Firestore registerWithCredentials Sync Warning]', e);
                }
            }

            return newProfile;
        },

        async loginWithCredentials(identifier, password) {
            await initFirebase();
            const cleanId = String(identifier || '').trim().toLowerCase();
            const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);

            // Sincronizar usuarios desde Firestore para poder iniciar sesión desde cualquier dispositivo
            if (fbDb && fsModRef) {
                try {
                    const snap = await fsModRef.getDocs(fsModRef.collection(fbDb, 'users'));
                    snap.forEach(docSnap => {
                        const u = docSnap.data();
                        if (u && u.id) {
                            if (!u.customAvatar && isGoogleDefaultPhotoUrl(u.avatar)) {
                                u.avatar = DEFAULT_AVATAR;
                            }
                            users[u.id] = u;
                        }
                    });
                    setStoredJSON(STORAGE_KEYS.USERS, users);
                } catch (e) {}
            }

            const matchedUser = Object.values(users).find(u =>
                u && (
                    (u.username && u.username.toLowerCase() === cleanId) ||
                    (u.email && u.email.toLowerCase() === cleanId)
                )
            );

            if (!matchedUser) {
                throw new Error('No encontramos una cuenta con ese usuario o correo.');
            }

            if (isGoogleAccount(matchedUser) && (!matchedUser.password || matchedUser.password === '••••••••')) {
                throw new Error('Esta cuenta fue creada con Google. Usa el botón "Continuar con Google".');
            }

            if (matchedUser.password !== password) {
                throw new Error('Contraseña incorrecta. Intenta de nuevo.');
            }

            if (fbAuth && authModRef && currentAuthUser) {
                try { await authModRef.signOut(fbAuth); } catch (e) {}
                currentAuthUser = null;
            }

            localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, matchedUser.id);
            sessionStorage.removeItem('overflow_demo_mode');
            cacheUserProfileLocally(matchedUser);

            return matchedUser;
        },

        async logout() {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
            sessionStorage.removeItem('overflow_demo_mode');
            await initFirebase();
            if (fbAuth && authModRef) {
                try {
                    await authModRef.signOut(fbAuth);
                } catch (e) {
                    console.warn('[Logout Warning]', e);
                }
            }
            currentAuthUser = null;
            window.location.href = 'index.html';
        },

        async isAuthenticated() {
            const cachedUid = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
            if (cachedUid) return true;
            await initFirebase();
            return Boolean(currentAuthUser);
        },

        async requireAuth() {
            const cachedUid = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
            const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
            if (cachedUid && users[cachedUid]) {
                const user = users[cachedUid];
                // Si inició sesión con Google y aún no ha confirmado su username corto personalizado, pedirlo
                if (isGoogleAccount(user) && user.usernameConfirmed === false) {
                    return await showAuthModal('google-username', user);
                }
                return user;
            }

            await initFirebase();
            if (currentAuthUser) {
                const profile = await this.getProfile(currentAuthUser.uid);
                if (profile && isGoogleAccount(profile) && profile.usernameConfirmed === false) {
                    return await showAuthModal('google-username', profile);
                }
                return profile;
            }
            return await showAuthModal('auth');
        },

        // ==========================================
        // 1. CAPÍTULOS, LIKES, VISTAS Y PROGRESO
        // ==========================================
        async getActiveChapter() {
            const urlChapter = new URLSearchParams(window.location.search).get('chapter');
            const ch = urlChapter
                || localStorage.getItem('activeChapter')
                || localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAPTER)
                || '1';
            localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAPTER, ch);
            localStorage.setItem('activeChapter', ch);
            return ch;
        },

        async setActiveChapter(chapterId) {
            const id = String(chapterId);
            localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAPTER, id);
            localStorage.setItem('activeChapter', id);
            document.documentElement.setAttribute('data-chapter', id);

            const cachedUid = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
            if (cachedUid) {
                const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
                if (users[cachedUid]) {
                    users[cachedUid].activeChapter = id;
                    setStoredJSON(STORAGE_KEYS.USERS, users);
                }
            }

            initFirebase().then(async () => {
                const targetUid = (currentAuthUser && currentAuthUser.uid) || cachedUid;
                if (targetUid && fbDb && fsModRef) {
                    try {
                        const userRef = fsModRef.doc(fbDb, 'users', targetUid);
                        await fsModRef.setDoc(userRef, { activeChapter: id }, { merge: true });
                    } catch (e) {}
                }
            });
        },

        async getVolumePreference() {
            const cachedUid = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
            const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
            if (cachedUid && users[cachedUid] && typeof users[cachedUid].volume === 'number') {
                return Math.min(100, Math.max(0, Math.round(users[cachedUid].volume)));
            }
            const rawVol = localStorage.getItem(STORAGE_KEYS.VOLUME_PREF);
            const parsed = rawVol !== null ? Number(rawVol) : 80;
            return Number.isFinite(parsed) ? Math.min(100, Math.max(0, Math.round(parsed))) : 80;
        },

        async setVolumePreference(volume) {
            const clamped = Math.min(100, Math.max(0, Math.round(Number(volume) || 0)));
            localStorage.setItem(STORAGE_KEYS.VOLUME_PREF, String(clamped));

            const cachedUid = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || DEFAULT_CURRENT_USER_ID;
            const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
            if (users[cachedUid]) {
                users[cachedUid].volume = clamped;
                setStoredJSON(STORAGE_KEYS.USERS, users);
            }

            if (this._volSyncTimer) clearTimeout(this._volSyncTimer);
            this._volSyncTimer = setTimeout(() => {
                initFirebase().then(async () => {
                    const targetUid = (currentAuthUser && currentAuthUser.uid) || cachedUid;
                    if (targetUid && fbDb && fsModRef) {
                        try {
                            const userRef = fsModRef.doc(fbDb, 'users', targetUid);
                            await fsModRef.setDoc(userRef, { volume: clamped }, { merge: true });
                        } catch (e) {}
                    }
                });
            }, 250);

            return clamped;
        },

        async getChapterStats(chapterId = 'chapter_1') {
            const chapters = getStoredJSON(STORAGE_KEYS.CHAPTERS, SEED_CHAPTERS);
            const ch = chapters[chapterId] || SEED_CHAPTERS[chapterId] || {
                id: chapterId,
                title: 'Capítulo 1: A la deriva',
                likes: [],
                likesCount: 1200,
                viewsCount: 2700,
                totalPanels: TOTAL_CHAPTER_1_PANELS
            };

            const currentUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)
                || (currentAuthUser && currentAuthUser.uid)
                || DEFAULT_CURRENT_USER_ID;

            const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
            const activeUser = users[currentUserId];
            const totalPanels = getChapterPanelCount(ch);
            const panelsRead = (activeUser && activeUser.chapterProgress && typeof activeUser.chapterProgress[chapterId] === 'number')
                ? Math.min(totalPanels, Math.max(0, activeUser.chapterProgress[chapterId]))
                : 0;

            const hasLiked = Array.isArray(ch.likes) && ch.likes.includes(currentUserId);

            initFirebase().then(() => syncChaptersFromFirestoreInBackground());

            return {
                id: ch.id,
                likesCount: typeof ch.likesCount === 'number' ? ch.likesCount : 1200,
                viewsCount: typeof ch.viewsCount === 'number' ? ch.viewsCount : 2700,
                totalPanels,
                panelsRead,
                hasLiked,
                likes: Array.isArray(ch.likes) ? ch.likes : []
            };
        },

        async incrementChapterView(chapterId = 'chapter_1') {
            const sessionKey = `overflow_viewed_${chapterId}`;
            if (sessionStorage.getItem(sessionKey) === 'true') {
                return await this.getChapterStats(chapterId);
            }
            sessionStorage.setItem(sessionKey, 'true');

            const chapters = getStoredJSON(STORAGE_KEYS.CHAPTERS, SEED_CHAPTERS);
            if (!chapters[chapterId]) {
                chapters[chapterId] = { ...SEED_CHAPTERS[chapterId] };
            }
            const ch = chapters[chapterId];
            ch.viewsCount = (typeof ch.viewsCount === 'number' ? ch.viewsCount : 2700) + 1;
            setStoredJSON(STORAGE_KEYS.CHAPTERS, chapters);

            initFirebase().then(async () => {
                if (fbDb && fsModRef) {
                    try {
                        await fsModRef.setDoc(fsModRef.doc(fbDb, 'chapters', chapterId), {
                            id: ch.id || chapterId,
                            title: ch.title || 'Capítulo 1: A la deriva',
                            likes: Array.isArray(ch.likes) ? ch.likes : [],
                            likesCount: typeof ch.likesCount === 'number' ? ch.likesCount : 1200,
                            viewsCount: ch.viewsCount,
                            totalPanels: getChapterPanelCount(ch)
                        }, { merge: true });
                    } catch (e) {}
                }
            });

            return await this.getChapterStats(chapterId);
        },

        async saveChapterProgress(chapterId = 'chapter_1', panelsRead = 1, totalPanels = TOTAL_CHAPTER_1_PANELS) {
            const currentUserId = await this.getCurrentUserId();
            const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
            const user = users[currentUserId];
            if (!user) return;

            if (!user.chapterProgress || typeof user.chapterProgress !== 'object') {
                user.chapterProgress = {};
            }

            const prevProgress = user.chapterProgress[chapterId] || 0;
            const nextProgress = Math.min(totalPanels, Math.max(prevProgress, Math.round(panelsRead)));
            if (nextProgress === prevProgress) return nextProgress;

            user.chapterProgress[chapterId] = nextProgress;
            cacheUserProfileLocally(user);

            if (this._progressSyncTimer) clearTimeout(this._progressSyncTimer);
            this._progressSyncTimer = setTimeout(() => {
                initFirebase().then(async () => {
                    if (fbDb && fsModRef) {
                        try {
                            await fsModRef.setDoc(fsModRef.doc(fbDb, 'users', currentUserId), {
                                chapterProgress: user.chapterProgress
                            }, { merge: true });
                        } catch (e) {}
                    }
                });
            }, 350);

            return nextProgress;
        },

        async toggleChapterLike(chapterId = 'chapter_1') {
            const currentUserId = await this.getCurrentUserId();
            const chapters = getStoredJSON(STORAGE_KEYS.CHAPTERS, SEED_CHAPTERS);
            if (!chapters[chapterId]) {
                chapters[chapterId] = {
                    ...(SEED_CHAPTERS[chapterId] || {
                        id: chapterId,
                        title: 'Capítulo 1: A la deriva',
                        likes: [],
                        likesCount: 1200,
                        viewsCount: 2700,
                        totalPanels: TOTAL_CHAPTER_1_PANELS
                    })
                };
            }

            const ch = chapters[chapterId];
            if (!Array.isArray(ch.likes)) ch.likes = [];
            if (typeof ch.likesCount !== 'number') ch.likesCount = 1200;

            const alreadyLiked = ch.likes.includes(currentUserId);
            if (alreadyLiked) {
                ch.likes = ch.likes.filter(id => id !== currentUserId);
                ch.likesCount = Math.max(0, ch.likesCount - 1);
            } else {
                ch.likes.push(currentUserId);
                ch.likesCount = ch.likesCount + 1;
            }

            setStoredJSON(STORAGE_KEYS.CHAPTERS, chapters);
            applyChapterMetricsToDOMSynchronously();

            initFirebase().then(async () => {
                if (fbDb && fsModRef) {
                    try {
                        await fsModRef.setDoc(fsModRef.doc(fbDb, 'chapters', chapterId), {
                            id: ch.id || chapterId,
                            title: ch.title || 'Capítulo 1: A la deriva',
                            likes: ch.likes,
                            likesCount: ch.likesCount,
                            viewsCount: typeof ch.viewsCount === 'number' ? ch.viewsCount : 2700,
                            totalPanels: getChapterPanelCount(ch)
                        }, { merge: true });
                    } catch (e) {
                        console.warn('[Firestore toggleChapterLike Sync Warning]', e);
                    }
                }
            });

            return {
                likesCount: ch.likesCount,
                hasLiked: !alreadyLiked
            };
        },

        // ==========================================
        // 2. USUARIOS Y PERFILES (0ms CACHE + CLOUD SYNC)
        // ==========================================
        async getCurrentUserId() {
            const cachedUid = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
            if (cachedUid) return cachedUid;
            await initFirebase();
            if (currentAuthUser) return currentAuthUser.uid;
            return DEFAULT_CURRENT_USER_ID;
        },

        async getProfile(userId = null) {
            const targetId = userId || localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || (currentAuthUser && currentAuthUser.uid) || DEFAULT_CURRENT_USER_ID;
            const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);

            if (users[targetId]) {
                initFirebase().then(async () => {
                    if (fbDb && fsModRef) {
                        try {
                            const snap = await fsModRef.getDoc(fsModRef.doc(fbDb, 'users', targetId));
                            if (snap.exists()) {
                                const cloudData = snap.data();
                                if (!cloudData.customAvatar && isGoogleDefaultPhotoUrl(cloudData.avatar)) {
                                    cloudData.avatar = DEFAULT_AVATAR;
                                }
                                cacheUserProfileLocally(cloudData);
                                if (targetId === localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)) {
                                    applyProfileToDOMSynchronously(cloudData);
                                }
                            }
                        } catch (e) {}
                    }
                });
                return users[targetId];
            }

            await initFirebase();
            if (fbDb && fsModRef) {
                try {
                    const userRef = fsModRef.doc(fbDb, 'users', targetId);
                    const snap = await fsModRef.getDoc(userRef);
                    if (snap.exists()) {
                        const data = snap.data();
                        if (!data.customAvatar && isGoogleDefaultPhotoUrl(data.avatar)) {
                            data.avatar = DEFAULT_AVATAR;
                        }
                        cacheUserProfileLocally(data);
                        return data;
                    } else if (currentAuthUser && targetId === currentAuthUser.uid) {
                        return await ensureUserProfileInFirestore(currentAuthUser);
                    }
                } catch (e) {
                    console.warn('[Firestore getProfile Fallback]', e);
                }
            }

            return users[targetId] || users[DEFAULT_CURRENT_USER_ID];
        },

        async updateProfile(updates, userId = null) {
            const targetId = userId || (await this.getCurrentUserId());
            const currentProfile = await this.getProfile(targetId);
            if (!currentProfile) return null;

            if (updates.username) {
                const validation = validateUsernameFormat(updates.username);
                if (!validation.valid) {
                    throw new Error(validation.error);
                }
                const newUsername = validation.clean;
                updates.username = newUsername;

                const oldUsername = currentProfile.username || '';
                if (newUsername.toLowerCase() !== oldUsername.toLowerCase()) {
                    const availCheck = await this.isUsernameAvailable(newUsername, targetId);
                    if (!availCheck.available) {
                        throw new Error(availCheck.error);
                    }

                    // En Firestore: reservar el nuevo username y liberar el anterior
                    await initFirebase();
                    if (fbDb && fsModRef) {
                        try {
                            await fsModRef.setDoc(fsModRef.doc(fbDb, 'usernames', newUsername.toLowerCase()), {
                                uid: targetId,
                                createdAt: Date.now()
                            });
                            if (oldUsername) {
                                try {
                                    await fsModRef.deleteDoc(fsModRef.doc(fbDb, 'usernames', oldUsername.toLowerCase()));
                                } catch (e) {}
                            }
                        } catch (e) {
                            console.warn('[Firestore username reservation Warning]', e);
                        }
                    }
                }
            }

            const updatedProfile = { ...currentProfile, ...updates };
            cacheUserProfileLocally(updatedProfile);

            if (updates.username || updates.avatar) {
                const posts = getStoredJSON(STORAGE_KEYS.POSTS, SEED_POSTS);
                let changed = false;
                posts.forEach(p => {
                    if (p.authorId === targetId) {
                        if (updates.username) p.authorUsername = updates.username;
                        if (updates.avatar) p.authorAvatar = updates.avatar;
                        changed = true;
                    }
                    if (Array.isArray(p.comments)) {
                        p.comments.forEach(c => {
                            if (c.authorId === targetId) {
                                if (updates.username) c.authorUsername = updates.username;
                                if (updates.avatar) c.authorAvatar = updates.avatar;
                                changed = true;
                            }
                        });
                    }
                });
                if (changed) setStoredJSON(STORAGE_KEYS.POSTS, posts);
            }

            await initFirebase();
            if (fbDb && fsModRef) {
                try {
                    const userRef = fsModRef.doc(fbDb, 'users', targetId);
                    await fsModRef.setDoc(userRef, updatedProfile, { merge: true });

                    if (updates.username || updates.avatar) {
                        const postsCol = fsModRef.collection(fbDb, 'posts');
                        const snap = await fsModRef.getDocs(postsCol);
                        const updatePromises = [];

                        snap.forEach((docSnap) => {
                            const post = docSnap.data();
                            let postChanged = false;

                            if (post.authorId === targetId) {
                                if (updates.username) post.authorUsername = updates.username;
                                if (updates.avatar) post.authorAvatar = updates.avatar;
                                postChanged = true;
                            }

                            if (Array.isArray(post.comments)) {
                                post.comments.forEach(c => {
                                    if (c.authorId === targetId) {
                                        if (updates.username) c.authorUsername = updates.username;
                                        if (updates.avatar) c.authorAvatar = updates.avatar;
                                        postChanged = true;
                                    }
                                });
                            }

                            if (postChanged) {
                                updatePromises.push(
                                    fsModRef.setDoc(fsModRef.doc(fbDb, 'posts', docSnap.id), post, { merge: true })
                                );
                            }
                        });

                        if (updatePromises.length > 0) {
                            await Promise.all(updatePromises);
                        }
                    }
                } catch (e) {
                    console.error('[Firestore updateProfile Error]', e);
                }
            }

            return updatedProfile;
        },

        async toggleFollow(targetUserId) {
            const currentUserId = await this.getCurrentUserId();
            if (!targetUserId || currentUserId === targetUserId) {
                return { isFollowing: false, targetFollowers: 0 };
            }

            const currentUser = await this.getProfile(currentUserId);
            const targetUser = await this.getProfile(targetUserId);
            if (!currentUser || !targetUser) {
                return { isFollowing: false, targetFollowers: 0 };
            }

            if (!Array.isArray(currentUser.following)) currentUser.following = [];
            const isFollowing = currentUser.following.includes(targetUserId);

            if (isFollowing) {
                currentUser.following = currentUser.following.filter(id => id !== targetUserId);
                currentUser.followingCount = Math.max(0, (currentUser.followingCount || 0) - 1);
                targetUser.followersCount = Math.max(0, (targetUser.followersCount || 0) - 1);
            } else {
                currentUser.following.push(targetUserId);
                currentUser.followingCount = (currentUser.followingCount || 0) + 1;
                targetUser.followersCount = (targetUser.followersCount || 0) + 1;
            }

            cacheUserProfileLocally(currentUser);
            cacheUserProfileLocally(targetUser);

            initFirebase().then(async () => {
                if (fbDb && fsModRef) {
                    try {
                        await Promise.all([
                            fsModRef.setDoc(fsModRef.doc(fbDb, 'users', currentUserId), {
                                following: currentUser.following,
                                followingCount: currentUser.followingCount
                            }, { merge: true }),
                            fsModRef.setDoc(fsModRef.doc(fbDb, 'users', targetUserId), {
                                followersCount: targetUser.followersCount
                            }, { merge: true })
                        ]);
                    } catch (e) {}
                }
            });

            return {
                isFollowing: !isFollowing,
                targetFollowers: targetUser.followersCount,
                currentFollowing: currentUser.followingCount
            };
        },

        // ==========================================
        // 3. PUBLICACIONES (0ms CACHE + CLOUD SYNC)
        // ==========================================
        async getPosts(filterAuthorId = null) {
            const cachedPosts = getStoredJSON(STORAGE_KEYS.POSTS, SEED_POSTS);
            initFirebase().then(() => syncPostsFromFirestoreInBackground());

            if (filterAuthorId) {
                return cachedPosts.filter(p => p.authorId === filterAuthorId);
            }
            return cachedPosts;
        },

        async getRepostsByUser(userId) {
            const targetId = userId || (await this.getCurrentUserId());
            const user = await this.getProfile(targetId);
            const allPosts = await this.getPosts();
            const userReposts = (user && Array.isArray(user.reposts)) ? user.reposts : [];

            return allPosts.filter(p =>
                userReposts.includes(p.id) ||
                (Array.isArray(p.reposts) && p.reposts.includes(targetId))
            );
        },

        async createPost({ content, media = null }) {
            const user = await this.getProfile();
            const newPost = {
                id: 'post_' + Date.now(),
                authorId: user.id,
                authorUsername: user.username,
                authorAvatar: (user.customAvatar && user.avatar) ? user.avatar : DEFAULT_AVATAR,
                createdAt: Date.now(),
                content: content || '',
                media: media || null,
                likes: [],
                dislikes: [],
                reposts: [],
                comments: []
            };

            const posts = getStoredJSON(STORAGE_KEYS.POSTS, SEED_POSTS);
            posts.unshift(newPost);
            setStoredJSON(STORAGE_KEYS.POSTS, posts);

            initFirebase().then(async () => {
                if (fbDb && fsModRef) {
                    try {
                        await fsModRef.setDoc(fsModRef.doc(fbDb, 'posts', newPost.id), newPost);
                    } catch (e) {
                        console.error('[Firestore createPost Error]', e);
                    }
                }
            });

            return newPost;
        },

        async toggleLike(postId) {
            const currentUserId = await this.getCurrentUserId();
            const allPosts = getStoredJSON(STORAGE_KEYS.POSTS, SEED_POSTS);
            const post = allPosts.find(p => p.id === postId);
            if (!post) return null;

            if (!Array.isArray(post.likes)) post.likes = [];
            if (!Array.isArray(post.dislikes)) post.dislikes = [];

            const isLiked = post.likes.includes(currentUserId);
            if (isLiked) {
                post.likes = post.likes.filter(id => id !== currentUserId);
            } else {
                post.likes.push(currentUserId);
                post.dislikes = post.dislikes.filter(id => id !== currentUserId);
            }

            setStoredJSON(STORAGE_KEYS.POSTS, allPosts);

            initFirebase().then(async () => {
                if (fbDb && fsModRef) {
                    try {
                        await fsModRef.setDoc(fsModRef.doc(fbDb, 'posts', postId), {
                            likes: post.likes,
                            dislikes: post.dislikes
                        }, { merge: true });
                    } catch (e) {}
                }
            });

            return {
                likesCount: post.likes.length,
                dislikesCount: post.dislikes.length,
                hasLiked: !isLiked,
                hasDisliked: false
            };
        },

        async toggleDislike(postId) {
            const currentUserId = await this.getCurrentUserId();
            const allPosts = getStoredJSON(STORAGE_KEYS.POSTS, SEED_POSTS);
            const post = allPosts.find(p => p.id === postId);
            if (!post) return null;

            if (!Array.isArray(post.likes)) post.likes = [];
            if (!Array.isArray(post.dislikes)) post.dislikes = [];

            const isDisliked = post.dislikes.includes(currentUserId);
            if (isDisliked) {
                post.dislikes = post.dislikes.filter(id => id !== currentUserId);
            } else {
                post.dislikes.push(currentUserId);
                post.likes = post.likes.filter(id => id !== currentUserId);
            }

            setStoredJSON(STORAGE_KEYS.POSTS, allPosts);

            initFirebase().then(async () => {
                if (fbDb && fsModRef) {
                    try {
                        await fsModRef.setDoc(fsModRef.doc(fbDb, 'posts', postId), {
                            likes: post.likes,
                            dislikes: post.dislikes
                        }, { merge: true });
                    } catch (e) {}
                }
            });

            return {
                likesCount: post.likes.length,
                dislikesCount: post.dislikes.length,
                hasLiked: false,
                hasDisliked: !isDisliked
            };
        },

        async toggleRepost(postId) {
            const currentUserId = await this.getCurrentUserId();
            const allPosts = getStoredJSON(STORAGE_KEYS.POSTS, SEED_POSTS);
            const post = allPosts.find(p => p.id === postId);
            const user = await this.getProfile(currentUserId);
            if (!post || !user) return null;

            if (!Array.isArray(post.reposts)) post.reposts = [];
            if (!Array.isArray(user.reposts)) user.reposts = [];

            const hasReposted = post.reposts.includes(currentUserId);
            if (hasReposted) {
                post.reposts = post.reposts.filter(id => id !== currentUserId);
                user.reposts = user.reposts.filter(id => id !== postId);
            } else {
                post.reposts.push(currentUserId);
                if (!user.reposts.includes(postId)) {
                    user.reposts.push(postId);
                }
            }

            setStoredJSON(STORAGE_KEYS.POSTS, allPosts);
            cacheUserProfileLocally(user);

            initFirebase().then(async () => {
                if (fbDb && fsModRef) {
                    try {
                        await Promise.all([
                            fsModRef.setDoc(fsModRef.doc(fbDb, 'posts', postId), {
                                reposts: post.reposts
                            }, { merge: true }),
                            fsModRef.setDoc(fsModRef.doc(fbDb, 'users', currentUserId), {
                                reposts: user.reposts
                            }, { merge: true })
                        ]);
                    } catch (e) {}
                }
            });

            return {
                repostsCount: post.reposts.length,
                hasReposted: !hasReposted
            };
        },

        async addComment(postId, commentText) {
            if (!commentText || !commentText.trim()) return null;

            const user = await this.getProfile();
            const allPosts = getStoredJSON(STORAGE_KEYS.POSTS, SEED_POSTS);
            const post = allPosts.find(p => p.id === postId);
            if (!post) return null;

            if (!Array.isArray(post.comments)) post.comments = [];

            const newComment = {
                id: 'comment_' + Date.now(),
                authorId: user.id,
                authorUsername: user.username,
                authorAvatar: (user.customAvatar && user.avatar) ? user.avatar : DEFAULT_AVATAR,
                text: commentText.trim(),
                createdAt: Date.now()
            };

            post.comments.push(newComment);
            setStoredJSON(STORAGE_KEYS.POSTS, allPosts);

            initFirebase().then(async () => {
                if (fbDb && fsModRef) {
                    try {
                        await fsModRef.setDoc(fsModRef.doc(fbDb, 'posts', postId), {
                            comments: post.comments
                        }, { merge: true });
                    } catch (e) {}
                }
            });

            return {
                commentsCount: post.comments.length,
                comment: newComment
            };
        },

        // ==========================================
        // 4. UTILIDADES: TIEMPO RELATIVO E IMÁGENES
        // ==========================================
        timeAgo(timestamp) {
            const now = Date.now();
            const diffSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));

            if (diffSeconds < 60) return 'Hace un momento';
            const diffMinutes = Math.floor(diffSeconds / 60);
            if (diffMinutes < 60) return `${diffMinutes}m`;
            const diffHours = Math.floor(diffMinutes / 60);
            if (diffHours < 24) return `${diffHours}h`;
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays}d`;
        },

        compressImage(file, maxDimension = 800, quality = 0.7) {
            return new Promise((resolve, reject) => {
                if (!file || !file.type.startsWith('image/')) {
                    return reject(new Error('El archivo no es una imagen válida.'));
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > maxDimension) {
                                height = Math.round((height * maxDimension) / width);
                                width = maxDimension;
                            }
                        } else {
                            if (height > maxDimension) {
                                width = Math.round((width * maxDimension) / height);
                                height = maxDimension;
                            }
                        }

                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                        resolve(compressedBase64);
                    };
                    img.onerror = () => reject(new Error('Error al cargar la imagen.'));
                    img.src = e.target.result;
                };
                reader.onerror = () => reject(new Error('Error al leer el archivo.'));
                reader.readAsDataURL(file);
            });
        }
    };

    window.DB = DB;
})(window);
