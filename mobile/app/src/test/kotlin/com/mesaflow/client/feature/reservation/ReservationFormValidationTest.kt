package com.mesaflow.client.feature.reservation

import com.mesaflow.client.core.model.PaymentMethod
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReservationFormValidationTest {

    @Test
    fun `cannot submit reservation when payment method has not been chosen`() {
        val canSubmit = canSubmitReservationForm(
            customerName = "Cliente Movil",
            partySize = 2,
            reservationAt = "2026-08-01T20:00:00.000Z",
            paymentMethod = null,
            isLoading = false,
        )

        assertFalse(canSubmit)
    }

    @Test
    fun `shows payment method error only after submit attempt without selection`() {
        assertTrue(
            shouldShowReservationPaymentMethodError(
                submitAttempted = true,
                paymentMethod = null,
            ),
        )
        assertFalse(
            shouldShowReservationPaymentMethodError(
                submitAttempted = false,
                paymentMethod = null,
            ),
        )
        assertFalse(
            shouldShowReservationPaymentMethodError(
                submitAttempted = true,
                paymentMethod = PaymentMethod.CARD,
            ),
        )
    }
}
