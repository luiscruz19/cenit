const messages = {
    generic: {
        fields_required: 'Todos los campos requeridos deben ser completados',
        invalid_enum_value: 'El valor proporcionado no está permitido',
        id_required: 'El ID es requerido',
        invalid_date_format: 'Formato de fecha inválido',
        token_expirated: 'El token ingresado ha expirado.',
        token_invalid: 'El token ingresado no es válido.',
        token_not_found: 'El token ingresado no fue encontrado.',
        not_found: 'Recurso no encontrado',
    },
    auth: {
        email_not_allowed: 'Tu cuenta de Google no está habilitada para este dashboard.',
        state_invalid: 'El state de OAuth es inválido o expiró. Volvé a intentar el login.',
        code_required: 'Falta el código de autorización de Google.',
        no_refresh_token: 'Google no devolvió el refresh token. Volvé a loguearte (se pide consentimiento de nuevo).',
        google_not_connected: 'No hay una cuenta de Google conectada. Iniciá sesión para vincularla.',
        google_revoked: 'El acceso a Google fue revocado o expiró. Volvé a iniciar sesión para reconectar.',
    },
    site: {
        fields_empty: {
            name: 'El nombre del sitio no puede estar vacío',
            domain: 'El dominio no puede estar vacío',
        },
        domain_exists: 'Ya existe un sitio con ese dominio',
        not_found: 'Sitio no encontrado',
        has_data: 'El sitio tiene métricas cargadas: se desactivó en lugar de eliminarse',
    },
    etl: {
        already_running: 'Ya hay una corrida de ETL en curso',
        run_not_found: 'Corrida no encontrada',
    },
};

export default messages;
