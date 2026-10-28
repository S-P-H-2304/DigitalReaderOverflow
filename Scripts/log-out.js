/**
 * Overflow Settings & Account Management (log-out.js)
 * Conectado con Scripts/db.js (Firestore + Caché local).
 */

document.addEventListener('DOMContentLoaded', async () => {
    // --- 0. BOTÓN VOLVER ---
    const btnVolver = document.getElementById('overlay-publish');
    if (btnVolver) {
        btnVolver.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    // --- 1. CARGAR Y MOSTRAR DATOS DEL PERFIL DESDE DB ---
    const headerTitle = document.getElementById('settings-user-header');
    const settingsUserPic = document.getElementById('settings-user-pic');
    const notifToggle = document.getElementById('notifications-toggle');
    const passwordRow = document.getElementById('settings-password-row')
        || document.querySelector('.settings-panels-content[data-field="password"]');
    const editableRows = document.querySelectorAll('.settings-panels-content[data-field]');

    async function renderSettingsUI() {
        if (!window.DB) return;
        const user = await window.DB.requireAuth();
        if (!user) return;

        if (headerTitle) {
            headerTitle.textContent = user.username || 'Usuario';
        }
        if (settingsUserPic && user.avatar) {
            settingsUserPic.referrerPolicy = 'no-referrer';
            settingsUserPic.src = user.avatar;
        }
        if (notifToggle && typeof user.notificationsEnabled === 'boolean') {
            notifToggle.checked = user.notificationsEnabled;
        }

        const isGoogle = window.DB.isGoogleAccount ? window.DB.isGoogleAccount(user) : (user.authProvider === 'google');
        if (passwordRow) {
            passwordRow.style.display = isGoogle ? 'none' : '';
        }

        editableRows.forEach(row => {
            const field = row.getAttribute('data-field');
            const pElem = row.querySelector('.settings-icon-container p');
            if (!pElem || !field) return;

            if (field === 'password') {
                pElem.textContent = '••••••••';
            } else if (user[field] !== undefined) {
                pElem.textContent = user[field] || '—';
            }
        });
    }

    await renderSettingsUI();

    // Guardar estado del switch de notificaciones
    if (notifToggle && window.DB) {
        notifToggle.addEventListener('change', async () => {
            await window.DB.updateProfile({ notificationsEnabled: notifToggle.checked });
        });
    }

    // --- 2. MODAL DE EDICIÓN DE CAMPOS ---
    const editBackdrop = document.getElementById('edit-backdrop');
    const editTitle = document.getElementById('edit-field-title');
    const editInput = document.getElementById('edit-field-input');
    const editTextarea = document.getElementById('edit-field-textarea');
    const editBioCounter = document.getElementById('edit-bio-counter');
    const editConfirmPass = document.getElementById('edit-field-confirm-password');
    const editError = document.getElementById('edit-field-error');
    const btnCancelarEdit = document.getElementById('btn-cancelar-edit');
    const btnGuardarEdit = document.getElementById('btn-guardar-edit');

    let activeRowParagraph = null;
    let activeFieldKey = null;

    function triggerBioLimitAnimation(counterElem) {
        if (!counterElem) return;
        counterElem.classList.remove('counter-limit-reached');
        // Forzar reflow para reiniciar la animación CSS
        void counterElem.offsetWidth;
        counterElem.classList.add('counter-limit-reached');
    }

    function showEditError(msg) {
        if (!editError) return;
        editError.textContent = msg;
        editError.style.display = 'block';
    }

    function hideEditError() {
        if (!editError) return;
        editError.textContent = '';
        editError.style.display = 'none';
    }

    if (editableRows.length > 0 && editBackdrop && editTitle && editInput) {
        editableRows.forEach((row) => {
            row.addEventListener('click', async () => {
                const field = row.getAttribute('data-field');
                const user = window.DB ? await window.DB.getProfile() : null;

                // Si inició sesión con Google, no permitir abrir cambio de contraseña
                if (field === 'password' && user && window.DB.isGoogleAccount && window.DB.isGoogleAccount(user)) {
                    return;
                }

                const labelElem = row.querySelector('h2');
                const valueElem = row.querySelector('.settings-icon-container p');
                if (!labelElem || !valueElem) return;

                activeRowParagraph = valueElem;
                activeFieldKey = field;
                hideEditError();

                const fieldName = labelElem.textContent.trim();
                editTitle.textContent = `Editar ${fieldName}`;
                const editFieldHint = document.getElementById('edit-field-hint');

                if (field === 'bio' && editTextarea) {
                    if (editFieldHint) editFieldHint.style.display = 'none';
                    // Descripción: mostrar textarea de al menos 6 líneas con límite de 150 caracteres
                    editInput.style.display = 'none';
                    if (editConfirmPass) editConfirmPass.style.display = 'none';
                    editTextarea.style.display = 'block';
                    editTextarea.rows = 6;
                    editTextarea.maxLength = 150;
                    const initialBio = ((user && user.bio) ? user.bio : (valueElem.textContent.trim() === '—' ? '' : valueElem.textContent.trim())).slice(0, 150);
                    editTextarea.value = initialBio;
                    if (editBioCounter) {
                        editBioCounter.style.display = 'block';
                        editBioCounter.classList.remove('counter-limit-reached');
                        editBioCounter.textContent = `${initialBio.length} / 150`;
                        if (initialBio.length >= 150) {
                            triggerBioLimitAnimation(editBioCounter);
                        }
                    }
                    editBackdrop.classList.add('active');
                    setTimeout(() => {
                        editTextarea.focus();
                    }, 100);
                } else if (field === 'password') {
                    if (editFieldHint) editFieldHint.style.display = 'none';
                    // Contraseña (solo cuentas no-Google): mostrar doble input para confirmar
                    if (editTextarea) editTextarea.style.display = 'none';
                    if (editBioCounter) editBioCounter.style.display = 'none';
                    editInput.style.display = 'block';
                    editInput.type = 'password';
                    editInput.value = '';
                    editInput.placeholder = 'Nueva contraseña (mín. 4 caracteres)';
                    editInput.autocomplete = 'new-password';
                    editInput.maxLength = 60;
                    if (editConfirmPass) {
                        editConfirmPass.style.display = 'block';
                        editConfirmPass.value = '';
                    }
                    editBackdrop.classList.add('active');
                    setTimeout(() => {
                        editInput.focus();
                    }, 100);
                } else {
                    // Otros campos de 1 línea (username, nombres, apellidos, email)
                    if (editTextarea) editTextarea.style.display = 'none';
                    if (editBioCounter) editBioCounter.style.display = 'none';
                    if (editConfirmPass) editConfirmPass.style.display = 'none';
                    if (editFieldHint) editFieldHint.style.display = field === 'username' ? 'block' : 'none';
                    editInput.style.display = 'block';
                    editInput.type = field === 'email' ? 'email' : 'text';
                    editInput.maxLength = field === 'username' ? 20 : 120;
                    const currentValue = (user && user[field] !== undefined) ? user[field] : valueElem.textContent.trim();
                    editInput.value = currentValue === '—' ? '' : currentValue;
                    editInput.placeholder = field === 'username' ? 'Ej. alex_99 o lector.overflow' : `Ingresa tu ${fieldName.toLowerCase()}`;
                    editBackdrop.classList.add('active');
                    setTimeout(() => {
                        editInput.focus();
                        editInput.select();
                    }, 100);
                }
            });
        });

        const cerrarModalEdicion = () => {
            editBackdrop.classList.remove('active');
            const editFieldHint = document.getElementById('edit-field-hint');
            if (editFieldHint) editFieldHint.style.display = 'none';
            activeRowParagraph = null;
            activeFieldKey = null;
            hideEditError();
        };

        const guardarEdicion = async () => {
            if (!activeRowParagraph || !activeFieldKey) {
                cerrarModalEdicion();
                return;
            }

            hideEditError();

            if (activeFieldKey === 'bio' && editTextarea) {
                const newBio = editTextarea.value.trim();
                if (newBio.length > 150) {
                    showEditError('La descripción no puede superar los 150 caracteres.');
                    return;
                }
                activeRowParagraph.textContent = newBio || '—';
                if (window.DB) {
                    await window.DB.updateProfile({ bio: newBio });
                }
                cerrarModalEdicion();
                return;
            }

            if (activeFieldKey === 'password') {
                const newPass = editInput.value;
                const confirmPass = editConfirmPass ? editConfirmPass.value : '';

                if (!newPass || newPass.length < 4) {
                    showEditError('La contraseña debe tener al menos 4 caracteres.');
                    return;
                }
                if (newPass !== confirmPass) {
                    showEditError('Las contraseñas no coinciden. Verifica ambos campos.');
                    return;
                }

                activeRowParagraph.textContent = '••••••••';
                if (window.DB) {
                    await window.DB.updateProfile({ password: newPass });
                }
                cerrarModalEdicion();
                return;
            }

            const newValue = editInput.value.trim();
            if (!newValue) {
                showEditError('Este campo no puede quedar vacío.');
                return;
            }

            if (activeFieldKey === 'username') {
                const validation = window.DB.validateUsername ? window.DB.validateUsername(newValue) : null;
                if (validation && !validation.valid) {
                    showEditError(validation.error);
                    return;
                }
                try {
                    await window.DB.updateProfile({ username: newValue });
                    activeRowParagraph.textContent = newValue;
                    if (headerTitle) {
                        headerTitle.textContent = newValue;
                    }
                    cerrarModalEdicion();
                    return;
                } catch (err) {
                    showEditError(err.message || 'Error al actualizar el username.');
                    return;
                }
            }

            activeRowParagraph.textContent = newValue;
            if (window.DB) {
                await window.DB.updateProfile({ [activeFieldKey]: newValue });
            }
            cerrarModalEdicion();
        };

        if (btnCancelarEdit) {
            btnCancelarEdit.addEventListener('click', cerrarModalEdicion);
        }

        if (btnGuardarEdit) {
            btnGuardarEdit.addEventListener('click', guardarEdicion);
        }

        editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (activeFieldKey === 'password' && editConfirmPass && editConfirmPass.style.display !== 'none') {
                    editConfirmPass.focus();
                } else {
                    guardarEdicion();
                }
            } else if (e.key === 'Escape') {
                cerrarModalEdicion();
            }
        });

        if (editConfirmPass) {
            editConfirmPass.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    guardarEdicion();
                } else if (e.key === 'Escape') {
                    cerrarModalEdicion();
                }
            });
        }

        if (editTextarea) {
            editTextarea.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    cerrarModalEdicion();
                    return;
                }
                // Si ya está en 150 caracteres y presiona una tecla para escribir, hacer parpadear el contador en rojo
                const isNavOrControl = e.ctrlKey || e.metaKey || e.altKey || [
                    'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                    'Home', 'End', 'Tab', 'Escape'
                ].includes(e.key);
                const hasSelection = editTextarea.selectionStart !== editTextarea.selectionEnd;
                if (!isNavOrControl && !hasSelection && editTextarea.value.length >= 150) {
                    triggerBioLimitAnimation(editBioCounter);
                }
            });

            editTextarea.addEventListener('input', () => {
                if (editTextarea.value.length >= 150) {
                    if (editTextarea.value.length > 150) {
                        editTextarea.value = editTextarea.value.slice(0, 150);
                    }
                    triggerBioLimitAnimation(editBioCounter);
                } else if (editBioCounter) {
                    editBioCounter.classList.remove('counter-limit-reached');
                }
                if (editBioCounter) {
                    editBioCounter.textContent = `${editTextarea.value.length} / 150`;
                }
            });
        }

        editBackdrop.addEventListener('click', (e) => {
            if (e.target === editBackdrop) {
                cerrarModalEdicion();
            }
        });
    }

    // --- 3. MODAL DE CERRAR SESIÓN ---
    const btnAbrirLogout = document.getElementById('settings-padding');
    const logoutBackdrop = document.getElementById('logout-backdrop');
    const btnCancelarLogout = document.getElementById('btn-cancelar');
    const btnConfirmarLogout = document.getElementById('btn-confirmar-logout');

    if (btnAbrirLogout && logoutBackdrop && btnCancelarLogout) {
        btnAbrirLogout.addEventListener('click', () => {
            logoutBackdrop.classList.add('active');
        });

        btnCancelarLogout.addEventListener('click', () => {
            logoutBackdrop.classList.remove('active');
        });

        if (btnConfirmarLogout) {
            btnConfirmarLogout.addEventListener('click', async () => {
                logoutBackdrop.classList.remove('active');
                if (window.DB) {
                    await window.DB.logout();
                } else {
                    window.location.href = 'index.html';
                }
            });
        }

        logoutBackdrop.addEventListener('click', (e) => {
            if (e.target === logoutBackdrop) {
                logoutBackdrop.classList.remove('active');
            }
        });
    }
});
