document.addEventListener("DOMContentLoaded", async () => {
    const btnVolver = document.getElementById('overlay-publish');
    const btnCerrarSesion = document.getElementById('settings-padding'); // Botón del footer
    const backdrop = document.getElementById('logout-backdrop'); // El fondo oscuro
    const btnCancelar = document.getElementById('btn-cancelar'); // Botón cancelar
    const btnConfirmar = document.getElementById('btn-confirmar-logout'); // Botón confirmar

    const userPic = document.getElementById('settings-user-pic');
    const userHeader = document.getElementById('settings-user-header');
    const notificationsToggle = document.getElementById('notifications-toggle');

    // 0. BOTÓN VOLVER ATRÁS
    if (btnVolver) {
        btnVolver.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    // 1. ABRIR EL POPUP DE CIERRE DE SESIÓN
    if (btnCerrarSesion && backdrop) {
        btnCerrarSesion.addEventListener('click', () => {
            backdrop.classList.add('active');
        });
    }

    // 2. CERRAR EL POPUP CON BOTÓN CANCELAR
    if (btnCancelar && backdrop) {
        btnCancelar.addEventListener('click', () => {
            backdrop.classList.remove('active');
        });
    }

    // 3. CERRAR EL POPUP HACIENDO CLIC AFUERA
    if (backdrop) {
        backdrop.addEventListener('click', (evento) => {
            if (evento.target === backdrop) {
                backdrop.classList.remove('active');
            }
        });
    }

    // 4. ACCIÓN DE CERRAR SESIÓN
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', () => {
            backdrop.classList.remove('active');
            // Redirigir a inicio
            window.location.href = 'index.html';
        });
    }

    // ==========================================
    // 5. POP-UP PARA EDITAR DATOS (NOMBRE, CORREO, CONTRASEÑA, ETC.)
    // ==========================================
    const editBackdrop = document.getElementById('edit-backdrop');
    const editTitle = document.getElementById('edit-field-title');
    const editInput = document.getElementById('edit-field-input');
    const btnCancelarEdit = document.getElementById('btn-cancelar-edit');
    const btnGuardarEdit = document.getElementById('btn-guardar-edit');

    const fieldConfig = {
        'nombres': {
            title: 'Editar Nombres',
            type: 'text',
            placeholder: 'Ingresa tu nombre'
        },
        'apellidos': {
            title: 'Editar Apellidos',
            type: 'text',
            placeholder: 'Ingresa tus apellidos'
        },
        'email': {
            title: 'Editar Email',
            type: 'email',
            placeholder: 'ejemplo@correo.com'
        },
        'password': {
            title: 'Editar Contraseña',
            type: 'password',
            placeholder: 'Nueva contraseña'
        }
    };

    let currentEditingKey = null;
    let currentTargetP = null;

    // Cargar datos reales desde DB (LocalStorage)
    if (window.DB) {
        const user = await window.DB.getProfile();
        if (user) {
            if (userPic && user.avatar) userPic.src = user.avatar;
            if (userHeader && user.username) userHeader.textContent = user.username;
            if (notificationsToggle && typeof user.notificationsEnabled === 'boolean') {
                notificationsToggle.checked = user.notificationsEnabled;
            }

            Object.keys(fieldConfig).forEach(key => {
                const row = document.querySelector(`.settings-panels-content[data-field="${key}"]`);
                if (!row) return;
                const pElem = row.querySelector('.settings-icon-container p');
                if (pElem && user[key] !== undefined) {
                    if (key === 'password') {
                        pElem.textContent = '•'.repeat(Math.max(6, String(user[key]).length));
                    } else {
                        pElem.textContent = user[key];
                    }
                }
            });
        }
    }

    // Toggle de notificaciones conectado con DB
    if (notificationsToggle && window.DB) {
        notificationsToggle.addEventListener('change', async (e) => {
            await window.DB.updateProfile({ notificationsEnabled: e.target.checked });
        });
    }

    // Abrir modal al hacer clic en cualquier parte de la fila
    const editableRows = document.querySelectorAll('.settings-panels-content[data-field]');
    editableRows.forEach(row => {
        row.addEventListener('click', () => {
            const fieldKey = row.getAttribute('data-field');
            const config = fieldConfig[fieldKey];
            if (!config || !editBackdrop) return;

            currentEditingKey = fieldKey;
            currentTargetP = row.querySelector('.settings-icon-container p');

            editTitle.textContent = config.title;
            editInput.type = config.type;
            editInput.placeholder = config.placeholder;

            // Pre-llenar con el valor actual si no es contraseña
            if (fieldKey === 'password') {
                editInput.value = '';
            } else if (currentTargetP) {
                editInput.value = currentTargetP.textContent.trim();
            }

            editBackdrop.classList.add('active');
            setTimeout(() => {
                if (editInput) editInput.focus();
            }, 100);
        });
    });

    function cerrarModalEdicion() {
        if (editBackdrop) {
            editBackdrop.classList.remove('active');
            currentEditingKey = null;
            currentTargetP = null;
            if (editInput) editInput.value = '';
        }
    }

    if (btnCancelarEdit) {
        btnCancelarEdit.addEventListener('click', cerrarModalEdicion);
    }

    if (editBackdrop) {
        editBackdrop.addEventListener('click', (e) => {
            if (e.target === editBackdrop) {
                cerrarModalEdicion();
            }
        });
    }

    if (btnGuardarEdit) {
        btnGuardarEdit.addEventListener('click', async () => {
            if (!editInput) return;
            const nuevoValor = editInput.value.trim();
            if (nuevoValor && currentTargetP && currentEditingKey) {
                if (currentEditingKey === 'password') {
                    currentTargetP.textContent = '•'.repeat(Math.max(6, nuevoValor.length));
                } else {
                    currentTargetP.textContent = nuevoValor;
                }

                if (window.DB) {
                    await window.DB.updateProfile({ [currentEditingKey]: nuevoValor });
                }
            }
            cerrarModalEdicion();
        });
    }

    // Tecla Enter para guardar y Escape para cancelar en el modal de edición
    if (editInput) {
        editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (btnGuardarEdit) btnGuardarEdit.click();
            } else if (e.key === 'Escape') {
                cerrarModalEdicion();
            }
        });
    }

    // Escape general para cerrar cualquier modal activo
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (editBackdrop && editBackdrop.classList.contains('active')) {
                cerrarModalEdicion();
            }
            if (backdrop && backdrop.classList.contains('active')) {
                backdrop.classList.remove('active');
            }
        }
    });
});
