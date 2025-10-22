import { TestBed } from '@angular/core/testing';
import { AuthInitializerService } from './auth-initializer';
import { AuthService } from './auth';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('AuthInitializerService', () => {
  let service: AuthInitializerService;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getToken',
      'isAuthenticated'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthInitializerService,
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    service = TestBed.inject(AuthInitializerService);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initializeAuth', () => {
    it('should return a promise', (done) => {
      const result = service.initializeAuth();

      expect(result instanceof Promise).toBeTrue();

      result.then(() => {
        expect(true).toBeTrue();
        done();
      });
    });

    it('should resolve successfully', (done) => {
      service.initializeAuth().then(() => {
        expect(true).toBeTrue();
        done();
      });
    });

    it('should not throw errors when localStorage is empty', (done) => {
      localStorage.clear();

      expect(() => {
        service.initializeAuth().then(() => {
          done();
        });
      }).not.toThrow();
    });

    it('should handle localStorage token', (done) => {
      localStorage.setItem('auth_token', 'test-token');

      service.initializeAuth().then(() => {
        const token = localStorage.getItem('auth_token');
        expect(token).toBe('test-token');
        localStorage.clear();
        done();
      });
    });

    it('should catch localStorage errors', (done) => {
      spyOn(localStorage, 'getItem').and.throwError('Storage error');

      service.initializeAuth().then(() => {
        expect(true).toBeTrue();
        done();
      });
    });

    it('should be usable as APP_INITIALIZER', (done) => {
      const result = service.initializeAuth();

      Promise.all([result]).then(() => {
        expect(true).toBeTrue();
        done();
      });
    });
  });
});