# Android GitHub Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a signed MesaFlow Android 0.1.0 APK that uses the Render backend, carries the frontend's `M` branding, and is publicly downloadable from GitHub Releases and the deployed frontend.

**Architecture:** Keep Android `debug` and `release` network configuration separate through `BuildConfig.BASE_URL`. Rebuild the launcher as an adaptive vector icon using the existing SVG identity, expose the stable GitHub Releases URL from the Angular root footer, and keep all signing material local and ignored. Build, verify, install, smoke-test, and then publish the exact verified APK manually on GitHub.

**Tech Stack:** Android/Kotlin, Gradle Kotlin DSL, Android adaptive vector drawables, Retrofit/OkHttp, Angular 21, Vitest/Testing Library, GitHub Releases.

## Global Constraints

- Android application ID remains `com.mesaflow.client`.
- Initial public version remains `versionCode = 1` and `versionName = "0.1.0"`.
- Android `debug` keeps `http://127.0.0.1:3000/api/v1/` for `adb reverse` development.
- Android `release` uses `https://fullstack-architecture-lab.onrender.com/api/v1/` with the trailing slash.
- Minimum supported Android API remains 26.
- The favicon files under `frontend/public/` remain unchanged and are the visual source of truth.
- The keystore, `keystore.properties`, passwords, and private keys never enter Git.
- Existing unrelated working-tree files and user changes are not staged, deleted, or reverted.
- GitHub publication uses the public repository `Programito/fullstack-architecture-lab` and tag `v0.1.0`.

---

## File Map

- `mobile/app/build.gradle.kts`: release backend URL, version, and existing signing configuration.
- `mobile/app/src/main/res/drawable/ic_launcher_background.xml`: new adaptive-icon gradient background.
- `mobile/app/src/main/res/drawable/ic_launcher_foreground.xml`: branded `M` foreground and cyan accent.
- `mobile/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`: adaptive launcher composition.
- `mobile/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`: round-launcher alias using the same layers.
- `mobile/app/src/main/AndroidManifest.xml`: regular and round launcher references.
- `frontend/src/app/app.ts`: stable public Android Releases URL.
- `frontend/src/app/app.html`: global Android download link.
- `frontend/src/app/app.css`: accessible footer/link presentation.
- `frontend/src/app/app.spec.ts`: download-link behavior and security attributes.
- `mobile/README.md`: signing, build, verification, and GitHub Release instructions.
- `README.md`: public Android download entry in English and Spanish production sections.
- `mobile/mesaflow-release.jks`: local ignored signing key, created interactively and never committed.
- `mobile/keystore.properties`: local ignored Gradle signing values, created interactively and never committed.

---

### Task 1: Point Android Release Builds at Render

**Files:**
- Modify: `mobile/app/build.gradle.kts:48-54`

**Interfaces:**
- Consumes: NestJS production prefix `/api/v1` and the deployed Render origin.
- Produces: `BuildConfig.BASE_URL = "https://fullstack-architecture-lab.onrender.com/api/v1/"` for the `release` variant.

- [ ] **Step 1: Confirm the current variant split**

Run from the repository root:

```powershell
rg -n 'buildConfigField\("String", "BASE_URL"' mobile/app/build.gradle.kts
```

Expected: `debug` shows `127.0.0.1` and `release` shows `api.mesaflow.example`.

- [ ] **Step 2: Replace only the release URL**

Keep the build types exactly separated:

```kotlin
debug {
    // Host local via tunel ADB: requiere "adb reverse tcp:3000 tcp:3000" en cada
    // reinicio del emulador/dispositivo. Ver README para detalles y alternativa 10.0.2.2.
    buildConfigField("String", "BASE_URL", "\"http://127.0.0.1:3000/api/v1/\"")
}
release {
    buildConfigField(
        "String",
        "BASE_URL",
        "\"https://fullstack-architecture-lab.onrender.com/api/v1/\"",
    )
    isMinifyEnabled = true
    isShrinkResources = true
    proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
    signingConfig = signingConfigs.findByName("release")
}
```

- [ ] **Step 3: Compile the release Kotlin sources**

Run from `mobile/`:

```powershell
.\gradlew.bat :app:compileReleaseKotlin
```

Expected: `BUILD SUCCESSFUL`; generated release code contains the HTTPS Render URL.

- [ ] **Step 4: Confirm local networking did not change**

Run from the repository root:

```powershell
rg -n '127\.0\.0\.1:3000|fullstack-architecture-lab\.onrender\.com' mobile/app/build.gradle.kts
```

Expected: one local `debug` URL and one Render `release` URL.

- [ ] **Step 5: Commit the production endpoint change**

```powershell
git add mobile/app/build.gradle.kts
git commit -m "fix(mobile): use production API in release builds"
```

---

### Task 2: Replace the Placeholder Launcher with the MesaFlow Brand

**Files:**
- Create: `mobile/app/src/main/res/drawable/ic_launcher_background.xml`
- Modify: `mobile/app/src/main/res/drawable/ic_launcher_foreground.xml`
- Modify: `mobile/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`
- Create: `mobile/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`
- Modify: `mobile/app/src/main/AndroidManifest.xml`

**Interfaces:**
- Consumes: paths and colors from `frontend/public/favicon-mesaflow.svg`.
- Produces: Android adaptive icon layers referenced by both `android:icon` and `android:roundIcon`.

- [ ] **Step 1: Add the gradient background drawable**

Create `mobile/app/src/main/res/drawable/ic_launcher_background.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="64"
    android:viewportHeight="64">
    <path android:pathData="M0,0H64V64H0Z">
        <aapt:attr name="android:fillColor">
            <gradient
                android:startX="8"
                android:startY="6"
                android:endX="56"
                android:endY="58"
                android:type="linear">
                <item android:offset="0" android:color="#FF0F766E" />
                <item android:offset="1" android:color="#FF06B6D4" />
            </gradient>
        </aapt:attr>
    </path>
</vector>
```

- [ ] **Step 2: Replace the foreground with the favicon's `M` and accent**

Replace `mobile/app/src/main/res/drawable/ic_launcher_foreground.xml` with:

```xml
<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="64"
    android:viewportHeight="64">
    <path android:pathData="M15,48V16H24L32,27L40,16H49V48H41V28L32,40L23,28V48Z">
        <aapt:attr name="android:fillColor">
            <gradient
                android:startX="20"
                android:startY="18"
                android:endX="44"
                android:endY="46"
                android:type="linear">
                <item android:offset="0" android:color="#FFFFFFFF" />
                <item android:offset="1" android:color="#FFCFFAFE" />
            </gradient>
        </aapt:attr>
    </path>
    <path
        android:pathData="M23,28L32,40L41,28"
        android:fillColor="@android:color/transparent"
        android:strokeColor="#FF67E8F9"
        android:strokeWidth="3"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />
</vector>
```

- [ ] **Step 3: Point the adaptive icon background at the new drawable**

Set `mobile/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` to:

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
```

- [ ] **Step 4: Add the round launcher resource**

Create `mobile/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml` with the same adaptive layers:

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
```

- [ ] **Step 5: Declare the round icon in the manifest**

Add the `roundIcon` attribute beside `android:icon`:

```xml
<application
    android:name=".MesaFlowApp"
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:label="@string/app_name"
    android:supportsRtl="true"
    android:theme="@style/Theme.MesaFlow">
```

- [ ] **Step 6: Compile Android resources**

Run from `mobile/`:

```powershell
.\gradlew.bat :app:processDebugResources :app:processReleaseResources
```

Expected: `BUILD SUCCESSFUL` with no invalid vector, gradient, or resource-reference errors.

- [ ] **Step 7: Inspect the icon preview**

Open `ic_launcher.xml` in Android Studio's adaptive icon preview and inspect circular, squircle, rounded-square, and square masks.

Expected: the entire `M` and cyan accent remain visible in every mask with no embedded rounded-square border.

- [ ] **Step 8: Commit the launcher resources**

```powershell
git add mobile/app/src/main/AndroidManifest.xml mobile/app/src/main/res/drawable/ic_launcher_background.xml mobile/app/src/main/res/drawable/ic_launcher_foreground.xml mobile/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml mobile/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml
git commit -m "feat(mobile): apply MesaFlow adaptive launcher icon"
```

---

### Task 3: Add the Android Download Link to the Frontend

**Files:**
- Modify: `frontend/src/app/app.spec.ts`
- Modify: `frontend/src/app/app.ts`
- Modify: `frontend/src/app/app.html`
- Modify: `frontend/src/app/app.css`

**Interfaces:**
- Consumes: stable URL `https://github.com/Programito/fullstack-architecture-lab/releases/latest`.
- Produces: a global external link named `Android APK`, available on every frontend route.

- [ ] **Step 1: Write the failing link test**

Add to `frontend/src/app/app.spec.ts`:

```typescript
it('links to the latest public Android release securely', async () => {
  await render(App);

  const link = screen.getByRole('link', { name: 'Android APK' });

  expect(link.getAttribute('href')).toBe(
    'https://github.com/Programito/fullstack-architecture-lab/releases/latest',
  );
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run from `frontend/`:

```powershell
pnpm test -- --watch=false src/app/app.spec.ts
```

Expected: FAIL because no link with accessible name `Android APK` exists.

- [ ] **Step 3: Expose the stable Releases URL**

Add to the `App` class in `frontend/src/app/app.ts`:

```typescript
protected readonly androidReleaseUrl =
  'https://github.com/Programito/fullstack-architecture-lab/releases/latest';
```

- [ ] **Step 4: Add the link to the global footer**

Replace the footer content in `frontend/src/app/app.html` with:

```html
<footer class="app-layout__footer" aria-label="Frontend version and downloads">
  <a
    class="app-layout__android-link"
    [href]="androidReleaseUrl"
    target="_blank"
    rel="noopener noreferrer"
  >
    Android APK
  </a>
  <span>{{ version }}</span>
</footer>
```

- [ ] **Step 5: Style the footer link with keyboard focus**

Update the existing footer rule and add the link rules in `frontend/src/app/app.css`:

```css
.app-layout__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  color: var(--ui-text-muted, #64748b);
  font-size: 0.75rem;
  line-height: 1rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.app-layout__android-link {
  color: inherit;
  text-underline-offset: 0.2em;
}

.app-layout__android-link:hover {
  color: var(--ui-primary, #0ea5e9);
}

.app-layout__android-link:focus-visible {
  border-radius: 0.25rem;
  outline: 2px solid var(--ui-primary, #0ea5e9);
  outline-offset: 3px;
}
```

- [ ] **Step 6: Run the focused test and build**

Run from `frontend/`:

```powershell
pnpm test -- --watch=false src/app/app.spec.ts
pnpm build
```

Expected: focused tests pass and the production build completes without template or CSS errors.

- [ ] **Step 7: Commit the download link**

```powershell
git add frontend/src/app/app.ts frontend/src/app/app.html frontend/src/app/app.css frontend/src/app/app.spec.ts
git commit -m "feat(frontend): link public Android releases"
```

---

### Task 4: Synchronize Android and Root Documentation

**Files:**
- Modify: `mobile/README.md:81-108`
- Modify: `README.md:80-85`
- Modify: `README.md:229-234`
- Modify: `docs/plan-mobile-app-cliente.md:113`

**Interfaces:**
- Consumes: final Render URL, artifact name, release tag, and signing workflow from Tasks 1-3.
- Produces: reproducible English/Spanish setup and publication instructions.

- [ ] **Step 1: Replace the mobile release placeholder**

Update `mobile/README.md` so the release URL is documented as:

```text
https://fullstack-architecture-lab.onrender.com/api/v1/
```

Remove the statement that `https://api.mesaflow.example` is still configured.

- [ ] **Step 2: Document the exact build and verification commands**

Add this release flow to `mobile/README.md`:

```powershell
.\gradlew.bat test
.\gradlew.bat :app:assembleRelease
& 'C:\Users\Thor_\AppData\Local\Android\Sdk\build-tools\37.0.0\apksigner.bat' verify --verbose --print-certs .\app\build\outputs\apk\release\app-release.apk
Copy-Item .\app\build\outputs\apk\release\app-release.apk .\app\build\outputs\apk\release\mesaflow-0.1.0.apk
```

Document that the named APK is uploaded to tag `v0.1.0` and that every future release increments `versionCode`.

- [ ] **Step 3: Document the public GitHub release URL**

Add both URLs to `mobile/README.md`:

```text
Releases: https://github.com/Programito/fullstack-architecture-lab/releases
Latest:   https://github.com/Programito/fullstack-architecture-lab/releases/latest
```

Explain that users may need to authorize installation from their browser and that the APK is not a Google Play installation.

- [ ] **Step 4: Add Android to both root production sections**

Add the following entry below `Backend` in the English and Spanish production sections of `README.md`:

```markdown
- **Android:** https://github.com/Programito/fullstack-architecture-lab/releases/latest
```

- [ ] **Step 5: Mark the release preparation status accurately**

Update `docs/plan-mobile-app-cliente.md` so Phase 8 records that code/configuration is ready for a signed GitHub Release while physical-device validation and external publication remain operational release steps.

- [ ] **Step 6: Search for stale networking and publishing text**

Run from the repository root:

```powershell
rg -n 'api\.mesaflow\.example|127\.0\.0\.1:3000|GitHub Releases|releases/latest|versionCode' mobile README.md docs
```

Expected: no production placeholder remains; localhost appears only in development/test guidance; release instructions and versioning are consistent.

- [ ] **Step 7: Validate Markdown whitespace**

```powershell
git diff --check -- README.md mobile/README.md docs/plan-mobile-app-cliente.md
```

Expected: no output.

- [ ] **Step 8: Commit synchronized documentation**

```powershell
git add README.md mobile/README.md docs/plan-mobile-app-cliente.md
git commit -m "docs: add Android GitHub release workflow"
```

---

### Task 5: Create the Local Release Signing Identity

**Files:**
- Create locally, ignored: `mobile/mesaflow-release.jks`
- Create locally, ignored: `mobile/keystore.properties`

**Interfaces:**
- Consumes: signing configuration already present in `mobile/app/build.gradle.kts`.
- Produces: local `release` signing config named `release`; no committed files.

- [ ] **Step 1: Confirm both secret files are ignored before creating them**

Run from the repository root:

```powershell
git check-ignore -v mobile/mesaflow-release.jks mobile/keystore.properties
```

Expected: `mobile/.gitignore` matches `*.jks` and `keystore.properties`.

- [ ] **Step 2: Generate the keystore interactively**

Run from `mobile/`:

```powershell
& 'C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe' -genkeypair -v -keystore .\mesaflow-release.jks -alias mesaflow -keyalg RSA -keysize 2048 -validity 10000
```

Choose and store the prompted passwords in a password manager. Use the real publisher identity requested by `keytool`; do not paste passwords into the terminal command or any tracked document.

- [ ] **Step 3: Create the local Gradle properties file**

Create `mobile/keystore.properties` in a local editor with exactly these four keys:

```properties
storeFile=mesaflow-release.jks
storePassword=the store password entered in Step 2
keyAlias=mesaflow
keyPassword=the key password entered in Step 2
```

The two password descriptions above must be replaced locally with the actual secret values before saving. Never stage this file.

- [ ] **Step 4: Verify Gradle detects the release signing configuration**

Run from `mobile/`:

```powershell
.\gradlew.bat :app:signingReport
```

Expected: variant `release` reports the `mesaflow-release.jks` store and alias `mesaflow` without exposing passwords.

- [ ] **Step 5: Verify the secrets remain untracked**

Run from the repository root:

```powershell
git status --short --ignored mobile/mesaflow-release.jks mobile/keystore.properties
```

Expected: both paths are marked `!!`, not `??` or staged.

- [ ] **Step 6: Back up the signing identity**

Store an encrypted copy of `mesaflow-release.jks`, its alias, and both passwords in a second secure location controlled by the publisher. This backup is required before public distribution because Android updates must use the same key.

---

### Task 6: Build, Verify, Install, and Smoke-Test the APK

**Files:**
- Produce: `mobile/app/build/outputs/apk/release/app-release.apk`
- Produce: `mobile/app/build/outputs/apk/release/mesaflow-0.1.0.apk`

**Interfaces:**
- Consumes: Tasks 1-5 and a connected Android API 26+ device with USB debugging enabled.
- Produces: the exact signed APK approved for public upload.

- [ ] **Step 1: Run the Android unit suite**

Run from `mobile/`:

```powershell
.\gradlew.bat test
```

Expected: all unit tests pass.

- [ ] **Step 2: Build the optimized release APK**

```powershell
.\gradlew.bat :app:assembleRelease
```

Expected: `BUILD SUCCESSFUL` and `app/build/outputs/apk/release/app-release.apk` exists.

- [ ] **Step 3: Verify the APK signature and certificate**

```powershell
& 'C:\Users\Thor_\AppData\Local\Android\Sdk\build-tools\37.0.0\apksigner.bat' verify --verbose --print-certs .\app\build\outputs\apk\release\app-release.apk
```

Expected: `Verified` and at least APK Signature Scheme v2 is `true`; record the SHA-256 certificate digest in the private release notes.

- [ ] **Step 4: Create the versioned upload copy**

```powershell
Copy-Item .\app\build\outputs\apk\release\app-release.apk .\app\build\outputs\apk\release\mesaflow-0.1.0.apk
```

Expected: both files have the same byte length and SHA-256 digest.

- [ ] **Step 5: Compare the artifact hashes**

```powershell
Get-FileHash .\app\build\outputs\apk\release\app-release.apk -Algorithm SHA256
Get-FileHash .\app\build\outputs\apk\release\mesaflow-0.1.0.apk -Algorithm SHA256
```

Expected: identical hashes.

- [ ] **Step 6: Install the versioned APK on a connected device**

```powershell
& 'C:\Users\Thor_\AppData\Local\Android\Sdk\platform-tools\adb.exe' devices
& 'C:\Users\Thor_\AppData\Local\Android\Sdk\platform-tools\adb.exe' install -r .\app\build\outputs\apk\release\mesaflow-0.1.0.apk
```

Expected: the device is listed as `device` and installation ends with `Success`.

- [ ] **Step 7: Perform the physical-device smoke test**

On the installed release build:

1. Confirm the launcher icon displays the MesaFlow `M` without clipping.
2. Launch without `adb reverse`; readiness must reach Render over HTTPS.
3. Enter demo mode and load the menu.
4. Add a product, review the cart, and complete one representative order flow.
5. Close and reopen the app to confirm persisted state remains coherent.

Expected: no request targets localhost, no cleartext-network error appears, and the representative flow completes against Render.

- [ ] **Step 8: Run the frontend regression check**

Run from `frontend/`:

```powershell
pnpm test -- --watch=false src/app/app.spec.ts
pnpm build
```

Expected: focused tests and production build pass.

---

### Task 7: Publish and Validate GitHub Release `v0.1.0`

**Files:**
- Upload: `mobile/app/build/outputs/apk/release/mesaflow-0.1.0.apk`
- External destination: `https://github.com/Programito/fullstack-architecture-lab/releases/tag/v0.1.0`

**Interfaces:**
- Consumes: the exact verified APK from Task 6 and all committed code/documentation changes.
- Produces: a public versioned download and a working frontend `releases/latest` destination.

- [ ] **Step 1: Review only intended tracked changes**

Run from the repository root:

```powershell
git status --short
git log --oneline -6
git diff --check HEAD~4..HEAD
```

Expected: the intended Android, frontend, and documentation commits are present; unrelated untracked local files remain unstaged.

- [ ] **Step 2: Create the annotated release tag**

```powershell
git tag -a v0.1.0 -m "MesaFlow Android 0.1.0"
```

Expected: `git show --no-patch v0.1.0` points to the final verified commit.

- [ ] **Step 3: Push the branch and tag**

```powershell
git push origin main
git push origin v0.1.0
```

Expected: both pushes succeed and GitHub shows the tagged commit.

- [ ] **Step 4: Create the GitHub Release in the browser**

Open `https://github.com/Programito/fullstack-architecture-lab/releases/new`, select existing tag `v0.1.0`, set title `MesaFlow Android 0.1.0`, and use these release notes:

```markdown
## MesaFlow Android 0.1.0

Primera versión pública de la app cliente Android de MesaFlow.

- Conexión segura con el backend de producción.
- Entrada mediante QR o modo demo.
- Consulta de carta, carrito, pedidos, reservas y pagos.
- Compatible con Android 8.0 (API 26) o superior.

Descarga `mesaflow-0.1.0.apk` e instálalo desde el navegador. Android puede pedir permiso para instalar aplicaciones desde esta fuente.
```

Attach `mobile/app/build/outputs/apk/release/mesaflow-0.1.0.apk`, leave “Set as the latest release” enabled, and publish.

- [ ] **Step 5: Validate the public download without authentication**

Open an incognito browser window at:

```text
https://github.com/Programito/fullstack-architecture-lab/releases/latest
```

Expected: it redirects to `v0.1.0`, shows `mesaflow-0.1.0.apk`, and downloads without a GitHub login.

- [ ] **Step 6: Validate the deployed frontend link**

After Vercel deploys the pushed frontend commit, open:

```text
https://fullstack-architecture-lab-crao.vercel.app
```

Expected: the global footer displays `Android APK`; activating it opens the latest GitHub Release in a new tab.

- [ ] **Step 7: Reinstall the downloaded artifact**

Download the public asset on the Android test device and install it.

Expected: Android recognizes the same package/signature; installation succeeds and the smoke-tested Render-backed behavior is unchanged.

