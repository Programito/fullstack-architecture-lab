# Mobile Quality Check

Ejecuta la verificación final mínima para el trabajo completado en la app cliente Android (`mobile/`).

Analiza los archivos cambiados y decide qué comandos ejecutar desde `mobile/` (en Windows, si `JAVA_HOME` no está en la shell, usar `$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'` antes de invocar Gradle):

**Matriz de verificación:**
- Lógica pura (parser, filtro) → spec JUnit enfocada: `./gradlew :app:testDebugUnitTest --tests "<paquete.Clase>"`
- Repositorio con red o Room → spec con `MockWebServer`/fake de DAO, luego `./gradlew :app:testDebugUnitTest`
- ViewModel, pantalla, navegación → `./gradlew :app:compileDebugKotlin :app:compileDebugAndroidTestKotlin`
- Nueva llamada de red disparada al abrir una pantalla (p. ej. algo en `init` de un ViewModel) → revisar si `FakeBackend` (cola FIFO estricta) necesita ajuste antes de que un test instrumentado existente se rompa en silencio
- Cambio i18n → completar `values/strings.xml`, `values-en/`, `values-ca/`
- Toolchain (`build.gradle.kts`, `libs.versions.toml`, wrapper Gradle/AGP) → seguir `.codex/skills/documenting-mobile-kotlin-changes/SKILL.md` y actualizar `mobile/README.md`

**Sobre `androidTest`:** si el entorno no tiene emulador/dispositivo Android conectado, `./gradlew :app:connectedDebugAndroidTest` no se puede ejecutar. En ese caso, el mínimo aceptable es `compileDebugAndroidTestKotlin` en verde (detecta errores de compilación) más una petición explícita de verificación manual en Android Studio o CI — nunca reportar un test instrumentado como "pasado" sin haberlo ejecutado de verdad.

**Checklist final antes de cerrar:**
1. No se revirtieron cambios del usuario no relacionados.
2. `./gradlew :app:testDebugUnitTest` en verde.
3. `./gradlew :app:compileDebugAndroidTestKotlin` en verde si se tocó algo bajo `app/src/androidTest/`.
4. Traducciones completas para `es`, `en` y `ca` si cambió texto visible.
5. `mobile/README.md` sigue reflejando el comportamiento real (setup, stack fijado, flujo de pedido, entrada/mesa).

Reporta: comandos ejecutados con resultado, checks omitidos con razón (incluida la falta de emulador si aplica), y cualquier riesgo residual.
