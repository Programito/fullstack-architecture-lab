package com.mesaflow.client

import android.app.Application
import android.content.Context
import androidx.test.runner.AndroidJUnitRunner
import dagger.hilt.android.testing.HiltTestApplication

/**
 * Runner de instrumentación que sustituye la Application real por
 * [HiltTestApplication], como exige Hilt para poder inyectar en los tests
 * (ver `testInstrumentationRunner` en app/build.gradle.kts).
 */
class HiltTestRunner : AndroidJUnitRunner() {
    override fun newApplication(cl: ClassLoader?, name: String?, context: Context?): Application =
        super.newApplication(cl, HiltTestApplication::class.java.name, context)
}
