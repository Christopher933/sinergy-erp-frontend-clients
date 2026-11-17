import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { InterceptorService } from '../../../../core/services/interceptor.service';
import { Payment } from '../../models/payment.model';
import {
  PaymentReceiptCompose,
  PaymentReceiptTemplate,
  PaymentService,
  ReceiptKind,
} from '../../services/payment.service';
import { ReceiptBrandingComponent } from '../receipt-branding/receipt-branding.component';

@Component({
  selector: 'app-send-payment-email-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReceiptBrandingComponent],
  templateUrl: './send-payment-email-modal.component.html',
  styleUrls: ['./send-payment-email-modal.component.scss'],
})
export class SendPaymentEmailModalComponent implements OnInit {
  compose = signal<PaymentReceiptCompose | null>(null);
  template = signal<PaymentReceiptTemplate | null>(null);
  loading = signal(true);
  sending = false;
  savingTemplate = false;
  showTemplate = false;
  toEmail = '';
  cc = '';
  note = '';
  subject = '';
  bodyHtml = '';
  constructor(
    private paymentService: PaymentService,
    private interceptorService: InterceptorService,
    private sanitizer: DomSanitizer,
    public dialogRef: MatDialogRef<SendPaymentEmailModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { payment: Payment; contractId: string; kind?: ReceiptKind },
  ) {}

  ngOnInit() {
    this.paymentService.composeReceipt(this.data.contractId, this.data.payment.id, this.data.kind || 'payment').subscribe({
      next: (compose) => {
        this.compose.set(compose);
        this.toEmail = compose.to_email || '';
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.interceptorService.openSnackbar({
          type: 'error',
          title: 'Error',
          message: err.error?.message || 'No se pudo armar el recibo',
        });
      },
    });
  }

  preview(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.compose()?.preview_html || '');
  }

  samplePreview(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.template()?.sample_html || '');
  }

  openTemplate() {
    this.showTemplate = true;
    if (this.template()) return;
    this.paymentService.getReceiptTemplate(this.data.contractId).subscribe({
      next: (template) => {
        this.template.set(template);
        this.subject = template.subject;
        this.bodyHtml = template.body_html;
      },
      error: (err) => {
        this.interceptorService.openSnackbar({
          type: 'error',
          title: 'Error',
          message: err.error?.message || 'No se pudo cargar la plantilla',
        });
      },
    });
  }

  saveTemplate(reset = false) {
    this.savingTemplate = true;
    this.paymentService
      .updateReceiptTemplate(this.data.contractId, reset
        ? { reset_default: true }
        : { subject: this.subject, body_html: this.bodyHtml })
      .subscribe({
        next: (template) => {
          this.template.set(template);
          this.subject = template.subject;
          this.bodyHtml = template.body_html;
          this.savingTemplate = false;
          this.refreshCompose();
        },
        error: (err) => {
          this.savingTemplate = false;
          this.interceptorService.openSnackbar({
            type: 'error',
            title: 'Error',
            message: err.error?.message || 'No se pudo guardar la plantilla',
          });
        },
      });
  }

  send() {
    if (this.sending) return;
    this.sending = true;
    const cc = this.cc.split(',').map((item) => item.trim()).filter(Boolean);
    this.paymentService
      .sendReceipt(this.data.contractId, this.data.payment.id, {
        to_email: this.toEmail,
        cc,
        extra_message: this.note,
      }, this.data.kind || 'payment')
      .subscribe({
        next: () => {
          this.sending = false;
          this.interceptorService.openSnackbar({
            type: 'success',
            title: 'Enviado',
            message: 'El recibo se envió por correo',
          });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.sending = false;
          this.interceptorService.openSnackbar({
            type: 'error',
            title: 'Error',
            message: err.error?.message || 'No se pudo enviar el recibo',
          });
        },
      });
  }

  close() {
    this.dialogRef.close();
  }

  refreshCompose() {
    this.paymentService.composeReceipt(this.data.contractId, this.data.payment.id, this.data.kind || 'payment').subscribe({
      next: (compose) => this.compose.set(compose),
    });
  }
}
