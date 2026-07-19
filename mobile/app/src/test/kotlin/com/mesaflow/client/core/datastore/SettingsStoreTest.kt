package com.mesaflow.client.core.datastore

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import com.mesaflow.client.core.model.AppLanguage
import com.mesaflow.client.core.model.Session
import com.mesaflow.client.core.model.ThemeMode
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

class SettingsStoreTest {

    private lateinit var scope: CoroutineScope
    private lateinit var tmpFile: File
    private lateinit var store: SettingsStore
    private lateinit var sessionStore: SessionStore

    @Before
    fun setUp() {
        scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
        tmpFile = File.createTempFile("settings-test", ".preferences_pb").also { it.delete() }
        val dataStore = PreferenceDataStoreFactory.create(scope = scope, produceFile = { tmpFile })
        store = SettingsStore(dataStore)
        sessionStore = SessionStore(dataStore)
    }

    @After
    fun tearDown() {
        scope.cancel()
        tmpFile.delete()
    }

    @Test
    fun `el tema por defecto es SYSTEM`() = runTest {
        assertEquals(ThemeMode.SYSTEM, store.themeMode.first())
    }

    @Test
    fun `guardar un tema se refleja en el flow`() = runTest {
        store.setThemeMode(ThemeMode.DARK)

        assertEquals(ThemeMode.DARK, store.themeMode.first())
    }

    @Test
    fun `el idioma por defecto es SYSTEM`() = runTest {
        assertEquals(AppLanguage.SYSTEM, store.language.first())
    }

    @Test
    fun `guardar un idioma se refleja en el flow`() = runTest {
        store.setLanguage(AppLanguage.CA)

        assertEquals(AppLanguage.CA, store.language.first())
    }

    @Test
    fun `limpiar la sesion conserva el idioma seleccionado`() = runTest {
        store.setLanguage(AppLanguage.ES)
        sessionStore.saveSession(
            session = Session(
                accessToken = "token",
                userId = "user-id",
                email = "cliente@example.com",
                displayName = "Cliente",
                roles = listOf("customer"),
                permissions = listOf("service"),
                restaurantScopes = listOf("restaurant-id"),
            ),
            refreshCookie = "refresh-cookie",
        )

        sessionStore.clear()

        assertNull(sessionStore.session.first())
        assertEquals(AppLanguage.ES, store.language.first())
    }

    // No hay test de "sobrevive a reabrir el DataStore": DataStore no permite
    // dos instancias activas sobre el mismo fichero a la vez (lanza
    // IllegalStateException), y simular un reinicio de proceso de forma
    // fiable exigiría cancelar y esperar la limpieza async de la primera
    // instancia antes de abrir la segunda — complejidad que no aporta nada,
    // porque la persistencia en disco es una garantía de la propia librería
    // DataStore, no algo que SettingsStore deba re-verificar aquí.
}
