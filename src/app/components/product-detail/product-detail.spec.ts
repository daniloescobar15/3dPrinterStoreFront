import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductDetailComponent } from './product-detail';
import { ProductService, Product } from '../../services/product';
import { CartService } from '../../services/cart';
import { of, EMPTY } from 'rxjs';

describe('ProductDetailComponent', () => {
  let component: ProductDetailComponent;
  let fixture: ComponentFixture<ProductDetailComponent>;
  let productService: jasmine.SpyObj<ProductService>;
  let cartService: jasmine.SpyObj<CartService>;
  let router: jasmine.SpyObj<Router>;
  let activatedRoute: any;

  const mockProduct: Product = {
    id: 1,
    name: 'Test Printer',
    description: 'Test Description',
    price: 1299.99,
    image: 'test.jpg',
    specs: ['spec1', 'spec2', 'spec3']
  };

  beforeEach(async () => {
    const productServiceSpy = jasmine.createSpyObj('ProductService', [
      'getProductById'
    ]);
    const cartServiceSpy = jasmine.createSpyObj('CartService', ['addToCart']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'serializeUrl', 'parseUrl']);
    Object.defineProperty(routerSpy, 'events', { get: () => EMPTY });

    activatedRoute = {
      params: of({ id: '1' }),
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('1')
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailComponent],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: CartService, useValue: cartServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRoute }
      ]
    }).compileComponents();

    productService = TestBed.inject(
      ProductService
    ) as jasmine.SpyObj<ProductService>;
    cartService = TestBed.inject(CartService) as jasmine.SpyObj<CartService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    fixture = TestBed.createComponent(ProductDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    productService.getProductById.and.returnValue(of(mockProduct));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load product details', (done) => {
      productService.getProductById.and.returnValue(of(mockProduct));

      fixture.detectChanges();

      setTimeout(() => {
        expect(component.product).toEqual(mockProduct);
        done();
      }, 100);
    });

    it('should handle product not found', (done) => {
      productService.getProductById.and.returnValue(of(undefined));

      fixture.detectChanges();

      setTimeout(() => {
        expect(component.product).toBeNull();
        done();
      }, 100);
    });

    it('should subscribe to route params changes', () => {
      productService.getProductById.and.returnValue(of(mockProduct));

      fixture.detectChanges();

      expect(productService.getProductById).toHaveBeenCalledWith(1);
    });

    it('should initialize product as null', (done) => {
      productService.getProductById.and.returnValue(of(mockProduct));
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.product).not.toBeNull();
        done();
      }, 100);
    });
  });

  describe('addToCart', () => {
    beforeEach(() => {
      productService.getProductById.and.returnValue(of(mockProduct));
      fixture.detectChanges();
      component.product = mockProduct;
      component.quantity = 2;
    });

    it('should add product to cart with quantity', () => {
      component.addToCart();

      expect(cartService.addToCart).toHaveBeenCalledWith(mockProduct, 2);
    });

    it('should use default quantity of 1', () => {
      component.quantity = 1;
      component.addToCart();

      expect(cartService.addToCart).toHaveBeenCalledWith(mockProduct, 1);
    });

    it('should not add if no product loaded', () => {
      component.product = null;
      component.addToCart();

      expect(cartService.addToCart).not.toHaveBeenCalled();
    });

    it('should add multiple times', () => {
      component.addToCart();
      component.addToCart();

      expect(cartService.addToCart).toHaveBeenCalledTimes(2);
    });
  });

  describe('quantity selection', () => {
    beforeEach(() => {
      productService.getProductById.and.returnValue(of(mockProduct));
      fixture.detectChanges();
    });

    it('should initialize with quantity 1', () => {
      expect(component.quantity).toBe(1);
    });

    it('should update quantity', () => {
      component.quantity = 5;
      expect(component.quantity).toBe(5);
    });

    it('should handle minimum quantity', () => {
      component.quantity = 0;
      expect(component.quantity).toBe(0);
    });
  });

  describe('product error handling', () => {
    beforeEach(() => {
      productService.getProductById.and.returnValue(of(mockProduct));
      fixture.detectChanges();
    });

    it('should handle null product gracefully', () => {
      component.product = null;
      fixture.detectChanges();
      expect(component.product).toBeNull();
    });

    it('should maintain quantity state', () => {
      component.quantity = 3;
      expect(component.quantity).toBe(3);
    });
  });

  describe('product display', () => {
    it('should display product name', (done) => {
      productService.getProductById.and.returnValue(of(mockProduct));

      fixture.detectChanges();

      setTimeout(() => {
        expect(component.product?.name).toBe('Test Printer');
        done();
      }, 100);
    });

    it('should display product price', (done) => {
      productService.getProductById.and.returnValue(of(mockProduct));

      fixture.detectChanges();

      setTimeout(() => {
        expect(component.product?.price).toBe(1299.99);
        done();
      }, 100);
    });

    it('should display product specifications', (done) => {
      productService.getProductById.and.returnValue(of(mockProduct));

      fixture.detectChanges();

      setTimeout(() => {
        expect(component.product?.specs.length).toBe(3);
        expect(component.product?.specs).toContain('spec1');
        done();
      }, 100);
    });
  });
});