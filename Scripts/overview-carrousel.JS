document.addEventListener('DOMContentLoaded', () => {
    const indicadores = document.querySelectorAll('.carousel-indicator');
    const tarjetas = document.querySelectorAll('.chapter-slide');
    // Capturamos el contenedor principal donde el usuario pondrá el dedo
    const contenedorSlides = document.querySelector('.slides-container'); 

    if (indicadores.length === 0 || tarjetas.length === 0) return;

    let indiceActual = 0; // Para saber en qué tarjeta estamos
    let startX = 0; // Donde pone el dedo
    let endX = 0; // Donde levanta el dedo

    // --- 1. FUNCIÓN CENTRAL PARA CAMBIAR DE TARJETA ---
    function cambiarTarjeta(nuevoIndice) {
        // Evitamos que se salga de los límites (que no pase de la última o baje de la primera)
        if (nuevoIndice < 0) nuevoIndice = 0;
        if (nuevoIndice >= tarjetas.length) nuevoIndice = tarjetas.length - 1;

        indiceActual = nuevoIndice;

        // Apagamos todas
        tarjetas.forEach(tarjeta => tarjeta.classList.remove('active-slide'));
        indicadores.forEach(btn => {
            btn.classList.remove('active-carousel-indicator');
            btn.removeAttribute('aria-current');
        });

        // Encendemos la correcta
        tarjetas[indiceActual].classList.add('active-slide');
        indicadores[indiceActual].classList.add('active-carousel-indicator');
        indicadores[indiceActual].setAttribute('aria-current', 'true');
    }

    // --- 2. CLICS EN LOS INDICADORES (Por si alguien los toca) ---
    indicadores.forEach((indicador, index) => {
        indicador.addEventListener('click', () => {
            cambiarTarjeta(index);
        });
    });

    // --- 3. LÓGICA DE DESLIZAMIENTO TÁCTIL (SWIPE) ---
    // Cuando el usuario toca la pantalla
    contenedorSlides.addEventListener('touchstart', (e) => {
        startX = e.changedTouches[0].screenX;
    }, { passive: true });

    // Cuando el usuario suelta la pantalla
    contenedorSlides.addEventListener('touchend', (e) => {
        endX = e.changedTouches[0].screenX;
        manejarSwipe();
    }, { passive: true });

    // Calculamos si fue un toque por error o un deslizamiento real
    function manejarSwipe() {
        const umbral = 50; // Mínimo de píxeles que debe arrastrar para que cuente como swipe
        const distancia = startX - endX;

        if (distancia > umbral) {
            // Arrastró hacia la izquierda -> Siguiente tarjeta
            cambiarTarjeta(indiceActual + 1);
        } else if (distancia < -umbral) {
            // Arrastró hacia la derecha -> Tarjeta anterior
            cambiarTarjeta(indiceActual - 1);
        }
    }
});