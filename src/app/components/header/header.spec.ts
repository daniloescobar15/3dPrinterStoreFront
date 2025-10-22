import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header';
import { AuthService } from '../../services/auth';
import { CartService } from '../../services/cart';
import { Router, ActivatedRoute } from '@angular/router';
import { of, EMPTY } from 'rxjs';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let cartService: jasmine.SpyObj<CartService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'isAuthenticated',
      'logout'
    ]);
    const cartServiceSpy = jasmine.createSpyObj('CartService', ['getCart']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'navigateByUrl', 'serializeUrl', 'parseUrl']);
    Object.defineProperty(routerSpy, 'events', { get: () => EMPTY });

    authServiceSpy.currentUser$ = of(null);
    cartServiceSpy.getCart.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CartService, useValue: cartServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    cartService = TestBed.inject(CartService) as jasmine.SpyObj<CartService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });


});