package com.mesaflow.client.feature.reservation

import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

/**
 * Medianoche UTC de "hoy", en los mismos millis que usa el DatePicker de
 * Material3 (trabaja siempre en UTC, independientemente de la zona horaria
 * del dispositivo). Recibe un [Clock] inyectable para poder testear "hoy"
 * de forma determinista sin depender de la fecha real del sistema.
 */
fun todayUtcMillis(clock: Clock = Clock.systemUTC()): Long =
    Instant.now(clock)
        .atZone(ZoneOffset.UTC)
        .toLocalDate()
        .atStartOfDay(ZoneOffset.UTC)
        .toInstant()
        .toEpochMilli()

/** true si [candidateUtcMillis] es hoy o una fecha futura respecto a [todayUtcMillis]. */
fun isReservationDateSelectable(candidateUtcMillis: Long, todayUtcMillis: Long): Boolean =
    candidateUtcMillis >= todayUtcMillis
