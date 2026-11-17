import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Payment,
  PaymentStats,
  MarkPaymentPaidDto,
  UpdatePaymentDto,
  RegisterPartialPaymentDto,
  GeneratePaymentsDto,
  GeneratePaymentsResponse,
  PaymentSchedulePreview,
} from '../models/payment.model';
import { PaymentDocument } from '../models/payment-document.model';

export interface PaymentReceiptCompose {
  to_email: string;
  additional_email?: string | null;
  customer_name: string;
  subject: string;
  preview_html: string;
  attachment_name: string;
}

export interface PaymentReceiptFiscalOption {
  id: string;
  razon_social: string;
  rfc: string;
  has_logo: boolean;
  use_as_system_logo: boolean;
  logo_url: string | null;
}

export interface PaymentReceiptTemplate {
  id: string;
  subject: string;
  body_html: string;
  fiscal_configuration_id: string | null;
  effective_fiscal_configuration_id: string | null;
  fiscal_configurations: PaymentReceiptFiscalOption[];
  variables: { key: string; label: string }[];
  sample_subject: string;
  sample_html: string;
}

export type ReceiptKind = 'payment' | 'downpayment' | 'hoa';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private api = environment.api;

  constructor(private http: HttpClient) {}

  generatePayments(contractId: string, data: GeneratePaymentsDto): Observable<GeneratePaymentsResponse> {
    return this.http.post<GeneratePaymentsResponse>(`${this.api}/tenant/contracts/${contractId}/payments/generate`, data);
  }

  regeneratePayments(contractId: string, data: GeneratePaymentsDto): Observable<GeneratePaymentsResponse> {
    return this.http.post<GeneratePaymentsResponse>(`${this.api}/tenant/contracts/${contractId}/payments/regenerate`, data);
  }

  getSchedulePreview(contractId: string, startDate?: string): Observable<PaymentSchedulePreview> {
    const params = startDate ? { start_date: startDate } : undefined;
    return this.http.get<PaymentSchedulePreview>(
      `${this.api}/tenant/contracts/${contractId}/payments/schedule-preview`,
      { params }
    );
  }

  getPayments(contractId: string): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.api}/tenant/contracts/${contractId}/payments`);
  }

  getPaymentStats(contractId: string): Observable<PaymentStats> {
    return this.http.get<PaymentStats>(`${this.api}/tenant/contracts/${contractId}/payments/stats`);
  }

  getPayment(contractId: string, paymentId: string): Observable<Payment> {
    return this.http.get<Payment>(`${this.api}/tenant/contracts/${contractId}/payments/${paymentId}`);
  }

  updatePayment(contractId: string, paymentId: string, data: UpdatePaymentDto): Observable<Payment> {
    return this.http.put<Payment>(`${this.api}/tenant/contracts/${contractId}/payments/${paymentId}`, data);
  }

  updateLateInterest(
    contractId: string,
    paymentId: string,
    data: { amount?: number | null; waived?: boolean },
  ): Observable<Payment> {
    return this.http.patch<Payment>(
      `${this.api}/tenant/contracts/${contractId}/payments/${paymentId}/late-interest`,
      data,
    );
  }

  markAsPaid(contractId: string, paymentId: string, data: MarkPaymentPaidDto): Observable<Payment> {
    return this.http.post<Payment>(`${this.api}/tenant/contracts/${contractId}/payments/${paymentId}/pay`, data);
  }

  cancelPayment(contractId: string, paymentId: string): Observable<Payment> {
    return this.http.post<Payment>(`${this.api}/tenant/contracts/${contractId}/payments/${paymentId}/cancel`, {});
  }

  deletePayment(contractId: string, paymentId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/tenant/contracts/${contractId}/payments/${paymentId}`);
  }

  registerPartialPayment(contractId: string, paymentId: string, data: RegisterPartialPaymentDto): Observable<Payment> {
    return this.http.post<Payment>(`${this.api}/tenant/contracts/${contractId}/payments/${paymentId}/pay`, data);
  }

  downloadReceipt(contractId: string, paymentId: string, kind: ReceiptKind = 'payment'): Observable<Blob> {
    return this.http.get(`${this.api}${this.receiptBase(contractId, paymentId, kind)}.pdf`, { responseType: 'blob' });
  }

  composeReceipt(contractId: string, paymentId: string, kind: ReceiptKind = 'payment'): Observable<PaymentReceiptCompose> {
    return this.http.get<PaymentReceiptCompose>(`${this.api}${this.receiptBase(contractId, paymentId, kind)}/compose`);
  }

  sendReceipt(
    contractId: string,
    paymentId: string,
    body: { to_email?: string; cc?: string[]; extra_message?: string },
    kind: ReceiptKind = 'payment',
  ): Observable<{ sent: boolean }> {
    return this.http.post<{ sent: boolean }>(`${this.api}${this.receiptBase(contractId, paymentId, kind)}/send`, body);
  }

  private receiptBase(contractId: string, paymentId: string, kind: ReceiptKind): string {
    const segment =
      kind === 'downpayment' ? 'downpayment-payments' : kind === 'hoa' ? 'hoa-payments' : 'payments';
    return `/tenant/contracts/${contractId}/${segment}/${paymentId}/receipt`;
  }

  getReceiptTemplate(contractId: string): Observable<PaymentReceiptTemplate> {
    return this.http.get<PaymentReceiptTemplate>(
      `${this.api}/tenant/contracts/${contractId}/payments/receipt-template`,
    );
  }

  updateReceiptTemplate(
    contractId: string,
    body: { subject?: string; body_html?: string; reset_default?: boolean; fiscal_configuration_id?: string | null },
  ): Observable<PaymentReceiptTemplate> {
    return this.http.patch<PaymentReceiptTemplate>(
      `${this.api}/tenant/contracts/${contractId}/payments/receipt-template`,
      body,
    );
  }

  uploadReceiptLogo(contractId: string, fiscalConfigurationId: string, file: File): Observable<PaymentReceiptTemplate> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fiscal_configuration_id', fiscalConfigurationId);
    return this.http.post<PaymentReceiptTemplate>(
      `${this.api}/tenant/contracts/${contractId}/payments/receipt-template/logo`,
      formData,
    );
  }

  resetPayment(contractId: string, paymentId: string): Observable<Payment> {
    return this.http.post<Payment>(`${this.api}/tenant/contracts/${contractId}/payments/${paymentId}/reset`, {});
  }

  uploadDocument(contractId: string, paymentId: string, file: File, document_type: string, notes?: string): Observable<PaymentDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', document_type);
    if (notes) {
      formData.append('notes', notes);
    }
    return this.http.post<PaymentDocument>(`${this.api}/tenant/contracts/${contractId}/payments/${paymentId}/documents`, formData);
  }

  getDocuments(contractId: string, paymentId: string): Observable<PaymentDocument[]> {
    return this.http.get<PaymentDocument[]>(`${this.api}/tenant/contracts/${contractId}/payments/${paymentId}/documents`);
  }

  getDocumentUrl(contractId: string, paymentId: string, documentId: string, expiresIn: number = 3600): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.api}/tenant/contracts/${contractId}/payments/${paymentId}/documents/${documentId}/url?expiresIn=${expiresIn}`);
  }

  deleteDocument(contractId: string, paymentId: string, documentId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/tenant/contracts/${contractId}/payments/${paymentId}/documents/${documentId}`);
  }
}
