document.addEventListener('DOMContentLoaded', () => {
    // 1. Capturamos los elementos
    const visor = document.getElementById('visor');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');

    // Validación de seguridad
    if (!visor || !btnPrev || !btnNext) return;

    // 2. Acción para bajar de página
    btnNext.addEventListener('click', () => {
        visor.scrollBy({
            top: window.innerHeight, // Baja exactamente 1 pantalla de alto
            left: 0,
            behavior: 'smooth'       // Movimiento fluido y animado
        });
    });

    // 3. Acción para subir de página
    btnPrev.addEventListener('click', () => {
        visor.scrollBy({
            top: -window.innerHeight, // El número negativo lo hace subir 1 pantalla
            left: 0,
            behavior: 'smooth'
        });
    });
});