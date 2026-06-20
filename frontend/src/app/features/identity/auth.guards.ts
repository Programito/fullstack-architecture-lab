import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

import { IdentitySessionStore } from './identity-session.store';
import { authenticatedHome } from './auth-navigation';

export const authenticatedGuard: CanActivateFn = (_route, state) => {
  const identity = inject(IdentitySessionStore);
  const router = inject(Router);
  return identity.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const anonymousOnlyGuard: CanActivateFn = () => {
  const identity = inject(IdentitySessionStore);
  const router = inject(Router);
  return identity.isAuthenticated()
    ? router.parseUrl(authenticatedHome(identity.roles(), identity.permissions()))
    : true;
};

export const developerGuard: CanActivateFn = () => {
  const identity = inject(IdentitySessionStore);
  const router = inject(Router);
  if (!identity.isAuthenticated()) return router.parseUrl('/login');
  return identity.hasRole('developer')
    ? true
    : router.parseUrl(authenticatedHome(identity.roles(), identity.permissions()));
};

export const adminGuard: CanActivateFn = () => {
  const identity = inject(IdentitySessionStore);
  const router = inject(Router);
  if (!identity.isAuthenticated()) return router.parseUrl('/login');
  return identity.hasRole('admin')
    ? true
    : router.parseUrl(authenticatedHome(identity.roles(), identity.permissions()));
};
