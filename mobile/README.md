# MesaFlow Mobile — app cliente Android

[← README principal](../README.md)

App nativa Android para que el cliente del restaurante pida desde su mesa. Kotlin + Jetpack Compose + Material 3, MVVM/UDF, feature-first.

Documentación relacionada:

- [Documento técnico de la app cliente](../docs/mobile-app.md)
- [Plan de desarrollo](../docs/plan-mobile-app-cliente.md)

## Primer build (Fase 0)

1. Abrir la carpeta `mobile/` en Android Studio Panda 4 / 2025.3.4 o más reciente, con soporte para AGP 9.2.
2. Dejar que sincronice: la primera vez descarga Gradle 9.4.1, el SDK de Android 37 y las dependencias.
3. Ejecutar la app en un emulador o dispositivo (API 26+). Debe verse la pantalla de bienvenida de MesaFlow.
4. Tests unitarios: `./gradlew test` (o `gradlew.bat test` en Windows).

## Stack fijado

| Pieza | Versión |
|---|---|
| AGP | 9.2.1 (Gradle wrapper 9.4.1) |
| Kotlin | 2.3.21 (+ plugin Compose y serialization) |
| KSP | 2.3.9 |
| Compose BOM | 2026.06.01 (Material 3) |
| Navigation 3 | 1.1.3 (se cablea en la Fase 3) |
| Hilt | 2.58 |
| kotlinx-serialization-json | 1.11.0 |
| Room | 2.8.4 (carrito persistente, Fase 5) |
| androidx.lifecycle (runtime/viewmodel-compose) | 2.10.0 |

> **Nota AGP 9:** el proyecto ya usa AGP 9.2.1 y Gradle 9.4.1. Conserva
> temporalmente `android.builtInKotlin=false` y `android.newDsl=false` para la
> integración actual de Kotlin/Hilt; Gradle avisa de que estas opciones y las
> APIs de variantes antiguas deben migrarse antes de AGP 10.

El catálogo incluye Room, Retrofit/OkHttp, DataStore, Coil y Google Code Scanner,
usados por las capas de datos y los flujos cliente actuales.

## Estructura

```txt
app/src/main/kotlin/com/mesaflow/client/
├── MainActivity.kt          # single-activity; acogerá el NavDisplay de Nav3
├── MesaFlowApp.kt           # @HiltAndroidApp
├── core/designsystem/       # MesaFlowTheme (Fase 1: Material 3 Expressive completo)
├── feature/entry/           # bienvenida (Fase 3: QR + modo demo reales)
└── navigation/              # (Fase 3) claves de ruta serializables + back stack
```

## Entrada y mesa

- **Readiness del backend**: al abrir la pantalla de entrada, `EntryViewModel` consulta
  `GET /health/readiness` y reintenta cada 5s mientras no esté `ready`, mostrando un aviso
  ("despertando"/"caído") sin bloquear el escáner ni el modo demo. Espeja el mismo patrón que
  ya usa el login del frontend (`PlatformReadinessService`): la base de datos es de hosting
  gratuito y puede quedarse dormida por inactividad.
- **Elegir mesa borra el carrito anterior**: `EntryViewModel.signInAndEnter` limpia
  `CartRepository` para el restaurante antes de guardar el nuevo `TableContext`. Cubre tanto
  "salir de la mesa y volver a entrar" como el caso silencioso de sesión expirada (el cliente
  vuelve a Entry con el carrito de la mesa anterior todavía en Room).

## Flujo del pedido contra el backend

Al pulsar "Enviar pedido a cocina", `OrderRepository.submitCart()` encadena estas llamadas:

1. `POST /restaurants/:id/service-points/:tableId/orders` — abre el pedido de la mesa
   (si ya hay uno activo, el backend devuelve ese mismo).
2. `POST /restaurants/:id/orders/:orderId/lines` — una llamada por línea del carrito
   (con `modifiers`, `comboSlots` y `platterComponents`).
3. `POST /restaurants/:id/service-points/:tableId/send-to-kitchen` — **imprescindible**:
   las líneas nacen en estado `pending` y el panel de cocina solo ve las que se disparan
   con esta llamada (pasan a `preparing`, el pedido a `sent_to_kitchen` y la mesa a
   `waiting_kitchen`). Sin este paso el pedido existe pero cocina no lo muestra.
4. (Fase 7, tras el mock de pasarela) `POST /restaurants/:id/orders/:orderId/payments` —
   registra el pago real (`amountCents`, `method`: card/bizum/cash).

El carrito Room solo se vacía si TODO el envío (incluido el disparo a cocina) confirma;
ante cualquier fallo se conserva para reintentar.

> **Nota de permisos (cambio en el backend):** `send-to-kitchen` exigía el permiso
> `kitchen`, pero es una acción de sala (la dispara el camarero o esta app cliente),
> así que ahora exige `service` — que el rol `waiter` del demo-login sí tiene. Los
> endpoints de cocina (cambiar estado de líneas, mark-served) siguen exigiendo
> `kitchen`. Queda un TODO en `restaurant-order.controller.ts`: cuando exista un
> rol/permiso dedicado de cliente final, diferenciarlo ahí.


## Build release firmado (Fase 8)

1. Genera un keystore propio una sola vez y guárdalo **fuera del repo** (o en la
   raíz de `mobile/`, está ignorado por git):
   ```
   keytool -genkeypair -v -keystore mesaflow-release.jks -alias mesaflow -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Crea `mobile/keystore.properties` (también ignorado por git):
   ```
   storeFile=mesaflow-release.jks
   storePassword=<contraseña del almacén>
   keyAlias=mesaflow
   keyPassword=<contraseña de la clave>
   ```
   `storeFile` se resuelve relativo a `mobile/`; también acepta ruta absoluta.
3. El build `release` usa el backend real HTTPS:
   ```text
   https://fullstack-architecture-lab.onrender.com/api/v1/
   ```
   El build `debug` conserva `http://127.0.0.1:3000/api/v1/` para desarrollo
   local mediante `adb reverse`.
4. Ejecuta los tests, compila y verifica la firma desde `mobile/` en Windows:
   ```powershell
   .\gradlew.bat test
   .\gradlew.bat :app:assembleRelease
   & "$env:ANDROID_HOME\build-tools\37.0.0\apksigner.bat" verify --verbose --print-certs .\app\build\outputs\apk\release\app-release.apk
   Copy-Item .\app\build\outputs\apk\release\app-release.apk .\app\build\outputs\apk\release\mesaflow-0.1.0.apk
   ```
   El APK queda en `app/build/outputs/apk/release/` con R8 y `shrinkResources`
   activados. Si `keystore.properties` no existe, el APK sale **sin firmar**
   (útil en CI, no instalable tal cual).

## Publicación gratuita en GitHub Releases

- Releases: https://github.com/Programito/fullstack-architecture-lab/releases
- Última versión: https://github.com/Programito/fullstack-architecture-lab/releases/latest

La primera publicación usa el tag `v0.1.0` y adjunta
`mesaflow-0.1.0.apk`. En cada publicación posterior se debe incrementar
`versionCode`; `versionName`, el tag y el nombre del APK deben reflejar la nueva
versión.

El usuario puede descargar el APK sin iniciar sesión porque el repositorio es
público. Android puede solicitar permiso para instalar aplicaciones desde el
navegador empleado. Esta distribución es directa y no procede de Google Play.
