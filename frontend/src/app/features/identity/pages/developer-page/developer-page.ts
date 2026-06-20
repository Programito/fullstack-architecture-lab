import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { ColorModeMenu } from '../../../../shared/ui/color-mode-menu/color-mode-menu';
import { Icon } from '../../../../shared/ui/icon/icon';
import { LanguageSelect } from '../../../../shared/ui/language-select/language-select';
import type { DeveloperResourcesDto } from '../../api/identity-api.models';
import { IdentityApiService } from '../../api/identity-api.service';
import { IdentitySessionStore } from '../../identity-session.store';

@Component({
  selector: 'app-developer-page',
  imports: [Button, Card, ColorModeMenu, Icon, LanguageSelect, TranslocoPipe],
  templateUrl: './developer-page.html',
  styleUrl: './developer-page.css',
  host: {
    '[class.developer-page--logging-out]': 'loggingOut()',
  },
})
export class DeveloperPage {
  private readonly api = inject(IdentityApiService);
  private readonly identity = inject(IdentitySessionStore);
  private readonly router = inject(Router);
  private readonly logoutTransitionMs = 180;

  protected readonly resources = signal<DeveloperResourcesDto | null>(null);
  protected readonly loggingOut = signal(false);

  constructor() {
    this.api.getDeveloperResources().subscribe({
      next: (resources) => this.resources.set(resources),
    });
  }

  protected logout(): void {
    if (this.loggingOut()) return;

    this.loggingOut.set(true);
    const startedAt = Date.now();
    const finish = () => {
      const remaining = Math.max(0, this.logoutTransitionMs - (Date.now() - startedAt));
      window.setTimeout(() => this.finishLogout(), remaining);
    };

    this.api.logout().subscribe({
      next: () => finish(),
      error: () => finish(),
    });
  }

  private finishLogout(): void {
    this.identity.clear();
    void this.router.navigate(['/login']);
  }
}
