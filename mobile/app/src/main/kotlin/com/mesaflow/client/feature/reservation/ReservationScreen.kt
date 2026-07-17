package com.mesaflow.client.feature.reservation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.BasicAlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mesaflow.client.R
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.PriceFormatter
import com.mesaflow.client.core.model.PaymentMethod
import com.mesaflow.client.core.model.Reservation
import com.mesaflow.client.core.model.ReservationStatus
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

/**
 * Reservas propias del cliente: la lista de reservas activas creadas desde
 * esta app (cada una cancelable por separado), más un formulario para añadir
 * una nueva (fecha, hora, comensales, fianza fake). No hay listado del
 * restaurante (ver [ReservationViewModel]): esta pantalla solo conoce las
 * reservas que ella misma creó, nunca las de otros clientes.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReservationScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ReservationViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    val errorMessage = uiState.error?.let { stringResource(it.toReservationErrorRes()) }
    LaunchedEffect(errorMessage) {
        if (errorMessage != null) {
            snackbarHostState.showSnackbar(errorMessage)
            viewModel.onErrorShown()
        }
    }

    // Desde el formulario, si hay reservas activas detrás, la flecha vuelve a
    // la lista en vez de salir de la pantalla.
    val formDismissesToList = uiState.showForm && uiState.reservations.isNotEmpty()

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.reservation_title)) },
                navigationIcon = {
                    IconButton(onClick = {
                        if (formDismissesToList) viewModel.closeNewReservationForm() else onBack()
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.reservation_back))
                    }
                },
            )
        },
    ) { innerPadding ->
        when {
            !uiState.hasChecked -> LoadingBody(innerPadding)
            uiState.isFormVisible ->
                ReservationForm(
                    isLoading = uiState.isLoading,
                    onSubmit = viewModel::createReservation,
                    contentPadding = innerPadding,
                )
            else ->
                ReservationList(
                    reservations = uiState.reservations,
                    isLoading = uiState.isLoading,
                    onCancel = viewModel::cancelReservation,
                    onNewReservation = viewModel::openNewReservationForm,
                    contentPadding = innerPadding,
                )
        }
    }
}

@Composable
private fun LoadingBody(contentPadding: PaddingValues, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(contentPadding)
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        CircularProgressIndicator()
    }
}

@Composable
private fun ReservationList(
    reservations: List<Reservation>,
    isLoading: Boolean,
    onCancel: (Reservation) -> Unit,
    onNewReservation: () -> Unit,
    contentPadding: PaddingValues,
    modifier: Modifier = Modifier,
) {
    // Reserva pendiente de confirmar su cancelación: cancelar es irreversible
    // y la fianza no se devuelve, así que nunca se cancela con un solo toque.
    var pendingCancel by remember { mutableStateOf<Reservation?>(null) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(contentPadding)
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
    ) {
        reservations.forEach { reservation ->
            ReservationStatusCard(
                reservation = reservation,
                isLoading = isLoading,
                onCancel = { pendingCancel = reservation },
            )
            Spacer(Modifier.height(16.dp))
        }
        Spacer(Modifier.height(8.dp))
        if (isLoading) {
            CircularProgressIndicator(Modifier.height(40.dp))
        } else {
            Button(onClick = onNewReservation, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.reservation_new))
            }
        }
    }

    pendingCancel?.let { reservation ->
        AlertDialog(
            onDismissRequest = { pendingCancel = null },
            title = { Text(stringResource(R.string.reservation_cancel_confirm_title)) },
            text = {
                Text(
                    stringResource(
                        R.string.reservation_cancel_confirm_message,
                        PriceFormatter.format(reservation.depositAmountCents.toLong(), "EUR"),
                    ),
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        pendingCancel = null
                        onCancel(reservation)
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
                ) { Text(stringResource(R.string.reservation_cancel)) }
            },
            dismissButton = {
                TextButton(onClick = { pendingCancel = null }) {
                    Text(stringResource(R.string.reservation_cancel_keep))
                }
            },
        )
    }
}

@Composable
private fun ReservationStatusCard(
    reservation: Reservation,
    isLoading: Boolean,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(Modifier.padding(20.dp)) {
            Text(
                text = stringResource(reservation.status.toStatusLabelRes()),
                style = MaterialTheme.typography.titleMedium,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = reservation.reservationAt.toDisplayDateTime(),
                style = MaterialTheme.typography.bodyLarge,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.reservation_party_size, reservation.partySize),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = stringResource(
                    R.string.reservation_deposit_paid,
                    PriceFormatter.format(reservation.depositAmountCents.toLong(), "EUR"),
                ),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(16.dp))
            OutlinedButton(
                onClick = onCancel,
                enabled = !isLoading,
                // Cancelar es destructivo (la fianza no se devuelve): en rojo,
                // que no parezca una acción neutra más.
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.5f)),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.reservation_cancel))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReservationForm(
    isLoading: Boolean,
    onSubmit: (
        customerName: String,
        customerPhone: String?,
        partySize: Int,
        reservationAt: String,
        notes: String?,
        paymentMethod: PaymentMethod,
    ) -> Unit,
    contentPadding: PaddingValues,
    modifier: Modifier = Modifier,
) {
    var customerName by remember { mutableStateOf("") }
    var customerPhone by remember { mutableStateOf("") }
    var partySize by remember { mutableIntStateOf(2) }
    var notes by remember { mutableStateOf("") }
    var selectedMethod by remember { mutableStateOf<PaymentMethod?>(null) }
    var submitAttempted by remember { mutableStateOf(false) }
    val todayMillis = remember { todayUtcMillis() }
    var selectedDateMillis by remember { mutableStateOf<Long?>(todayMillis) }
    var selectedHour by remember { mutableIntStateOf(21) }
    var selectedMinute by remember { mutableIntStateOf(0) }
    var showDatePicker by remember { mutableStateOf(false) }
    var showTimePicker by remember { mutableStateOf(false) }

    val reservationAt = selectedDateMillis?.let { millis ->
        Instant.ofEpochMilli(millis)
            .atZone(ZoneOffset.UTC)
            .withHour(selectedHour)
            .withMinute(selectedMinute)
            .withSecond(0)
            .withNano(0)
            .toInstant()
            .toString()
    }
    val depositAmountCents = calculateReservationDepositCents(partySize)
    val hasBaseReservationData = hasBaseReservationFormData(
        customerName = customerName,
        partySize = partySize,
        reservationAt = reservationAt,
        isLoading = isLoading,
    )
    val canSubmit = canSubmitReservationForm(
        customerName = customerName,
        partySize = partySize,
        reservationAt = reservationAt,
        paymentMethod = selectedMethod,
        isLoading = isLoading,
    )
    val showPaymentMethodError = shouldShowReservationPaymentMethodError(
        submitAttempted = submitAttempted,
        paymentMethod = selectedMethod,
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(contentPadding)
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
    ) {
        OutlinedTextField(
            value = customerName,
            onValueChange = { customerName = it },
            label = { Text(stringResource(R.string.reservation_name_label)) },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = customerPhone,
            onValueChange = { customerPhone = it },
            label = { Text(stringResource(R.string.reservation_phone_label)) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.reservation_party_size_label), style = MaterialTheme.typography.bodyLarge)
            Spacer(Modifier.width(16.dp))
            IconButton(onClick = { if (partySize > 1) partySize-- }) { Text("−") }
            Text("$partySize", style = MaterialTheme.typography.titleMedium)
            IconButton(onClick = { partySize++ }) { Text("+") }
        }
        Spacer(Modifier.height(12.dp))
        OutlinedButton(onClick = { showDatePicker = true }, modifier = Modifier.fillMaxWidth()) {
            Text(
                selectedDateMillis?.let {
                    Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate()
                        .format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM))
                } ?: stringResource(R.string.reservation_pick_date),
            )
        }
        Spacer(Modifier.height(12.dp))
        OutlinedButton(onClick = { showTimePicker = true }, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.reservation_pick_time, selectedHour, selectedMinute))
        }
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = notes,
            onValueChange = { notes = it },
            label = { Text(stringResource(R.string.reservation_notes_label)) },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(20.dp))
        Text(
            text = stringResource(
                R.string.reservation_deposit_notice,
                PriceFormatter.format(depositAmountCents.toLong(), "EUR"),
            ),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(12.dp))
        Text(
            text = stringResource(R.string.checkout_method_title),
            style = MaterialTheme.typography.titleMedium,
        )
        Spacer(Modifier.height(8.dp))
        ReservationPaymentMethodRow(
            label = stringResource(R.string.checkout_method_card),
            selected = selectedMethod == PaymentMethod.CARD,
            enabled = !isLoading,
            onClick = {
                selectedMethod = PaymentMethod.CARD
                submitAttempted = false
            },
        )
        ReservationPaymentMethodRow(
            label = stringResource(R.string.checkout_method_bizum),
            selected = selectedMethod == PaymentMethod.BIZUM,
            enabled = !isLoading,
            onClick = {
                selectedMethod = PaymentMethod.BIZUM
                submitAttempted = false
            },
        )
        ReservationPaymentMethodRow(
            label = stringResource(R.string.checkout_method_cash),
            selected = selectedMethod == PaymentMethod.CASH,
            enabled = !isLoading,
            onClick = {
                selectedMethod = PaymentMethod.CASH
                submitAttempted = false
            },
        )
        if (showPaymentMethodError) {
            Text(
                text = stringResource(R.string.reservation_payment_method_required),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
            )
        }
        Spacer(Modifier.height(4.dp))
        Text(
            text = stringResource(R.string.checkout_mock_note),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(24.dp))
        if (isLoading) {
            CircularProgressIndicator(Modifier.height(40.dp))
        } else {
            Button(
                onClick = {
                    submitAttempted = true
                    val paymentMethod = selectedMethod ?: return@Button
                    onSubmit(
                        customerName.trim(),
                        customerPhone.trim().ifBlank { null },
                        partySize,
                        reservationAt!!,
                        notes.trim().ifBlank { null },
                        paymentMethod,
                    )
                },
                enabled = hasBaseReservationData,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.reservation_submit))
            }
        }
    }

    if (showDatePicker) {
        val datePickerState = rememberDatePickerState(
            initialSelectedDateMillis = selectedDateMillis ?: todayMillis,
            // El cliente no puede reservar en el pasado (el backend ya lo
            // rechaza, ver reservationInPast en CreateRestaurantReservationUseCase,
            // pero bloquearlo aqui evita el viaje de red y el error generico).
            selectableDates = remember(todayMillis) {
                object : SelectableDates {
                    override fun isSelectableDate(utcTimeMillis: Long): Boolean =
                        isReservationDateSelectable(utcTimeMillis, todayMillis)
                }
            },
        )
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    selectedDateMillis = datePickerState.selectedDateMillis
                    showDatePicker = false
                }) { Text(stringResource(R.string.reservation_pick_confirm)) }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) { Text(stringResource(R.string.entry_manual_entry_cancel)) }
            },
        ) {
            DatePicker(state = datePickerState)
        }
    }

    if (showTimePicker) {
        val timePickerState = rememberTimePickerState(initialHour = selectedHour, initialMinute = selectedMinute, is24Hour = true)
        BasicAlertDialog(onDismissRequest = { showTimePicker = false }) {
            Card {
                Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    TimePicker(state = timePickerState)
                    Spacer(Modifier.height(12.dp))
                    Row {
                        TextButton(onClick = { showTimePicker = false }) { Text(stringResource(R.string.entry_manual_entry_cancel)) }
                        TextButton(onClick = {
                            selectedHour = timePickerState.hour
                            selectedMinute = timePickerState.minute
                            showTimePicker = false
                        }) { Text(stringResource(R.string.reservation_pick_confirm)) }
                    }
                }
            }
        }
    }
}

/** Fila de método de pago: mismo patrón visual que CheckoutScreen.PaymentMethodRow. */
@Composable
private fun ReservationPaymentMethodRow(
    label: String,
    selected: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
    ) {
        RadioButton(selected = selected, onClick = onClick, enabled = enabled)
        Spacer(Modifier.width(8.dp))
        Text(text = label, style = MaterialTheme.typography.bodyLarge)
    }
}

private fun String.toDisplayDateTime(): String = runCatching {
    val instant = Instant.parse(this)
    DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT)
        .withZone(ZoneId.systemDefault())
        .format(instant)
}.getOrDefault(this)

private fun ReservationStatus.toStatusLabelRes(): Int = when (this) {
    ReservationStatus.PENDING -> R.string.reservation_status_pending
    ReservationStatus.CONFIRMED -> R.string.reservation_status_confirmed
    ReservationStatus.SEATED -> R.string.reservation_status_seated
    ReservationStatus.CANCELLED -> R.string.reservation_status_cancelled
    ReservationStatus.NO_SHOW -> R.string.reservation_status_no_show
    ReservationStatus.UNKNOWN -> R.string.reservation_status_unknown
}

private fun AppError.toReservationErrorRes(): Int = when (this) {
    AppError.Network -> R.string.entry_error_network
    AppError.Unauthorized -> R.string.entry_error_unauthorized
    AppError.NotFound -> R.string.reservation_error_not_found
    AppError.Validation -> R.string.reservation_error_validation
    AppError.PaymentDeclined -> R.string.reservation_error_payment_declined
    else -> R.string.entry_error_generic
}

internal fun hasBaseReservationFormData(
    customerName: String,
    partySize: Int,
    reservationAt: String?,
    isLoading: Boolean,
): Boolean = customerName.isNotBlank() && partySize >= 1 && reservationAt != null && !isLoading

internal fun canSubmitReservationForm(
    customerName: String,
    partySize: Int,
    reservationAt: String?,
    paymentMethod: PaymentMethod?,
    isLoading: Boolean,
): Boolean = hasBaseReservationFormData(customerName, partySize, reservationAt, isLoading) && paymentMethod != null

internal fun shouldShowReservationPaymentMethodError(
    submitAttempted: Boolean,
    paymentMethod: PaymentMethod?,
): Boolean = submitAttempted && paymentMethod == null
