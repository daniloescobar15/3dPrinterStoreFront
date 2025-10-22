import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { AuthService, User, AuthResponse } from './auth';
import { environment } from '../../environments/environment';
import { STORAGE_KEYS } from '../constants/storage-keys';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    active: true,
    verified: true
  };

  const mockAuthResponse: AuthResponse = {
    token: 'mock-token',
    tokenExpirationInstant: Date.now() + 3600000,
    user: mockUser
  };

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('login', () => {
    it('should login successfully and store auth data', (done) => {
      const loginId = 'test@example.com';
      const password = 'password123';

      service.login(loginId, password).subscribe((response) => {
        expect(response).toEqual(mockAuthResponse);
        expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBe(mockAuthResponse.token);
        expect(localStorage.getItem(STORAGE_KEYS.USER)).toBe(JSON.stringify(mockUser));
        done();
      });

      const req = httpMock.expectOne(`${service.getApiUrl()}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.loginId).toBe(loginId);
      expect(req.request.body.password).toBe(password);
      req.flush(mockAuthResponse);
    });

    it('should handle 401 error for incorrect credentials', (done) => {
      service.login('test@example.com', 'wrongpassword').subscribe(
        () => fail('should have failed'),
        (error) => {
          expect(error.message).toContain('Credenciales incorrectas');
          done();
        }
      );

      const req = httpMock.expectOne(`${service.getApiUrl()}/login`);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle connection errors', (done) => {
      service.login('test@example.com', 'password').subscribe(
        () => fail('should have failed'),
        (error) => {
          expect(error.message).toContain('No se pudo conectar');
          done();
        }
      );

      const req = httpMock.expectOne(`${service.getApiUrl()}/login`);
      req.error(new ErrorEvent('Network error'));
    });

    it('should update currentUser$ observable', (done) => {
      service.currentUser$.subscribe((user) => {
        if (user) {
          expect(user).toEqual(mockUser);
          done();
        }
      });

      service.login('test@example.com', 'password').subscribe();

      const req = httpMock.expectOne(`${service.getApiUrl()}/login`);
      req.flush(mockAuthResponse);
    });
  });

  describe('logout', () => {
    it('should clear auth data from localStorage', () => {
      localStorage.setItem(STORAGE_KEYS.TOKEN, mockAuthResponse.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));
      localStorage.setItem(STORAGE_KEYS.EXPIRATION, Date.now().toString());

      service.logout();

      expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.EXPIRATION)).toBeNull();
    });

    it('should set currentUser to null', (done) => {
      service.logout();

      service.currentUser$.subscribe((user) => {
        expect(user).toBeNull();
        done();
      });
    });
  });

  describe('getToken', () => {
    it('should return token from localStorage', () => {
      localStorage.setItem(STORAGE_KEYS.TOKEN, 'test-token');
      expect(service.getToken()).toBe('test-token');
    });

    it('should return null if no token stored', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is authenticated', (done) => {
      service.login('test@example.com', 'password').subscribe(() => {
        expect(service.isAuthenticated()).toBeTrue();
        done();
      });

      const req = httpMock.expectOne(`${service.getApiUrl()}/login`);
      req.flush(mockAuthResponse);
    });

    it('should return false when user is not authenticated', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', (done) => {
      service.login('test@example.com', 'password').subscribe(() => {
        expect(service.getCurrentUser()).toEqual(mockUser);
        done();
      });

      const req = httpMock.expectOne(`${service.getApiUrl()}/login`);
      req.flush(mockAuthResponse);
    });

    it('should return null if no user logged in', () => {
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('setApiUrl', () => {
    it('should change API URL to proxy', () => {
      service.setApiUrl(true);
      expect(service.getApiUrl()).toBe(environment.apiUrl.proxy);
      expect(localStorage.getItem(STORAGE_KEYS.USE_PROXY)).toBe('true');
    });

    it('should change API URL to direct', () => {
      service.setApiUrl(false);
      expect(service.getApiUrl()).toBe(environment.apiUrl.direct);
      expect(localStorage.getItem(STORAGE_KEYS.USE_PROXY)).toBe('false');
    });
  });

  describe('getApiUrl', () => {
    it('should return current API URL', () => {
      const apiUrl = service.getApiUrl();
      expect(apiUrl).toBeDefined();
      expect(typeof apiUrl).toBe('string');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', (done) => {
      localStorage.setItem(STORAGE_KEYS.TOKEN, 'old-token');

      service.refreshToken().subscribe((response) => {
        expect(response).toEqual(mockAuthResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.getApiUrl()}/jwt/refresh`);
      expect(req.request.method).toBe('POST');
      req.flush(mockAuthResponse);
    });

    it('should return error when no token exists', (done) => {
      service.refreshToken().subscribe(
        () => fail('should have failed'),
        (error) => {
          expect(error.message).toContain('No hay token');
          done();
        }
      );
    });

    it('should handle 401 error and logout', (done) => {
      localStorage.setItem(STORAGE_KEYS.TOKEN, 'invalid-token');
      spyOn(service, 'logout');

      service.refreshToken().subscribe(
        () => fail('should have failed'),
        (error) => {
          expect(service.logout).toHaveBeenCalled();
          done();
        }
      );

      const req = httpMock.expectOne(`${service.getApiUrl()}/jwt/refresh`);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('testApiConnection', () => {
    it('should test API connection successfully', (done) => {
      service.testApiConnection().subscribe((response) => {
        expect(response).toBeDefined();
        done();
      });

      const req = httpMock.expectOne(`${service.getApiUrl()}/status`);
      req.flush({ status: 'ok' });
    });

    it('should handle connection error', (done) => {
      service.testApiConnection().subscribe(
        () => fail('should have failed'),
        (error) => {
          expect(error).toBeDefined();
          done();
        }
      );

      const req = httpMock.expectOne(`${service.getApiUrl()}/status`);
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('loadStoredAuthData', () => {
    it('should load stored auth data if valid', () => {
      const futureExpiration = Date.now() + 7200000;
      localStorage.setItem(STORAGE_KEYS.TOKEN, mockAuthResponse.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));
      localStorage.setItem(STORAGE_KEYS.EXPIRATION, futureExpiration.toString());

      const httpClient = TestBed.inject(HttpClient);
      const newService = new AuthService(httpClient);
      expect(newService.isAuthenticated()).toBeTrue();
    });

    it('should logout if stored token is expired', () => {
      const pastExpiration = Date.now() - 1000;
      localStorage.setItem(STORAGE_KEYS.TOKEN, mockAuthResponse.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));
      localStorage.setItem(STORAGE_KEYS.EXPIRATION, pastExpiration.toString());

      const httpClient = TestBed.inject(HttpClient);
      const newService = new AuthService(httpClient);
      expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
    });
  });
});