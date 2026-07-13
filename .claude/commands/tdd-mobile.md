# TDD Mobile Kotlin

Implementa cambios en la app cliente Android siguiendo el ciclo rojo-verde-refactor del proyecto.

## Flujo de trabajo

1. **Rojo:** Añadir o actualizar el test más pequeño primero. Confirmar que falla por la razón esperada.
2. **Verde:** Implementar el cambio mínimo que satisfaga el comportamiento.
3. **Refactor:** Limpiar mientras los tests siguen en verde.
4. **Ampliar:** Cuando el cambio afecte navegación, i18n (`strings.xml`), o un flujo cubierto por `androidTest`.

Si el primer test pasa antes de implementar, revisar el test — debe probar el comportamiento ausente.

## Contexto de la tarea

$ARGUMENTS

## Arquitectura

```txt
mobile/app/src/main/kotlin/com/mesaflow/client/
├── core/{model,data,network,database,datastore,designsystem}/
├── feature/<nombre>/     # pantalla + ViewModel
└── navigation/           # claves de ruta (Nav3) + back stack
```

Preferir extender un repositorio/ViewModel existente. DTOs (`network/dto/`) son un espejo del contrato del backend — los repositorios mapean a `core/model/`, nunca se exponen DTOs a la UI.

## Nivel de test adecuado

- Lógica pura (parser, filtro): spec JUnit junto al fuente, sin mocks.
- Repositorio con red: spec JUnit con `MockWebServer`.
- Repositorio con Room: spec JUnit con fake del DAO en memoria.
- Flujo crítico end-to-end: Compose UI Test instrumentado (`app/src/androidTest/`) con Hilt + `FakeBackend`.

## Notas

- `ViewModel`: `MutableStateFlow` privado + `StateFlow` público, `.update { it.copy(...) }`. Eventos puntuales de navegación vía `MutableSharedFlow<Unit>`.
- Repositorios devuelven `AppResult<T>`; `safeApiCall { ... }` traduce excepciones de red a `AppError` tipado — la UI nunca ve detalles técnicos.
- Room del carrito está indexado solo por `restaurantId`, no por mesa — revisar si un cambio de flujo de entrada necesita limpiar el carrito (ver `EntryViewModel.signInAndEnter`).
- `FakeBackend` usa cola FIFO estricta (`server.enqueue` en orden). Una llamada de red nueva que se dispare sola al componer una pantalla (p. ej. algo en `init` de un ViewModel) puede desordenar esa cola — decidir explícitamente cómo encaja antes de asumir que el test sigue pasando.
- Texto visible en `res/values/strings.xml` (es), `values-en/`, `values-ca/` — completar los tres si cambia texto visible.

## Cierre

Terminar con `/mobile-check` para ejecutar la verificación final mínima. Si el cambio toca `androidTest` y no hay emulador/dispositivo disponible, decirlo explícitamente en vez de asumir que pasa.
