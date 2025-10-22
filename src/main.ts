import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app';
import { appConfig } from './app/app.config';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app/app.routes';

console.log('Iniciando la aplicación...');

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    console.log('Aplicación iniciada correctamente');
  })
  .catch((err) => {
    console.error('Error al iniciar la aplicación:', err);
    
    if (confirm('Error al iniciar la aplicación. ¿Desea intentar iniciar en modo seguro?')) {
      console.log('Intentando iniciar en modo seguro...');
      
      const safeConfig = {
        providers: [
          provideRouter(routes),
          provideHttpClient()
        ]
      };
      
      bootstrapApplication(AppComponent, safeConfig)
        .then(() => console.log('Aplicación iniciada en modo seguro'))
        .catch(e => console.error('Error en modo seguro:', e));
    }
  });
