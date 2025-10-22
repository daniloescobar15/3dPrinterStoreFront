import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  returnUrl: string = '/';
  
  showDebugOptions = false;
  useProxy = true;
  currentApiUrl = '';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private http: HttpClient
  ) {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }
    
    this.currentApiUrl = this.authService.getApiUrl();
    this.useProxy = this.currentApiUrl.includes('/api');
  }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      username: ['test@test.com', [Validators.required, Validators.email]],
      password: ['admin123', Validators.required]
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    this.submitted = true;

    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    const username = this.f['username'].value;
    const password = this.f['password'].value;

    console.log('Intentando iniciar sesión con:', username);

    this.authService.login(username, password)
      .subscribe({
        next: (response) => {
          console.log('Login exitoso');
          
          this.router.navigateByUrl(this.returnUrl);
        },
        error: (error) => {
          console.error('Error durante el login:', error);
          
          if (error && typeof error === 'string') {
            this.error = error;
          } else if (error && error.message) {
            this.error = error.message;
          } else {
            this.error = 'Error al iniciar sesión. Por favor, verifica tus credenciales e inténtalo de nuevo.';
          }
          
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        }
      });
  }
  
  toggleDebugOptions(): void {
    this.showDebugOptions = !this.showDebugOptions;
  }
  
  toggleProxy(): void {
    this.useProxy = !this.useProxy;
    
    this.authService.setApiUrl(this.useProxy);
    this.currentApiUrl = this.authService.getApiUrl();
    
    console.log(`Modo de conexión cambiado a: ${this.useProxy ? 'Proxy' : 'Directo'}`);
    console.log(`URL actual: ${this.currentApiUrl}`);
  }
  
  testApiConnection(): void {
    this.loading = true;
    this.error = '';
    
    this.authService.testApiConnection()
      .subscribe({
        next: (response) => {
          this.loading = false;
          alert('Conexión exitosa al API');
          console.log('Respuesta de prueba:', response);
        },
        error: (error) => {
          this.loading = false;
          
          let errorMessage = 'Error desconocido';
          
          if (error.status === 0) {
            errorMessage = 'Error de conexión: Posible problema de CORS o servidor no disponible';
            
            if (!this.useProxy) {
              errorMessage += '\n\nSugerencia: Activa la opción "Usar proxy para API" e intenta nuevamente.';
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          this.error = errorMessage;
          alert(`Error al conectar con el API: ${errorMessage}`);
          console.error('Error de conexión:', error);
        }
      });
  }
  

}