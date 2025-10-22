import { Injectable } from '@angular/core';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class AuthInitializerService {
  constructor(private authService: AuthService) {}

  /**
   * Inicializa el servicio de autenticación cargando los datos almacenados
   * Este método se puede usar como un APP_INITIALIZER en la configuración de la aplicación
   */
  initializeAuth(): Promise<void> {
    console.log('Inicializando servicio de autenticación...');
    
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        console.log('Token encontrado en localStorage');
      } else {
        console.log('No se encontró token en localStorage');
      }
    } catch (error) {
      console.error('Error al verificar datos de autenticación:', error);
    }
    
    return Promise.resolve();
  }
}