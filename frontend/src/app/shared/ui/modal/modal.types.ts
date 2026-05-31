export type ModalSize = 'sm' | 'md' | 'lg';
export type ModalAppearance = 'default' | 'minimal';

export type ModalConfig<TData = unknown> = {
  title?: string;
  description?: string;
  size?: ModalSize;
  appearance?: ModalAppearance;
  closeAriaLabel?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  data?: TData;
};
