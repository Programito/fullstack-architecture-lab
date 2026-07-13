package com.mesaflow.client.core.network.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStoreFile
import com.mesaflow.client.BuildConfig
import com.mesaflow.client.core.network.AuthApi
import com.mesaflow.client.core.network.AuthInterceptor
import com.mesaflow.client.core.network.ClientOriginInterceptor
import com.mesaflow.client.core.network.HealthApi
import com.mesaflow.client.core.network.MenuApi
import com.mesaflow.client.core.network.OrdersApi
import com.mesaflow.client.core.network.RefreshApi
import com.mesaflow.client.core.network.SessionCookieJar
import com.mesaflow.client.core.network.TokenAuthenticator
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import java.io.File
import javax.inject.Named
import javax.inject.Singleton
import kotlinx.serialization.json.Json
import okhttp3.Cache
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    /**
     * Caché HTTP en disco para respuestas con ETag (carta y estado del pedido): el backend
     * marca esos GET con `Cache-Control: private, max-age=0, must-revalidate`, así que OkHttp
     * revalida con If-None-Match y los sondeos repetidos se convierten en 304 sin cuerpo —
     * clave con un backend en hosting gratuito. Solo la usa el cliente principal; el de
     * refresh no hace GETs cacheables.
     */
    private const val HTTP_CACHE_DIR = "http_cache"
    private const val HTTP_CACHE_SIZE_BYTES = 5L * 1024 * 1024

    @Provides
    @Named("baseUrl")
    fun provideBaseUrl(): String = NetworkConfig.baseUrlOverride ?: BuildConfig.BASE_URL

    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
        // Sin esto, kotlinx.serialization omite campos con valor igual al
        // default (p.ej. quantity=1 en los DTOs de pedido), y el backend
        // los recibe como undefined -> 400 "must not be less than 1".
        encodeDefaults = true
    }

    @Provides
    @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> =
        PreferenceDataStoreFactory.create(
            produceFile = { context.preferencesDataStoreFile("mesaflow_session") },
        )

    /** Cliente sin Authenticator, solo para /auth/refresh (evita recursión de 401). */
    @Provides
    @Singleton
    @Named("refreshClient")
    fun provideRefreshOkHttpClient(
        cookieJar: SessionCookieJar,
        clientOriginInterceptor: ClientOriginInterceptor,
    ): OkHttpClient =
        OkHttpClient.Builder()
            .cookieJar(cookieJar)
            .addInterceptor(clientOriginInterceptor)
            .apply { if (BuildConfig.DEBUG) addInterceptor(basicLogging()) }
            .build()

    @Provides
    @Singleton
    fun provideRefreshApi(
        @Named("refreshClient") client: OkHttpClient,
        @Named("baseUrl") baseUrl: String,
        json: Json,
    ): RefreshApi = retrofit(client, baseUrl, json).create(RefreshApi::class.java)

    @Provides
    @Singleton
    fun provideOkHttpClient(
        @ApplicationContext context: Context,
        cookieJar: SessionCookieJar,
        clientOriginInterceptor: ClientOriginInterceptor,
        authInterceptor: AuthInterceptor,
        tokenAuthenticator: TokenAuthenticator,
    ): OkHttpClient =
        OkHttpClient.Builder()
            .cache(Cache(File(context.cacheDir, HTTP_CACHE_DIR), HTTP_CACHE_SIZE_BYTES))
            .cookieJar(cookieJar)
            .addInterceptor(clientOriginInterceptor)
            .addInterceptor(authInterceptor)
            .authenticator(tokenAuthenticator)
            .apply { if (BuildConfig.DEBUG) addInterceptor(basicLogging()) }
            .build()

    @Provides
    @Singleton
    fun provideRetrofit(
        client: OkHttpClient,
        @Named("baseUrl") baseUrl: String,
        json: Json,
    ): Retrofit = retrofit(client, baseUrl, json)

    @Provides
    @Singleton
    fun provideAuthApi(retrofit: Retrofit): AuthApi = retrofit.create(AuthApi::class.java)

    @Provides
    @Singleton
    fun provideMenuApi(retrofit: Retrofit): MenuApi = retrofit.create(MenuApi::class.java)

    @Provides
    @Singleton
    fun provideOrdersApi(retrofit: Retrofit): OrdersApi = retrofit.create(OrdersApi::class.java)

    @Provides
    @Singleton
    fun provideHealthApi(retrofit: Retrofit): HealthApi = retrofit.create(HealthApi::class.java)

    private fun retrofit(client: OkHttpClient, baseUrl: String, json: Json): Retrofit =
        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()

    private fun basicLogging(): HttpLoggingInterceptor =
        HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
}
