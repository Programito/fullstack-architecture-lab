package com.mesaflow.client.core.data

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.datastore.ReservationStore
import com.mesaflow.client.core.model.PaymentMethod
import com.mesaflow.client.core.model.ReservationStatus
import com.mesaflow.client.core.network.ReservationsApi
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class ReservationRepositoryTest {

    private lateinit var server: MockWebServer
    private lateinit var repository: ReservationRepository
    private lateinit var reservationStore: ReservationStore
    private lateinit var scope: CoroutineScope
    private lateinit var tmpFile: File

    private val reservationBody = """
        {
          "id": "reservation-abc",
          "customerNameSnapshot": "Cliente Movil",
          "customerPhoneSnapshot": "+34 600 000 000",
          "partySize": 2,
          "reservationAt": "2026-08-01T20:00:00.000Z",
          "durationMinutes": 90,
          "status": "pending",
          "notes": null,
          "depositAmountCents": 1000,
          "depositPaidAt": "2026-08-01T19:00:00.000Z"
        }
    """.trimIndent()

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()

        scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
        tmpFile = File.createTempFile("reservation-test", ".preferences_pb").also { it.delete() }
        val dataStore = PreferenceDataStoreFactory.create(scope = scope, produceFile = { tmpFile })
        reservationStore = ReservationStore(dataStore)

        val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }
        val api = Retrofit.Builder()
            .baseUrl(server.url("/api/v1/"))
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(ReservationsApi::class.java)

        repository = ReservationRepository(reservationsApi = api, reservationStore = reservationStore)
    }

    @After
    fun tearDown() {
        server.shutdown()
        scope.cancel()
        tmpFile.delete()
    }

    @Test
    fun `crear una reserva la mapea a dominio, incluyendo la fianza, y guarda su referencia`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(201).setBody(reservationBody))

        val result = repository.create(
            restaurantId = "restaurant-mesaflow-centro",
            customerName = "Cliente Movil",
            customerPhone = "+34 600 000 000",
            partySize = 2,
            reservationAt = "2026-08-01T20:00:00.000Z",
            paymentMethod = PaymentMethod.CARD,
        )

        assertTrue(result is AppResult.Success)
        val reservation = (result as AppResult.Success).data
        assertEquals("reservation-abc", reservation.id)
        assertEquals(ReservationStatus.PENDING, reservation.status)
        assertEquals(1000, reservation.depositAmountCents)
        assertEquals("2026-08-01T19:00:00.000Z", reservation.depositPaidAt)

        val saved = reservationStore.currentOwnReservation()
        assertEquals("reservation-abc", saved?.reservationId)
        assertEquals("restaurant-mesaflow-centro", saved?.restaurantId)

        val request = server.takeRequest()
        assertTrue(request.path!!.endsWith("/restaurants/restaurant-mesaflow-centro/reservations"))
        assertTrue(request.body.readUtf8().contains("\"paymentMethod\":\"card\""))
    }

    @Test
    fun `un fallo al crear no guarda ninguna referencia`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(400).setBody("{}"))

        val result = repository.create(
            restaurantId = "restaurant-mesaflow-centro",
            customerName = "Cliente Movil",
            customerPhone = null,
            partySize = 2,
            reservationAt = "2026-08-01T20:00:00.000Z",
            paymentMethod = PaymentMethod.CARD,
        )

        assertTrue(result is AppResult.Error)
        assertEquals(AppError.Validation, (result as AppResult.Error).error)
        assertNull(reservationStore.currentOwnReservation())
    }

    @Test
    fun `un 402 del backend se mapea a PaymentDeclined y no guarda ninguna referencia`() = runBlocking {
        // El FakeReservationPaymentGateway del backend siempre aprueba (igual que el
        // cobro mock de pedidos): no hay un método/valor que dispare un 402 real desde
        // este flujo. Se comprueba igualmente el mapeo AppError.PaymentDeclined para un
        // 402 crudo, por si el backend rechazara el cobro por otro motivo (fianza ya
        // pagada, gateway real futuro, etc.).
        server.enqueue(MockResponse().setResponseCode(402).setBody("{\"message\":\"The deposit payment was declined.\"}"))

        val result = repository.create(
            restaurantId = "restaurant-mesaflow-centro",
            customerName = "Cliente Movil",
            customerPhone = null,
            partySize = 2,
            reservationAt = "2026-08-01T20:00:00.000Z",
            paymentMethod = PaymentMethod.CARD,
        )

        assertTrue(result is AppResult.Error)
        assertEquals(AppError.PaymentDeclined, (result as AppResult.Error).error)
        assertNull(reservationStore.currentOwnReservation())
    }

    @Test
    fun `refreshOwnReservation devuelve null cuando no hay ninguna reserva guardada`() = runBlocking {
        assertNull(repository.refreshOwnReservation())
    }

    @Test
    fun `refreshOwnReservation consulta la reserva guardada por id`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(201).setBody(reservationBody))
        repository.create(
            restaurantId = "restaurant-mesaflow-centro",
            customerName = "Cliente Movil",
            customerPhone = null,
            partySize = 2,
            reservationAt = "2026-08-01T20:00:00.000Z",
            paymentMethod = PaymentMethod.CARD,
        )
        server.takeRequest()

        server.enqueue(MockResponse().setResponseCode(200).setBody(reservationBody))
        val result = repository.refreshOwnReservation()

        assertTrue(result is AppResult.Success)
        val request = server.takeRequest()
        assertTrue(request.path!!.endsWith("/restaurants/restaurant-mesaflow-centro/reservations/reservation-abc"))
    }

    @Test
    fun `cancelOwnReservation cancela y limpia la referencia guardada`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(201).setBody(reservationBody))
        repository.create(
            restaurantId = "restaurant-mesaflow-centro",
            customerName = "Cliente Movil",
            customerPhone = null,
            partySize = 2,
            reservationAt = "2026-08-01T20:00:00.000Z",
            paymentMethod = PaymentMethod.CARD,
        )
        server.takeRequest()

        val cancelledBody = reservationBody.replace("\"status\": \"pending\"", "\"status\": \"cancelled\"")
        server.enqueue(MockResponse().setResponseCode(200).setBody(cancelledBody))

        val result = repository.cancelOwnReservation()

        assertTrue(result is AppResult.Success)
        assertEquals(ReservationStatus.CANCELLED, (result as AppResult.Success).data.status)
        assertNull(reservationStore.currentOwnReservation())

        val request = server.takeRequest()
        assertTrue(request.path!!.endsWith("/restaurants/restaurant-mesaflow-centro/reservations/reservation-abc/cancel"))
    }

    @Test
    fun `cancelOwnReservation devuelve null cuando no hay ninguna reserva guardada`() = runBlocking {
        assertNull(repository.cancelOwnReservation())
    }
}
