---
name: documenting-mobile-kotlin-changes
description: Use when changing Android, Kotlin, Gradle, or toolchain files under mobile/ and the corresponding project documentation may drift
---

# Documenting Mobile Kotlin Changes

## Overview

Keep `mobile/README.md` synchronized with the actual Android toolchain and local development flow. If `build.gradle.kts`, `libs.versions.toml`, `gradle.properties`, or wrapper files change, assume the README may now be stale.

## Use This Checklist

1. Review the diff in `mobile/app/build.gradle.kts`, `mobile/gradle/libs.versions.toml`, `mobile/gradle.properties`, and `mobile/gradle/wrapper/gradle-wrapper.properties`.
2. Update `mobile/README.md` if any of these changed:
   - Android Studio minimum version
   - AGP or Gradle wrapper version
   - Kotlin/plugin versions that affect setup
   - debug `BASE_URL` or local backend connection steps
   - compatibility flags or migration notes worth preserving
3. Search `mobile/` and `docs/` for stale version strings or old networking instructions.
4. Document only current reality, not planned future migrations that already happened.

## Common Drift

- README still describes old AGP/Gradle versions after a toolchain bump.
- Local dev instructions mention `10.0.2.2` when debug now relies on `adb reverse`.
- Migration notes stay written in future tense after the migration is already merged.
