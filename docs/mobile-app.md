# MesaFlow Mobile — arquitectura

Documento técnico de la app cliente Android (`mobile/`). Complementa el plan de
fases (`docs/plan-mobile-app-cliente.md`) y el `mobile/README.md` (setup,
flujo de pedido). Aquí el foco es *cómo* está construida: capas, paquetes,
conexión al backend y los dos flujos críticos de extremo a extremo.

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

## Capas y paquetes

Single-activity (`MainActivity`) + Jetpack Compose, patrón MVVM/UDF
(ViewModel expone `StateFlow<UiState>`; la UI solo emite eventos). Organización
feature-first: cada pantalla vive en su propio paquete bajo `feature/` y solo
depende de `core/` (nunca de otra `feature/`).

```mermaid
flowchart TB
    subgraph feature["feature/*"]
        entry["entry\n(QR + demo)"]
        menu["menu\n(carta + buscador)"]
        product["product\n(configurador)"]
        cart["cart\n(resumen)"]
        checkout["checkout\n(cobro mock)"]
    end

    subgraph core["core/*"]
        network["network\n(Retrofit + OkHttp)"]
        data["data\n(repositorios)"]
        database["database\n(Room: carrito)"]
        datastore["datastore\n(sesión)"]
        designsystem["designsystem\n(tema + componentes)"]
    end

    nav["navigation\n(Nav3: back stack + claves)"]

    entry --> nav --> menu --> nav --> cart --> nav --> checkout
    menu --> product

    feature --> data
    data --> network
    data --> database
    data --> datastore
    feature --> designsystem
```

- **`core/network`** — Retrofit + `kotlinx.serialization`; `AuthInterceptor` y
  `TokenAuthenticator` gestionan el token de sesión, `SessionCookieJar`
  persiste la cookie httpOnly entre llamadas.
- **`core/data`** — un repositorio por dominio (`MenuRepository`,
  `CartRepository`, `OrderRepository`, `AuthRepository`); traducen DTOs de red
  a los modelos de `core/model` y son el único punto que toca `core/network` +
  `core/database` a la vez.
- **`core/database`** — Room, solo para el carrito (persiste entre reinicios
  de la app; el resto del estado es efímero o vive en el backend).
- **`core/datastore`** — sesión activa (mesa/restaurante) vía Preferences
  DataStore.
- **`navigation`** — Navigation 3: el back stack (`rememberNavBackStack`) es
  estado propio de la composable raíz, no de un `ViewModel` compartido; las
  claves (`NavKeys.kt`) son `@Serializable` para sobrevivir a la muerte de
  proceso.

## Navegación entre pantallas

```mermaid
stateDiagram-v2
    [*] --> Entry
    Entry --> Menu: onEnter (QR o demo)
    Menu --> Cart: onCartClick
    Cart --> Menu: onBack
    Cart --> Checkout: onCheckout (pedido enviado a cocina)
    Checkout --> Menu: onDone (pago aceptado, stack limpio)
    Menu --> Entry: sessionExpired (stack vacío)
```

Entry → Menu y Checkout → Menu **reemplazan** el stack (`backStack.clear()`)
para que atrás nunca vuelva al login ni a un cobro ya cerrado. Las
transiciones (`MesaFlowNavigation.kt`) son un fundido + deslizamiento sutil
(`transitionSpec`/`popTransitionSpec`, 220 ms), simétrico en ambas
direcciones e incluye `predictivePopTransitionSpec` para el gesto de retroceso
predictivo de Android.

## Flujo crítico: pedir y enviar a cocina

```mermaid
sequenceDiagram
    participant UI as MenuScreen / CartScreen
    participant VM as CartViewModel
    participant Repo as OrderRepository
    participant API as Backend

    UI->>VM: onSubmit()
    VM->>Repo: submitCart(restaurantId, tableId, lines)
    Repo->>API: POST .../orders (abre o reutiliza el pedido)
    API-->>Repo: orderId
    loop por cada línea del carrito
        Repo->>API: POST .../orders/{orderId}/lines
        API-->>Repo: línea creada (estado pending)
    end
    Repo->>API: POST .../send-to-kitchen
    API-->>Repo: 201 (líneas -> preparing, mesa -> waiting_kitchen)
    Repo-->>VM: éxito
    VM->>Repo: cartRepository.clear(restaurantId)
    VM-->>UI: navegar a Checkout
```

Si cualquier paso falla (incluido `send-to-kitchen`), `OrderRepository` no
limpia el carrito Room: la línea se conserva y el usuario puede reintentar sin
perder su configuración. El paso de `send-to-kitchen` es imprescindible: sin
él las líneas quedan en `pending` y el panel de cocina no las ve nunca (ver
`mobile/README.md` → *Flujo del pedido contra el backend*).

## Validación

Diagramas verificados con el validador Mermaid del repo:

```bash
python C:\Users\Thor_\.codex\skills\mermaid-docs-validator\scripts\validate_mermaid_docs.py docs
```
