package com.mesaflow.client.core.common

import com.mesaflow.client.core.model.AppLanguage
import com.mesaflow.client.core.model.ComboDefinition
import com.mesaflow.client.core.model.ComboSlot
import com.mesaflow.client.core.model.Menu
import com.mesaflow.client.core.model.MenuItem
import com.mesaflow.client.core.model.MenuSection
import com.mesaflow.client.core.model.ModifierGroup
import com.mesaflow.client.core.model.ModifierOption
import com.mesaflow.client.core.model.NameI18n
import com.mesaflow.client.core.model.PlatterComponent
import java.util.Locale

/**
 * Resuelve que variante de nombre mostrar segun el idioma activo. La
 * resolucion pasa SIEMPRE por aqui y nunca en el servidor: el backend manda
 * las tres variantes que existan (o ninguna) en cada respuesta de la carta,
 * y es esta app la que decide cual pintar, para poder cambiar de idioma sin
 * red (ver docs/superpowers/plans/2026-07-11-menu-multilingual-names.md).
 *
 * [fallback] es siempre el `name` canonico (castellano) que ya viene del
 * backend: se usa si no hay `nameI18n`, si no hay variante para [localeTag],
 * o si esa variante esta vacia/en blanco.
 */
fun resolveName(nameI18n: NameI18n?, fallback: String, localeTag: String): String {
    if (nameI18n == null) return fallback
    val candidate = when (localeTag) {
        "ca" -> nameI18n.ca
        "en" -> nameI18n.en
        "es" -> nameI18n.es
        else -> null
    }
    return candidate?.takeIf { it.isNotBlank() } ?: fallback
}

/**
 * Idioma efectivo para resolver `nameI18n`: el idioma forzado por el usuario
 * en Ajustes, o si esta en modo "Sistema" (`AppLanguage.SYSTEM`, `tag ==
 * null`), el locale actual del dispositivo/proceso — el mismo que ya
 * resuelve `AppCompatDelegate` para los strings.xml de la UI.
 */
fun AppLanguage.resolveLocaleTag(): String = tag ?: Locale.getDefault().language

/**
 * Devuelve una copia de la carta con cada nombre resuelto al idioma
 * [localeTag], sustituyendo el campo `name` de cada nodo (producto, seccion,
 * grupo/opcion de modificador, slot de combo, componente de platter) por su
 * variante en ese idioma (o el original si no hay traduccion). Se aplica en
 * memoria sobre la carta ya cargada — cambiar de idioma nunca dispara una
 * peticion de red nueva, solo re-mapea los datos que ya estan en RAM/cache.
 *
 * `ComboSlotOption` no se resuelve aqui: su nombre de display viene del
 * producto asociado, no de un campo propio (ver nota en Menu.kt/MenuDtos.kt).
 */
fun Menu.withResolvedNames(localeTag: String): Menu = copy(
    sections = sections.map { it.withResolvedNames(localeTag) },
)

private fun MenuSection.withResolvedNames(localeTag: String): MenuSection = copy(
    name = resolveName(nameI18n, name, localeTag),
    items = items.map { it.withResolvedNames(localeTag) },
)

private fun MenuItem.withResolvedNames(localeTag: String): MenuItem = copy(
    name = resolveName(nameI18n, name, localeTag),
    modifierGroups = modifierGroups.map { it.withResolvedNames(localeTag) },
    comboDefinition = comboDefinition?.withResolvedNames(localeTag),
    platterComponents = platterComponents.map { it.withResolvedNames(localeTag) },
)

private fun ModifierGroup.withResolvedNames(localeTag: String): ModifierGroup = copy(
    name = resolveName(nameI18n, name, localeTag),
    options = options.map { it.withResolvedNames(localeTag) },
)

private fun ModifierOption.withResolvedNames(localeTag: String): ModifierOption = copy(
    name = resolveName(nameI18n, name, localeTag),
)

private fun ComboDefinition.withResolvedNames(localeTag: String): ComboDefinition = copy(
    slots = slots.map { it.withResolvedNames(localeTag) },
)

private fun ComboSlot.withResolvedNames(localeTag: String): ComboSlot = copy(
    name = resolveName(nameI18n, name, localeTag),
)

private fun PlatterComponent.withResolvedNames(localeTag: String): PlatterComponent = copy(
    name = resolveName(nameI18n, name, localeTag),
)
