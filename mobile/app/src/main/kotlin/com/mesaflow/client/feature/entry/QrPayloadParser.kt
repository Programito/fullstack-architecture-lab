package com.mesaflow.client.feature.entry

import com.mesaflow.client.core.model.TableContext

/**
 * Parsea el contenido del QR de mesa. Formatos aceptados:
 *  - https://<dominio>/t/<restaurantId>/<tableId>   (recomendado: sirve tambien como App Link)
 *  - mesaflow://t/<restaurantId>/<tableId>
 * Devuelve null si el QR no es de MesaFlow o esta incompleto.
 */
object QrPayloadParser {

    fun parse(raw: String?): TableContext? {
        val value = raw?.trim().orEmpty()
        if (value.isEmpty()) return null

        val segments: List<String> = when {
            value.startsWith("mesaflow://", ignoreCase = true) ->
                value.removePrefix("mesaflow://").removePrefix("MESAFLOW://").split('/')
            value.startsWith("https://", ignoreCase = true) || value.startsWith("http://", ignoreCase = true) ->
                value.substringAfter("://").split('/').drop(1) // quita el host
            else -> return null
        }

        val cleaned = segments.map { it.trim() }.filter { it.isNotEmpty() }
        if (cleaned.size != 3 || !cleaned[0].equals("t", ignoreCase = true)) return null

        return TableContext(restaurantId = cleaned[1], tableId = cleaned[2])
    }
}
