/**
 * Overflow Other Profile Viewer & Following System (otherprofile.js)
 * Conectado con Scripts/db.js (LocalStorage desacoplado listo para Firebase).
 */

document.addEventListener('DOMContentLoaded', async () => {
    // --- 0. BOTÓN VOLVER ---
    const btnVolver = document.getElementById('overlay-publish');
    if (btnVolver) {
        btnVolver.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = 'community.html';
            }
        });
    }

    if (!window.DB) return;

    // --- 1. REFERENCIAS DE ELEMENTOS Y UID DINÁMICO ---
    const urlParams = new URLSearchParams(window.location.search);
    const TARGET_USER_ID = urlParams.get('uid') || 'user_other';
    const otherAvatar = document.getElementById('other-avatar');
    const otherBanner = document.getElementById('other-banner');
    const otherUsername = document.getElementById('other-username');
    const otherBio = document.getElementById('other-bio');
    const followersCountElem = document.getElementById('other-followers-count');
    const followingCountElem = document.getElementById('other-following-count');
    const btnToggleFollow = document.getElementById('btn-toggle-follow');
    const followLabel = document.getElementById('follow-label');
    const feedContainer = document.getElementById('profile-feed-container');

    // Tabs
    const btnPosts = document.getElementById('tab-posts');
    const btnReposts = document.getElementById('tab-reposts');
    const activePill = document.querySelector('.active-pill');

    // Comments Modal
    const commentsBackdrop = document.getElementById('comments-backdrop');
    const commentsList = document.getElementById('comments-list');
    const btnCloseComments = document.getElementById('btn-close-comments');
    const commentInput = document.getElementById('comment-input');
    const btnSendComment = document.getElementById('btn-send-comment');

    let currentTab = 'posts';
    let activeCommentPostId = null;

    // --- 2. CARGAR PERFIL DE USUARIO VISITADO DESDE FIRESTORE ---
    async function loadTargetProfile() {
        const currentUser = await window.DB.requireAuth();
        if (currentUser && currentUser.id === TARGET_USER_ID) {
            window.location.href = 'myprofile.html';
            return;
        }
        const targetUser = await window.DB.getProfile(TARGET_USER_ID);

        if (targetUser) {
            if (otherAvatar && targetUser.avatar) {
                otherAvatar.referrerPolicy = 'no-referrer';
                otherAvatar.src = targetUser.avatar;
            }
            if (otherBanner && targetUser.banner) otherBanner.src = targetUser.banner;
            if (otherUsername) otherUsername.textContent = targetUser.username;
            if (otherBio) otherBio.textContent = targetUser.bio || '';
            if (followersCountElem) followersCountElem.textContent = targetUser.followersCount || 0;
            if (followingCountElem) followingCountElem.textContent = targetUser.followingCount || 0;
        }

        // Estado inicial de "Seguir"
        if (currentUser && btnToggleFollow && followLabel) {
            const isFollowing = Array.isArray(currentUser.following) && currentUser.following.includes(TARGET_USER_ID);
            updateFollowButtonUI(isFollowing);
        }
    }

    function updateFollowButtonUI(isFollowing) {
        if (!btnToggleFollow || !followLabel) return;
        if (isFollowing) {
            btnToggleFollow.classList.add('active-following');
            followLabel.textContent = 'Siguiendo';
        } else {
            btnToggleFollow.classList.remove('active-following');
            followLabel.textContent = 'Seguir';
        }
    }

    // --- 3. ACCIÓN DE SEGUIR / DEJAR DE SEGUIR ---
    if (btnToggleFollow) {
        btnToggleFollow.addEventListener('click', async () => {
            const res = await window.DB.toggleFollow(TARGET_USER_ID);
            if (!res) return;

            updateFollowButtonUI(res.isFollowing);
            if (followersCountElem) {
                followersCountElem.textContent = res.targetFollowers;
            }
        });
    }

    // --- 4. TABS (POSTS VS REPOSTS) ---
    if (btnPosts && btnReposts && activePill) {
        btnPosts.addEventListener('click', async () => {
            if (currentTab === 'posts') return;
            currentTab = 'posts';
            activePill.style.transform = 'translateX(0%)';
            btnPosts.classList.add('active');
            btnReposts.classList.remove('active');
            await renderProfileFeed();
        });

        btnReposts.addEventListener('click', async () => {
            if (currentTab === 'reposts') return;
            currentTab = 'reposts';
            activePill.style.transform = 'translateX(100%)';
            btnReposts.classList.add('active');
            btnPosts.classList.remove('active');
            await renderProfileFeed();
        });
    }

    // --- 5. RENDERIZADO DEL FEED ---
    const SVG_LIKE = `<svg class="interaction-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.30643 7.04996L7.15158 0.75C7.71751 0.75 8.26027 0.971248 8.66044 1.36507C9.06062 1.7589 9.28544 2.29304 9.28544 2.84999V5.64997H13.3113C13.5175 5.64767 13.7218 5.68952 13.9099 5.77262C14.0981 5.85572 14.2656 5.97808 14.4009 6.13123C14.5362 6.28437 14.6361 6.46464 14.6936 6.65954C14.7511 6.85444 14.7648 7.05931 14.7339 7.25996L13.7523 13.5599C13.7009 13.8937 13.5286 14.198 13.2672 14.4167C13.0057 14.6354 12.6728 14.7537 12.3297 14.7499H4.30643M4.30643 7.04996V14.7499M4.30643 7.04996H2.17257C1.79528 7.04996 1.43345 7.19746 1.16666 7.46001C0.899878 7.72256 0.75 8.07865 0.75 8.44995V13.3499C0.75 13.7212 0.899878 14.0773 1.16666 14.3399C1.43345 14.6024 1.79528 14.7499 2.17257 14.7499H4.30643" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    const SVG_DISLIKE = `<svg class="interaction-icon" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.70163 7.3501L7.26293 12.75C6.77785 12.75 6.31263 12.5604 5.96962 12.2228C5.62661 11.8852 5.43391 11.4274 5.43391 10.95V8.55008H1.98316C1.80641 8.55205 1.63134 8.51617 1.47007 8.44495C1.30881 8.37372 1.16521 8.26884 1.04922 8.13757C0.933235 8.00631 0.847635 7.8518 0.798352 7.68474C0.749069 7.51769 0.737282 7.34208 0.763808 7.1701L1.60516 1.7702C1.64925 1.48406 1.79694 1.22324 2.02101 1.03581C2.24509 0.848372 2.53044 0.746945 2.82451 0.750217H9.70163M9.70163 7.3501V0.750217M9.70163 7.3501H11.3295C11.6745 7.3561 12.0098 7.23722 12.2717 7.01601C12.5335 6.79481 12.7037 6.48668 12.75 6.15012V1.9502C12.7037 1.61364 12.5335 1.30551 12.2717 1.0843C12.0098 0.863096 11.6745 0.744212 11.3295 0.750217H9.70163" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    const SVG_COMMENT = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 17 17" fill="none">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M10.4374 8.5574C10.4374 8.1464 10.7706 7.81321 11.1816 7.81321H11.1883C11.5993 7.81321 11.9325 8.1464 11.9325 8.5574C11.9325 8.96841 11.5993 9.30159 11.1883 9.30159H11.1816C10.7706 9.30159 10.4374 8.96841 10.4374 8.5574Z" fill="currentColor"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M7.45396 8.5574C7.45396 8.1464 7.78715 7.81321 8.19815 7.81321H8.20485C8.61586 7.81321 8.94904 8.1464 8.94904 8.5574C8.94904 8.96841 8.61586 9.30159 8.20485 9.30159H8.19815C7.78715 9.30159 7.45396 8.96841 7.45396 8.5574Z" fill="currentColor"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M4.4705 8.5574C4.4705 8.1464 4.80369 7.81321 5.21469 7.81321H5.22139C5.6324 7.81321 5.96558 8.1464 5.96558 8.5574C5.96558 8.96841 5.6324 9.30159 5.22139 9.30159H5.21469C4.80369 9.30159 4.4705 8.96841 4.4705 8.5574Z" fill="currentColor"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M13.1174 3.38105C10.4321 0.694698 6.06872 0.694698 3.38342 3.38105C1.28042 5.48365 0.823599 8.6005 2.00393 11.1512C2.00789 11.1598 2.01164 11.1684 2.01516 11.1772C2.08375 11.3476 2.08221 11.5407 2.07912 11.65C2.07525 11.7871 2.06008 11.9451 2.04135 12.1059C2.02364 12.2578 2.00116 12.4253 1.9783 12.5955L1.97355 12.6308C1.94879 12.8153 1.92358 13.0046 1.90158 13.1942C1.85696 13.5788 1.82894 13.9379 1.84141 14.2252C1.84762 14.3683 1.86327 14.4744 1.88325 14.5471C1.88999 14.5716 1.89615 14.5884 1.9007 14.5993C1.91157 14.6039 1.92843 14.61 1.95293 14.6167C2.02566 14.6367 2.13176 14.6523 2.27491 14.6585C2.5622 14.671 2.9213 14.643 3.30581 14.5984C3.4954 14.5764 3.68471 14.5512 3.86913 14.5265L3.90428 14.5218C4.07454 14.4989 4.24204 14.4765 4.39407 14.4588C4.55479 14.4401 4.71279 14.4249 4.84992 14.4211C4.95915 14.418 5.15225 14.4165 5.32262 14.4851C5.33132 14.4886 5.33993 14.4923 5.34844 14.4963C7.89966 15.6761 11.0152 15.22 13.1174 13.1168C15.8031 10.4308 15.8084 6.07167 13.1174 3.38105Z" fill="currentColor"/>
    </svg>`;

    const SVG_REPOST = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="16" viewBox="0 0 24 20" fill="none">
        <path d="M16.4992 6.22687V4.04399H7.50076C6.47983 4.04389 5.47576 4.30248 4.58361 4.79528C3.69145 5.28808 2.94074 5.99878 2.40252 6.86011C1.8643 7.72144 1.5564 8.70489 1.50795 9.71737C1.45951 10.7298 1.67212 11.7379 2.12567 12.646C2.16959 12.7336 2.1957 12.8289 2.20251 12.9265C2.20933 13.0241 2.1967 13.1221 2.16537 13.2149C2.13403 13.3077 2.0846 13.3934 2.01989 13.4672C1.95518 13.541 1.87646 13.6015 1.78823 13.6451C1.7 13.6887 1.60398 13.7146 1.50565 13.7214C1.40733 13.7281 1.30862 13.7156 1.21518 13.6845C1.12173 13.6534 1.03537 13.6043 0.96103 13.5401C0.886688 13.4758 0.825819 13.3977 0.7819 13.3101C0.214356 12.1748 -0.0518964 10.9145 0.00836005 9.64857C0.0686165 8.3826 0.453387 7.15286 1.12623 6.07583C1.79907 4.99879 2.7377 4.11012 3.85323 3.49398C4.96875 2.87785 6.22424 2.55465 7.50076 2.55499H16.4992V0.372111C16.4993 0.301378 16.5196 0.232117 16.5578 0.172438C16.5961 0.112758 16.6506 0.0651314 16.7152 0.035134C16.7797 0.00513655 16.8515 -0.00598964 16.9221 0.0030583C16.9928 0.0121062 17.0594 0.0409538 17.1141 0.0862228L20.6535 3.0136C20.8335 3.1625 20.8335 3.43648 20.6535 3.58538L17.1141 6.51276C17.0594 6.55803 16.9928 6.58687 16.9221 6.59592C16.8515 6.60497 16.7797 6.59384 16.7152 6.56385C16.6506 6.53385 16.5961 6.48622 16.5578 6.42654C16.5196 6.36686 16.4993 6.2976 16.4992 6.22687ZM22.2133 6.35492C22.3913 6.26715 22.5971 6.25314 22.7855 6.31596C22.9739 6.37878 23.1295 6.51329 23.2181 6.68995C23.7856 7.82518 24.0519 9.08546 23.9916 10.3514C23.9314 11.6174 23.5466 12.8471 22.8738 13.9242C22.2009 15.0012 21.2623 15.8899 20.1468 16.506C19.0312 17.1222 17.7758 17.4454 16.4992 17.445H7.50076V19.6279C7.50074 19.6986 7.48041 19.7679 7.44217 19.8276C7.40393 19.8872 7.34935 19.9349 7.28483 19.9649C7.22031 19.9949 7.14852 20.006 7.07787 19.9969C7.00721 19.9879 6.94061 19.959 6.88587 19.9138L3.34647 16.9864C3.30427 16.9515 3.27032 16.9077 3.24703 16.8583C3.22373 16.8089 3.21166 16.7551 3.21166 16.7005C3.21166 16.646 3.22373 16.5921 3.24703 16.5427C3.27032 16.4933 3.30427 16.4496 3.34647 16.4146L6.88587 13.4872C6.94061 13.442 7.00721 13.4131 7.07787 13.4041C7.14852 13.395 7.22031 13.4062 7.28483 13.4362C7.34935 13.4662 7.40393 13.5138 7.44217 13.5735C7.48041 13.6331 7.50074 13.7024 7.50076 13.7731V15.956H16.4992C17.5203 15.9564 18.5246 15.698 19.4169 15.2053C20.3093 14.7126 21.0602 14.0019 21.5986 13.1405C22.137 12.2792 22.445 11.2956 22.4935 10.283C22.542 9.2704 22.3294 8.26226 21.8758 7.35404C21.7874 7.17731 21.7733 6.97295 21.8366 6.78589C21.8999 6.59882 22.0353 6.44286 22.2133 6.35492Z" fill="currentColor"/>
    </svg>`;

    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async function renderProfileFeed() {
        if (!feedContainer) return;
        const currentUserId = await window.DB.getCurrentUserId();

        let posts = [];
        if (currentTab === 'posts') {
            posts = await window.DB.getPosts(TARGET_USER_ID);
        } else {
            posts = await window.DB.getRepostsByUser(TARGET_USER_ID);
        }

        if (posts.length === 0) {
            const emptyMsg = currentTab === 'posts' 
                ? 'Este usuario no tiene publicaciones aún.' 
                : 'Este usuario no tiene reposts aún.';
            feedContainer.innerHTML = `
                <div style="text-align: center; padding: 2.5rem 1rem; color: var(--on-surface);">
                    <p>${emptyMsg}</p>
                </div>
            `;
            return;
        }

        feedContainer.innerHTML = posts.map(post => {
            const hasLiked = Array.isArray(post.likes) && post.likes.includes(currentUserId);
            const hasDisliked = Array.isArray(post.dislikes) && post.dislikes.includes(currentUserId);
            const hasReposted = Array.isArray(post.reposts) && post.reposts.includes(currentUserId);
            const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
            const dislikesCount = Array.isArray(post.dislikes) ? post.dislikes.length : 0;
            const commentsCount = Array.isArray(post.comments) ? post.comments.length : 0;
            const repostsCount = Array.isArray(post.reposts) ? post.reposts.length : 0;
            const timeStr = window.DB.timeAgo(post.createdAt);

            let mediaHtml = '';
            if (post.media && post.media.url) {
                mediaHtml = `
                    <div class="post-media-box">
                        <img class="post-image-attachment" src="${post.media.url}" alt="Adjunto de publicación">
                    </div>
                `;
            }

            return `
                <article class="community-card-cta-container post-card" data-post-id="${post.id}">
                    <div class="community-card-cta-header">
                        <img class="community-card-profile-icon" src="${post.authorAvatar || 'Images/default-avatar.svg'}" alt="${post.authorUsername}" referrerpolicy="no-referrer" style="border-radius: 50%; object-fit: cover;">
                        <span class="post-username-text" style="font-weight: bold;">${post.authorUsername}</span>
                        <div class="dot"></div>
                        <span class="post-time-text">${timeStr}</span>
                    </div>
                    <div class="post-text-body">
                        <p>${escapeHTML(post.content)}</p>
                    </div>
                    ${mediaHtml}
                    <div class="community-card-interactions">
                        <button type="button" class="interaction-icon-container btn-like ${hasLiked ? 'active-like' : ''}" data-post-id="${post.id}" aria-label="Me gusta">
                            ${SVG_LIKE}
                            <span class="count-like">${likesCount}</span>
                        </button>
                        <button type="button" class="interaction-icon-container btn-dislike ${hasDisliked ? 'active-dislike' : ''}" data-post-id="${post.id}" aria-label="No me gusta">
                            ${SVG_DISLIKE}
                            <span class="count-dislike">${dislikesCount}</span>
                        </button>
                        <button type="button" class="interaction-icon-container btn-comment" data-post-id="${post.id}" aria-label="Comentarios">
                            ${SVG_COMMENT}
                            <span class="count-comment">${commentsCount}</span>
                        </button>
                        <button type="button" class="interaction-icon-container btn-repost ${hasReposted ? 'active-repost' : ''}" data-post-id="${post.id}" aria-label="Repostear">
                            ${SVG_REPOST}
                            <span class="count-repost">${repostsCount}</span>
                        </button>
                    </div>
                </article>
            `;
        }).join('');

        attachPostListeners();
        if (window.Motion) {
            window.Motion.animateFeedEntrance(feedContainer);
        }
    }

    function attachPostListeners() {
        if (!feedContainer) return;

        // Likes
        feedContainer.querySelectorAll('.btn-like').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const postId = btn.getAttribute('data-post-id');
                const res = await window.DB.toggleLike(postId);
                if (!res) return;

                const card = btn.closest('.post-card');
                btn.querySelector('.count-like').textContent = res.likesCount;
                btn.classList.toggle('active-like', res.hasLiked);

                if (res.hasLiked && window.Motion) {
                    window.Motion.popLike(btn);
                }

                const dislikeBtn = card.querySelector('.btn-dislike');
                if (dislikeBtn) {
                    dislikeBtn.querySelector('.count-dislike').textContent = res.dislikesCount;
                    dislikeBtn.classList.remove('active-dislike');
                }
            });
        });

        // Dislikes
        feedContainer.querySelectorAll('.btn-dislike').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const postId = btn.getAttribute('data-post-id');
                const res = await window.DB.toggleDislike(postId);
                if (!res) return;

                const card = btn.closest('.post-card');
                btn.querySelector('.count-dislike').textContent = res.dislikesCount;
                btn.classList.toggle('active-dislike', res.hasDisliked);

                if (res.hasDisliked && window.Motion) {
                    window.Motion.tiltDislike(btn);
                }

                const likeBtn = card.querySelector('.btn-like');
                if (likeBtn) {
                    likeBtn.querySelector('.count-like').textContent = res.likesCount;
                    likeBtn.classList.remove('active-like');
                }
            });
        });

        // Reposts
        feedContainer.querySelectorAll('.btn-repost').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const postId = btn.getAttribute('data-post-id');
                const res = await window.DB.toggleRepost(postId);
                if (!res) return;

                btn.querySelector('.count-repost').textContent = res.repostsCount;
                btn.classList.toggle('active-repost', res.hasReposted);

                if (res.hasReposted && window.Motion) {
                    window.Motion.spinRepost(btn);
                }
            });
        });

        // Comentarios
        feedContainer.querySelectorAll('.btn-comment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.Motion) {
                    window.Motion.popComment(btn);
                }
                const postId = btn.getAttribute('data-post-id');
                openCommentsModal(postId);
            });
        });
    }

    // --- 6. MODAL DE COMENTARIOS ---
    async function openCommentsModal(postId) {
        if (!commentsBackdrop) return;
        activeCommentPostId = postId;

        const posts = await window.DB.getPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        renderCommentsList(post.comments || []);
        commentsBackdrop.classList.add('active');
        if (commentInput) {
            commentInput.value = '';
            setTimeout(() => commentInput.focus(), 100);
        }
    }

    function renderCommentsList(comments) {
        if (!commentsList) return;
        if (!comments || comments.length === 0) {
            commentsList.innerHTML = `
                <div class="empty-comments-box">
                    <p>Aún no hay comentarios. ¡Sé el primero!</p>
                </div>
            `;
            return;
        }

        commentsList.innerHTML = comments.map(c => `
            <div class="comment-item">
                <img class="comment-avatar" src="${c.authorAvatar || 'Images/default-avatar.svg'}" alt="${c.authorUsername}" referrerpolicy="no-referrer">
                <div class="comment-content-box">
                    <div class="comment-author-row">
                        <span class="comment-author-name">${c.authorUsername}</span>
                        <span class="comment-time">${window.DB.timeAgo(c.createdAt)}</span>
                    </div>
                    <p class="comment-text">${escapeHTML(c.text)}</p>
                </div>
            </div>
        `).join('');

        commentsList.scrollTop = commentsList.scrollHeight;
    }

    function closeCommentsModal() {
        if (commentsBackdrop) {
            commentsBackdrop.classList.remove('active');
            activeCommentPostId = null;
            if (commentInput) commentInput.value = '';
        }
    }

    if (btnCloseComments) {
        btnCloseComments.addEventListener('click', closeCommentsModal);
    }

    if (commentsBackdrop) {
        commentsBackdrop.addEventListener('click', (e) => {
            if (e.target === commentsBackdrop) closeCommentsModal();
        });
    }

    async function submitComment() {
        if (!commentInput || !activeCommentPostId) return;
        const text = commentInput.value.trim();
        if (!text) return;

        const res = await window.DB.addComment(activeCommentPostId, text);
        if (res) {
            commentInput.value = '';
            const posts = await window.DB.getPosts();
            const post = posts.find(p => p.id === activeCommentPostId);
            if (post) renderCommentsList(post.comments || []);

            const card = document.querySelector(`.post-card[data-post-id="${activeCommentPostId}"]`);
            if (card) {
                const countElem = card.querySelector('.count-comment');
                if (countElem) countElem.textContent = res.commentsCount;
            }
        }
    }

    if (btnSendComment) {
        btnSendComment.addEventListener('click', submitComment);
    }

    if (commentInput) {
        commentInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitComment();
            } else if (e.key === 'Escape') {
                closeCommentsModal();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && commentsBackdrop && commentsBackdrop.classList.contains('active')) {
            closeCommentsModal();
        }
    });

    window.addEventListener('overflow:posts-synced', () => {
        renderProfileFeed();
    });

    // Carga inicial
    await loadTargetProfile();
    await renderProfileFeed();
});
