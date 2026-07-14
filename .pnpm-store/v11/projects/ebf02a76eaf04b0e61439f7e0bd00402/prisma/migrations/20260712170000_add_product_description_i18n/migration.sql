-- Descripcion multiidioma del producto (ES/CA/EN). Aditivo y opcional, mismo
-- patron que `nameI18n` (ver 20260711120000_add_menu_name_i18n): `description`
-- sigue siendo el canonico (castellano) y el fallback; `descriptionI18n`
-- guarda las variantes que existan como { es?, ca?, en? }. Sin backfill. La
-- resolucion de idioma se hace siempre en el cliente, nunca aqui (ver
-- docs/superpowers/plans/2026-07-11-menu-multilingual-names.md).
ALTER TABLE "products"
ADD COLUMN "descriptionI18n" JSONB;
