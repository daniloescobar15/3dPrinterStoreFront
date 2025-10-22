import { TestBed } from '@angular/core/testing';
import { CartService, CartItem } from './cart';
import { Product } from './product';

describe('CartService', () => {
  let service: CartService;

  const mockProduct1: Product = {
    id: 1,
    name: 'Product 1',
    description: 'Description 1',
    price: 100,
    image: 'image1.jpg',
    specs: ['spec1', 'spec2']
  };

  const mockProduct2: Product = {
    id: 2,
    name: 'Product 2',
    description: 'Description 2',
    price: 200,
    image: 'image2.jpg',
    specs: ['spec3']
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CartService]
    });
    service = TestBed.inject(CartService);
  });

  describe('addToCart', () => {
    it('should add multiple different products', (done) => {
      service.addToCart(mockProduct1);
      service.addToCart(mockProduct2);

      service.getCart().subscribe((items) => {
        expect(items.length).toBe(2);
        expect(items[0].product.id).toBe(mockProduct1.id);
        expect(items[1].product.id).toBe(mockProduct2.id);
        done();
      });
    });

    it('should use default quantity of 1', (done) => {
      service.addToCart(mockProduct1);

      service.getCart().subscribe((items) => {
        expect(items[0].quantity).toBe(1);
        done();
      });
    });
  });

  describe('removeFromCart', () => {
    it('should remove product from cart', (done) => {
      service.addToCart(mockProduct1);
      service.addToCart(mockProduct2);
      service.removeFromCart(mockProduct1.id);

      service.getCart().subscribe((items) => {
        expect(items.length).toBe(1);
        expect(items[0].product.id).toBe(mockProduct2.id);
        done();
      });
    });

    it('should handle removing non-existent product', (done) => {
      service.addToCart(mockProduct1);
      service.removeFromCart(999);

      service.getCart().subscribe((items) => {
        expect(items.length).toBe(1);
        done();
      });
    });

    it('should empty cart when removing only product', (done) => {
      service.addToCart(mockProduct1);
      service.removeFromCart(mockProduct1.id);

      service.getCart().subscribe((items) => {
        expect(items.length).toBe(0);
        done();
      });
    });
  });

  describe('updateQuantity', () => {
    it('should update product quantity', (done) => {
      service.addToCart(mockProduct1, 2);
      service.updateQuantity(mockProduct1.id, 5);

      service.getCart().subscribe((items) => {
        expect(items[0].quantity).toBe(5);
        done();
      });
    });

    it('should handle updating non-existent product', (done) => {
      service.addToCart(mockProduct1, 2);
      service.updateQuantity(999, 10);

      service.getCart().subscribe((items) => {
        expect(items.length).toBe(1);
        expect(items[0].quantity).toBe(2);
        done();
      });
    });

    it('should set quantity to zero', (done) => {
      service.addToCart(mockProduct1, 5);
      service.updateQuantity(mockProduct1.id, 0);

      service.getCart().subscribe((items) => {
        expect(items[0].quantity).toBe(0);
        done();
      });
    });
  });

  describe('getTotal', () => {
    it('should calculate total correctly', () => {
      service.addToCart(mockProduct1, 2);
      service.addToCart(mockProduct2, 1);

      const total = service.getTotal();
      expect(total).toBe(100 * 2 + 200 * 1);
    });

    it('should return 0 for empty cart', () => {
      const total = service.getTotal();
      expect(total).toBe(0);
    });

    it('should calculate total with single product', () => {
      service.addToCart(mockProduct1, 3);

      const total = service.getTotal();
      expect(total).toBe(100 * 3);
    });

    it('should update total after removing item', () => {
      service.addToCart(mockProduct1, 2);
      service.addToCart(mockProduct2, 1);
      service.removeFromCart(mockProduct1.id);

      const total = service.getTotal();
      expect(total).toBe(200);
    });

    it('should update total after updating quantity', () => {
      service.addToCart(mockProduct1, 2);
      service.updateQuantity(mockProduct1.id, 5);

      const total = service.getTotal();
      expect(total).toBe(100 * 5);
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', (done) => {
      service.addToCart(mockProduct1);
      service.addToCart(mockProduct2);
      service.clearCart();

      service.getCart().subscribe((items) => {
        expect(items.length).toBe(0);
        done();
      });
    });

    it('should set total to 0 after clearing', () => {
      service.addToCart(mockProduct1, 2);
      service.addToCart(mockProduct2, 1);
      service.clearCart();

      expect(service.getTotal()).toBe(0);
    });
  });

  describe('getCart', () => {
    it('should return observable of cart items', (done) => {
      service.addToCart(mockProduct1);

      service.getCart().subscribe((items) => {
        expect(Array.isArray(items)).toBeTrue();
        expect(items.length).toBe(1);
        done();
      });
    });
  });
});