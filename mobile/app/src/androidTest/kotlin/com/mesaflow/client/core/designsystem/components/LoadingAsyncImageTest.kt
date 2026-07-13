package com.mesaflow.client.core.designsystem.components

import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.size
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import coil3.ImageLoader
import coil3.fetch.Fetcher
import com.mesaflow.client.core.designsystem.MesaFlowTheme
import kotlinx.coroutines.awaitCancellation
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class LoadingAsyncImageTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun muestraSkeletonMientrasLaImagenSigueCargando() {
        val imageLoader = ImageLoader.Builder(composeRule.activity)
            .components {
                add(HangingImageFetcher.Factory)
            }
            .build()

        composeRule.setContent {
            MesaFlowTheme {
                LoadingAsyncImage(
                    model = HangingImageModel,
                    contentDescription = "Producto",
                    imageLoader = imageLoader,
                    modifier = Modifier.size(72.dp),
                    loadingTestTag = "loading-image",
                )
            }
        }

        composeRule.onNodeWithTag("loading-image").assertIsDisplayed()
    }

    @Test
    fun ocultaElSkeletonCuandoLaImagenYaSeHaCargado() {
        composeRule.setContent {
            MesaFlowTheme {
                LoadingAsyncImage(
                    model = TRANSPARENT_PNG_DATA_URI,
                    contentDescription = "Producto",
                    modifier = Modifier.size(72.dp),
                    loadingTestTag = "loading-image",
                )
            }
        }

        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithTag("loading-image").fetchSemanticsNodes().isEmpty()
        }

        composeRule.onAllNodesWithTag("loading-image").assertCountEquals(0)
    }
}

private data object HangingImageModel

private class HangingImageFetcher : Fetcher {
    override suspend fun fetch() = awaitCancellation()

    data object Factory : Fetcher.Factory<HangingImageModel> {
        override fun create(
            data: HangingImageModel,
            options: coil3.request.Options,
            imageLoader: ImageLoader,
        ): Fetcher = HangingImageFetcher()
    }
}

private const val TRANSPARENT_PNG_DATA_URI =
    "data:image/png;base64," +
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnM6N8AAAAASUVORK5CYII="
