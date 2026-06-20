export const ACCOUNT_TYPES = ['regular', 'demo', 'system', 'test'] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export function canUseInteractiveAuth(accountType: AccountType, demoLoginEnabled: boolean): boolean {
  return accountType === 'regular' || (accountType === 'demo' && demoLoginEnabled);
}
