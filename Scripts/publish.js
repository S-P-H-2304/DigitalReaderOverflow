document.addEventListener("DOMContentLoaded", () => {
    // Referencias a tus botones
    const btnAbrir = document.querySelector('[aria-label="Crear nueva publicación"]'); //[cite: 3]
    const btnCerrar = document.getElementById('overlay-publish'); //[cite: 4]
    const overlay = document.getElementById('publish-overlay');

    // Acción de Abrir
    btnAbrir.addEventListener('click', () => {
        overlay.classList.add('active');
        
        // Bloqueamos el scroll del body para que la comunidad de atrás quede estática
        document.body.style.overflow = 'hidden'; 
    });

    // Acción de Cerrar
    btnCerrar.addEventListener('click', () => {
        overlay.classList.remove('active');
        
        // Devolvemos el scroll a la normalidad
        document.body.style.overflow = ''; 
    });
});