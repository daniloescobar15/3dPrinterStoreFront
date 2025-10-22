import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { STORAGE_KEYS } from '../constants/storage-keys';

export interface User {
  id: string;
  email: string;
  username: string;
  active: boolean;
  verified: boolean;
}

export interface AuthResponse {
  token: string;
  tokenExpirationInstant: number;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private originalApiUrl = environment.apiUrl.direct;
  private devApiUrl = environment.apiUrl.proxy;
  
  private apiUrl = environment.apiUrl.proxy;
  
  private applicationId = environment.auth.applicationId;
  private authKey = environment.auth.authKey;
  
  setApiUrl(useProxy: boolean): void {
    this.apiUrl = useProxy ? this.devApiUrl : this.originalApiUrl;
    localStorage.setItem(STORAGE_KEYS.USE_PROXY, useProxy.toString());
    console.log(`API URL cambiada a: ${this.apiUrl} (${useProxy ? 'usando proxy' : 'directo'})`);
  }
  
  getApiUrl(): string {
    return this.apiUrl;
  }
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private tokenExpirationTimer: any;

  constructor(private http: HttpClient) {
    const useProxyStr = localStorage.getItem(STORAGE_KEYS.USE_PROXY);
    const useProxy = useProxyStr ? useProxyStr === 'true' : true;
    this.setApiUrl(useProxy);
    
    this.loadStoredAuthData();
  }

  private loadStoredAuthData(): void {
    const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const tokenExpiration = localStorage.getItem(STORAGE_KEYS.EXPIRATION);
    
    if (storedToken && storedUser && tokenExpiration) {
      const expirationTimestamp = parseInt(tokenExpiration);
      const expirationDate = new Date(expirationTimestamp);
      const currentTime = new Date();
      
      if (expirationDate.getTime() - currentTime.getTime() > 60000) {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
        
        const expirationDuration = expirationTimestamp - currentTime.getTime() - 60000;
        this.autoLogout(expirationDuration > 0 ? expirationDuration : 0);
        
        console.log('Sesión restaurada para:', user.email);
        console.log('El token expirará en:', expirationDate.toLocaleString());
      } else {
        console.log('Token expirado o a punto de expirar, cerrando sesión');
        this.logout();
      }
    } else {
      console.log('No hay datos de sesión almacenados');
    }
  }

  login(loginId: string, password: string): Observable<AuthResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': this.authKey
    });

    const body = {
      applicationId: this.applicationId,
      loginId,
      password,
      metaData: {
        device: { description: 'web' }
      }
    };
    console.log(this.apiUrl)
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, body, { 
      headers,
      withCredentials: false
    })
      .pipe(
        tap(response => {
          console.log('Respuesta de login exitosa:', response);
          this.handleAuthentication(response);
        }),
        catchError(error => {
          console.error('Error durante el login:', error);
          
          if (error.status === 0) {
            console.error('Error de conexión: Posible problema de CORS o servidor no disponible');
            console.error('Mensaje de error:', error.message);
            console.error('Tipo de error:', error.name);
            
            const isCORSError = error.message.includes('CORS') || 
                              (error.name === 'HttpErrorResponse' && 
                               error.message.includes('Unknown Error'));
            
            if (isCORSError) {
              if (this.apiUrl === this.originalApiUrl) {
                this.setApiUrl(true);
                return throwError(() => new Error('Error de CORS detectado. Se ha cambiado automáticamente al modo proxy. Por favor, intenta nuevamente.'));
              } else {
                return throwError(() => new Error('Error de CORS: El servidor no permite solicitudes desde este origen. Verifica la configuración del proxy.'));
              }
            } else {
              return throwError(() => new Error('No se pudo conectar al servidor. Verifica tu conexión o contacta al administrador.'));
            }
          } else if (error.status === 401) {
            return throwError(() => new Error('Credenciales incorrectas. Por favor, verifica tu usuario y contraseña.'));
          } else {
            return throwError(() => new Error(`Error de autenticación (${error.status}): ${error.message}`));
          }
        })
      );
  }

  private handleAuthentication(authResponse: AuthResponse): void {
    const { token, tokenExpirationInstant, user } = authResponse;
    
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.EXPIRATION, tokenExpirationInstant.toString());
    
    this.currentUserSubject.next(user);
    
    const expirationDuration = tokenExpirationInstant - new Date().getTime() - 60000;
    
    if (expirationDuration > 0) {
      this.autoLogout(expirationDuration);
    } else {
      this.refreshToken();
    }
    
    console.log('Usuario autenticado:', user.email);
    console.log('El token expirará en:', new Date(tokenExpirationInstant).toLocaleString());
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.EXPIRATION);
    
    this.currentUserSubject.next(null);
    
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
    this.tokenExpirationTimer = null;
  }

  private autoLogout(expirationDuration: number): void {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
    
    this.tokenExpirationTimer = setTimeout(() => {
      console.log('Token a punto de expirar, intentando renovar...');
      
      this.refreshToken().subscribe({
        next: () => {
          console.log('Token renovado exitosamente');
        },
        error: (error) => {
          console.error('Error al renovar el token:', error);
          console.log('Cerrando sesión automáticamente');
          this.logout();
          
          alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        }
      });
    }, expirationDuration);
    
    console.log(`Temporizador de renovación de token configurado para ${Math.round(expirationDuration / 1000 / 60)} minutos`);
  }

  refreshToken(): Observable<AuthResponse> {
    const token = this.getToken();
    
    if (!token) {
      return throwError(() => new Error('No hay token para renovar'));
    }
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': this.authKey
    });
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/jwt/refresh`, {
      token,
      applicationId: this.applicationId
    }, { headers }).pipe(
      tap(response => {
        console.log('Token renovado exitosamente');
        this.handleAuthentication(response);
      }),
      catchError(error => {
        console.error('Error al renovar el token:', error);
        
        if (error.status === 401) {
          this.logout();
        }
        
        return throwError(() => new Error('No se pudo renovar el token. Por favor, inicia sesión nuevamente.'));
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
  
  testApiConnection(): Observable<any> {
    return this.http.get(`${this.apiUrl}/status`).pipe(
      tap(response => {
        console.log('Conexión exitosa con el API:', response);
      }),
      catchError(error => {
        console.error('Error al conectar con el API:', error);
        
        if (error.status === 0) {
          const isCORSError = error.message.includes('CORS') || 
                            (error.name === 'HttpErrorResponse' && 
                             error.message.includes('Unknown Error'));
          
          if (isCORSError && this.apiUrl === this.originalApiUrl) {
            console.log('Detectado error de CORS, cambiando a modo proxy...');
            this.setApiUrl(true);
          }
        }
        
        return throwError(() => error);
      })
    );
  }
}