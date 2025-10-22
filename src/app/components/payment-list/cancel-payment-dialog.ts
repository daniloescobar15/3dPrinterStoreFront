import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

export interface CancelDialogData {
  paymentReference: string;
  paymentId: string;
}

@Component({
  selector: 'app-cancel-payment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ],
  template: `
    <div class="cancel-dialog-container">
      <h2 mat-dialog-title>Cancelar Pago</h2>
      
      <mat-dialog-content>
        <p class="payment-info">
          <strong>ID del Pago:</strong> {{ data.paymentId }}
        </p>
        <p class="payment-info">
          <strong>Referencia:</strong> <code>{{ data.paymentReference }}</code>
        </p>
        
        <mat-form-field class="full-width">
          <mat-label>Descripción de cancelación</mat-label>
          <textarea
            matInput
            [(ngModel)]="cancelDescription"
            rows="4"
            placeholder="Ingrese la razón o descripción de la cancelación"
            maxlength="255"
          ></textarea>
          <mat-hint align="end">{{ cancelDescription.length }}/255</mat-hint>
        </mat-form-field>

        <p class="warning-text">
          ⚠️ Esta acción cancelará el pago de forma permanente.
        </p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancelar</button>
        <button
          mat-raised-button
          color="warn"
          (click)="onConfirm()"
          [disabled]="!cancelDescription.trim()"
        >
          Cancelar Pago
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .cancel-dialog-container {
      min-width: 400px;
    }

    .payment-info {
      margin: 12px 0;
      font-size: 14px;
    }

    code {
      background-color: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      word-break: break-all;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .warning-text {
      color: #d32f2f;
      font-weight: 500;
      margin-top: 16px;
      font-size: 13px;
    }

    mat-dialog-actions {
      padding-top: 12px;
      margin-top: 12px;
      border-top: 1px solid #e0e0e0;
    }
  `]
})
export class CancelPaymentDialogComponent {
  cancelDescription: string = '';

  constructor(
    public dialogRef: MatDialogRef<CancelPaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CancelDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.cancelDescription.trim()) {
      this.dialogRef.close(this.cancelDescription);
    }
  }
}