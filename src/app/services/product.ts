import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  specs: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private products: Product[] = [
    {
      id: 1,
      name: 'Prusa i3 MK4',
      description: 'Impresora 3D profesional para uso general',
      price: 1299.99,
      image: 'https://somosmaker.com/wp-content/uploads/1970/01/ENDER-3-V3-SE-220_220_250MM.png',
      specs: ['XY: 250x210mm', 'Z: 220mm', 'Nozzle: 0.4mm', 'Hot bed: 60°C']
    },
    {
      id: 2,
      name: 'Creality Ender 3 V3',
      description: 'Impresora 3D económica y confiable',
      price: 299.99,
      image: 'https://somosmaker.com/wp-content/uploads/1970/01/ENDER-3-V3-SE-220_220_250MM.png',
      specs: ['XY: 235x235mm', 'Z: 270mm', 'Nozzle: 0.4mm', 'Hot bed: 60°C']
    },
    {
      id: 3,
      name: 'Bambu Lab X1 Carbon',
      description: 'Impresora 3D de alta velocidad con cámara',
      price: 1799.99,
      image: 'https://somosmaker.com/wp-content/uploads/1970/01/ENDER-3-V3-SE-220_220_250MM.png',
      specs: ['XY: 256x256mm', 'Z: 256mm', 'Velocidad: 500mm/s', 'Cámara integrada']
    },
    {
      id: 4,
      name: 'Formlabs Form 3B',
      description: 'Impresora 3D de resina de precisión',
      price: 3499.99,
      image: 'https://somosmaker.com/wp-content/uploads/1970/01/ENDER-3-V3-SE-220_220_250MM.png',
      specs: ['XY: 145x82mm', 'Resolución: 25 micras', 'Tecnología SLA', 'Software avanzado']
    },
    {
      id: 5,
      name: 'Ultimaker S5',
      description: 'Impresora 3D industrial de dos cabezales',
      price: 4799.99,
      image: 'https://somosmaker.com/wp-content/uploads/1970/01/ENDER-3-V3-SE-220_220_250MM.png',
      specs: ['XY: 330x240mm', 'Z: 300mm', 'Doble extrusor', 'Conexión Wi-Fi']
    },
    {
      id: 6,
      name: 'Anycubic Vyper',
      description: 'Impresora 3D leveling automático y rápido',
      price: 399.99,
      image: 'https://somosmaker.com/wp-content/uploads/1970/01/ENDER-3-V3-SE-220_220_250MM.png',
      specs: ['XY: 245x245mm', 'Z: 260mm', 'Leveling automático', 'Pantalla táctil']
    }
  ];

  private productsSubject = new BehaviorSubject<Product[]>(this.products);

  constructor() { }

  getProducts(): Observable<Product[]> {
    return this.productsSubject.asObservable();
  }

  getProductById(id: number): Observable<Product | undefined> {
    return new Observable(observer => {
      observer.next(this.products.find(p => p.id === id));
      observer.complete();
    });
  }
}
