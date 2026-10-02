document.addEventListener('DOMContentLoaded', () => {
    const btnPosts = document.querySelector('.posts');
    const btnReposts = document.querySelector('.reposts');
    const activePill = document.querySelector('.active-pill');

    // Validamos que los elementos existan antes de ejecutar el código
    if (!btnPosts || !btnReposts || !activePill) return;

    btnPosts.addEventListener('click', () => {
        // Regresa la pastilla a su posición original a la izquierda
        activePill.style.transform = 'translateX(0%)';
        
        // Ilumina el texto de Posts y apaga el de Reposts
        btnPosts.classList.add('active');
        btnReposts.classList.remove('active');
    });

    btnReposts.addEventListener('click', () => {
        // Desliza la pastilla a la derecha exactamente el equivalente a su propio ancho
        activePill.style.transform = 'translateX(100%)';
        
        // Ilumina el texto de Reposts y apaga el de Posts
        btnReposts.classList.add('active');
        btnPosts.classList.remove('active');
    });
});