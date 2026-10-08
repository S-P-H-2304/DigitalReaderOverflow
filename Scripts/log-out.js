document.addEventListener("DOMContentLoaded", () => {
    const btnCerrarSesion = document.getElementById('settings-padding'); // Botón del footer
    const backdrop = document.getElementById('logout-backdrop'); // El fondo oscuro
    const btnCancelar = document.getElementById('btn-cancelar'); // Botón cancelar
    const btnConfirmar = document.getElementById('btn-confirmar-logout'); // Botón confirmar

    // 1. ABRIR EL POPUP
    btnCerrarSesion.addEventListener('click', () => {
        backdrop.classList.add('active');
    });

    // 2. CERRAR EL POPUP CON BOTÓN CANCELAR
    btnCancelar.addEventListener('click', () => {
        backdrop.classList.remove('active');
    });

    // 3. CERRAR EL POPUP HACIENDO CLIC AFUERA
    backdrop.addEventListener('click', (evento) => {
        // Si el clic fue exactamente en el fondo oscuro y NO dentro de la caja azul
        if (evento.target === backdrop) {
            backdrop.classList.remove('active');
        }
    });

    // 4. ACCIÓN DE CERRAR SESIÓN (Aquí iría tu lógica futura)
    btnConfirmar.addEventListener('click', () => {
        console.log("Sesión cerrada");
        // window.location.href = 'login.html'; // Ejemplo de redirección
    });
});