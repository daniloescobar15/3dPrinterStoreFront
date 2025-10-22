import { ApplicationConfig, APP_INITIALIZER, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, inject } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient, withInterceptors, HttpRequest, HttpErrorResponse, HttpHandlerFn } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

import { routes } from './app.routes';
import { AuthService } from './services/auth';
import { AuthInitializerService } from './services/auth-initializer';

const authInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  console.log('Interceptor ejecutándose para:', req.url);
  
  const noAuthRequired = [
    '/api/login',
    '/api/status',
    '/api/jwt/refresh'
  ];
  
  const skipAuth = noAuthRequired.some(endpoint => req.url.includes(endpoint));
  
  if (skipAuth) {
    console.log('Solicitud a endpoint sin autenticación, no se añade token:', req.url);
    return next(req);
  }
  
  const authService = inject(AuthService);
  const token = authService.getToken();
  const router = inject(Router);
  
  if (token) {
    console.log('Añadiendo token a la solicitud');
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  } else {
    console.log('No hay token disponible para la solicitud');
  }
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        console.error('Error 401: No autorizado');
        authService.logout();
        router.navigate(['/login']);
        return throwError(() => new Error('Sesión expirada. Por favor, inicia sesión nuevamente.'));
      }
      
      if (error.status === 0) {
        console.error('Error de conexión: Posible problema de CORS');
        
        const isCORSError = error.message.includes('CORS') || 
                          (error.name === 'HttpErrorResponse' && 
                           error.message.includes('Unknown Error'));
        
        if (isCORSError) {
          console.log('Detectado error de CORS, intentando cambiar a modo proxy...');
          try {
            authService.setApiUrl(true);
            console.log('Cambiado a modo proxy. Reintenta la operación.');
          } catch (e) {
            console.error('No se pudo cambiar a modo proxy automáticamente:', e);
          }
        }
      }
      
      return throwError(() => error);
    })
  );
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptorFn])
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: (authInitializer: AuthInitializerService) => {
        return () => authInitializer.initializeAuth();
      },
      deps: [AuthInitializerService],
      multi: true
    }
  ]
};
