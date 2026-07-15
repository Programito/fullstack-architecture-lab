import { inject } from '@angular/core';
import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { API_BASE_URL } from '../../core/api/api.config';
import { IdentityApiService } from './api/identity-api.service';
import { IdentitySessionStore } from './identity-session.store';
import { shouldAttachAuthHeader } from './auth-request-policy';

let refreshInProgress = false;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const identity = inject(IdentitySessionStore);
  const api = inject(IdentityApiService);
  const apiBaseUrl = inject(API_BASE_URL);
  const router = inject(Router);
  const token = identity.session().accessToken;
  const shouldAuthorize = shouldAttachAuthHeader(request.url, window.location.origin, apiBaseUrl);
  const isAuthRequest = !shouldAuthorize && (
    request.url.includes('/auth/login')
    || request.url.includes('/auth/demo-login')
    || request.url.includes('/auth/refresh')
    || request.url.includes('/auth/public-config')
  );
  const authorizedRequest = token && shouldAuthorize
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthRequest || !shouldAuthorize || refreshInProgress) {
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
