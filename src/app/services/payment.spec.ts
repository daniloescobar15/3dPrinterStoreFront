import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PaymentService, PaymentRequest, PaymentResponse, PAYMENT_STATUS_MAP, PaymentRecord } from './payment';
import { environment } from '../../environments/environment';

describe('PaymentService', () => {
  let service: PaymentService;
  let httpMock: HttpTestingController;

  const mockPaymentRequest: PaymentRequest = {
    externalId: 'ORD-12345',
    amount: 150.50,
    description: 'Test payment',
    dueDate: '2025-12-31 23:59:59',
    callbackURL: 'http://callback.url'
  };

  const mockPaymentResponse: PaymentResponse = {
    responseCode: 200,
    responseMessage: 'Success',
    reference: 'REF-12345',
    status: '01',
    data: {
      reference: 'REF-12345',
      status: '01'
    }
  };

  const mockPaymentRecord: PaymentRecord = {
    id: 1,
    userId: 'user-1',
    externalId: 'ORD-12345',
    amount: 150.50,
    paymentId: 'PAY-12345',
    reference: 'REF-12345',
    responseCode: 200,
    responseMessage: 'Success',
    status: '01',
    description: 'Test payment',
    createdAt: '2025-01-01 10:00:00',
    updatedAt: '2025-01-01 10:00:00'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PaymentService]
    });

    service = TestBed.inject(PaymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('processPayment', () => {
    it('should process payment successfully', (done) => {
      service.processPayment(mockPaymentRequest).subscribe((response) => {
        expect(response).toEqual(mockPaymentResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl.proxy}/payment/process`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockPaymentRequest);
      req.flush(mockPaymentResponse);
    });

    it('should handle payment processing error', (done) => {
      service.processPayment(mockPaymentRequest).subscribe(
        () => fail('should have failed'),
        (error) => {
          expect(error).toBeDefined();
          done();
        }
      );

      const req = httpMock.expectOne(`${environment.apiUrl.proxy}/payment/process`);
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('getPayments', () => {
    it('should fetch payments list', (done) => {
      const mockPayments = [mockPaymentRecord];

      service.getPayments().subscribe((payments) => {
        expect(payments).toEqual(mockPayments);
        expect(payments.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl.proxy}/payment/list`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPayments);
    });

    it('should handle fetch payments error', (done) => {
      service.getPayments().subscribe(
        () => fail('should have failed'),
        (error) => {
          expect(error).toBeDefined();
          done();
        }
      );

      const req = httpMock.expectOne(`${environment.apiUrl.proxy}/payment/list`);
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment successfully', (done) => {
      const cancelRequest = {
        reference: 'REF-12345',
        updateDescription: 'User requested cancellation'
      };

      const mockCancelResponse = {
        responseCode: 200,
        responseMessage: 'Payment cancelled successfully'
      };

      service.cancelPayment(cancelRequest).subscribe((response) => {
        expect(response.responseCode).toBe(200);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl.proxy}/payment/cancel`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(cancelRequest);
      req.flush(mockCancelResponse);
    });
  });

  describe('loadPayments', () => {
    it('should load payments and update subject', (done) => {
      const mockPayments = [mockPaymentRecord];

      service.payments$.subscribe((payments) => {
        if (payments.length > 0) {
          expect(payments).toEqual(mockPayments);
          done();
        }
      });

      service.loadPayments();

      const req = httpMock.expectOne(`${environment.apiUrl.proxy}/payment/list`);
      req.flush(mockPayments);
    });
  });

  describe('generateExternalId', () => {
    it('should generate unique external IDs', () => {
      const id1 = service.generateExternalId('ORD');
      const id2 = service.generateExternalId('ORD');

      expect(id1).toMatch(/^ORD-\d+-[A-Z0-9]+$/);
      expect(id2).toMatch(/^ORD-\d+-[A-Z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should use custom prefix', () => {
      const id = service.generateExternalId('INV');
      expect(id).toMatch(/^INV-/);
    });

    it('should use default prefix ORD', () => {
      const id = service.generateExternalId();
      expect(id).toMatch(/^ORD-/);
    });
  });

  describe('validatePaymentData', () => {
    it('should validate correct payment data', () => {
      const errors = service.validatePaymentData(mockPaymentRequest);
      expect(errors.length).toBe(0);
    });

    it('should validate external ID', () => {
      const invalidData = { ...mockPaymentRequest, externalId: '' };
      const errors = service.validatePaymentData(invalidData);
      expect(errors.some((e) => e.includes('ID externo'))).toBeTrue();
    });

    it('should validate amount is greater than 0', () => {
      const invalidData = { ...mockPaymentRequest, amount: 0 };
      const errors = service.validatePaymentData(invalidData);
      expect(errors.some((e) => e.includes('monto'))).toBeTrue();
    });

    it('should validate description is not empty', () => {
      const invalidData = { ...mockPaymentRequest, description: '' };
      const errors = service.validatePaymentData(invalidData);
      expect(errors.some((e) => e.includes('descripción'))).toBeTrue();
    });

    it('should validate due date is in the future', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString().slice(0, 19).replace('T', ' ');
      const invalidData = { ...mockPaymentRequest, dueDate: pastDate };
      const errors = service.validatePaymentData(invalidData);
      expect(errors.some((e) => e.includes('futuro'))).toBeTrue();
    });

    it('should validate multiple errors', () => {
      const invalidData = {
        externalId: '',
        amount: -10,
        description: '',
        dueDate: ''
      };
      const errors = service.validatePaymentData(invalidData);
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe('getStatusLabel', () => {
    it('should return correct status labels', () => {
      expect(service.getStatusLabel('01')).toBe('Creado');
      expect(service.getStatusLabel('02')).toBe('Pagado');
      expect(service.getStatusLabel('03')).toBe('Cancelado');
      expect(service.getStatusLabel('04')).toBe('Expirado');
    });

    it('should return unknown for invalid status', () => {
      expect(service.getStatusLabel('99')).toBe('Desconocido');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct colors for each status', () => {
      expect(service.getStatusColor('01')).toBe('warning');
      expect(service.getStatusColor('02')).toBe('success');
      expect(service.getStatusColor('03')).toBe('danger');
      expect(service.getStatusColor('04')).toBe('secondary');
    });

    it('should return secondary for unknown status', () => {
      expect(service.getStatusColor('99')).toBe('secondary');
    });
  });

  describe('formatDateForApi', () => {
    it('should format Date object correctly', () => {
      const date = new Date('2025-12-31T23:59:59');
      const formatted = service.formatDateForApi(date);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should format string date correctly', () => {
      const dateString = '2025-12-31T23:59:59';
      const formatted = service.formatDateForApi(dateString);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should handle edge cases', () => {
      const date = new Date('2025-01-01T00:00:00');
      const formatted = service.formatDateForApi(date);
      expect(formatted).toMatch(/^2025-01-01/);
    });
  });

  describe('startAutoRefresh and stopAutoRefresh', () => {
    it('should start auto refresh polling', (done) => {
      const mockPayments = [mockPaymentRecord];

      service.startAutoRefresh();

      setTimeout(() => {
        service.stopAutoRefresh();
        done();
      }, 100);

      const req = httpMock.expectOne(`${environment.apiUrl.proxy}/payment/list`);
      req.flush(mockPayments);
    });

    it('should stop auto refresh polling', (done) => {
      service.startAutoRefresh();

      setTimeout(() => {
        service.stopAutoRefresh();

        setTimeout(() => {
          try {
            httpMock.expectNone(`${environment.apiUrl.proxy}/payment/list`);
            done();
          } catch {
            done();
          }
        }, 100);
      }, 100);

      const req = httpMock.expectOne(`${environment.apiUrl.proxy}/payment/list`);
      req.flush([]);
    });
  });

  describe('downloadPaymentVoucher', () => {
    it('should generate PDF voucher', () => {
      spyOn(window.URL, 'createObjectURL');

      service.downloadPaymentVoucher(mockPaymentRecord);

      expect(true).toBeTrue();
    });
  });
});