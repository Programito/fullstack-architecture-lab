# Distribución Android mediante GitHub Releases

**Fecha:** 2026-07-19

## Objetivo

Publicar gratuitamente la aplicación Android de MesaFlow como un APK firmado y descargable desde las Releases públicas de `Programito/fullstack-architecture-lab`. La aplicación instalada debe conservar la identidad visual del frontend y consumir el backend desplegado en Render.

## Alcance

Esta entrega prepara la primera versión distribuible, `0.1.0` (`versionCode = 1`), sin publicar en Google Play. Incluye la configuración de producción, el icono Android, la firma local, la documentación, la verificación del APK y la publicación manual en GitHub Releases.

No se automatizará la publicación con GitHub Actions en esta primera versión. El keystore y sus contraseñas permanecerán fuera de Git.

## Configuración de red

Los builds mantendrán destinos separados:

- `debug`: `http://127.0.0.1:3000/api/v1/`, utilizado con `adb reverse tcp:3000 tcp:3000` para desarrollo local.
- `release`: `https://fullstack-architecture-lab.onrender.com/api/v1/`, utilizado por el APK distribuido.

La barra final se conservará porque Retrofit requiere una URL base terminada en `/`. El manifest principal seguirá permitiendo Internet y el permiso para tráfico HTTP en claro continuará limitado al source set `debug`.

No se añadirá el cliente Android a `FRONTEND_ORIGIN`: la aplicación usa Retrofit/OkHttp y no está sujeta a CORS del navegador. El encabezado existente `X-Client-Origin: apk-customer` se mantendrá sin cambios.

## Icono de la aplicación

El favicon vectorial de `frontend/public/favicon-mesaflow.svg` será la fuente visual del icono Android. Se reproducirán:

- la forma de la letra `M`;
- los tonos turquesa y cian;
- el acento interior de la marca;
- el contraste blanco/cian sobre el fondo corporativo.

El recurso Android continuará siendo un adaptive icon. El fondo y el primer plano estarán separados para que Android pueda aplicar máscaras circulares, cuadradas o redondeadas sin recortar la `M`. La figura principal permanecerá dentro de la zona segura del icono adaptativo.

El favicon del frontend no se modificará.

## Firma y secretos

Se generará un keystore de release dedicado a MesaFlow. `mobile/keystore.properties` referenciará el archivo y contendrá las credenciales necesarias para Gradle.

Estos archivos no se subirán al repositorio:

- el keystore (`*.jks` o `*.keystore`);
- `mobile/keystore.properties`;
- contraseñas, alias o claves privadas.

Antes de generar el primer APK se comprobará que las reglas de `mobile/.gitignore` cubren ambos archivos. El keystore se copiará a una ubicación de respaldo segura: todas las futuras actualizaciones deberán estar firmadas con la misma clave para que Android las acepte como actualización de la aplicación instalada.

## Artefacto y versionado

La distribución inicial utilizará un APK release firmado:

```text
mesaflow-0.1.0.apk
```

La Release de GitHub utilizará el tag `v0.1.0`. Las siguientes publicaciones incrementarán siempre `versionCode`; `versionName` y el tag reflejarán la versión visible correspondiente.

El enlace público esperado será:

```text
https://github.com/Programito/fullstack-architecture-lab/releases/download/v0.1.0/mesaflow-0.1.0.apk
```

## Experiencia de descarga

El README principal mostrará la aplicación Android junto al frontend y backend, enlazando a la página de Releases o al APK de la última versión estable.

El frontend incorporará un enlace visible de descarga para Android. Para evitar que el sitio quede atado a una versión concreta, el enlace preferido será la página estable de Releases:

```text
https://github.com/Programito/fullstack-architecture-lab/releases/latest
```

El texto avisará de que Android puede solicitar permiso para instalar aplicaciones desde el navegador. No se presentará el APK como una descarga de Google Play.

## Verificación

Antes de publicar se realizarán estas comprobaciones:

1. Ejecutar los tests unitarios de Android.
2. Compilar el build `release` con R8 y reducción de recursos.
3. Confirmar que el APK está firmado.
4. Instalar el APK en un dispositivo Android API 26 o superior.
5. Confirmar que el launcher muestra correctamente la `M` con máscaras circular y redondeada cuando sea posible.
6. Abrir la aplicación y comprobar `GET /api/v1/health/readiness` contra Render.
7. Probar entrada demo, carga de carta y un flujo de pedido representativo.
8. Descargar el APK publicado desde GitHub en un dispositivo e instalarlo como comprobación final del mismo artefacto distribuido.

Si Render está dormido, la pantalla de readiness existente debe mostrar el estado de arranque y recuperarse cuando la base de datos esté preparada.

## Documentación

`mobile/README.md` se actualizará para reflejar la URL real de producción, la generación del APK firmado, su nombre final y el procedimiento de GitHub Releases. El README raíz incorporará el enlace público de Android.

Las instrucciones conservarán claramente la diferencia entre ejecución local (`debug`) y distribución (`release`).

## Criterios de aceptación

- El build `debug` conserva la conexión local actual.
- El build `release` consume exclusivamente el backend HTTPS de Render.
- El icono instalado reproduce la identidad de la `M` del favicon y funciona como adaptive icon.
- El APK release está firmado, optimizado e instalable en Android API 26 o superior.
- Ningún secreto de firma aparece en Git.
- La documentación explica cómo reconstruir y publicar versiones posteriores.
- La Release pública permite descargar el APK sin iniciar sesión en GitHub.
- El enlace desde el frontend conduce a la distribución pública de Android.
