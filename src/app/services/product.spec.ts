import { TestBed } from '@angular/core/testing';
import { ProductService, Product } from './product';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProductService]
    });
    service = TestBed.inject(ProductService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getProducts', () => {
    it('should return observable of products', (done) => {
      service.getProducts().subscribe((products) => {
        expect(products).toBeDefined();
        expect(Array.isArray(products)).toBeTrue();
        expect(products.length).toBeGreaterThan(0);
        done();
      });
    });

    it('should return all 6 products', (done) => {
      service.getProducts().subscribe((products) => {
        expect(products.length).toBe(6);
        done();
      });
    });

    it('should return products with correct structure', (done) => {
      service.getProducts().subscribe((products) => {
        products.forEach((product) => {
          expect(product.id).toBeDefined();
          expect(product.name).toBeDefined();
          expect(product.description).toBeDefined();
          expect(product.price).toBeDefined();
          expect(product.image).toBeDefined();
          expect(product.specs).toBeDefined();
          expect(Array.isArray(product.specs)).toBeTrue();
        });
        done();
      });
    });

    it('should contain expected products', (done) => {
      service.getProducts().subscribe((products) => {
        const printerNames = products.map((p) => p.name);
        expect(printerNames).toContain('Prusa i3 MK4');
        expect(printerNames).toContain('Creality Ender 3 V3');
        expect(printerNames).toContain('Bambu Lab X1 Carbon');
        done();
      });
    });


  });

  describe('getProductById', () => {
    it('should return product by ID', (done) => {
      service.getProductById(1).subscribe((product) => {
        expect(product).toBeDefined();
        expect(product?.id).toBe(1);
        expect(product?.name).toBe('Prusa i3 MK4');
        done();
      });
    });

    it('should return undefined for non-existent ID', (done) => {
      service.getProductById(999).subscribe((product) => {
        expect(product).toBeUndefined();
        done();
      });
    });

    it('should return product with all properties', (done) => {
      service.getProductById(2).subscribe((product) => {
        expect(product?.id).toBe(2);
        expect(product?.name).toBe('Creality Ender 3 V3');
        expect(product?.description).toBeDefined();
        expect(product?.price).toBeDefined();
        expect(product?.image).toBeDefined();
        expect(product?.specs).toBeDefined();
        done();
      });
    });

    it('should return product with correct price', (done) => {
      service.getProductById(3).subscribe((product) => {
        expect(product?.price).toBe(1799.99);
        done();
      });
    });

    it('should handle multiple concurrent requests', (done) => {
      let completedRequests = 0;

      service.getProductById(1).subscribe((product) => {
        expect(product?.id).toBe(1);
        completedRequests++;
        if (completedRequests === 3) done();
      });

      service.getProductById(2).subscribe((product) => {
        expect(product?.id).toBe(2);
        completedRequests++;
        if (completedRequests === 3) done();
      });

      service.getProductById(3).subscribe((product) => {
        expect(product?.id).toBe(3);
        completedRequests++;
        if (completedRequests === 3) done();
      });
    });

    it('should complete observable after emission', (done) => {
      let completed = false;

      service.getProductById(1).subscribe(
        (product) => {
          expect(product).toBeDefined();
        },
        () => {
          fail('should not error');
        },
        () => {
          completed = true;
          expect(completed).toBeTrue();
          done();
        }
      );
    });
  });

  describe('Product prices', () => {
    it('should have correct price range', (done) => {
      service.getProducts().subscribe((products) => {
        const prices = products.map((p) => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        expect(minPrice).toBeGreaterThan(0);
        expect(maxPrice).toBeLessThan(10000);
        done();
      });
    });

    it('all products should have unique IDs', (done) => {
      service.getProducts().subscribe((products) => {
        const ids = products.map((p) => p.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
        done();
      });
    });
  });
});