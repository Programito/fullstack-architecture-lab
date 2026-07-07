# Release Note: Observabilidad por canal y pagos POS

Fecha: 2026-07-06

## Resumen

Esta iteracion mejora el diagnostico operativo tras los cambios de la APK y
amplia la lectura del dashboard POS en la seccion de pagos.

## Cambios incluidos

- Nueva dimension `clientOrigin` propagada entre backend, frontend web y APK.
- Valores canonicos soportados:
  - `web-admin`
  - `web-demo`
  - `web-pos`
  - `apk-customer`
  - `backend`
- La APK identifica su trafico con `X-Client-Origin: apk-customer`.
- `developer/logs` ahora permite:
  - filtrar por canal
  - ver el origen en la tabla y el detalle
  - revisar breakdown por canal
  - consultar KPIs compactos de login correcto/fallido por canal
- El dashboard POS amplia `paymentBreakdown` con:
  - porcentaje sobre ingresos
  - numero de operaciones
  - ticket medio por metodo
  - metodo dominante

## Impacto operativo

- Soporte puede separar rapido accesos web, demo, POS y APK sin depender de
  `User-Agent`.
- El filtro por canal afecta a KPIs, timeline, breakdown y eventos, asi que el
  diagnostico queda alineado en toda la pantalla.
- Los pagos del POS muestran mejor el mix real de cobro, no solo importe bruto.

## Compatibilidad y notas

- `clientOrigin` vive en `metadata`; no requiere migracion Prisma en esta fase.
- La deteccion de APK se basa en header y no introduce un SDK nuevo.
- El seed en memoria incluye tambien `customer@mesaflow.demo`; la documentacion
  y los tests deben derivar ese recuento desde `DEMO_ACCOUNT_CATALOG`.
