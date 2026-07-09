package com.mesaflow.client.core.model

/** Preferencia de tema de la app. SYSTEM sigue el modo claro/oscuro del dispositivo. */
enum class ThemeMode {
    SYSTEM,
    LIGHT,
    DARK,
}

/**
 * Preferencia de idioma de la app. SYSTEM usa el locale del dispositivo;
 * el resto fuerza uno de los idiomas con recursos traducidos (es por
 * defecto, en, ca — ver app/src/main/res/values*).
 */
enum class AppLanguage(val tag: String?) {
    SYSTEM(null),
    ES("es"),
    EN("en"),
    CA("ca"),
}
