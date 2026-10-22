/**
 * Overflow Database & Authentication Service (db.js)
 * Conectado a Firebase Authentication (Google Sign-In) y Cloud Firestore
 * Proyecto: overflow-digital-reader
 * Optimizado con hidratación síncrona (0ms antes del primer pintado) + Stale-While-Revalidate
 * para eliminar cualquier parpadeo de placeholders o tardanza entre páginas.
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

    const SEED_CHAPTERS = {
        'chapter_1': {
            id: 'chapter_1',
            title: 'Capítulo 1: A la deriva',
            likes: ['user_other'],
            likesCount: 1200
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
            bio: 'Lector veterano del cómic Overflow y explorador de capítulos.',
            avatar: DEFAULT_AVATAR,
            banner: DEFAULT_BANNER,
            activeChapter: '1',
            notificationsEnabled: true,
            volume: 80,
            followersCount: 322,
            followingCount: 540,
            following: [],
            reposts: []
        },
        'user_other': {
            id: 'user_other',
            username: 'Usuario 1',
            nombres: 'Carlos',
            apellidos: 'Lector',
            email: 'carlos@overflow.com',
            password: '••••••••',
            bio: 'Fanático del cómic Overflow y coleccionista de viñetas.',
            avatar: DEFAULT_AVATAR,
            banner: DEFAULT_BANNER,
            activeChapter: '1',
            notificationsEnabled: false,
            volume: 80,
            followersCount: 120,
            followingCount: 85,
            following: [],
            reposts: []
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
                url: 'Images/cap1Cover.jpg'
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

    // Limpia cualquier referencia antigua a Maclovin en el caché local
    function sanitizeLegacyPlaceholders() {
        const users = getStoredJSON(STORAGE_KEYS.USERS, null);
        if (users) {
            let modified = false;
            Object.keys(users).forEach(uid => {
                const u = users[uid];
                if (u.avatar === 'Images/Maclovin.png') {
                    u.avatar = DEFAULT_AVATAR;
                    modified = true;
                }
                if (u.banner === 'Images/MaclovinMaGrande.png') {
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
                if (p.authorAvatar === 'Images/Maclovin.png') {
                    p.authorAvatar = DEFAULT_AVATAR;
                    modified = true;
                }
                if (Array.isArray(p.comments)) {
                    p.comments.forEach(c => {
                        if (c.authorAvatar === 'Images/Maclovin.png') {
                            c.authorAvatar = DEFAULT_AVATAR;
                            modified = true;
                        }
                    });
                }
            });
            if (modified) setStoredJSON(STORAGE_KEYS.POSTS, posts);
        }
    }

    function initLocalCache() {
        if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAPTER)) {
            const oldChapter = localStorage.getItem('activeChapter') || '1';
            localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAPTER, oldChapter);
        }
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
        if (profile.avatar === 'Images/Maclovin.png') profile.avatar = DEFAULT_AVATAR;
        if (profile.banner === 'Images/MaclovinMaGrande.png') profile.banner = DEFAULT_BANNER;
        const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
        users[profile.id] = profile;
        setStoredJSON(STORAGE_KEYS.USERS, users);
    }

    // =========================================================================
    // HIDRATACIÓN SÍNCRONA INSTANTÁNEA (0ms ANTES DEL PRIMER PINTADO DEL NAVEGADOR)
    // =========================================================================
    function applyProfileToDOMSynchronously(user) {
        if (!user) return;
        const avatarSrc = user.avatar || DEFAULT_AVATAR;
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

        if (settingsPic) {
            settingsPic.referrerPolicy = 'no-referrer';
            settingsPic.src = avatarSrc;
        }
        if (settingsHeader && user.username) settingsHeader.textContent = user.username;
        if (notifToggle && typeof user.notificationsEnabled === 'boolean') {
            notifToggle.checked = user.notificationsEnabled;
        }

        ['username', 'bio', 'nombres', 'apellidos', 'email', 'password'].forEach(key => {
            const row = document.querySelector(`.settings-panels-content[data-field="${key}"]`);
            if (!row) return;
            const pElem = row.querySelector('.settings-icon-container p');
            if (pElem && user[key] !== undefined) {
                pElem.textContent = (key === 'password')
                    ? '•'.repeat(Math.max(6, String(user[key]).length))
                    : (user[key] || '—');
            }
        });

        // 3. Vista Comunidad Overlay (community.html)
        const publishAvatar = document.getElementById('publish-user-avatar');
        if (publishAvatar) {
            publishAvatar.referrerPolicy = 'no-referrer';
            publishAvatar.src = avatarSrc;
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

        // Pre-hidratar likes globales del capítulo en chapterReader.html
        const chapterLikesCountEl = document.getElementById('chapter-likes-count');
        const chapterLikeBtn = document.getElementById('btn-chapter-like');
        const likesInteractionBox = document.getElementById('likes-interaction');
        if (chapterLikesCountEl) {
            const chapters = getStoredJSON(STORAGE_KEYS.CHAPTERS, SEED_CHAPTERS);
            const ch = chapters['chapter_1'] || SEED_CHAPTERS['chapter_1'];
            const activeUid = cachedUid || DEFAULT_CURRENT_USER_ID;
            const hasLiked = Array.isArray(ch.likes) && ch.likes.includes(activeUid);
            chapterLikesCountEl.textContent = ch.likesCount ?? 1200;
            if (chapterLikeBtn) chapterLikeBtn.classList.toggle('active-like', hasLiked);
            if (likesInteractionBox) likesInteractionBox.classList.toggle('active-like', hasLiked);
        }
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
                            // Sincronizar perfil en segundo plano sin bloquear el hilo principal
                            ensureUserProfileInFirestore(user).then(syncedProfile => {
                                if (syncedProfile) {
                                    applyProfileToDOMSynchronously(syncedProfile);
                                }
                            }).catch(err => {
                                console.warn('[Firebase Profile Sync Warning]', err);
                            });
                        } else {
                            if (sessionStorage.getItem('overflow_demo_mode') !== 'true') {
                                localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
                            }
                        }
                        if (firstCheck) {
                            firstCheck = false;
                            resolve();
                        }
                    });
                });

                firebaseReady = true;

                // Sembrar datos iniciales y sincronizar posts y capítulos en segundo plano
                ensureSeedDataInFirestore().catch(() => {});
                syncPostsFromFirestoreInBackground().catch(() => {});
                syncChaptersFromFirestoreInBackground().catch(() => {});

                return true;
            } catch (err) {
                console.warn('[Firebase Init Fallback a LocalStorage]', err);
                firebaseReady = false;
                return false;
            }
        })();

        return initPromise;
    }

    // Iniciar carga de Firebase en segundo plano
    initFirebase();

    async function syncPostsFromFirestoreInBackground() {
        if (!fbDb || !fsModRef) return null;
        try {
            const postsCol = fsModRef.collection(fbDb, 'posts');
            const snap = await fsModRef.getDocs(postsCol);
            const cloudPosts = [];
            snap.forEach(docSnap => {
                const p = docSnap.data();
                if (p.authorAvatar === 'Images/Maclovin.png') p.authorAvatar = DEFAULT_AVATAR;
                if (Array.isArray(p.comments)) {
                    p.comments.forEach(c => {
                        if (c.authorAvatar === 'Images/Maclovin.png') c.authorAvatar = DEFAULT_AVATAR;
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
                    cloudChapters[data.id] = data;
                    hasDocs = true;
                }
            });
            if (hasDocs) {
                const prevRaw = localStorage.getItem(STORAGE_KEYS.CHAPTERS);
                const nextRaw = JSON.stringify(cloudChapters);
                if (prevRaw !== nextRaw) {
                    localStorage.setItem(STORAGE_KEYS.CHAPTERS, nextRaw);
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

            if ((!data.avatar || data.avatar === 'Images/Maclovin.png') && authUser.photoURL) {
                updates.avatar = authUser.photoURL;
                data.avatar = authUser.photoURL;
                needsUpdate = true;
            } else if (data.avatar === 'Images/Maclovin.png') {
                updates.avatar = DEFAULT_AVATAR;
                data.avatar = DEFAULT_AVATAR;
                needsUpdate = true;
            }

            if (!data.banner || data.banner === 'Images/MaclovinMaGrande.png') {
                updates.banner = DEFAULT_BANNER;
                data.banner = DEFAULT_BANNER;
                needsUpdate = true;
            }

            if (needsUpdate) {
                await fsModRef.setDoc(userRef, updates, { merge: true });
            }

            if (data.activeChapter) {
                const ch = String(data.activeChapter);
                localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAPTER, ch);
                localStorage.setItem('activeChapter', ch);
                document.documentElement.setAttribute('data-chapter', ch);
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

        const emailPrefix = authUser.email ? authUser.email.split('@')[0] : 'lector';
        const cleanUsername = displayName
            ? displayName.replace(/\s+/g, '_')
            : `${emailPrefix}_${authUser.uid.slice(0, 4)}`;

        const currentLocalChapter = localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAPTER)
            || localStorage.getItem('activeChapter')
            || '1';

        const currentLocalVolume = Number(localStorage.getItem(STORAGE_KEYS.VOLUME_PREF) || 80);

        const newProfile = {
            id: authUser.uid,
            username: cleanUsername,
            nombres: nombres,
            apellidos: apellidos,
            email: authUser.email || '',
            password: '••••••••',
            bio: '¡Hola! Soy lector de Overflow: Diarios de un prófugo.',
            avatar: authUser.photoURL || DEFAULT_AVATAR,
            banner: DEFAULT_BANNER,
            activeChapter: String(currentLocalChapter),
            notificationsEnabled: true,
            volume: currentLocalVolume,
            followersCount: 0,
            followingCount: 0,
            following: [],
            reposts: [],
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
            }
        }
    }

    function showGoogleAuthModal() {
        return new Promise((resolve) => {
            let modal = document.getElementById('overflow-auth-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'overflow-auth-modal';
                modal.className = 'auth-modal-backdrop';
                modal.innerHTML = `
                    <article class="auth-modal-card" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
                        <div class="auth-modal-logo-badge">
                            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M16 2C8.26801 2 2 8.26801 2 16C2 23.732 8.26801 30 16 30C23.732 30 30 23.732 30 16C30 8.26801 23.732 2 16 2ZM16 10.5C18.7614 10.5 21 12.7386 21 15.5C21 18.2614 18.7614 20.5 16 20.5C13.2386 20.5 11 18.2614 11 15.5C11 12.7386 13.2386 10.5 16 10.5ZM16 27.2C12.2 27.2 8.85 25.28 6.88 22.35C8.15 19.98 11.75 18.5 16 18.5C20.25 18.5 23.85 19.98 25.12 22.35C23.15 25.28 19.8 27.2 16 27.2Z" fill="#D4DBE4"/>
                            </svg>
                        </div>
                        <h2 id="auth-modal-title" class="auth-modal-title">Bienvenido a Overflow</h2>
                        <p class="auth-modal-subtitle">
                            Inicia sesión con tu cuenta de Google para crear tu perfil personal en la nube, guardar tu progreso de lectura y participar en la comunidad.
                        </p>
                        <div id="auth-modal-error" class="auth-modal-error"></div>
                        <button type="button" id="btn-google-signin" class="btn-google-login">
                            <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                            </svg>
                            <span id="btn-google-signin-text">Continuar con Google</span>
                        </button>
                        <button type="button" id="btn-auth-back-home" class="btn-auth-secondary">
                            Volver al Inicio (Modo Invitado)
                        </button>
                    </article>
                `;
                document.body.appendChild(modal);
            }

            requestAnimationFrame(() => {
                modal.classList.add('active');
            });

            const btnGoogle = modal.querySelector('#btn-google-signin');
            const btnGoogleText = modal.querySelector('#btn-google-signin-text');
            const btnBackHome = modal.querySelector('#btn-auth-back-home');
            const errorBox = modal.querySelector('#auth-modal-error');

            btnGoogle.onclick = async () => {
                errorBox.style.display = 'none';
                btnGoogle.disabled = true;
                btnGoogleText.textContent = 'Conectando con Google...';

                try {
                    const profile = await DB.loginWithGoogle();
                    applyProfileToDOMSynchronously(profile);
                    modal.classList.remove('active');
                    resolve(profile);
                } catch (err) {
                    btnGoogle.disabled = false;
                    btnGoogleText.textContent = 'Continuar con Google';

                    let msg = 'No se pudo iniciar sesión con Google. ';
                    if (err && err.code === 'auth/popup-closed-by-user') {
                        msg = 'Cerraste la ventana de Google antes de completar el acceso.';
                    } else if (err && (err.code === 'auth/unauthorized-domain' || err.code === 'auth/operation-not-supported-in-this-environment')) {
                        msg = 'Abre el proyecto usando Live Server (http://localhost o http://127.0.0.1) y asegúrate de que el dominio esté autorizado en Firebase Auth.';
                    } else if (err && err.message) {
                        msg += err.message;
                    }
                    errorBox.textContent = msg;
                    errorBox.style.display = 'block';
                }
            };

            btnBackHome.onclick = () => {
                window.location.href = 'index.html';
            };
        });
    }

    // --- REPOSITORIO DB PÚBLICO ---
    const DB = {
        DEFAULT_AVATAR,
        DEFAULT_BANNER,

        // ==========================================
        // 0. AUTENTICACIÓN CON GOOGLE (INSTANT CACHE + FIREBASE)
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
            // 1. FAST-PATH (0ms): Si ya hay sesión guardada en caché local, devolver el perfil al instante
            const cachedUid = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
            const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
            if (cachedUid && users[cachedUid]) {
                return users[cachedUid];
            }

            // 2. Si no hay caché local, esperar a Firebase Auth y pedir login con Google si no hay sesión
            await initFirebase();
            if (currentAuthUser) {
                return await this.getProfile(currentAuthUser.uid);
            }
            return await showGoogleAuthModal();
        },

        // ==========================================
        // 1. CAPÍTULOS Y TEMA
        // ==========================================
        async getActiveChapter() {
            return localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAPTER)
                || localStorage.getItem('activeChapter')
                || '1';
        },

        async setActiveChapter(chapterId) {
            const id = String(chapterId);
            localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAPTER, id);
            localStorage.setItem('activeChapter', id);
            document.documentElement.setAttribute('data-chapter', id);

            // Actualizar también en caché local del usuario
            const cachedUid = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
            if (cachedUid) {
                const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
                if (users[cachedUid]) {
                    users[cachedUid].activeChapter = id;
                    setStoredJSON(STORAGE_KEYS.USERS, users);
                }
            }

            // Sincronizar con Cloud Firestore en segundo plano
            initFirebase().then(async () => {
                if (currentAuthUser && fbDb && fsModRef) {
                    try {
                        const userRef = fsModRef.doc(fbDb, 'users', currentAuthUser.uid);
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

            // Debounce / sincronizar en segundo plano con el documento del usuario en Cloud Firestore
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
                likesCount: 1200
            };

            const currentUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)
                || (currentAuthUser && currentAuthUser.uid)
                || DEFAULT_CURRENT_USER_ID;

            const hasLiked = Array.isArray(ch.likes) && ch.likes.includes(currentUserId);

            // Sincronizar en segundo plano con Firestore
            initFirebase().then(() => syncChaptersFromFirestoreInBackground());

            return {
                id: ch.id,
                likesCount: typeof ch.likesCount === 'number' ? ch.likesCount : 1200,
                hasLiked,
                likes: Array.isArray(ch.likes) ? ch.likes : []
            };
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
                        likesCount: 1200
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

            // Sincronizar globalmente con Cloud Firestore
            initFirebase().then(async () => {
                if (fbDb && fsModRef) {
                    try {
                        await fsModRef.setDoc(fsModRef.doc(fbDb, 'chapters', chapterId), {
                            id: ch.id,
                            title: ch.title || 'Capítulo 1: A la deriva',
                            likes: ch.likes,
                            likesCount: ch.likesCount
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

            // FAST-PATH (0ms): Si el usuario ya está en caché local, devolverlo de inmediato
            // y disparar actualización silenciosa desde Firestore en segundo plano
            if (users[targetId]) {
                initFirebase().then(async () => {
                    if (fbDb && fsModRef) {
                        try {
                            const snap = await fsModRef.getDoc(fsModRef.doc(fbDb, 'users', targetId));
                            if (snap.exists()) {
                                const cloudData = snap.data();
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

            // Si es un usuario nuevo que no estaba en caché local, consultarlo en Firestore
            await initFirebase();
            if (fbDb && fsModRef) {
                try {
                    const userRef = fsModRef.doc(fbDb, 'users', targetId);
                    const snap = await fsModRef.getDoc(userRef);
                    if (snap.exists()) {
                        const data = snap.data();
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

            const updatedProfile = { ...currentProfile, ...updates };
            cacheUserProfileLocally(updatedProfile);

            // Actualizar inmediatamente también el caché local de posts
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

            // Sincronizar con Firestore
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

            // Disparar sincronización en segundo plano sin bloquear el renderizado (0ms)
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
                authorAvatar: user.avatar || DEFAULT_AVATAR,
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
                authorAvatar: user.avatar || DEFAULT_AVATAR,
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
