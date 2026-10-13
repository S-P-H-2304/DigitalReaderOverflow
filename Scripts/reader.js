document.addEventListener('DOMContentLoaded', () => {
    // 1. Capturamos los elementos
    const visor = document.getElementById('visor');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');

    // Validación de seguridad
    if (!visor || !btnPrev || !btnNext) return;

    // Desplazamiento proporcional fluido (tira vertical)
    const getScrollStep = () => Math.round(window.innerHeight * 0.75);

    // 2. Acción para bajar en la tira
    btnNext.addEventListener('click', () => {
        visor.scrollBy({
            top: getScrollStep(),
            left: 0,
            behavior: 'smooth'
        });
    });

    // 3. Acción para subir en la tira
    btnPrev.addEventListener('click', () => {
        visor.scrollBy({
            top: -getScrollStep(),
            left: 0,
            behavior: 'smooth'
        });
    });

    // 4. Interacción con animación de Like en el lector
    const likeBtn = document.querySelector('#likes-interaction .reader-icons-interactions');
    if (likeBtn) {
        likeBtn.addEventListener('click', () => {
            likeBtn.classList.toggle('active-like');
            if (window.Motion) window.Motion.popLike(likeBtn);
        });
    }
});
