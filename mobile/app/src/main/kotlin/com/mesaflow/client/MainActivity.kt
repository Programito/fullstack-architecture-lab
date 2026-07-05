package com.mesaflow.client

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.mesaflow.client.core.designsystem.MesaFlowTheme
import com.mesaflow.client.navigation.MesaFlowNavigation
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MesaFlowTheme {
                MesaFlowNavigation()
            }
        }
    }
}
