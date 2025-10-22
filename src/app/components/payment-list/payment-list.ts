import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService, PaymentRecord, PAYMENT_STATUS_MAP, CancelPaymentRequest } from '../../services/payment';
import { Subscription } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CancelPaymentDialogComponent } from './cancel-payment-dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-payment-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    MatDialogModule,
    MatButtonModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './payment-list.html',
  styleUrls: ['./payment-list.css']
})
export class PaymentListComponent implements OnInit, OnDestroy {
  payments: PaymentRecord[] = [];
  filteredPayments: PaymentRecord[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  cancelingPaymentId: string | null = null;
  private paymentsSubscription: Subscription | null = null;

  showFilters = false;
  searchText = '';
  selectedStatus: string | null = null;
  dateFrom: string | null = null;
  dateTo: string | null = null;
  amountFrom: number | null = null;
  amountTo: number | null = null;

  statusOptions = [
    { value: '01', label: 'Creado' },
    { value: '02', label: 'Pagado' },
    { value: '03', label: 'Cancelado' },
    { value: '04', label: 'Expirado' }
  ];

  constructor(
    private paymentService: PaymentService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.paymentService.startAutoRefresh();

    this.paymentsSubscription = this.paymentService.payments$.subscribe({
      next: (payments) => {
        this.payments = payments;
        this.applyFilters();
        this.isLoading = false;
        this.errorMessage = null;
      },
      error: (error) => {
        console.error('Error al cargar los pagos:', error);
        this.isLoading = false;
        this.errorMessage = 'Error al cargar los pagos. Por favor, intenta de nuevo.';
      }
    });
  }

  ngOnDestroy(): void {
    this.paymentService.stopAutoRefresh();

    if (this.paymentsSubscription) {
      this.paymentsSubscription.unsubscribe();
    }
  }

  /**
   * Obtiene el texto legible del estado
   */
  getStatusLabel(status: string): string {
    return this.paymentService.getStatusLabel(status);
  }

  /**
   * Obtiene el color del estado
   */
  getStatusColor(status: string): string {
    return this.paymentService.getStatusColor(status);
  }

  /**
   * Formatea la fecha para mostrar
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Obtiene el ícono según el estado
   */
  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      '01': '⏳', // Creado - reloj
      '02': '✅', // Pagado - check
      '03': '❌', // Cancelado - error
      '04': '⚠️'  // Expirado - warning
    };
    return icons[status] || '❓';
  }

  /**
   * Manualmente refresca los pagos
   */
  refreshPayments(): void {
    this.isLoading = true;
    this.paymentService.loadPayments();
  }

  /**
   * Abre el diálogo para cancelar un pago
   */
  openCancelDialog(payment: PaymentRecord): void {
    const dialogRef = this.dialog.open(CancelPaymentDialogComponent, {
      width: '450px',
      data: {
        paymentId: payment.paymentId,
        paymentReference: payment.reference
      }
    });

    dialogRef.afterClosed().subscribe((cancelDescription) => {
      if (cancelDescription) {
        this.cancelPayment(payment, cancelDescription);
      }
    });
  }

  /**
   * Cancela un pago
   */
  private cancelPayment(payment: PaymentRecord, cancelDescription: string): void {
    this.cancelingPaymentId = payment.paymentId;
    
    const cancelRequest: CancelPaymentRequest = {
      reference: payment.reference,
      updateDescription: cancelDescription
    };

    this.paymentService.cancelPayment(cancelRequest).subscribe({
      next: (response) => {
        this.cancelingPaymentId = null;
        
        if (response.responseCode === 202) {
          this.snackBar.open('✅ Pago cancelado exitosamente', 'Cerrar', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });
          
          this.paymentService.loadPayments();
        } else if (response.responseCode === 400 || response.responseCode === 409) {
          let errorMessage = response.responseMessage || 'Error al cancelar el pago';
          
          if (response.error && response.error.includes('previously cancelled')) {
            errorMessage = 'Este pago ya ha sido cancelado anteriormente';
          }
          
          this.snackBar.open(`❌ ${errorMessage}`, 'Cerrar', {
            duration: 6000,
            panelClass: ['error-snackbar']
          });
        }
      },
      error: (error) => {
        this.cancelingPaymentId = null;
        console.error('Error al cancelar el pago:', error);
        
        this.snackBar.open(
          '❌ Error al cancelar el pago. Por favor, intenta de nuevo.',
          'Cerrar',
          {
            duration: 6000,
            panelClass: ['error-snackbar']
          }
        );
      }
    });
  }

  /**
   * Verifica si un pago puede ser cancelado
   * (Solo los pagos creados o pagados pueden cancelarse)
   */
  canCancelPayment(payment: PaymentRecord): boolean {
    return payment.status === '01' || payment.status === '02';
  }

  /**
   * Descarga el comprobante de pago en PDF
   */
  downloadVoucher(payment: PaymentRecord): void {
    this.paymentService.downloadPaymentVoucher(payment);
  }

  /**
   * Alterna la visibilidad del panel de filtros
   */
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  /**
   * Aplica todos los filtros a la lista de pagos
   */
  applyFilters(): void {
    this.filteredPayments = this.payments.filter(payment => {
      if (this.searchText.trim()) {
        const searchLower = this.searchText.toLowerCase();
        const matchesSearch = 
          payment.reference.toLowerCase().includes(searchLower) ||
          (payment.description && payment.description.toLowerCase().includes(searchLower)) ||
          payment.paymentId.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (this.selectedStatus && payment.status !== this.selectedStatus) {
        return false;
      }

      if (this.dateFrom || this.dateTo) {
        const paymentDate = new Date(payment.createdAt).getTime();
        
        if (this.dateFrom) {
          const fromDate = new Date(this.dateFrom).getTime();
          if (paymentDate < fromDate) return false;
        }
        
        if (this.dateTo) {
          const toDate = new Date(this.dateTo);
          toDate.setHours(23, 59, 59, 999); // Incluir todo el día
          if (paymentDate > toDate.getTime()) return false;
        }
      }

      if (this.amountFrom !== null || this.amountTo !== null) {
        const amount = payment.amount;
        
        if (this.amountFrom !== null && amount < this.amountFrom) {
          return false;
        }
        
        if (this.amountTo !== null && amount > this.amountTo) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Limpia todos los filtros
   */
  clearFilters(): void {
    this.searchText = '';
    this.selectedStatus = null;
    this.dateFrom = null;
    this.dateTo = null;
    this.amountFrom = null;
    this.amountTo = null;
    this.applyFilters();
  }

  /**
   * Maneja cambios en la búsqueda
   */
  onSearchChange(): void {
    this.applyFilters();
  }

  /**
   * Maneja cambios en los filtros avanzados
   */
  onFilterChange(): void {
    this.applyFilters();
  }

  /**
   * Obtiene el total de pagos filtrados
   */
  getFilteredTotal(): number {
    return this.filteredPayments.length;
  }

  /**
   * Obtiene el monto total de los pagos filtrados
   */
  getFilteredAmount(): number {
    return this.filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  }
}