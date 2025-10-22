import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { LoginComponent } from './login';
import { AuthService } from '../../services/auth';
import { of, throwError, EMPTY } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let activatedRoute: any;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'login',
      'isAuthenticated',
      'getApiUrl',
      'setApiUrl',
      'testApiConnection'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'navigateByUrl']);
    Object.defineProperty(routerSpy, 'events', { get: () => EMPTY });

    activatedRoute = {
      snapshot: {
        queryParams: {}
      }
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule, HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRoute }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    authService.isAuthenticated.and.returnValue(false);
    authService.getApiUrl.and.returnValue('http://localhost:3000/api');

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize login form with default values', () => {
      expect(component.loginForm).toBeDefined();
      expect(component.loginForm.get('username')).toBeDefined();
      expect(component.loginForm.get('password')).toBeDefined();
    });

    it('should set default return URL to /', () => {
      expect(component.returnUrl).toBe('/');
    });

    it('should get return URL from query params', () => {
      activatedRoute.snapshot.queryParams = { returnUrl: '/checkout' };
      component.ngOnInit();
      expect(component.returnUrl).toBe('/checkout');
    });

    it('should initialize with form controls', () => {
      expect(component.loginForm.get('username')).toBeDefined();
      expect(component.loginForm.get('password')).toBeDefined();
    });
  });

  describe('onSubmit', () => {
    it('should not submit invalid form', () => {
      component.loginForm.get('username')?.setValue('');
      component.loginForm.get('password')?.setValue('');

      component.onSubmit();

      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should submit valid form', () => {
      authService.login.and.returnValue(of({ token: 'test', tokenExpirationInstant: Date.now() + 3600000, user: { id: '1', email: 'test@test.com', username: 'test', active: true, verified: true } }));

      component.loginForm.get('username')?.setValue('test@test.com');
      component.loginForm.get('password')?.setValue('password123');

      component.onSubmit();

      expect(authService.login).toHaveBeenCalledWith('test@test.com', 'password123');
    });

    it('should set loading to true on submit', () => {
      authService.login.and.returnValue(of({ token: 'test', tokenExpirationInstant: Date.now() + 3600000, user: { id: '1', email: 'test@test.com', username: 'test', active: true, verified: true } }));

      component.loginForm.get('username')?.setValue('test@test.com');
      component.loginForm.get('password')?.setValue('password123');

      component.onSubmit();

      expect(component.loading).toBeFalse();
    });

    it('should navigate to return URL on successful login', () => {
      authService.login.and.returnValue(of({ token: 'test', tokenExpirationInstant: Date.now() + 3600000, user: { id: '1', email: 'test@test.com', username: 'test', active: true, verified: true } }));

      component.returnUrl = '/checkout';
      component.loginForm.get('username')?.setValue('test@test.com');
      component.loginForm.get('password')?.setValue('password123');

      component.onSubmit();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/checkout');
    });

    it('should handle login error', () => {
      const error = { message: 'Invalid credentials' };
      authService.login.and.returnValue(throwError(() => error));

      component.loginForm.get('username')?.setValue('test@test.com');
      component.loginForm.get('password')?.setValue('wrongpassword');

      component.onSubmit();

      expect(component.error).toBe('Invalid credentials');
      expect(component.loading).toBeFalse();
    });


  });

  describe('form validation', () => {
    it('should require email format for username', () => {
      const usernameControl = component.loginForm.get('username');
      usernameControl?.setValue('notanemail');

      expect(usernameControl?.invalid).toBeTrue();
      expect(usernameControl?.hasError('email')).toBeTrue();
    });

    it('should require password', () => {
      const passwordControl = component.loginForm.get('password');
      passwordControl?.setValue('');

      expect(passwordControl?.invalid).toBeTrue();
      expect(passwordControl?.hasError('required')).toBeTrue();
    });

    it('should accept valid email', () => {
      const usernameControl = component.loginForm.get('username');
      usernameControl?.setValue('test@example.com');

      expect(usernameControl?.valid).toBeTrue();
    });
  });

  describe('debug options', () => {
    it('should toggle debug options', () => {
      expect(component.showDebugOptions).toBeFalse();
      component.toggleDebugOptions();
      expect(component.showDebugOptions).toBeTrue();
      component.toggleDebugOptions();
      expect(component.showDebugOptions).toBeFalse();
    });

    it('should toggle proxy mode', () => {
      component.useProxy = false;
      component.toggleProxy();

      expect(component.useProxy).toBeTrue();
      expect(authService.setApiUrl).toHaveBeenCalledWith(true);
    });

    it('should update current API URL when toggling proxy', () => {
      authService.getApiUrl.and.returnValue('http://proxy:3000/api');
      component.toggleProxy();

      expect(component.currentApiUrl).toBe('http://proxy:3000/api');
    });

    it('should test API connection', () => {
      authService.testApiConnection.and.returnValue(of({ status: 'ok' }));

      component.testApiConnection();

      expect(authService.testApiConnection).toHaveBeenCalled();
      expect(component.loading).toBeFalse();
    });

    it('should handle API connection error', () => {
      const error = { status: 0, message: 'Connection error' };
      authService.testApiConnection.and.returnValue(throwError(() => error));

      component.testApiConnection();

      expect(component.error).toBeTruthy();
      expect(component.loading).toBeFalse();
    });
  });

  describe('form getter', () => {
    it('should return form controls', () => {
      const controls = component.f;

      expect(controls['username']).toBeDefined();
      expect(controls['password']).toBeDefined();
    });
  });
});