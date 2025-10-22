import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;

  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();
    
    if (token) {
      if (!request.url.includes('/api/login')) {
        request = request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    }
    
    return next.handle(request).pipe(
      tap({
        next: (event) => {
        },
        error: (error) => {
          console.error('Error en la solicitud HTTP:', error);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          return this.handle401Error(request, next);
        } else if (error.status === 403) {
          console.error('No tienes permisos para acceder a este recurso');
        } else if (error.status === 0) {
          console.error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
        } else if (error.status >= 500) {
          console.error('Error en el servidor. Por favor, inténtalo más tarde.');
        }
        
        return throwError(() => error);
      })
    );
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      
      this.authService.logout();
      
      const currentUrl = this.router.url;
      if (currentUrl !== '/login') {
        this.router.navigate(['/login'], { 
          queryParams: { returnUrl: currentUrl }
        });
      }
      
      console.log('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      
      this.isRefreshing = false;
    }
    
    return throwError(() => new Error('Sesión expirada'));
  }
}