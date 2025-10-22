import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { environment } from '../../environments/environment';
import { switchMap, tap, startWith } from 'rxjs/operators';
import { jsPDF } from 'jspdf';

export interface PaymentRequest {
  externalId: string;
  amount: number;
  description: string;
  dueDate: string;
  callbackURL?: string;
}

export interface PaymentResponse {
  responseCode?: number;
  responseMessage?: string;
  reference?: string;
  status?: string;
  data?: {
    reference?: string;
    status?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface CancelPaymentRequest {
  reference: string;
  updateDescription: string;
}

export interface CancelPaymentResponse {
  responseCode: number;
  responseMessage: string;
  data?: {
    paymentId: number;
    creationDate: string;
    reference: string;
    status: string;
    message: string;
    cancelDescription: string;
    updatedAt: string;
  };
  error?: string;
  timestamp?: number;
}

export interface PaymentRecord {
  id: number;
  userId: string;
  externalId: string;
  amount: number;
  paymentId: string;
  reference: string;
  responseCode: number;
  responseMessage: string;
  status: string; // "01" = creado, "02" = pagado, "03" = cancelado, "04" = expirado
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentStatusMap {
  [key: string]: string;
}

export const PAYMENT_STATUS_MAP: PaymentStatusMap = {
  '01': 'Creado',
  '02': 'Pagado',
  '03': 'Cancelado',
  '04': 'Expirado'
};

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = environment.apiUrl.proxy;
  private paymentsSubject = new BehaviorSubject<PaymentRecord[]>([]);
  public payments$ = this.paymentsSubject.asObservable();

  private refreshSubscription: any;

  constructor(private http: HttpClient) { }

  /**
   * Procesa un pago y genera un voucher
   * @param paymentData Datos del pago
   * @returns Observable con la respuesta del servidor
   */
  processPayment(paymentData: PaymentRequest): Observable<PaymentResponse> {
    const url = `${this.apiUrl}/payment/process`;

    return this.http.post<PaymentResponse>(url, paymentData);
  }

  /**
   * Obtiene la lista de pagos del usuario
   * @returns Observable con el array de pagos
   */
  getPayments(): Observable<PaymentRecord[]> {
    const url = `${this.apiUrl}/payment/list`;

    return this.http.get<PaymentRecord[]>(url);
  }

  /**
   * Cancela un pago
   * @param cancelRequest Datos de cancelación (reference y updateDescription)
   * @returns Observable con la respuesta del servidor
   */
  cancelPayment(cancelRequest: CancelPaymentRequest): Observable<CancelPaymentResponse> {
    const url = `${this.apiUrl}/payment/cancel`;

    return this.http.post<CancelPaymentResponse>(url, cancelRequest);
  }

  /**
   * Obtiene la lista de pagos del usuario (una sola vez)
   * Actualiza el BehaviorSubject para que otros componentes puedan suscribirse
   */
  loadPayments(): void {
    this.getPayments().subscribe({
      next: (payments) => {
        this.paymentsSubject.next(payments);
      },
      error: (error) => {
        console.error('Error al cargar los pagos:', error);
      }
    });
  }

  /**
   * Inicia el polling automático cada 5 segundos
   * Se suscribe automáticamente y comienza a refrescar los pagos
   */
  startAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }

    this.refreshSubscription = interval(5000)
      .pipe(
        startWith(0),
        switchMap(() => this.getPayments()),
        tap((payments) => {
          this.paymentsSubject.next(payments);
        })
      )
      .subscribe({
        error: (error) => {
          console.error('Error en el polling automático de pagos:', error);
        }
      });
  }

  /**
   * Detiene el polling automático
   */
  stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = null;
    }
  }

  /**
   * Obtiene el texto legible del estado de pago
   * @param status Código de estado ("01", "02", "03", "04")
   * @returns Texto legible del estado
   */
  getStatusLabel(status: string): string {
    return PAYMENT_STATUS_MAP[status] || 'Desconocido';
  }

  /**
   * Obtiene el color del badge para el estado
   * @param status Código de estado
   * @returns Clase CSS de color
   */
  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      '01': 'warning',   // Creado - amarillo
      '02': 'success',   // Pagado - verde
      '03': 'danger',    // Cancelado - rojo
      '04': 'secondary'  // Expirado - gris
    };
    return colors[status] || 'secondary';
  }

  /**
   * Genera un ID externo único para el pago
   * Útil para asegurar IDs únicos
   * @param prefix Prefijo opcional para el ID
   * @returns ID externo único
   */
  generateExternalId(prefix: string = 'ORD'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Valida los datos del pago antes de enviarlos
   * @param paymentData Datos a validar
   * @returns Array de errores (vacío si es válido)
   */
  validatePaymentData(paymentData: Partial<PaymentRequest>): string[] {
    const errors: string[] = [];

    if (!paymentData.externalId || paymentData.externalId.trim() === '') {
      errors.push('El ID externo es requerido');
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('El monto debe ser mayor a 0');
    } else {
      const amountStr = paymentData.amount.toString();
      if (!this.hasExactlyTwoDecimals(paymentData.amount)) {
        errors.push('El monto debe tener exactamente 2 decimales');
      }
    }

    if (!paymentData.description || paymentData.description.trim() === '') {
      errors.push('La descripción es requerida');
    }

    if (!paymentData.dueDate || paymentData.dueDate.trim() === '') {
      errors.push('La fecha límite es requerida');
    } else {
      const dueDate = new Date(paymentData.dueDate);
      const now = new Date();
      if (dueDate <= now) {
        errors.push('La fecha límite debe ser en el futuro');
      }
    }

    return errors;
  }

  /**
   * Valida que un número tenga exactamente 2 decimales
   * @param amount Número a validar
   * @returns true si tiene exactamente 2 decimales
   */
  private hasExactlyTwoDecimals(amount: number): boolean {
    const rounded = Math.round(amount * 100) / 100;
    return amount === rounded;
  }

  /**
   * Formatea la fecha para el formato esperado por la API
   * @param date Fecha en formato Date o string
   * @returns Fecha formateada como 'YYYY-MM-DD HH:mm:ss'
   */
  formatDateForApi(date: Date | string): string {
    let dateObj: Date;

    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Genera y descarga un comprobante de pago en PDF
   * @param payment Registro de pago
   */
  downloadPaymentVoucher(payment: PaymentRecord): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, pageWidth, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE DE PAGO', 20, 20);

    doc.setTextColor(30, 41, 59);
    yPosition = 45;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL PAGO', 20, yPosition);
    yPosition += 10;
    const infoData = [
      { label: 'ID de Pago:', value: payment.paymentId },
      { label: 'Referencia:', value: payment.reference },
      { label: 'Estado:', value: this.getStatusLabel(payment.status) },
      { label: 'Monto:', value: `$${payment.amount.toFixed(2)}` },
      { label: 'Descripción:', value: payment.description || 'N/A' },
      { label: 'Fecha de Creación:', value: this.formatDateForDisplay(payment.createdAt) },
      { label: 'Última Actualización:', value: this.formatDateForDisplay(payment.updatedAt) },
      { label: 'Mensaje:', value: payment.responseMessage || 'N/A' }
    ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    infoData.forEach((item) => {
      doc.setFont('helvetica', 'bold');
      doc.text(item.label, 20, yPosition);
      
      doc.setFont('helvetica', 'normal');
      const labelWidth = doc.getTextWidth(item.label);
      const maxValueWidth = pageWidth - labelWidth - 40;
      
      const wrappedValue = doc.splitTextToSize(item.value, maxValueWidth);
      doc.text(wrappedValue, 20 + labelWidth + 5, yPosition);
      
      yPosition += wrappedValue.length > 1 ? wrappedValue.length * 5 + 2 : 8;
    });

    yPosition = pageHeight - 30;
    doc.setFillColor(241, 245, 249);
    doc.rect(0, yPosition - 5, pageWidth, 35, 'F');

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'Este comprobante fue generado automáticamente. Por favor, guárdalo para tus registros.',
      20,
      yPosition
    );
    
    const today = new Date();
    const formattedDate = today.toLocaleString('es-ES');
    doc.text(`Generado el: ${formattedDate}`, 20, yPosition + 8);

    const fileName = `comprobante-pago-${payment.reference}.pdf`;
    doc.save(fileName);
  }

  /**
   * Formatea una fecha para mostrar en el comprobante
   * @param dateString Fecha en string
   * @returns Fecha formateada de manera legible
   */
  private formatDateForDisplay(dateString: string): string {
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
}
