import type { NameI18n } from './name-i18n.model';

export interface MenuCategory {
  id: string;
  name: string;
  nameI18n?: NameI18n;
  parentId?: string;
  sortOrder: number;
  isVisible?: boolean;
}

