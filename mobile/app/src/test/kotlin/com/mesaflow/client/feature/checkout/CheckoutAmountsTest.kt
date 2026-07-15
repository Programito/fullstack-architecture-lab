package com.mesaflow.client.feature.checkout

import org.junit.Assert.assertEquals
import org.junit.Test

class CheckoutAmountsTest {

    @Test
    fun `calculates taxable base from a final price with included tax`() {
        assertEquals(264L, taxableBaseCents(totalCents = 320L, taxCents = 56L))
    }

    @Test
    fun `clamps taxable base to zero when tax exceeds total`() {
        assertEquals(0L, taxableBaseCents(totalCents = 40L, taxCents = 56L))
    }

    @Test
    fun `uses the payable total directly`() {
        val total = 1_240L

        assertEquals(1_240L, total)
    }
}
