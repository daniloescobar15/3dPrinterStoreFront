import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthInterceptor } from './auth-interceptor';
import { AuthService } from './auth';
import { Router } from '@angular/router';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { EMPTY } from 'rxjs';

describe('AuthInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getToken',
      'logout'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'navigateByUrl', 'serializeUrl', 'parseUrl']);
    Object.defineProperty(routerSpy, 'url', {
      get: jasmine.createSpy('url').and.returnValue('/dashboard'),
      configurable: true
    });
    Object.defineProperty(routerSpy, 'events', { get: () => EMPTY });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthInterceptor,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true
        }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('token injection', () => {
    it('should add Authorization header when token exists', () => {
      authService.getToken.and.returnValue('test-token');

      httpClient.get('/api/data').subscribe();

      const req = httpMock.expectOne('/api/data');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush({});
    });

    it('should not add Authorization header when no token', () => {
      authService.getToken.and.returnValue(null);

      httpClient.get('/api/data').subscribe();

      const req = httpMock.expectOne('/api/data');
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({});
    });

    it('should not add token to login requests', () => {
      authService.getToken.and.returnValue('test-token');

      httpClient.post('/api/login', {}).subscribe();

      const req = httpMock.expectOne('/api/login');
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({});
    });

    it('should add token to other requests', () => {
      authService.getToken.and.returnValue('test-token');

      httpClient.get('/api/payment/list').subscribe();

      const req = httpMock.expectOne('/api/payment/list');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush({});
    });
  });

  describe('error handling', () => {
    it('should not redirect if already on login page', () => {
      authService.getToken.and.returnValue('test-token');
      Object.defineProperty(router, 'url', {
        value: '/login',
        configurable: true
      });

      httpClient.get('/api/protected').subscribe(
        () => fail('should have failed'),
        () => {}
      );

      const req = httpMock.expectOne('/api/protected');
      req.flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should handle 403 errors', () => {
      authService.getToken.and.returnValue('test-token');

      httpClient.get('/api/restricted').subscribe(
        () => fail('should have failed'),
        (error: HttpErrorResponse) => {
          expect(error.status).toBe(403);
        }
      );

      const req = httpMock.expectOne('/api/restricted');
      req.flush(null, { status: 403, statusText: 'Forbidden' });

      expect(authService.logout).not.toHaveBeenCalled();
    });

    it('should handle 500 errors', () => {
      authService.getToken.and.returnValue('test-token');

      httpClient.get('/api/data').subscribe(
        () => fail('should have failed'),
        (error: HttpErrorResponse) => {
          expect(error.status).toBe(500);
        }
      );

      const req = httpMock.expectOne('/api/data');
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle connection errors (status 0)', () => {
      authService.getToken.and.returnValue('test-token');

      httpClient.get('/api/data').subscribe(
        () => fail('should have failed'),
        (error: HttpErrorResponse) => {
          expect(error.status).toBe(0);
        }
      );

      const req = httpMock.expectOne('/api/data');
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('request cloning', () => {
    it('should properly clone requests', () => {
      authService.getToken.and.returnValue('my-token');

      httpClient.get('/api/data').subscribe();

      const req = httpMock.expectOne('/api/data');
      expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
      req.flush({});
    });

    it('should preserve other headers when adding token', () => {
      authService.getToken.and.returnValue('test-token');

      httpClient.get('/api/data', {
        headers: { 'Custom-Header': 'value' }
      }).subscribe();

      const req = httpMock.expectOne('/api/data');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      expect(req.request.headers.get('Custom-Header')).toBe('value');
      req.flush({});
    });
  });

  describe('multiple requests', () => {
    it('should handle multiple requests correctly', () => {
      authService.getToken.and.returnValue('test-token');

      httpClient.get('/api/data1').subscribe();
      httpClient.get('/api/data2').subscribe();
      httpClient.post('/api/login', {}).subscribe();

      const req1 = httpMock.expectOne('/api/data1');
      const req2 = httpMock.expectOne('/api/data2');
      const req3 = httpMock.expectOne('/api/login');

      expect(req1.request.headers.get('Authorization')).toBe('Bearer test-token');
      expect(req2.request.headers.get('Authorization')).toBe('Bearer test-token');
      expect(req3.request.headers.has('Authorization')).toBeFalse();

      req1.flush({});
      req2.flush({});
      req3.flush({});
    });
  });
});