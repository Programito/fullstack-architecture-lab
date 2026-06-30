export const MENU_AUDIT_WARNING_TYPES = [
  'missing-image',
  'missing-description',
  'missing-section',
  'unavailable',
  'weak-combo-summary',
  'weak-customization-summary',
] as const;

export type MenuAuditWarningType = (typeof MENU_AUDIT_WARNING_TYPES)[number];
export type MenuAuditFilter = 'all' | MenuAuditWarningType;
export type MenuAuditPriority = 'high' | 'medium' | 'low';

export interface MenuAuditIssue {
  type: MenuAuditWarningType;
  productId: string;
  productName: string;
  priority: MenuAuditPriority;
}

export interface MenuAuditCounter {
  type: MenuAuditWarningType;
  count: number;
  priority: MenuAuditPriority;
  exampleProductName: string | null;
}

export interface MenuAuditReport {
  issues: MenuAuditIssue[];
  counters: MenuAuditCounter[];
  warningsByProductId: Record<string, MenuAuditWarningType[]>;
}
