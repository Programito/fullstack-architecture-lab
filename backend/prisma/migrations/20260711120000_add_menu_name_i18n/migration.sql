-- Nombres multiidioma de la carta (ES/CA/EN). Aditivo y opcional: `name` sigue
-- siendo el canonico (castellano) y el fallback; `nameI18n` guarda las
-- variantes que existan como { es?, ca?, en? }. Sin backfill: las filas
-- existentes se quedan sin `nameI18n` hasta que alguien las traduzca desde el
-- admin. La resolucion de idioma se hace siempre en el cliente, nunca aqui
-- (ver docs/superpowers/plans/2026-07-11-menu-multilingual-names.md).
ALTER TABLE "products"
ADD COLUMN "nameI18n" JSONB;

ALTER TABLE "menu_sections"
ADD COLUMN "nameI18n" JSONB;

ALTER TABLE "modifier_groups"
ADD COLUMN "nameI18n" JSONB;

ALTER TABLE "modifier_options"
ADD COLUMN "nameI18n" JSONB;

ALTER TABLE "combo_slots"
ADD COLUMN "nameI18n" JSONB;

ALTER TABLE "platter_components"
ADD COLUMN "nameI18n" JSONB;
