import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductListComponent } from './product-list';
import { ProductService, Product } from '../../services/product';
import { CartService } from '../../services/cart';
import { of } from 'rxjs';

describe('ProductListComponent', () => {
  let component: ProductListComponent;
  let fixture: ComponentFixture<ProductListComponent>;
  let productService: jasmine.SpyObj<ProductService>;
  let cartService: jasmine.SpyObj<CartService>;

  const mockProducts: Product[] = [
    {
      id: 1,
      name: 'Printer 1',
      description: 'Description 1',
      price: 100,
      image: 'image1.jpg',
      specs: ['spec1']
    },
    {
      id: 2,
      name: 'Printer 2',
      description: 'Description 2',
      price: 200,
      image: 'image2.jpg',
      specs: ['spec2']
    }
  ];

  beforeEach(async () => {
    const productServiceSpy = jasmine.createSpyObj('ProductService', [
      'getProducts'
    ]);
    const cartServiceSpy = jasmine.createSpyObj('CartService', ['addToCart']);

    await TestBed.configureTestingModule({
      imports: [ProductListComponent],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: CartService, useValue: cartServiceSpy }
      ]
    }).compileComponents();

    productService = TestBed.inject(
      ProductService
    ) as jasmine.SpyObj<ProductService>;
    cartService = TestBed.inject(CartService) as jasmine.SpyObj<CartService>;

    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    productService.getProducts.and.returnValue(of([]));
    expect(component).toBeTruthy();
  });


});