import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { IdentityApiService } from './api/identity-api.service';
import { IdentitySessionStore } from './identity-session.store';

export function refreshIdentitySessionOnStartup(): void {
  const identity = inject(IdentitySessionStore);
  if (!identity.session().userId || !identity.session().accessToken) {
    return;
  }

  const api = inject(IdentityApiService);
  const router = inject(Router);

  api.refresh().subscribe({
    next: (response) => identity.setAuthResponse(response),
    error: () => {
      identity.clear();
      void router.navigate(['/login']);
    },
  });
}
