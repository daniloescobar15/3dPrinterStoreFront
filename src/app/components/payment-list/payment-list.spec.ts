import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentListComponent } from './payment-list';
import { PaymentService, PaymentRecord } from '../../services/payment';
import { Router } from '@angular/router';
import { of, EMPTY } from 'rxjs';

describe('PaymentListComponent', () => {
  let component: PaymentListComponent;
  let fixture: ComponentFixture<PaymentListComponent>;
  let paymentService: jasmine.SpyObj<PaymentService>;
  let router: jasmine.SpyObj<Router>;

  const mockPayments: PaymentRecord[] = [
    {
      id: 1,
      userId: 'user-1',
      externalId: 'ORD-001',
      amount: 150.50,
      paymentId: 'PAY-001',
      reference: 'REF-001',
      responseCode: 200,
      responseMessage: 'Success',
      status: '02',
      description: 'Payment 1',
      createdAt: '2025-01-01 10:00:00',
      updatedAt: '2025-01-01 10:00:00'
    },
    {
      id: 2,
      userId: 'user-1',
      externalId: 'ORD-002',
      amount: 299.99,
      paymentId: 'PAY-002',
      reference: 'REF-002',
      responseCode: 200,
      responseMessage: 'Success',
      status: '01',
      description: 'Payment 2',
      createdAt: '2025-01-02 10:00:00',
      updatedAt: '2025-01-02 10:00:00'
    }
  ];

  beforeEach(async () => {
    const paymentServiceSpy = jasmine.createSpyObj('PaymentService', [
      'payments$',
      'loadPayments',
      'startAutoRefresh',
      'stopAutoRefresh',
      'cancelPayment',
      'getStatusLabel',
      'getStatusColor',
      'downloadPaymentVoucher'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'navigateByUrl', 'serializeUrl', 'parseUrl']);
    Object.defineProperty(routerSpy, 'events', { get: () => EMPTY });

    await TestBed.configureTestingModule({
      imports: [PaymentListComponent],
      providers: [
        { provide: PaymentService, useValue: paymentServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    paymentService = TestBed.inject(
      PaymentService
    ) as jasmine.SpyObj<PaymentService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    paymentService.payments$ = of(mockPayments);

    fixture = TestBed.createComponent(PaymentListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });



  describe('payment display', () => {
    it('should display all payments', (done) => {
      paymentService.payments$ = of(mockPayments);

      fixture.detectChanges();

      setTimeout(() => {
        expect(component.payments.length).toBe(2);
        done();
      }, 100);
    });

    it('should display payment details', (done) => {
      paymentService.payments$ = of(mockPayments);

      fixture.detectChanges();

      setTimeout(() => {
        expect(component.payments[0].reference).toBe('REF-001');
        expect(component.payments[0].amount).toBe(150.50);
        done();
      }, 100);
    });

    it('should handle empty payment list', (done) => {
      paymentService.payments$ = of([]);

      fixture.detectChanges();

      setTimeout(() => {
        expect(component.payments.length).toBe(0);
        done();
      }, 100);
    });
  });

  describe('cancel payment functionality', () => {
    beforeEach(() => {
      paymentService.payments$ = of(mockPayments);
      fixture.detectChanges();
    });

    it('should determine if payment can be cancelled', () => {
      const payment = mockPayments[0]; // status: '02' (Pagado)
      const canCancel = component.canCancelPayment(payment);

      expect(canCancel).toBeTrue();
    });

    it('should not allow cancellation of expired payment', () => {
      const expiredPayment: PaymentRecord = {
        ...mockPayments[0],
        status: '04' // Expirado
      };
      const canCancel = component.canCancelPayment(expiredPayment);

      expect(canCancel).toBeFalse();
    });
  });

  describe('downloadVoucher', () => {
    beforeEach(() => {
      paymentService.payments$ = of(mockPayments);
      fixture.detectChanges();
    });

    it('should download payment voucher', () => {
      const payment = mockPayments[0];

      component.downloadVoucher(payment);

      expect(paymentService.downloadPaymentVoucher).toHaveBeenCalledWith(
        payment
      );
    });
  });

  describe('status display', () => {
    beforeEach(() => {
      paymentService.payments$ = of(mockPayments);
      paymentService.getStatusLabel.and.callFake((status) => {
        const labels: { [key: string]: string } = {
          '01': 'Creado',
          '02': 'Pagado'
        };
        return labels[status] || 'Unknown';
      });
      paymentService.getStatusColor.and.callFake((status) => {
        const colors: { [key: string]: string } = {
          '01': 'warning',
          '02': 'success'
        };
        return colors[status] || 'secondary';
      });

      fixture.detectChanges();
    });

    it('should display status label', () => {
      expect(paymentService.getStatusLabel).toBeDefined();
      expect(paymentService.getStatusLabel('02')).toBe('Pagado');
    });

    it('should display status color', () => {
      expect(paymentService.getStatusColor).toBeDefined();
      expect(paymentService.getStatusColor('02')).toBe('success');
    });
  });
});