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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.BasicAlertDialog
import androidx.compose.material3.Button
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
 * Reserva propia del cliente: crear una nueva (fecha, hora, comensales,
 * fianza fake), ver su estado y cancelarla. No hay listado de reservas
 * (ver [ReservationViewModel]): esta pantalla solo conoce la reserva que
 * ella misma creó, nunca las de otros clientes del restaurante.
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

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.reservation_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.reservation_back))
                    }
                },
            )
        },
    ) { innerPadding ->
        when {
            !uiState.hasChecked -> LoadingBody(innerPadding)
            uiState.reservation != null && !uiState.reservation!!.isClosed ->
                ReservationStatusCard(
                    reservation = uiState.reservation!!,
                    isLoading = uiState.isLoading,
                    onCancel = viewModel::cancelReservation,
                    contentPadding = innerPadding,
                )
            else ->
                ReservationForm(
                    isLoading = uiState.isLoading,
                    onSubmit = viewModel::createReservation,
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
private fun ReservationStatusCard(
    reservation: Reservation,
    isLoading: Boolean,
    onCancel: () -> Unit,
    contentPadding: PaddingValues,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(contentPadding)
            .padding(24.dp),
    ) {
        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
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
            }
        }
        Spacer(Modifier.height(24.dp))
        if (isLoading) {
            CircularProgressIndicator(Modifier.height(40.dp))
        } else {
            OutlinedButton(onClick = onCancel, modifier = Modifier.fillMaxWidth()) {
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
    var selectedMethod by remember { mutableStateOf(PaymentMethod.CARD) }
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
    val canSubmit = customerName.isNotBlank() && partySize >= 1 && reservationAt != null && !isLoading

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
            onClick = { selectedMethod = PaymentMethod.CARD },
        )
        ReservationPaymentMethodRow(
            label = stringResource(R.string.checkout_method_bizum),
            selected = selectedMethod == PaymentMethod.BIZUM,
            enabled = !isLoading,
            onClick = { selectedMethod = PaymentMethod.BIZUM },
        )
        ReservationPaymentMethodRow(
            label = stringResource(R.string.checkout_method_cash),
            selected = selectedMethod == PaymentMethod.CASH,
            enabled = !isLoading,
            onClick = { selectedMethod = PaymentMethod.CASH },
        )
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
                    onSubmit(
                        customerName.trim(),
                        customerPhone.trim().ifBlank { null },
                        partySize,
                        reservationAt!!,
                        notes.trim().ifBlank { null },
                        selectedMethod,
                    )
                },
                enabled = canSubmit,
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
