import { inject } from '@angular/core';
import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { IdentityApiService } from './api/identity-api.service';
import { IdentitySessionStore } from './identity-session.store';

let refreshInProgress = false;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const identity = inject(IdentitySessionStore);
  const api = inject(IdentityApiService);
  const router = inject(Router);
  const token = identity.session().accessToken;
  const isAuthRequest = request.url.includes('/auth/login')
    || request.url.includes('/auth/demo-login')
    || request.url.includes('/auth/refresh')
    || request.url.includes('/auth/public-config');
  const authorizedRequest = token && !isAuthRequest
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthRequest || refreshInProgress) {
        return throwError(() => error);
      }
      refreshInProgress = true;
      return api.refresh().pipe(
        switchMap((response) => {
          refreshInProgress = false;
          identity.setAuthResponse(response);
          return next(request.clone({ setHeaders: { Authorization: `Bearer ${response.accessToken}` } }));
        }),
        catchError((refreshError) => {
          refreshInProgress = false;
          identity.clear();
          void router.navigate(['/login']);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
