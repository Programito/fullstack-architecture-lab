package com.mesaflow.client.feature.reservation

import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReservationDateRulesTest {

    /** "Ahora" fijo a media mañana para poder afirmar sobre "hoy", "mañana" y "ayer" sin depender del reloj real. */
    private val fixedClock = Clock.fixed(Instant.parse("2026-07-16T10:30:00Z"), ZoneOffset.UTC)

    @Test
    fun `todayUtcMillis devuelve la medianoche UTC del dia actual, no la hora actual`() {
        val expected = Instant.parse("2026-07-16T00:00:00Z").toEpochMilli()
        assertEquals(expected, todayUtcMillis(fixedClock))
    }

    @Test
    fun `hoy es una fecha seleccionable`() {
        val today = todayUtcMillis(fixedClock)
        assertTrue(isReservationDateSelectable(today, today))
    }

    @Test
    fun `una fecha futura es seleccionable`() {
        val today = todayUtcMillis(fixedClock)
        val tomorrow = today + 24 * 60 * 60 * 1000L
        assertTrue(isReservationDateSelectable(tomorrow, today))
    }

    @Test
    fun `una fecha pasada no es seleccionable`() {
        val today = todayUtcMillis(fixedClock)
        val yesterday = today - 24 * 60 * 60 * 1000L
        assertFalse(isReservationDateSelectable(yesterday, today))
    }

    @Test
    fun `el ultimo instante de ayer sigue sin ser seleccionable`() {
        val today = todayUtcMillis(fixedClock)
        assertFalse(isReservationDateSelectable(today - 1, today))
    }
}
