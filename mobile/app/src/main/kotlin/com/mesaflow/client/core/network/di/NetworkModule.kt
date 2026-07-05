package com.mesaflow.client.core.network.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStoreFile
import com.mesaflow.client.BuildConfig
import com.mesaflow.client.core.network.AuthApi
import com.mesaflow.client.core.network.AuthInterceptor
import com.mesaflow.client.core.network.RefreshApi
import com.mesaflow.client.core.network.SessionCookieJar
import com.mesaflow.client.core.network.TokenAuthenticator
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Named
import javax.inject.Singleton
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Named("baseUrl")
    fun provideBaseUrl(): String = BuildConfig.BASE_URL

    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
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
    fun provideRefreshOkHttpClient(cookieJar: SessionCookieJar): OkHttpClient =
        OkHttpClient.Builder()
            .cookieJar(cookieJar)
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
        cookieJar: SessionCookieJar,
        authInterceptor: AuthInterceptor,
        tokenAuthenticator: TokenAuthenticator,
    ): OkHttpClient =
        OkHttpClient.Builder()
            .cookieJar(cookieJar)
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

    private fun retrofit(client: OkHttpClient, baseUrl: String, json: Json): Retrofit =
        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()

    private fun basicLogging(): HttpLoggingInterceptor =
        HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
}
