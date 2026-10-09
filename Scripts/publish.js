document.addEventListener("DOMContentLoaded", () => {
    // --- 1. REFERENCIAS A LOS ELEMENTOS ---
    const btnAbrir = document.querySelector('[aria-label="Crear nueva publicación"]'); 
    const btnCerrar = document.getElementById('overlay-publish'); // Botón de cancelar/cerrar
    const overlay = document.getElementById('publish-overlay');
    const textareaInput = document.getElementById('post-input');

    // Validación por si el script corre en otra página donde no exista el overlay
    if (!btnAbrir || !overlay || !textareaInput) return;

    // --- 2. ACCIÓN DE ABRIR EL OVERLAY ---
    btnAbrir.addEventListener('click', () => {
        overlay.classList.add('active');
        
        // Bloqueamos el scroll de la página de fondo
        document.body.style.overflow = 'hidden'; 
        
        // Foco inmediato para desplegar el teclado en celulares
        textareaInput.focus();
    });

    // --- 3. ACCIÓN DE CERRAR EL OVERLAY ---
    btnCerrar.addEventListener('click', () => {
        overlay.classList.remove('active');
        
        // Devolvemos el scroll a la normalidad
        document.body.style.overflow = ''; 
        
        // Quitamos el foco para forzar que el teclado se oculte
        textareaInput.blur();
        
        // Reseteamos el texto y el tamaño de la caja para la próxima publicación
        textareaInput.value = '';
        textareaInput.style.height = 'auto';
    });

    // --- 4. AUTO-CRECIMIENTO DEL ÁREA DE TEXTO ---
    textareaInput.addEventListener('input', function() {
        // 1. Reseteamos la altura a 'auto' para que pueda encogerse si el usuario borra líneas
        this.style.height = 'auto'; 
        
        // 2. Le asignamos la altura física real que ocupa todo el texto ingresado
        this.style.height = this.scrollHeight + 'px'; 
    });
});