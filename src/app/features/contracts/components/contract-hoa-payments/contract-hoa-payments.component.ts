import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideAngularModule, Plus, Edit, Trash2, DollarSign, RotateCcw, X, FileDown, Mail } from 'lucide-angular';
import { ButtonComponent } from '../../../../core/components/button/button.component';
import { InterceptorService } from '../../../../core/services/interceptor.service';
import {
  HoaPayment,
  HoaPaymentStats,
  getHoaDueDate,
  getHoaOverdueAmount,
  getHoaPaymentMonthLabel,
  getHoaPaymentYear,
  getSuggestedHoaFirstPaymentDate,
  getSuggestedHoaMonthlyAmount,
  isHoaUnpaidOverdue,
  sortHoaPaymentsByDueDate,
  summarizeHoaCoverage
} from '../../models/hoa-payment.model';
import { HoaPaymentService } from '../../services/hoa-payment.service';
import { PaymentService } from '../../services/payment.service';
import { SendPaymentEmailModalComponent } from '../send-payment-email-modal/send-payment-email-modal.component';
import { GenerateHoaDialogComponent } from '../generate-hoa-dialog/generate-hoa-dialog.component';
import { EditHoaPaymentModalComponent } from '../edit-hoa-payment-modal/edit-hoa-payment-modal.component';
import { PartialHoaPaymentModalComponent } from '../partial-hoa-payment-modal/partial-hoa-payment-modal.component';
import { LocalDatePipe } from '../../../../core/pipes/local-date.pipe';

@Component({
  selector: 'app-contract-hoa-payments',
  standalone: true,
  imports: [CommonModule, ButtonComponent, LucideAngularModule, LocalDatePipe, MatTooltipModule],
  templateUrl: './contract-hoa-payments.component.html',
  styleUrl: './contract-hoa-payments.component.scss'
})
export class ContractHoaPaymentsComponent implements OnInit {
  @Input() contractId!: string;
  @Input() contract: any;
  @Input() currency = 'USD';
  @Input() contractStatus: string | null = null;
  @Output() dataChanged = new EventEmitter<void>();

  payments = signal<HoaPayment[]>([]);
  stats = signal<HoaPaymentStats | null>(null);
  loading = signal(false);
  generating = signal(false);
  currentPage = signal(1);
  selectedYear = signal<number | null>(null);
  readonly pageSize = 20;

  readonly Plus = Plus;
  readonly Edit = Edit;
  readonly Trash2 = Trash2;
  readonly DollarSign = DollarSign;
  readonly RotateCcw = RotateCcw;
  readonly X = X;
  readonly FileDown = FileDown;
  readonly Mail = Mail;
  readonly Math = Math;

  constructor(
    private hoaPaymentService: HoaPaymentService,
    private paymentService: PaymentService,
    private interceptorService: InterceptorService,
    private dialog: MatDialog
  ) {}

  hasReceipt(payment: HoaPayment): boolean {
    return payment.status !== 'cancelado' && Number(payment.amount_paid || 0) > 0;
  }

  downloadReceipt(payment: HoaPayment): void {
    this.paymentService.downloadReceipt(this.contractId, payment.id, 'hoa').subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `recibo-hoa-${payment.payment_number}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.interceptorService.openSnackbar({
          type: 'error',
          title: 'Error',
          message: 'No se pudo descargar el recibo',
        });
      },
    });
  }

  sendReceipt(payment: HoaPayment): void {
    this.dialog.open(SendPaymentEmailModalComponent, {
      width: '960px',
      maxWidth: '96vw',
      data: { payment, contractId: this.contractId, kind: 'hoa' },
    });
  }

  ngOnInit(): void {
    this.loadPayments();
    this.loadStats();
  }

  get isContractCancelled(): boolean {
    const status = (this.contractStatus || '').toLowerCase().trim();
    return status === 'cancelado' || status === 'cancelled' || status === 'canceled';
  }

  get canGeneratePayments(): boolean {
    return !this.isContractCancelled;
  }

  get sortedPayments(): HoaPayment[] {
    return sortHoaPaymentsByDueDate(this.payments());
  }

  get availableYears(): number[] {
    return [...new Set(this.sortedPayments.map((payment) => getHoaPaymentYear(payment)))]
      .filter((year) => year > 0)
      .sort((a, b) => a - b);
  }

  get filteredPayments(): HoaPayment[] {
    const year = this.selectedYear();
    if (year == null) return this.sortedPayments;
    return this.sortedPayments.filter((payment) => getHoaPaymentYear(payment) === year);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredPayments.length / this.pageSize));
  }

  get paginatedPayments(): HoaPayment[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredPayments.slice(start, start + this.pageSize);
  }

  get paginatedRows(): Array<{ kind: 'year'; year: number } | { kind: 'payment'; payment: HoaPayment }> {
    const rows: Array<{ kind: 'year'; year: number } | { kind: 'payment'; payment: HoaPayment }> = [];
    let lastYear: number | null = null;
    for (const payment of this.paginatedPayments) {
      const year = getHoaPaymentYear(payment);
      if (year && year !== lastYear) {
        rows.push({ kind: 'year', year });
        lastYear = year;
      }
      rows.push({ kind: 'payment', payment });
    }
    return rows;
  }

  get calendarRangeLabel(): string | null {
    return summarizeHoaCoverage(this.sortedPayments);
  }

  get overdueCount(): number {
    const list = this.sortedPayments;
    if (list.length) {
      return list.filter(isHoaUnpaidOverdue).length;
    }
    return this.stats()?.overdue_count || 0;
  }

  get overdueAmount(): number {
    const stats = this.stats();
    if (stats?.overdue_amount != null) {
      return Number(stats.overdue_amount);
    }
    return getHoaOverdueAmount(this.sortedPayments);
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage.set(page);
  }

  setYearFilter(year: number | null): void {
    this.selectedYear.set(year);
    this.currentPage.set(1);
  }

  loadPayments(): void {
    this.loading.set(true);
    this.hoaPaymentService.getPayments(this.contractId).subscribe({
      next: (payments) => {
        const sorted = sortHoaPaymentsByDueDate(payments);
        this.payments.set(sorted);
        this.autoSelectProgressPage(this.filteredPayments);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.interceptorService.openSnackbar({
          type: 'error',
          title: 'Error',
          message: 'No se pudieron cargar los pagos HOA'
        });
      }
    });
  }

  loadStats(): void {
    this.hoaPaymentService.getStats(this.contractId).subscribe({
      next: (stats) => this.stats.set(stats),
      error: () => {}
    });
  }

  generatePayments(): void {
    if (!this.contract || !this.canGeneratePayments) return;

    const existingPayments = this.payments();
    const dialogRef = this.dialog.open(GenerateHoaDialogComponent, {
      width: '500px',
      data: {
        contract: this.contract,
        existingPayments,
        suggestedFirstPaymentDate: getSuggestedHoaFirstPaymentDate(existingPayments),
        suggestedMonthlyAmount: getSuggestedHoaMonthlyAmount(existingPayments)
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;

      const monthlyAmount = Number(result.monthly_amount);
      if (!monthlyAmount || monthlyAmount <= 0) {
        this.interceptorService.openSnackbar({
          type: 'warning',
          title: 'Advertencia',
          message: 'El monto mensual debe ser mayor a 0'
        });
        return;
      }

      this.generating.set(true);
      this.hoaPaymentService.generatePayments(this.contractId, {
        first_payment_date: result.first_payment_date,
        payments_count: Number(result.payments_count),
        payment_day: Number(result.payment_day) || 5,
        monthly_amount: monthlyAmount
      }).subscribe({
        next: (created) => {
          this.generating.set(false);
          this.loadPayments();
          this.loadStats();
          this.dataChanged.emit();
          const count = created?.length ?? 0;
          this.interceptorService.openSnackbar({
            type: 'success',
            title: 'Éxito',
            message: count > 0
              ? `${count} cuota${count === 1 ? '' : 's'} HOA generada${count === 1 ? '' : 's'} correctamente`
              : 'Pagos HOA generados correctamente'
          });
        },
        error: (err) => {
          this.generating.set(false);
          this.interceptorService.openSnackbar({
            type: 'error',
            title: 'Error',
            message: err.error?.message || 'Error al generar pagos HOA'
          });
        }
      });
    });
  }

  editPayment(payment: HoaPayment): void {
    const dialogRef = this.dialog.open(EditHoaPaymentModalComponent, {
      data: { payment, contractId: this.contractId, currency: this.currency }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPayments();
        this.loadStats();
        this.dataChanged.emit();
      }
    });
  }

  registerPayment(payment: HoaPayment): void {
    const dialogRef = this.dialog.open(PartialHoaPaymentModalComponent, {
      data: { payment, contractId: this.contractId, currency: this.currency }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPayments();
        this.loadStats();
        this.dataChanged.emit();
      }
    });
  }

  cancelPayment(payment: HoaPayment): void {
    if (!confirm(`¿Cancelar el pago HOA #${payment.payment_number}?`)) return;
    this.hoaPaymentService.cancelPayment(this.contractId, payment.id).subscribe({
      next: () => {
        this.loadPayments();
        this.loadStats();
        this.dataChanged.emit();
      },
      error: (err) => {
        this.interceptorService.openSnackbar({
          type: 'error',
          title: 'Error',
          message: err.error?.message || 'No se pudo cancelar el pago HOA'
        });
      }
    });
  }

  resetPayment(payment: HoaPayment): void {
    if (!confirm(`¿Resetear el pago HOA #${payment.payment_number}?`)) return;
    this.hoaPaymentService.resetPayment(this.contractId, payment.id).subscribe({
      next: () => {
        this.loadPayments();
        this.loadStats();
        this.dataChanged.emit();
      },
      error: (err) => {
        this.interceptorService.openSnackbar({
          type: 'error',
          title: 'Error',
          message: err.error?.message || 'No se pudo resetear el pago HOA'
        });
      }
    });
  }

  deletePayment(payment: HoaPayment): void {
    if (!confirm(`¿Eliminar permanentemente el pago HOA #${payment.payment_number}?`)) return;
    this.hoaPaymentService.deletePayment(this.contractId, payment.id).subscribe({
      next: () => {
        this.loadPayments();
        this.loadStats();
        this.dataChanged.emit();
      },
      error: (err) => {
        this.interceptorService.openSnackbar({
          type: 'error',
          title: 'Error',
          message: err.error?.message || 'No se pudo eliminar el pago HOA'
        });
      }
    });
  }

  markOverdue(): void {
    this.hoaPaymentService.markOverdue(this.contractId).subscribe({
      next: () => {
        this.loadPayments();
        this.loadStats();
      },
      error: () => {}
    });
  }

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      pendiente: 'status-pill status-pill--pending',
      pagado: 'status-pill status-pill--paid',
      parcial: 'status-pill status-pill--partial',
      cancelado: 'status-pill status-pill--cancelled',
      overdue: 'status-pill status-pill--overdue'
    };
    return statusMap[status] || 'status-pill status-pill--cancelled';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      parcial: 'Parcial',
      pagado: 'Pagado',
      cancelado: 'Cancelado'
    };
    return labels[status] || status;
  }

  getPaymentMonthLabel(payment: HoaPayment): string {
    return getHoaPaymentMonthLabel(payment);
  }

  isPaymentOverdue(payment: HoaPayment): boolean {
    return isHoaUnpaidOverdue(payment);
  }

  canRegisterPayment(payment: HoaPayment): boolean {
    return payment.status === 'pendiente' || payment.status === 'parcial';
  }

  canEdit(payment: HoaPayment): boolean {
    return payment.status === 'pendiente' || payment.status === 'parcial' || payment.status === 'pagado';
  }

  canCancelPayment(payment: HoaPayment): boolean {
    return payment.status === 'pendiente' || payment.status === 'parcial' || payment.status === 'pagado';
  }

  canDeletePayment(payment: HoaPayment): boolean {
    return payment.status === 'cancelado';
  }

  canResetPayment(payment: HoaPayment): boolean {
    return payment.status === 'pagado' || payment.status === 'parcial';
  }

  private autoSelectProgressPage(payments: HoaPayment[]): void {
    if (!payments.length) {
      this.currentPage.set(1);
      return;
    }
    let lastPaidIndex = -1;
    for (let i = payments.length - 1; i >= 0; i--) {
      const p = payments[i];
      const hasAnyPayment = (p.amount_paid || 0) > 0 || p.status === 'pagado' || p.status === 'parcial';
      if (hasAnyPayment) {
        lastPaidIndex = i;
        break;
      }
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentMonthIndex = -1;
    for (let i = 0; i < payments.length; i++) {
      const due = getHoaDueDate(payments[i].due_date);
      if (!due) continue;
      if (
        due.getFullYear() === today.getFullYear() &&
        due.getMonth() === today.getMonth()
      ) {
        currentMonthIndex = i;
        break;
      }
    }
    const targetIndex =
      lastPaidIndex >= 0 ? lastPaidIndex : currentMonthIndex >= 0 ? currentMonthIndex : 0;
    const targetPage = Math.floor(targetIndex / this.pageSize) + 1;
    this.currentPage.set(targetPage);
  }
}
