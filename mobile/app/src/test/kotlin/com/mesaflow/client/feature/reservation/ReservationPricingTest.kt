package com.mesaflow.client.feature.reservation

import org.junit.Assert.assertEquals
import org.junit.Test

class ReservationPricingTest {

    @Test
    fun `multiplica la fianza por comensal segun el numero de comensales`() {
        assertEquals(RESERVATION_DEPOSIT_PER_PERSON_CENTS, calculateReservationDepositCents(1))
        assertEquals(4 * RESERVATION_DEPOSIT_PER_PERSON_CENTS, calculateReservationDepositCents(4))
    }

    @Test
    fun `devuelve cero para cero comensales`() {
        assertEquals(0, calculateReservationDepositCents(0))
    }
}
