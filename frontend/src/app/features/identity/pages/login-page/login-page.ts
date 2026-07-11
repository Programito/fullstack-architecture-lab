import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { finalize } from 'rxjs';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { ColorModeMenu } from '../../../../shared/ui/color-mode-menu/color-mode-menu';
import { Icon } from '../../../../shared/ui/icon/icon';
import { LanguageSelect } from '../../../../shared/ui/language-select/language-select';
import { Tabs, type TabsOption } from '../../../../shared/ui/tabs/tabs';
import type { DemoRoleName, ReadinessStatusDto } from '../../api/identity-api.models';
import { IdentityApiService } from '../../api/identity-api.service';
import { PlatformReadinessService } from '../../api/platform-readiness.service';
import { authenticatedHome } from '../../auth-navigation';
import { IdentitySessionStore } from '../../identity-session.store';

type DemoRoleView = {
  role: DemoRoleName;
  icon: string;
  label: string;
  description: string;
  group: 'restaurant' | 'technical';
  order: number;
};

const DEMO_ROLE_META: Record<DemoRoleName, { group: DemoRoleView['group']; order: number; fallbackIcon: string }> = {
  admin: { group: 'restaurant', order: 1, fallbackIcon: 'shield_person' },
  manager: { group: 'restaurant', order: 2, fallbackIcon: 'supervisor_account' },
  waiter: { group: 'restaurant', order: 3, fallbackIcon: 'room_service' },
  kitchen: { group: 'restaurant', order: 4, fallbackIcon: 'skillet' },
  developer: { group: 'technical', order: 5, fallbackIcon: 'code' },
};

@Component({
  selector: 'app-login-page',
  imports: [Alert, Button, Card, ColorModeMenu, Icon, LanguageSelect, Tabs, TranslocoPipe],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage {
  private readonly api = inject(IdentityApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly readiness = inject(PlatformReadinessService);
  private readonly identity = inject(IdentitySessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly transloco = inject(TranslocoService);
  private readonly activeTranslations = toSignal(this.transloco.selectTranslation(), {
    initialValue: this.transloco.getTranslation(this.transloco.getActiveLang()),
  });

  protected readonly activeTab = signal<'demo' | 'credentials'>('demo');
  protected readonly demoLoginEnabled = signal(false);
  protected readonly demoRoles = signal<Array<{ role: DemoRoleName; label: string; description: string; icon: string }>>([]);
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly passwordVisible = signal(false);
  protected readonly emailTouched = signal(false);
  protected readonly passwordTouched = signal(false);
  protected readonly loadingRole = signal<DemoRoleName | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorKey = signal('');
  protected readonly seedLoading = signal(false);
  protected readonly seedDone = signal(false);
  protected readonly seedError = signal(false);
  protected readonly readinessStatus = signal<ReadinessStatusDto['status']>('ready');

  protected readonly tabs = computed<TabsOption[]>(() => {
    this.activeTranslations();

    return this.demoLoginEnabled()
      ? [
          { label: this.transloco.translate('auth.demo.tab'), value: 'demo' },
          { label: this.transloco.translate('auth.credentials.tab'), value: 'credentials' },
        ]
      : [];
  });

  protected readonly localizedDemoRoles = computed<DemoRoleView[]>(() => {
    this.activeTranslations();

    return this.demoRoles()
      .map((item) => {
        const meta = DEMO_ROLE_META[item.role];

        return {
          role: item.role,
          icon: item.icon || meta.fallbackIcon,
          label: this.transloco.translate(`auth.roles.${item.role}.label`),
          description: this.transloco.translate(`auth.roles.${item.role}.description`),
          group: meta.group,
          order: meta.order,
        };
      })
      .sort((left, right) => left.order - right.order);
  });

  protected readonly restaurantRoles = computed(() => this.localizedDemoRoles().filter((item) => item.group === 'restaurant'));
  protected readonly technicalRoles = computed(() => this.localizedDemoRoles().filter((item) => item.group === 'technical'));

  protected readonly emailError = computed(() => {
    this.activeTranslations();
    if (!this.emailTouched()) return '';
    if (!this.email().trim()) return this.transloco.translate('auth.credentials.validation.emailRequired');
    if (!isValidEmail(this.email())) return this.transloco.translate('auth.credentials.validation.emailInvalid');
    return '';
  });

  protected readonly passwordError = computed(() => {
    this.activeTranslations();
    if (!this.passwordTouched()) return '';
    if (!this.password()) return this.transloco.translate('auth.credentials.validation.passwordRequired');
    if (this.password().length < 8) return this.transloco.translate('auth.credentials.validation.passwordMinLength');
    return '';
  });

  protected readonly credentialsValid = computed(() =>
    this.email().trim().length > 0 && isValidEmail(this.email()) && this.password().length >= 8,
  );
  protected readonly showWarmingUpBanner = computed(() => this.readinessStatus() === 'warming_up');
  protected readonly showDownBanner = computed(() => this.readinessStatus() === 'down');

  constructor() {
    this.loadAuthConfig();

    this.readiness.watch({ stopWhenReady: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.readinessStatus.set(result.status);
        // Si entramos con la base de datos dormida, la carga inicial de la configuración
        // pública (que trae los roles de demo) pudo fallar o llegar incompleta. Cuando el
        // aviso de "despertando la base de datos" termina (status 'ready'), se reintenta
        // para que la pestaña de demo aparezca sin tener que recargar la página.
        if (result.status === 'ready' && !this.demoLoginEnabled()) {
          this.loadAuthConfig();
        }
      });
  }

  private loadAuthConfig(): void {
    this.api.getAuthPublicConfig().subscribe({
      next: (config) => {
        this.demoLoginEnabled.set(config.demoLoginEnabled);
        this.demoRoles.set(config.demoRoles);
        this.activeTab.set(config.demoLoginEnabled ? 'demo' : 'credentials');
      },
      error: () => {
        this.demoLoginEnabled.set(false);
        this.activeTab.set('credentials');
      },
    });
  }

  protected selectTab(value: string): void {
    this.activeTab.set(value === 'demo' ? 'demo' : 'credentials');
    this.errorKey.set('');
  }

  protected markEmailTouched(): void {
    this.emailTouched.set(true);
  }

  protected markPasswordTouched(): void {
    this.passwordTouched.set(true);
  }

  protected updateEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  protected updatePassword(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected submitCredentials(event: Event): void {
    event.preventDefault();
    this.emailTouched.set(true);
    this.passwordTouched.set(true);

    if (!this.credentialsValid() || this.submitting()) return;

    this.submitting.set(true);
    this.errorKey.set('');
    this.api.login(this.email().trim(), this.password())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response) => this.completeLogin(response),
        error: () => this.errorKey.set('auth.errors.invalidCredentials'),
      });
  }

  protected loginDemo(role: DemoRoleName): void {
    if (this.loadingRole()) return;

    this.loadingRole.set(role);
    this.errorKey.set('');
    this.api.demoLogin(role)
      .pipe(finalize(() => this.loadingRole.set(null)))
      .subscribe({
        next: (response) => this.completeLogin(response),
        error: () => this.errorKey.set('auth.errors.demoUnavailable'),
      });
  }

  protected runSeed(): void {
    if (this.seedLoading()) return;
    this.seedLoading.set(true);
    this.seedDone.set(false);
    this.seedError.set(false);
    this.api.triggerSeed()
      .pipe(finalize(() => this.seedLoading.set(false)))
      .subscribe({
        next: () => this.seedDone.set(true),
        error: () => this.seedError.set(true),
      });
  }

  private completeLogin(response: Parameters<IdentitySessionStore['setAuthResponse']>[0]): void {
    this.identity.setAuthResponse(response);
    const requested = this.route.snapshot.queryParamMap.get('returnUrl');
    const destination = requested?.startsWith('/') && !requested.startsWith('/login')
      ? requested
      : authenticatedHome(response.roles, response.permissions);
    void this.router.navigateByUrl(destination);
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
