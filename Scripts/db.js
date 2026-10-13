/**
 * Overflow Database Service (db.js)
 * Capa de abstracción de datos para Digital Reader Overflow.
 * Actualmente implementada sobre LocalStorage con API asíncrona (Promises),
 * diseñada para una transición directa e indolora a Firebase Firestore / Auth.
 */

(function (window) {
    const STORAGE_KEYS = {
        ACTIVE_CHAPTER: 'overflow_active_chapter',
        CURRENT_USER_ID: 'overflow_current_user_id',
        USERS: 'overflow_users',
        POSTS: 'overflow_posts'
    };

    // --- DATOS SEMILLA (SEED DATA) ---
    const DEFAULT_CURRENT_USER_ID = 'user_mclovin';

    const SEED_USERS = {
        'user_mclovin': {
            id: 'user_mclovin',
            username: 'Maclovinsito_123',
            nombres: 'Jhon',
            apellidos: 'McLovin',
            email: 'McLovin123@gmail.com',
            password: '••••••••',
            bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
            avatar: 'Images/Maclovin.png',
            banner: 'Images/MaclovinMaGrande.png',
            notificationsEnabled: true,
            followersCount: 322,
            followingCount: 540,
            following: [], // IDs de usuarios seguidos
            reposts: []    // IDs de posts reposteados
        },
        'user_other': {
            id: 'user_other',
            username: 'Usuario 1',
            nombres: 'Carlos',
            apellidos: 'Lector',
            email: 'carlos@overflow.com',
            password: '••••••••',
            bio: 'Fanático del cómic Overflow y coleccionista de viñetas.',
            avatar: 'Images/Maclovin.png',
            banner: 'Images/MaclovinMaGrande.png',
            notificationsEnabled: false,
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
            authorAvatar: 'Images/Maclovin.png',
            createdAt: Date.now() - (10 * 60 * 60 * 1000), // Hace 10 horas
            content: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod. Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod.',
            media: null,
            likes: ['user_other'],
            dislikes: [],
            reposts: [],
            comments: [
                {
                    id: 'c_1',
                    authorId: 'user_mclovin',
                    authorUsername: 'Maclovinsito_123',
                    authorAvatar: 'Images/Maclovin.png',
                    text: '¡Totalmente de acuerdo con esta teoría del capítulo!',
                    createdAt: Date.now() - (8 * 60 * 60 * 1000)
                }
            ]
        },
        {
            id: 'post_1002',
            authorId: 'user_mclovin',
            authorUsername: 'Maclovinsito_123',
            authorAvatar: 'Images/Maclovin.png',
            createdAt: Date.now() - (2 * 60 * 60 * 1000), // Hace 2 horas
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

    // Helper interno para inicializar almacenamiento si está vacío
    function initStorage() {
        if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAPTER)) {
            // Revisa si había algo guardado con 'activeChapter' previo
            const oldChapter = localStorage.getItem('activeChapter') || '1';
            localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAPTER, oldChapter);
        }
        if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)) {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, DEFAULT_CURRENT_USER_ID);
        }
        if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.POSTS)) {
            localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(SEED_POSTS));
        }
    }

    initStorage();

    // Helpers internos de lectura y escritura síncrona segura
    function getStoredJSON(key, defaultVal) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : defaultVal;
        } catch (e) {
            console.error('[DB Error reading]', key, e);
            return defaultVal;
        }
    }

    function setStoredJSON(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {
            console.error('[DB Error saving]', key, e);
        }
    }

    // --- REPOSITORIO DB PÚBLICO ---
    const DB = {
        // ==========================================
        // 1. CAPÍTULOS Y TEMA
        // ==========================================
        async getActiveChapter() {
            return localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAPTER) || '1';
        },

        async setActiveChapter(chapterId) {
            const id = String(chapterId);
            localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAPTER, id);
            localStorage.setItem('activeChapter', id); // compatibilidad retroactiva
            document.documentElement.setAttribute('data-chapter', id);
        },

        // ==========================================
        // 2. USUARIOS Y PERFILES
        // ==========================================
        async getCurrentUserId() {
            return localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || DEFAULT_CURRENT_USER_ID;
        },

        async getProfile(userId = null) {
            const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
            const targetId = userId || (await this.getCurrentUserId());
            return users[targetId] || users[DEFAULT_CURRENT_USER_ID];
        },

        async updateProfile(updates, userId = null) {
            const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
            const targetId = userId || (await this.getCurrentUserId());
            if (!users[targetId]) return null;

            users[targetId] = { ...users[targetId], ...updates };
            setStoredJSON(STORAGE_KEYS.USERS, users);

            // Si se actualizó username o avatar, actualizar también en los posts del autor
            if (updates.username || updates.avatar) {
                const posts = getStoredJSON(STORAGE_KEYS.POSTS, SEED_POSTS);
                let changed = false;
                posts.forEach(p => {
                    if (p.authorId === targetId) {
                        if (updates.username) p.authorUsername = updates.username;
                        if (updates.avatar) p.authorAvatar = updates.avatar;
                        changed = true;
                    }
                });
                if (changed) setStoredJSON(STORAGE_KEYS.POSTS, posts);
            }

            return users[targetId];
        },

        async toggleFollow(targetUserId) {
            const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
            const currentUserId = await this.getCurrentUserId();
            const currentUser = users[currentUserId];
            const targetUser = users[targetUserId];

            if (!currentUser || !targetUser || currentUserId === targetUserId) {
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

            setStoredJSON(STORAGE_KEYS.USERS, users);
            return {
                isFollowing: !isFollowing,
                targetFollowers: targetUser.followersCount,
                currentFollowing: currentUser.followingCount
            };
        },

        // ==========================================
        // 3. PUBLICACIONES (POSTS)
        // ==========================================
        async getPosts(filterAuthorId = null) {
            const posts = getStoredJSON(STORAGE_KEYS.POSTS, SEED_POSTS);
            if (filterAuthorId) {
                return posts.filter(p => p.authorId === filterAuthorId);
            }
            return posts;
        },

        async getRepostsByUser(userId) {
            const user = await this.getProfile(userId);
            if (!user || !Array.isArray(user.reposts)) return [];
            const posts = getStoredJSON(STORAGE_KEYS.POSTS, SEED_POSTS);
            return posts.filter(p => user.reposts.includes(p.id));
        },

        async createPost({ content, media = null }) {
            const user = await this.getProfile();
            const posts = getStoredJSON(STORAGE_KEYS.POSTS, SEED_POSTS);

            const newPost = {
                id: 'post_' + Date.now(),
                authorId: user.id,
                authorUsername: user.username,
                authorAvatar: user.avatar,
                createdAt: Date.now(),
                content: content || '',
                media: media || null, // { type: 'image' | 'gif', url: string }
                likes: [],
                dislikes: [],
                reposts: [],
                comments: []
            };

            posts.unshift(newPost);
            setStoredJSON(STORAGE_KEYS.POSTS, posts);
            return newPost;
        },

        async toggleLike(postId) {
            const posts = getStoredJSON(STORAGE_KEYS.POSTS, SEED_POSTS);
            const currentUserId = await this.getCurrentUserId();
            const post = posts.find(p => p.id === postId);
            if (!post) return null;

            if (!Array.isArray(post.likes)) post.likes = [];
            if (!Array.isArray(post.dislikes)) post.dislikes = [];

            const isLiked = post.likes.includes(currentUserId);
            if (isLiked) {
                post.likes = post.likes.filter(id => id !== currentUserId);
            } else {
                post.likes.push(currentUserId);
                // Like y Dislike son mutuamente excluyentes
                post.dislikes = post.dislikes.filter(id => id !== currentUserId);
            }

            setStoredJSON(STORAGE_KEYS.POSTS, posts);
            return {
                likesCount: post.likes.length,
                dislikesCount: post.dislikes.length,
                hasLiked: !isLiked,
                hasDisliked: false
            };
        },

        async toggleDislike(postId) {
            const posts = getStoredJSON(STORAGE_KEYS.POSTS, SEED_POSTS);
            const currentUserId = await this.getCurrentUserId();
            const post = posts.find(p => p.id === postId);
            if (!post) return null;

            if (!Array.isArray(post.likes)) post.likes = [];
            if (!Array.isArray(post.dislikes)) post.dislikes = [];

            const isDisliked = post.dislikes.includes(currentUserId);
            if (isDisliked) {
                post.dislikes = post.dislikes.filter(id => id !== currentUserId);
            } else {
                post.dislikes.push(currentUserId);
                // Mutuamente excluyentes
                post.likes = post.likes.filter(id => id !== currentUserId);
            }

            setStoredJSON(STORAGE_KEYS.POSTS, posts);
            return {
                likesCount: post.likes.length,
                dislikesCount: post.dislikes.length,
                hasLiked: false,
                hasDisliked: !isDisliked
            };
        },

        async toggleRepost(postId) {
            const posts = getStoredJSON(STORAGE_KEYS.POSTS, SEED_POSTS);
            const users = getStoredJSON(STORAGE_KEYS.USERS, SEED_USERS);
            const currentUserId = await this.getCurrentUserId();
            const post = posts.find(p => p.id === postId);
            const user = users[currentUserId];
            if (!post || !user) return null;

            if (!Array.isArray(post.reposts)) post.reposts = [];
            if (!Array.isArray(user.reposts)) user.reposts = [];

            const hasReposted = post.reposts.includes(currentUserId);
            if (hasReposted) {
                post.reposts = post.reposts.filter(id => id !== currentUserId);
                user.reposts = user.reposts.filter(id => id !== postId);
            } else {
                post.reposts.push(currentUserId);
                user.reposts.push(postId);
            }

            setStoredJSON(STORAGE_KEYS.POSTS, posts);
            setStoredJSON(STORAGE_KEYS.USERS, users);
            return {
                repostsCount: post.reposts.length,
                hasReposted: !hasReposted
            };
        },

        async addComment(postId, commentText) {
            if (!commentText || !commentText.trim()) return null;
            const posts = getStoredJSON(STORAGE_KEYS.POSTS, SEED_POSTS);
            const user = await this.getProfile();
            const post = posts.find(p => p.id === postId);
            if (!post) return null;

            if (!Array.isArray(post.comments)) post.comments = [];

            const newComment = {
                id: 'comment_' + Date.now(),
                authorId: user.id,
                authorUsername: user.username,
                authorAvatar: user.avatar,
                text: commentText.trim(),
                createdAt: Date.now()
            };

            post.comments.push(newComment);
            setStoredJSON(STORAGE_KEYS.POSTS, posts);
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

        // Compresión de imagen para mantener LocalStorage dentro del límite
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
