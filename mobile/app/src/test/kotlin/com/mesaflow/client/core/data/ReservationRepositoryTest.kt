package com.mesaflow.client.core.data

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.datastore.ReservationStore
import com.mesaflow.client.core.model.OwnReservationRef
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

    private val secondReservationBody = reservationBody.replace("reservation-abc", "reservation-def")

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

    private fun createReservation(name: String = "Cliente Movil") = runBlocking {
        repository.create(
            restaurantId = "restaurant-mesaflow-centro",
            customerName = name,
            customerPhone = null,
            partySize = 2,
            reservationAt = "2026-08-01T20:00:00.000Z",
            paymentMethod = PaymentMethod.CARD,
        )
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

        val saved = reservationStore.currentOwnReservations()
        assertEquals(1, saved.size)
        assertEquals("reservation-abc", saved[0].reservationId)
        assertEquals("restaurant-mesaflow-centro", saved[0].restaurantId)

        val request = server.takeRequest()
        assertTrue(request.path!!.endsWith("/restaurants/restaurant-mesaflow-centro/reservations"))
        assertTrue(request.body.readUtf8().contains("\"paymentMethod\":\"card\""))
    }

    @Test
    fun `crear una segunda reserva conserva la referencia de la primera`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(201).setBody(reservationBody))
        createReservation()
        server.takeRequest()

        server.enqueue(MockResponse().setResponseCode(201).setBody(secondReservationBody))
        createReservation(name = "Cliente Movil 2")
        server.takeRequest()

        val saved = reservationStore.currentOwnReservations()
        assertEquals(listOf("reservation-abc", "reservation-def"), saved.map { it.reservationId })
    }

    @Test
    fun `un fallo al crear no guarda ninguna referencia`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(400).setBody("{}"))

        val result = createReservation()

        assertTrue(result is AppResult.Error)
        assertEquals(AppError.Validation, (result as AppResult.Error).error)
        assertTrue(reservationStore.currentOwnReservations().isEmpty())
    }

    @Test
    fun `un 402 del backend se mapea a PaymentDeclined y no guarda ninguna referencia`() = runBlocking {
        // El FakeReservationPaymentGateway del backend siempre aprueba (igual que el
        // cobro mock de pedidos): no hay un método/valor que dispare un 402 real desde
        // este flujo. Se comprueba igualmente el mapeo AppError.PaymentDeclined para un
        // 402 crudo, por si el backend rechazara el cobro por otro motivo (fianza ya
        // pagada, gateway real futuro, etc.).
        server.enqueue(MockResponse().setResponseCode(402).setBody("{\"message\":\"The deposit payment was declined.\"}"))

        val result = createReservation()

        assertTrue(result is AppResult.Error)
        assertEquals(AppError.PaymentDeclined, (result as AppResult.Error).error)
        assertTrue(reservationStore.currentOwnReservations().isEmpty())
    }

    @Test
    fun `refreshOwnReservations devuelve null cuando no hay ninguna reserva guardada`() = runBlocking {
        assertNull(repository.refreshOwnReservations())
    }

    @Test
    fun `refreshOwnReservations consulta cada reserva guardada por id`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(201).setBody(reservationBody))
        createReservation()
        server.takeRequest()
        server.enqueue(MockResponse().setResponseCode(201).setBody(secondReservationBody))
        createReservation(name = "Cliente Movil 2")
        server.takeRequest()

        server.enqueue(MockResponse().setResponseCode(200).setBody(reservationBody))
        server.enqueue(MockResponse().setResponseCode(200).setBody(secondReservationBody))
        // "Hoy" fijo al día de la reserva para que el test no caduque cuando
        // la fecha del fixture quede en el pasado real.
        val todayStart = java.time.Instant.parse("2026-08-01T00:00:00Z").toEpochMilli()
        val result = repository.refreshOwnReservations(todayStartUtcMillis = todayStart)

        assertTrue(result is AppResult.Success)
        assertEquals(listOf("reservation-abc", "reservation-def"), (result as AppResult.Success).data.map { it.id })
        assertTrue(server.takeRequest().path!!.endsWith("/restaurants/restaurant-mesaflow-centro/reservations/reservation-abc"))
        assertTrue(server.takeRequest().path!!.endsWith("/restaurants/restaurant-mesaflow-centro/reservations/reservation-def"))
    }

    @Test
    fun `refreshOwnReservations olvida las reservas cerradas desde el panel y las inexistentes`() = runBlocking {
        // Simula una reserva cancelada desde Angular y otra borrada del backend:
        // ninguna debe seguir en el almacén local ni mostrarse como activa.
        server.enqueue(MockResponse().setResponseCode(201).setBody(reservationBody))
        createReservation()
        server.takeRequest()
        server.enqueue(MockResponse().setResponseCode(201).setBody(secondReservationBody))
        createReservation(name = "Cliente Movil 2")
        server.takeRequest()

        val cancelledBody = reservationBody.replace("\"status\": \"pending\"", "\"status\": \"cancelled\"")
        server.enqueue(MockResponse().setResponseCode(200).setBody(cancelledBody))
        server.enqueue(MockResponse().setResponseCode(404).setBody("{}"))
        val result = repository.refreshOwnReservations()

        assertTrue(result is AppResult.Success)
        assertTrue((result as AppResult.Success).data.isEmpty())
        assertTrue(reservationStore.currentOwnReservations().isEmpty())
    }

    @Test
    fun `refreshOwnReservations olvida las reservas de un dia ya pasado`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(201).setBody(reservationBody))
        createReservation()
        server.takeRequest()
        server.enqueue(MockResponse().setResponseCode(201).setBody(secondReservationBody))
        createReservation(name = "Cliente Movil 2")
        server.takeRequest()

        // reservation-abc queda en un día pasado ("hoy" es el 2 de agosto);
        // reservation-def se mueve al día 3, así que sigue activa.
        val futureBody = secondReservationBody.replace("2026-08-01T20:00:00.000Z", "2026-08-03T20:00:00.000Z")
        server.enqueue(MockResponse().setResponseCode(200).setBody(reservationBody))
        server.enqueue(MockResponse().setResponseCode(200).setBody(futureBody))
        val todayStart = java.time.Instant.parse("2026-08-02T00:00:00Z").toEpochMilli()

        val result = repository.refreshOwnReservations(todayStartUtcMillis = todayStart)

        assertTrue(result is AppResult.Success)
        assertEquals(listOf("reservation-def"), (result as AppResult.Success).data.map { it.id })
        assertEquals(listOf("reservation-def"), reservationStore.currentOwnReservations().map { it.reservationId })
    }

    @Test
    fun `una reserva de hoy no se considera pasada aunque su hora ya haya vencido`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(201).setBody(reservationBody))
        createReservation()
        server.takeRequest()

        // "Hoy" es el mismo 1 de agosto: aunque las 20:00 ya hayan pasado,
        // la reserva es de hoy y debe seguir visible.
        server.enqueue(MockResponse().setResponseCode(200).setBody(reservationBody))
        val todayStart = java.time.Instant.parse("2026-08-01T00:00:00Z").toEpochMilli()

        val result = repository.refreshOwnReservations(todayStartUtcMillis = todayStart)

        assertTrue(result is AppResult.Success)
        assertEquals(listOf("reservation-abc"), (result as AppResult.Success).data.map { it.id })
    }

    @Test
    fun `cancelOwnReservation cancela esa reserva y solo olvida su referencia`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(201).setBody(reservationBody))
        createReservation()
        server.takeRequest()
        server.enqueue(MockResponse().setResponseCode(201).setBody(secondReservationBody))
        createReservation(name = "Cliente Movil 2")
        server.takeRequest()

        val cancelledBody = reservationBody.replace("\"status\": \"pending\"", "\"status\": \"cancelled\"")
        server.enqueue(MockResponse().setResponseCode(200).setBody(cancelledBody))

        val result = repository.cancelOwnReservation(
            OwnReservationRef(restaurantId = "restaurant-mesaflow-centro", reservationId = "reservation-abc"),
        )

        assertTrue(result is AppResult.Success)
        assertEquals(ReservationStatus.CANCELLED, (result as AppResult.Success).data.status)
        assertEquals(listOf("reservation-def"), reservationStore.currentOwnReservations().map { it.reservationId })

        val request = server.takeRequest()
        assertTrue(request.path!!.endsWith("/restaurants/restaurant-mesaflow-centro/reservations/reservation-abc/cancel"))
    }

    @Test
    fun `un fallo al cancelar conserva la referencia guardada`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(201).setBody(reservationBody))
        createReservation()
        server.takeRequest()

        server.enqueue(MockResponse().setResponseCode(500).setBody("{}"))
        val result = repository.cancelOwnReservation(
            OwnReservationRef(restaurantId = "restaurant-mesaflow-centro", reservationId = "reservation-abc"),
        )

        assertTrue(result is AppResult.Error)
        assertEquals(listOf("reservation-abc"), reservationStore.currentOwnReservations().map { it.reservationId })
    }
}
