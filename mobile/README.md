# MesaFlow Mobile — app cliente Android

App nativa Android para que el cliente del restaurante pida desde su mesa. Kotlin + Jetpack Compose + Material 3, MVVM/UDF, feature-first. Plan completo en `../docs/plan-mobile-app-cliente.md`.

## Primer build (Fase 0)

1. Abrir la carpeta `mobile/` en Android Studio (Narwhal 4 / 2025.1.4 o más reciente — necesita soporte de AGP 8.13).
2. Dejar que sincronice: la primera vez descarga Gradle 8.14.3, el SDK de Android 37 y las dependencias.
3. Ejecutar la app en un emulador o dispositivo (API 26+). Debe verse la pantalla de bienvenida de MesaFlow.
4. Tests unitarios: `./gradlew test` (o `gradlew.bat test` en Windows).

## Stack fijado

| Pieza | Versión |
|---|---|
| AGP | 8.13.2 (Gradle wrapper 8.14.3) |
| Kotlin | 2.3.21 (+ plugin Compose y serialization) |
| KSP | 2.3.9 |
| Compose BOM | 2026.06.01 (Material 3) |
| Navigation 3 | 1.1.3 (se cablea en la Fase 3) |
| Hilt | 2.58 (última compatible con AGP 8.x; Hilt 2.59+ exige AGP 9) |
| kotlinx-serialization-json | 1.11.0 |
| androidx.lifecycle (runtime/viewmodel-compose) | 2.10.0 (2.11.0 exige AGP 9.2; ver nota abajo) |

> **Nota AGP 9:** varias librerias de Google (Hilt 2.59+, lifecycle 2.11+) ya
> exigen AGP 9.x en su metadata. Este proyecto se queda deliberadamente en
> AGP 8.13 mientras sea viable, fijando esas dependencias a la ultima version
> compatible. Cuando el ecosistema lo haga insostenible (cada vez mas cerca),
> la migracion es: AGP 9.2.x + Gradle 9.4.1+ + Hilt 2.60 + lifecycle 2.11+,
> y requiere Android Studio Otter 3 Feature Drop (2025.2.3) o mas reciente.

Room, Retrofit/OkHttp, DataStore, Coil y CameraX/ML Kit se añaden al catalog en las fases 2–5, cuando se usan.

## Estructura

```txt
app/src/main/kotlin/com/mesaflow/client/
├── MainActivity.kt          # single-activity; acogerá el NavDisplay de Nav3
├── MesaFlowApp.kt           # @HiltAndroidApp
├── core/designsystem/       # MesaFlowTheme (Fase 1: Material 3 Expressive completo)
├── feature/entry/           # bienvenida (Fase 3: QR + modo demo reales)
└── navigation/              # (Fase 3) claves de ruta serializables + back stack
```

## Conexión al backend en desarrollo

- La URL base en debug es `http://10.0.2.2:3000/api/v1/` (loopback del emulador hacia tu máquina).
- En dispositivo físico: `adb reverse tcp:3000 tcp:3000` y arrancar el backend en local.
- El backend necesita `DEMO_LOGIN_ENABLED=true` para el modo demo (rol `waiter`).
- Solo el build de debug permite HTTP en claro (manifest de debug); release exige HTTPS.

## Estado por fases

- [x] Fase 0 — Bootstrap: proyecto compila, tema base, Hilt cableado, i18n es/en/ca inicial
- [x] Fase 1 — Design system y tema Expressive (paleta teal/terracota, componentes base con previews)
- [x] Fase 2 — Core de red y sesión (Retrofit + kotlinx.serialization, refresh por cookie httpOnly, DataStore, tests MockWebServer)
- [ ] Fase 3 — Entry: escáner QR + modo demo + Navigation 3
- [ ] Fase 4 — Carta: buscador y categorías
- [ ] Fase 5 — Configurador de producto + carrito Room
- [ ] Fase 6 — Resumen y envío del pedido
- [ ] Fase 7 — Cobro mock + pago aceptado
- [ ] Fase 8 — Pulido, i18n completa, APK release
