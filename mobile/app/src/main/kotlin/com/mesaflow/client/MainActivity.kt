package com.mesaflow.client

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.mesaflow.client.core.designsystem.MesaFlowTheme
import com.mesaflow.client.feature.entry.EntryScreen
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MesaFlowTheme {
                // Fase 3: aquí vivirá el NavDisplay de Navigation 3.
                EntryScreen()
            }
        }
    }
}
