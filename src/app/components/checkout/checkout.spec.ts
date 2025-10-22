import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckoutComponent } from './checkout';
import { CartService } from '../../services/cart';
import { PaymentService, PaymentRequest, PaymentResponse } from '../../services/payment';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError, EMPTY } from 'rxjs';
import { Product } from '../../services/product';

describe('CheckoutComponent', () => {
  let component: CheckoutComponent;
  let fixture: ComponentFixture<CheckoutComponent>;
  let cartService: jasmine.SpyObj<CartService>;
  let paymentService: jasmine.SpyObj<PaymentService>;
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
      'clearCart'
    ]);
    const paymentServiceSpy = jasmine.createSpyObj('PaymentService', [
      'processPayment',
      'validatePaymentData',
      'generateExternalId',
      'formatDateForApi',
      'downloadPaymentVoucher'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'navigateByUrl', 'serializeUrl', 'parseUrl']);
    Object.defineProperty(routerSpy, 'events', { get: () => EMPTY });

    await TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: [
        { provide: CartService, useValue: cartServiceSpy },
        { provide: PaymentService, useValue: paymentServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }
      ]
    }).compileComponents();

    cartService = TestBed.inject(CartService) as jasmine.SpyObj<CartService>;
    paymentService = TestBed.inject(
      PaymentService
    ) as jasmine.SpyObj<PaymentService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    cartService.getCart.and.returnValue(of([]));
    cartService.getTotal.and.returnValue(0);

    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    cartService.getCart.and.returnValue(of([]));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load cart and set default due date', () => {
      cartService.getCart.and.returnValue(of([]));
      cartService.getTotal.and.returnValue(0);

      fixture.detectChanges();

      expect(cartService.getCart).toHaveBeenCalled();
      expect(component.paymentForm.dueDate).toBeTruthy();
    });

    it('should calculate totals from cart', () => {
      const mockCartItem = { product: mockProduct, quantity: 2 };
      cartService.getCart.and.returnValue(of([mockCartItem]));
      cartService.getTotal.and.returnValue(200);

      fixture.detectChanges();

      expect(component.cartTotal).toBe(200);
    });
  });

  describe('createPaymentVoucher', () => {
    beforeEach(() => {
      cartService.getCart.and.returnValue(of([]));
      cartService.getTotal.and.returnValue(150.50);
      paymentService.generateExternalId.and.returnValue('ORD-123');
      paymentService.formatDateForApi.and.returnValue('2025-12-31 23:59:59');
      paymentService.validatePaymentData.and.returnValue([]);
      fixture.detectChanges();
    });



    it('should validate form before processing', () => {
      component.paymentForm.dueDate = ''; // Invalid

      component.createPaymentVoucher();

      expect(component.validationErrors.length).toBeGreaterThan(0);
      expect(paymentService.processPayment).not.toHaveBeenCalled();
    });

    it('should handle payment error', () => {
      const mockError = { error: { message: 'Payment failed' } };
      paymentService.processPayment.and.returnValue(throwError(() => mockError));

      component.createPaymentVoucher();

      expect(component.error).toBeTruthy();
      expect(component.success).toBeFalse();
    });


  });

  describe('validateForm', () => {
    beforeEach(() => {
      cartService.getCart.and.returnValue(of([]));
      fixture.detectChanges();
    });

    it('should validate due date is required', () => {
      component.paymentForm.dueDate = '';
      const isValid = component['validateForm']();

      expect(isValid).toBeFalse();
      expect(component.validationErrors.some((e) => e.includes('fecha'))).toBeTrue();
    });

    it('should validate due date is in future', () => {
      const pastDate = new Date(Date.now() - 86400000);
      component.paymentForm.dueDate = pastDate.toISOString().slice(0, 16);
      const isValid = component['validateForm']();

      expect(isValid).toBeFalse();
      expect(
        component.validationErrors.some((e) => e.includes('futuro'))
      ).toBeTrue();
    });

    it('should return true for valid form', () => {
      const futureDate = new Date(Date.now() + 86400000);
      component.paymentForm.dueDate = futureDate.toISOString().slice(0, 16);
      const isValid = component['validateForm']();

      expect(isValid).toBeTrue();
      expect(component.validationErrors.length).toBe(0);
    });
  });



  describe('backToCart', () => {
    it('should navigate to cart', () => {
      cartService.getCart.and.returnValue(of([]));
      fixture.detectChanges();

      component.backToCart();

      expect(router.navigate).toHaveBeenCalledWith(['/cart']);
    });
  });

  describe('continueShopping', () => {
    it('should navigate to products', () => {
      cartService.getCart.and.returnValue(of([]));
      fixture.detectChanges();

      component.continueShopping();

      expect(router.navigate).toHaveBeenCalledWith(['/products']);
    });
  });

  describe('downloadVoucher', () => {
    it('should download voucher if payment record exists', () => {
      cartService.getCart.and.returnValue(of([]));
      fixture.detectChanges();

      component.paymentRecord = { reference: 'REF-123' };
      component.downloadVoucher();

      expect(paymentService.downloadPaymentVoucher).toHaveBeenCalledWith(
        component.paymentRecord
      );
    });

    it('should not download voucher if no payment record', () => {
      cartService.getCart.and.returnValue(of([]));
      fixture.detectChanges();

      component.paymentRecord = null;
      component.downloadVoucher();

      expect(paymentService.downloadPaymentVoucher).not.toHaveBeenCalled();
    });
  });

  describe('generatePaymentDescription', () => {
    beforeEach(() => {
      cartService.getCart.and.returnValue(of([]));
      fixture.detectChanges();
    });

    it('should generate description from cart items', () => {
      const mockItem = { product: mockProduct, quantity: 2 };
      component.cartItems = [mockItem];

      component['generatePaymentDescription']();

      expect(component.paymentForm.description).toContain('Test Printer');
      expect(component.paymentForm.description).toContain('x2');
    });

    it('should clear description for empty cart', () => {
      component.cartItems = [];
      component['generatePaymentDescription']();

      expect(component.paymentForm.description).toBe('');
    });
  });

  describe('handlePaymentSuccess', () => {
    beforeEach(() => {
      cartService.getCart.and.returnValue(of([]));
      fixture.detectChanges();
    });

    it('should save totals for display', () => {
      component.cartTotal = 100;
      component.tax = 10;
      component.totalWithTax = 110;

      const mockResponse: PaymentResponse = {
        reference: 'REF-123',
        data: { reference: 'REF-123' }
      };

      component['handlePaymentSuccess'](mockResponse);

      expect(component.savedCartTotal).toBe(100);
      expect(component.savedTax).toBe(10);
      expect(component.savedTotalWithTax).toBe(110);
    });

    it('should clear cart after success', (done) => {
      const mockResponse: PaymentResponse = {
        reference: 'REF-123'
      };

      component['handlePaymentSuccess'](mockResponse);

      setTimeout(() => {
        expect(cartService.clearCart).toHaveBeenCalled();
        done();
      }, 2500);
    });
  });
});
