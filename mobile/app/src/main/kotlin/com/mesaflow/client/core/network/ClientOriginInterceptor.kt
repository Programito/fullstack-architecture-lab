package com.mesaflow.client.core.network

import javax.inject.Inject
import javax.inject.Singleton
import okhttp3.Interceptor
import okhttp3.Response

const val CLIENT_ORIGIN_HEADER = "X-Client-Origin"
const val APK_CLIENT_ORIGIN = "apk-customer"

@Singleton
class ClientOriginInterceptor @Inject constructor() : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder()
            .header(CLIENT_ORIGIN_HEADER, APK_CLIENT_ORIGIN)
            .build()
        return chain.proceed(request)
    }
}
