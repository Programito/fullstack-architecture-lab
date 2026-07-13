package com.mesaflow.client.core.designsystem.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import coil3.ImageLoader
import coil3.SingletonImageLoader
import coil3.compose.AsyncImagePainter
import coil3.compose.LocalPlatformContext
import coil3.compose.rememberAsyncImagePainter

/**
 * Imagen remota con espacio reservado: mientras Coil sigue cargando, pinta un
 * skeleton del mismo tamano para evitar saltos bruscos en la carta.
 */
@Composable
fun LoadingAsyncImage(
    model: Any?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    imageLoader: ImageLoader = SingletonImageLoader.get(LocalPlatformContext.current),
    contentScale: ContentScale = ContentScale.Crop,
    loadingTestTag: String? = null,
) {
    if (model == null) {
        Box(
            modifier = modifier.background(
                color = androidx.compose.material3.MaterialTheme.colorScheme.surfaceContainerHighest,
                shape = androidx.compose.material3.MaterialTheme.shapes.small,
            ),
        )
        return
    }

    val painter = rememberAsyncImagePainter(
        model = model,
        imageLoader = imageLoader,
        contentScale = contentScale,
    )
    val state by painter.state.collectAsState()

    Box(modifier = modifier) {
        when (state) {
            AsyncImagePainter.State.Empty,
            is AsyncImagePainter.State.Loading,
            -> SkeletonBox(
                Modifier
                    .fillMaxSize()
                    .then(
                        if (loadingTestTag != null) {
                            Modifier.testTag(loadingTestTag)
                        } else {
                            Modifier
                        },
                    ),
            )

            is AsyncImagePainter.State.Error -> Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        color = androidx.compose.material3.MaterialTheme.colorScheme.surfaceContainerHighest,
                        shape = androidx.compose.material3.MaterialTheme.shapes.small,
                    ),
            )

            is AsyncImagePainter.State.Success -> Unit
        }

        if (state !is AsyncImagePainter.State.Error) {
            Image(
                painter = painter,
                contentDescription = contentDescription,
                contentScale = contentScale,
                modifier = Modifier.fillMaxSize(),
            )
        }
    }
}
