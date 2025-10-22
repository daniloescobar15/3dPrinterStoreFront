import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CartComponent } from './cart';
import { CartService } from '../../services/cart';
import { Router, ActivatedRoute } from '@angular/router';
import { of, EMPTY } from 'rxjs';
import { Product } from '../../services/product';

describe('CartComponent', () => {
  let component: CartComponent;
  let fixture: ComponentFixture<CartComponent>;
  let cartService: jasmine.SpyObj<CartService>;
  let router: jasmine.SpyObj<Router>;

  const mockProduct: Product = {
    id: 1,
    name: 'Test Printer',
    description: 'Test Description',
    price: 100,
    image: 'test.jpg',
    specs: ['spec1']
  };

  beforeEach(async () => {
    const cartServiceSpy = jasmine.createSpyObj('CartService', [
      'getCart',
      'getTotal',
      'updateQuantity',
      'removeFromCart'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'navigateByUrl', 'serializeUrl', 'parseUrl']);
    Object.defineProperty(routerSpy, 'events', { get: () => EMPTY });

    await TestBed.configureTestingModule({
      imports: [CartComponent],
      providers: [
        { provide: CartService, useValue: cartServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }
      ]
    }).compileComponents();

    cartService = TestBed.inject(CartService) as jasmine.SpyObj<CartService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    fixture = TestBed.createComponent(CartComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    cartService.getCart.and.returnValue(of([]));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load cart items', () => {
      const mockItems = [{ product: mockProduct, quantity: 2 }];
      cartService.getCart.and.returnValue(of(mockItems));
      cartService.getTotal.and.returnValue(200);

      fixture.detectChanges();

      expect(component.cartItems).toEqual(mockItems);
      expect(component.total).toBe(200);
    });

    it('should handle empty cart', () => {
      cartService.getCart.and.returnValue(of([]));
      cartService.getTotal.and.returnValue(0);

      fixture.detectChanges();

      expect(component.cartItems).toEqual([]);
      expect(component.total).toBe(0);
    });

    it('should subscribe to cart changes', (done) => {
      const mockItems = [{ product: mockProduct, quantity: 1 }];
      cartService.getCart.and.returnValue(of(mockItems));
      cartService.getTotal.and.returnValue(100);

      fixture.detectChanges();

      expect(cartService.getCart).toHaveBeenCalled();
      done();
    });
  });

  describe('updateQuantity', () => {
    beforeEach(() => {
      cartService.getCart.and.returnValue(of([]));
      fixture.detectChanges();
    });

    it('should update quantity if greater than 0', () => {
      component.updateQuantity(1, 5);

      expect(cartService.updateQuantity).toHaveBeenCalledWith(1, 5);
    });

    it('should not update quantity if 0 or less', () => {
      component.updateQuantity(1, 0);

      expect(cartService.updateQuantity).not.toHaveBeenCalled();
    });

    it('should not update quantity if negative', () => {
      component.updateQuantity(1, -5);

      expect(cartService.updateQuantity).not.toHaveBeenCalled();
    });
  });

  describe('removeFromCart', () => {
    beforeEach(() => {
      cartService.getCart.and.returnValue(of([]));
      fixture.detectChanges();
    });

    it('should remove product from cart', () => {
      component.removeFromCart(1);

      expect(cartService.removeFromCart).toHaveBeenCalledWith(1);
    });

    it('should handle removing non-existent product', () => {
      component.removeFromCart(999);

      expect(cartService.removeFromCart).toHaveBeenCalledWith(999);
    });
  });

  describe('checkout', () => {
    beforeEach(() => {
      cartService.getCart.and.returnValue(of([]));
      fixture.detectChanges();
    });

    it('should navigate to checkout page', () => {
      component.checkout();

      expect(router.navigate).toHaveBeenCalledWith(['/checkout']);
    });
  });

  describe('display logic', () => {
    it('should update total when cart changes', (done) => {
      const mockItems = [
        { product: mockProduct, quantity: 2 },
        { product: { ...mockProduct, id: 2, price: 50 }, quantity: 3 }
      ];
      cartService.getCart.and.returnValue(of(mockItems));
      cartService.getTotal.and.returnValue(350); // (100*2) + (50*3)

      fixture.detectChanges();

      setTimeout(() => {
        expect(component.total).toBe(350);
        done();
      }, 100);
    });

    it('should display all cart items', () => {
      const mockItems = [
        { product: mockProduct, quantity: 1 },
        { product: { ...mockProduct, id: 2 }, quantity: 2 }
      ];
      cartService.getCart.and.returnValue(of(mockItems));
      cartService.getTotal.and.returnValue(300);

      fixture.detectChanges();

      expect(component.cartItems.length).toBe(2);
    });
  });
});