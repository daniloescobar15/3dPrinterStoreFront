import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart';
import { PaymentService, PaymentRequest, PaymentResponse } from '../../services/payment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.css']
})
export class CheckoutComponent implements OnInit, OnDestroy {
  cartItems: any[] = [];
  cartTotal = 0;
  tax = 0;
  totalWithTax = 0;

  paymentForm = {
    description: '',
    dueDate: ''
  };

  isLoading = false;
  error: string | null = null;
  success = false;
  paymentReference: string | null = null;
  copiedToClipboard = false;

  savedCartTotal = 0;
  savedTax = 0;
  savedTotalWithTax = 0;

  paymentRecord: any = null;

  validationErrors: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private cartService: CartService,
    private paymentService: PaymentService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCart();
    this.setDefaultDueDate();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga los items del carrito y calcula totales
   * Se suscribe continuamente para actualizar cuando el carrito cambia
   */
  private loadCart(): void {
    this.cartService.getCart()
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        this.cartItems = items;
        this.calculateTotals();
        console.log('Carrito actualizado:', items, 'Total:', this.totalWithTax);
      });
  }

  /**
   * Calcula los totales (subtotal, impuestos, total)
   */
  private calculateTotals(): void {
    this.cartTotal = this.cartService.getTotal();
    this.tax = this.cartTotal * 0.19;
    this.totalWithTax = this.cartTotal + this.tax;
    this.generatePaymentDescription();
  }

  /**
   * Genera la descripción del pago automáticamente a partir de los productos
   */
  private generatePaymentDescription(): void {
    if (this.cartItems.length === 0) {
      this.paymentForm.description = '';
      return;
    }

    const productNames = this.cartItems
      .map(item => `${item.product.name} (x${item.quantity})`)
      .join(', ');
    this.paymentForm.description = `Compra de: ${productNames}`;
  }

  /**
   * Establece la fecha límite por defecto (7 días desde hoy)
   */
  private setDefaultDueDate(): void {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    this.paymentForm.dueDate = defaultDate.toISOString().slice(0, 16);
  }

  /**
   * Valida el formulario antes de procesar el pago
   */
  private validateForm(): boolean {
    this.validationErrors = [];

    if (!this.paymentForm.dueDate) {
      this.validationErrors.push('La fecha límite de pago es requerida');
    } else {
      const dueDate = new Date(this.paymentForm.dueDate);
      const now = new Date();
      if (dueDate <= now) {
        this.validationErrors.push('La fecha límite debe ser en el futuro');
      }
    }

    return this.validationErrors.length === 0;
  }

  /**
   * Procesa el pago y crea el voucher
   */
  createPaymentVoucher(): void {
    this.error = null;
    this.success = false;
    this.paymentReference = null;
    this.copiedToClipboard = false;

    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;

    const externalId = this.paymentService.generateExternalId('ORD');
    const formattedDueDate = this.paymentService.formatDateForApi(
      new Date(this.paymentForm.dueDate)
    );

    const amountWithTwoDecimals = parseFloat(this.totalWithTax.toFixed(2));

    const callbackURL = environment.payment.callbackUrl;

    const paymentRequest: PaymentRequest = {
      externalId: externalId,
      amount: amountWithTwoDecimals,
      description: this.paymentForm.description,
      dueDate: formattedDueDate,
      callbackURL: callbackURL
    };

    const validationErrors = this.paymentService.validatePaymentData(paymentRequest);
    if (validationErrors.length > 0) {
      this.validationErrors = validationErrors;
      this.isLoading = false;
      return;
    }

    console.log('Enviando solicitud de pago:', paymentRequest);

    this.paymentService.processPayment(paymentRequest).subscribe({
      next: (response: PaymentResponse) => {
        this.handlePaymentSuccess(response);
      },
      error: (error) => {
        this.handlePaymentError(error);
      }
    });
  }

  /**
   * Maneja la respuesta exitosa del servidor
   */
  private handlePaymentSuccess(response: PaymentResponse): void {
    this.isLoading = false;
    this.success = true;

    this.savedCartTotal = this.cartTotal;
    this.savedTax = this.tax;
    this.savedTotalWithTax = this.totalWithTax;

    this.paymentReference = response.reference || response.data?.reference || null;

    if (!this.paymentReference) {
      console.warn('No se encontró la referencia en la respuesta:', response);
      this.error = 'Error: No se pudo obtener la referencia de pago. Por favor, contacta a soporte.';
      this.success = false;
      this.isLoading = false;
      return;
    }

    if (response.data && typeof response.data === 'object') {
      this.paymentRecord = response.data;
    } else {
      this.paymentRecord = {
        reference: this.paymentReference,
        amount: this.savedTotalWithTax,
        description: this.paymentForm.description,
        status: response.status || '01',
        ...response
      };
    }

    this.error = null;

    console.log('Pago procesado exitosamente:', response);
    console.log('Referencia extraída:', this.paymentReference);

    setTimeout(() => {
      this.cartService.clearCart();
    }, 2000);
  }

  /**
   * Maneja los errores de la solicitud
   */
  private handlePaymentError(error: any): void {
    this.isLoading = false;
    this.success = false;

    let errorMessage = 'Error al procesar el pago. Por favor, intenta nuevamente.';

    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status) {
      errorMessage = `Error ${error.status}: No se pudo procesar el pago`;
    }

    this.error = errorMessage;
    console.error('Error en el pago:', error);
  }

  copyReferenceToClipboard(): void {
    if (this.paymentReference) {
      navigator.clipboard.writeText(this.paymentReference).then(() => {
        this.copiedToClipboard = true;
        setTimeout(() => {
          this.copiedToClipboard = false;
        }, 2000);
      }).catch(() => {
        alert('Error al copiar la referencia. Por favor, cópiala manualmente.');
      });
    }
  }

  backToCart(): void {
    this.router.navigate(['/cart']);
  }

  continueShopping(): void {
    this.router.navigate(['/products']);
  }

  downloadVoucher(): void {
    if (this.paymentRecord) {
      this.paymentService.downloadPaymentVoucher(this.paymentRecord);
    }
  }
}
