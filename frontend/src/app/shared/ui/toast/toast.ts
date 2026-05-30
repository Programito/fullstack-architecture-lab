import { Component, Injectable, computed, input, signal } from '@angular/core';

export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';
export type ToastAppearance = 'default' | 'minimal';
export type ToastVariant = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'violet';

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  dismissible?: boolean;
};

export type Toast = {
  id: number;
  title: string;
  description: string;
  variant: ToastVariant;
  duration: number;
  dismissible: boolean;
};

type ToastShortcutOptions = Omit<ToastOptions, 'variant'>;

const DEFAULT_DURATION = 5000;

let nextToastId = 0;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly toasts = this._toasts.asReadonly();

  show(options: ToastOptions): number {
    const id = ++nextToastId;
    const toast: Toast = {
      id,
      title: options.title,
      description: options.description ?? '',
      variant: options.variant ?? 'neutral',
      duration: options.duration ?? DEFAULT_DURATION,
      dismissible: options.dismissible ?? true,
    };

    this._toasts.update((toasts) => [toast, ...toasts]);

    if (toast.duration > 0) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), toast.duration),
      );
    }

    return id;
  }

  primary(options: ToastShortcutOptions): number {
    return this.show({ ...options, variant: 'primary' });
  }

  neutral(options: ToastShortcutOptions): number {
    return this.show({ ...options, variant: 'neutral' });
  }

  success(options: ToastShortcutOptions): number {
    return this.show({ ...options, variant: 'success' });
  }

  warning(options: ToastShortcutOptions): number {
    return this.show({ ...options, variant: 'warning' });
  }

  danger(options: ToastShortcutOptions): number {
    return this.show({ ...options, variant: 'danger' });
  }

  violet(options: ToastShortcutOptions): number {
    return this.show({ ...options, variant: 'violet' });
  }

  dismiss(id: number): void {
    this.clearTimer(id);
    this._toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this._toasts.set([]);
  }

  private clearTimer(id: number): void {
    const timer = this.timers.get(id);

    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
}

@Component({
  selector: 'app-toast-viewport',
  templateUrl: './toast.html',
  styleUrl: './toast.css',
})
export class ToastViewport {
  readonly position = input<ToastPosition>('top-right');
  readonly appearance = input<ToastAppearance>('default');
  readonly limit = input(4);
  readonly ariaLabel = input('Notificaciones');

  protected readonly visibleToasts = computed(() => this.toastService.toasts().slice(0, Math.max(0, this.limit())));
  protected readonly classes = computed(() =>
    ['toast-viewport', `toast-viewport--${this.position()}`, `toast-viewport--${this.appearance()}`].join(' '),
  );

  constructor(protected readonly toastService: ToastService) {}

  protected toastClasses(toast: Toast): string {
    return ['toast', `toast--${toast.variant}`, `toast--${this.appearance()}`].join(' ');
  }

  protected toastRole(toast: Toast): 'alert' | 'status' {
    return toast.variant === 'danger' ? 'alert' : 'status';
  }

  protected toastLive(toast: Toast): 'assertive' | 'polite' {
    return toast.variant === 'danger' ? 'assertive' : 'polite';
  }
}
