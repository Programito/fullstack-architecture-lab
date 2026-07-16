package com.mesaflow.client.core.common

import java.io.IOException
import retrofit2.HttpException

/** Errores de aplicación: la UI solo conoce estas categorías, nunca detalles técnicos. */
sealed interface AppError {
    /** Sin conexión o servidor inalcanzable. */
    data object Network : AppError

    /** Sesión caducada o credenciales inválidas (401/403). */
    data object Unauthorized : AppError

    /** Recurso inexistente (404). */
    data object NotFound : AppError

    /** Petición inválida (400/422). */
    data object Validation : AppError

    /**
     * Fianza de reserva rechazada (402, ver FakeReservationPaymentGateway
     * en el backend). Categoría propia en vez de caer en Validation: la
     * UI necesita distinguir "datos mal introducidos" de "la tarjeta fake
     * fue rechazada" para mostrar el mensaje correcto.
     */
    data object PaymentDeclined : AppError

    /** Error del servidor (5xx). */
    data object Server : AppError

    /** Cualquier otra cosa. */
    data class Unknown(val message: String?) : AppError
}

/** Resultado tipado para las operaciones de repositorio. */
sealed interface AppResult<out T> {
    data class Success<T>(val data: T) : AppResult<T>
    data class Error(val error: AppError) : AppResult<Nothing>
}

inline fun <T, R> AppResult<T>.map(transform: (T) -> R): AppResult<R> = when (this) {
    is AppResult.Success -> AppResult.Success(transform(data))
    is AppResult.Error -> this
}

fun Throwable.toAppError(): AppError = when (this) {
    is HttpException -> when (code()) {
        401, 403 -> AppError.Unauthorized
        404 -> AppError.NotFound
        400, 422 -> AppError.Validation
        402 -> AppError.PaymentDeclined
        in 500..599 -> AppError.Server
        else -> AppError.Unknown(message())
    }
    is IOException -> AppError.Network
    else -> AppError.Unknown(message)
}

/** Envuelve una llamada de red y traduce excepciones a AppError. */
suspend fun <T> safeApiCall(block: suspend () -> T): AppResult<T> =
    try {
        AppResult.Success(block())
    } catch (t: Throwable) {
        if (t is kotlinx.coroutines.CancellationException) throw t
        AppResult.Error(t.toAppError())
    }
