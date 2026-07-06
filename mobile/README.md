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
| Room | 2.8.4 (carrito persistente, Fase 5) |
| androidx.lifecycle (runtime/viewmodel-compose) | 2.10.0 (2.11.0 exige AGP 9.2; ver nota abajo) |

> **Nota AGP 9:** varias librerías de Google (Hilt 2.59+, lifecycle 2.11+) ya
> exigen AGP 9.x en su metadata. Este proyecto se queda deliberadamente en
> AGP 8.13 mientras sea viable, fijando esas dependencias a la última versión
> compatible. Cuando el ecosistema lo haga insostenible (cada vez más cerca),
> la migración es: AGP 9.2.x + Gradle 9.4.1+ + Hilt 2.60 + lifecycle 2.11+,
> y requiere Android Studio Otter 3 Feature Drop (2025.2.3) o más reciente.

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

- La URL base en debug es `http://127.0.0.1:3000/api/v1/`, alcanzada mediante un túnel de ADB
  (funciona igual en emulador y en dispositivo físico). Con el emulador/dispositivo ya arrancado
  y el backend levantado en local, ejecuta:
  ```
  adb reverse tcp:3000 tcp:3000
  ```
  Hay que repetir este comando cada vez que se reinicia el emulador o se reconecta el dispositivo
  (el túnel no persiste).
- El backend necesita `DEMO_LOGIN_ENABLED=true` para el modo demo (rol `waiter`).
- Solo el build de debug permite HTTP en claro (manifest de debug); release exige HTTPS.

> **Nota — por qué `adb reverse` y no `10.0.2.2`:** el alias `10.0.2.2` (NAT interno del
> emulador hacia el host) debería funcionar igual de bien y es más simple, pero en algunos
> entornos Windows falla con `SocketTimeoutException` de forma silenciosa (paquetes
> descartados) sin relación con firewall, antivirus, VPN ni con cómo escucha el backend —
> causa no confirmada, posiblemente un problema puntual del backend de red SLIRP del
> emulador en esa máquina. `adb reverse` evita esa capa de red virtual por completo (usa el
> canal de depuración de ADB), así que es la alternativa recomendada si `10.0.2.2` deja de
> responder. Si en tu máquina `10.0.2.2` funciona sin problemas, puedes usarlo en su lugar
> cambiando `BASE_URL` y sin necesitar el paso de `adb reverse`.

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

## Estado por fases

- [x] Fase 0 — Bootstrap: proyecto compila, tema base, Hilt cableado, i18n es/en/ca inicial
- [x] Fase 1 — Design system y tema Expressive (paleta teal/terracota, componentes base con previews)
- [x] Fase 2 — Core de red y sesión (Retrofit + kotlinx.serialization, refresh por cookie httpOnly, DataStore, tests MockWebServer)
- [x] Fase 3 — Entry: escáner QR (Google code scanner) + modo demo real + Navigation 3
- [x] Fase 4 — Carta real: buscador sin tildes, categorías, imágenes Coil, estados carga/vacío/error
- [x] Fase 5 — Configurador de producto (extras, combos, "sin X") + carrito Room con merge de líneas idénticas
- [x] Fase 6 — Resumen del pedido (editar/borrar líneas) y envío real a cocina (abre pedido + líneas + disparo a cocina; el carrito se conserva si algo falla)
- [x] Fase 7 — Cobro (pasarela mock: tarjeta/Bizum/efectivo, sin cargo real) + registro real del pago en backend + pantalla de pago aceptado
- [~] Fase 8 — Pulido, i18n completa, APK release: i18n, accesibilidad, animaciones (Nav3 + rebote del carrito) y `docs/mobile-app.md` ya hechos; quedan tests de UI y el APK release firmado.
