import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { Banner } from '../../../../shared/ui/banner/banner';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { ColorModeMenu } from '../../../../shared/ui/color-mode-menu/color-mode-menu';
import { Icon } from '../../../../shared/ui/icon/icon';
import { LanguageSelect } from '../../../../shared/ui/language-select/language-select';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import type { DeveloperResourcesDto, ReadinessStatusDto } from '../../api/identity-api.models';
import { IdentityApiService } from '../../api/identity-api.service';
import { PlatformReadinessService } from '../../api/platform-readiness.service';
import { IdentitySessionStore } from '../../identity-session.store';

@Component({
  selector: 'app-developer-page',
  imports: [Banner, Button, Card, ColorModeMenu, Icon, LanguageSelect, Spinner, TranslocoPipe],
  templateUrl: './developer-page.html',
  styleUrl: './developer-page.css',
  host: {
    '[class.developer-page--logging-out]': 'loggingOut()',
  },
})
export class DeveloperPage {
  private readonly api = inject(IdentityApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly identity = inject(IdentitySessionStore);
  private readonly readiness = inject(PlatformReadinessService);
  private readonly router = inject(Router);

  protected readonly resources = signal<DeveloperResourcesDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly loggingOut = signal(false);
  protected readonly readinessStatus = signal<ReadinessStatusDto['status']>('ready');
  protected readonly readinessDurationMs = signal(0);
  protected readonly readinessVariant = computed<'success' | 'warning' | 'danger'>(() => {
    switch (this.readinessStatus()) {
      case 'warming_up':
        return 'warning';
      case 'down':
        return 'danger';
      default:
        return 'success';
    }
  });
  protected readonly readinessTitleKey = computed(() => `developer.platformStatus.${this.readinessStatus()}.title`);
  protected readonly readinessDescriptionKey = computed(() => `developer.platformStatus.${this.readinessStatus()}.description`);

  constructor() {
    this.readiness.watch()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.readinessStatus.set(result.status);
        this.readinessDurationMs.set(result.durationMs);
      });

    this.api.getDeveloperResources().subscribe({
      next: (resources) => {
        this.resources.set(resources);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected openLogs(): void {
    void this.router.navigate(['/developer/logs']);
  }

  protected logout(): void {
    if (this.loggingOut()) return;

    this.loggingOut.set(true);
    this.api.logout().subscribe({
      next: () => undefined,
      error: () => undefined,
    });
    this.finishLogout();
  }

  private finishLogout(): void {
    this.identity.clear();
    void this.router.navigate(['/login']);
  }
}
