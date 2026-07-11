// Variantes de nombre por idioma (ES/CA/EN), aditivas y opcionales junto al
// nombre canonico en castellano (`name`). El backend siempre devuelve las que
// existan; cada cliente resuelve cual mostrar segun su idioma activo — nunca
// se resuelve en el servidor (protege el cache ETag/304 de la carta). Ver
// docs/superpowers/plans/2026-07-11-menu-multilingual-names.md.
export interface NameI18n {
  es?: string;
  ca?: string;
  en?: string;
}
