import type { NameI18n } from './name-i18n.model';

export interface ModifierOption {
  id: string;
  name: string;
  nameI18n?: NameI18n;
  priceDelta: number;
  imageUrl?: string | null;
  selectedByDefault?: boolean;
}

