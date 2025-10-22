import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  const mockRouterState: RouterStateSnapshot = {
    url: '/checkout',
    root: {} as ActivatedRouteSnapshot
  };

  const mockRoute: ActivatedRouteSnapshot = {
    component: null,
    data: {},
    url: [],
    outlet: 'primary',
    parent: null,
    firstChild: null,
    children: [],
    pathFromRoot: [],
    paramMap: jasmine.createSpyObj('ParamMap', ['get']),
    queryParamMap: jasmine.createSpyObj('QueryParamMap', ['get']),
    params: {},
    queryParams: {},
    fragment: null,
    title: undefined
  } as any;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'isAuthenticated'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['createUrlTree', 'navigate', 'navigateByUrl', 'serializeUrl', 'parseUrl']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(AuthGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('canActivate', () => {
    it('should allow access if user is authenticated', () => {
      authService.isAuthenticated.and.returnValue(true);

      const result = guard.canActivate(mockRoute, mockRouterState);

      expect(result).toBeTrue();
    });

    it('should redirect to login if user is not authenticated', () => {
      authService.isAuthenticated.and.returnValue(false);
      const mockUrlTree = {} as UrlTree;
      router.createUrlTree.and.returnValue(mockUrlTree);

      const result = guard.canActivate(mockRoute, mockRouterState);

      expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/checkout' }
      });
      expect(result).toBe(mockUrlTree);
    });

    it('should preserve current URL in returnUrl query param', () => {
      authService.isAuthenticated.and.returnValue(false);
      const mockUrlTree = {} as UrlTree;
      router.createUrlTree.and.returnValue(mockUrlTree);

      const state: RouterStateSnapshot = {
        url: '/payment-list',
        root: {} as ActivatedRouteSnapshot
      };

      guard.canActivate(mockRoute, state);

      expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/payment-list' }
      });
    });

    it('should handle various protected routes', () => {
      authService.isAuthenticated.and.returnValue(false);
      const mockUrlTree = {} as UrlTree;
      router.createUrlTree.and.returnValue(mockUrlTree);

      const protectedRoutes = ['/checkout', '/payment-list', '/profile'];

      protectedRoutes.forEach((url) => {
        router.createUrlTree.calls.reset();

        const state: RouterStateSnapshot = {
          url,
          root: {} as ActivatedRouteSnapshot
        };

        guard.canActivate(mockRoute, state);

        expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
          queryParams: { returnUrl: url }
        });
      });
    });
  });
});