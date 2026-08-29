import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as QRCode from 'qrcode';
import Swal from 'sweetalert2';
import { AppComponent } from '../app.component';
import { ApiService } from '../service/api.service';
import { SwalService } from '../service/swal.service';

type BatchStatus = 'Idle' | 'Reserving' | 'Reserved' | 'Printing' | 'Printed' | 'Failed';

interface ReservedLabel {
  labelNumber: string;
  qrValue: string;
}

interface ProductContext {
  productName: string;
  styleNo: string;
  size: string;
  color: string;
  mrp: string;
}

interface PrinterOption {
  name: string;
  status: string;
  isDefault: boolean;
}

interface TemplateSummary {
  brandName: string;
  tagline: string;
  manufacturerName: string;
  hologramEnabled: boolean;
  // % of labelWidthMM — the SAME percentages the backend's print-command generator uses to compute
  // the physical printable area (see printerCommandService.buildTsplCommand server-side). Never
  // hard-code a different split here; that's exactly what caused preview/print to disagree before.
  brandSectionWidth: number;
  centerSectionWidth: number;
  hologramSectionWidth: number;
}

interface FieldErrors {
  printer?: string;
  mfgDate?: string;
  density?: string;
  speed?: string;
  gap?: string;
  offset?: string;
}

const SAVED_SETTINGS_KEY = 'labelPrint.printerSettings.v1';

@Component({
  selector: 'app-label-print',
  templateUrl: './label-print.component.html',
  styleUrls: ['./label-print.component.css']
})
export class LabelPrintComponent implements OnInit {

  // ===== Printer Settings panel state (spec section 6) =====
  settingsExpanded = true;

  selectedPrinter: string | null = null;
  availablePrinters: PrinterOption[] = [];
  mfgDate: string = new Date().toISOString().substring(0, 10);
  density = 10;
  speed = 2;
  gapMm = 3;
  offsetMm = 0;
  isDetectingPrinters = false;
  printerDetectionError = '';

  readonly densityMin = 1;
  readonly densityMax = 15;
  readonly speedMin = 1;
  readonly speedMax = 4;

  fieldErrors: FieldErrors = {};

  // Label template dimensions — come from the label template, not the printer hardware config.
  labelWidthMM = 90;
  labelHeightMM = 44;

  template: TemplateSummary = {
    brandName: 'ARISER',
    tagline: 'FORMAL & CASUAL SHIRTS / TROUSERS',
    manufacturerName: '',
    hologramEnabled: true,
    brandSectionWidth: 37,
    centerSectionWidth: 53,
    hologramSectionWidth: 10
  };

  // Optional product context handed in by whatever screen opened this one (route query params) —
  // this screen never manages item selection itself.
  productContext: ProductContext | null = null;

  // Dev-only outline of the printable/center section — see readProductContextFromRoute.
  debugPrintableArea = false;

  // Label quantity
  labelCount = 1;
  copies = 1;
  readonly maxLabelCount = 1000;
  readonly maxCopies = 50;

  // Reservation / print batch (kept internally — never rendered as a table)
  reservedLabels: ReservedLabel[] = [];
  batchStatus: BatchStatus = 'Idle';
  batchError = '';

  previewIndex = 0;
  previewQrDataUrl = '';

  constructor(
    private route: ActivatedRoute,
    private apiservice: ApiService,
    private swal: SwalService,
    private appComponent: AppComponent
  ) { }

  ngOnInit(): void {
    this.readProductContextFromRoute();
    this.loadLabelTemplateDefaults();
    this.restoreSavedPrinterSettings();
    this.loadPrinters();
  }

  private readProductContextFromRoute() {
    const params = this.route.snapshot.queryParamMap;

    // Dev-only visual outline of the printable/center section (see printerCommandService's
    // printableXMm/printableWidthMm) — opt-in via ?debugPrintArea=1 so it never shows by default.
    this.debugPrintableArea = params.get('debugPrintArea') === '1';

    const productName = params.get('productName');
    if (!productName) {
      this.productContext = null;
      return;
    }
    this.productContext = {
      productName,
      styleNo: params.get('styleNo') || '',
      size: params.get('size') || '',
      color: params.get('color') || '',
      mrp: params.get('mrp') || ''
    };
  }

  // ===== Printer Settings panel =====

  toggleSettings() {
    this.settingsExpanded = !this.settingsExpanded;
  }

  /** Label template dimensions + brand/hologram summary, and the backend's density/speed/gap
   *  defaults — used only as a fallback when nothing has been saved locally yet. Never selects
   *  a printer on its own. */
  private loadLabelTemplateDefaults() {
    this.apiservice.getLabelPrintConfig().subscribe(
      (res: any) => {
        if (res?.success && res?.data) {
          const data = res.data;
          this.labelWidthMM = Number(data.labelWidth ?? this.labelWidthMM);
          this.labelHeightMM = Number(data.labelHeight ?? this.labelHeightMM);

          if (!this.hasSavedSettings()) {
            this.density = this.clamp(Number(data.density ?? this.density), this.densityMin, this.densityMax);
            this.speed = this.clamp(Number(data.speed ?? this.speed), this.speedMin, this.speedMax);
            this.gapMm = Number(data.gap ?? this.gapMm);
          }

          if (data.template) {
            this.template = {
              brandName: data.template.brandName || this.template.brandName,
              tagline: data.template.tagline || this.template.tagline,
              manufacturerName: data.template.manufacturerName || '',
              hologramEnabled: !!data.template.hologramEnabled,
              brandSectionWidth: Number(data.template.brandSectionWidth ?? this.template.brandSectionWidth),
              centerSectionWidth: Number(data.template.centerSectionWidth ?? this.template.centerSectionWidth),
              hologramSectionWidth: Number(data.template.hologramSectionWidth ?? this.template.hologramSectionWidth)
            };
          }
        }
      },
      (error: any) => {
        console.error('GET label-print/config failed:', error);
      }
    );
  }

/** Loads the printer dropdown from the last detection result (fast — served from a short-lived
   *  cache on the backend). Used silently on page open; never surfaces an error toast. */
  loadPrinters() {
    this.isDetectingPrinters = true;
    this.printerDetectionError = '';

    this.apiservice.getLabelPrinters().subscribe(
      (res: any) => this.applyPrinterList(res, false),
      (error: any) => {
        this.isDetectingPrinters = false;
        this.availablePrinters = [];
        this.printerDetectionError = this.getErrorMessage(error, 'Unable to load printers.');
        console.error('GET label/printers failed:', error);
      }
    );
  }

  /** "Detect" button — forces a fresh OS-level printer query instead of serving the cache. */
  detectPrinters() {
    this.isDetectingPrinters = true;
    this.printerDetectionError = '';

    this.apiservice.detectLabelPrinters().subscribe(
      (res: any) => this.applyPrinterList(res, true),
      (error: any) => {
        this.isDetectingPrinters = false;
        this.availablePrinters = [];
        this.printerDetectionError = this.getErrorMessage(error, 'Unable to detect printers. Please try again.');
        console.error('POST label/printers/detect failed:', error);
        this.swal.error('Error', this.printerDetectionError);
      }
    );
  }

  private applyPrinterList(res: any, isUserInitiated: boolean) {
    this.isDetectingPrinters = false;
    const printers: PrinterOption[] = res?.success && Array.isArray(res.printers) ? res.printers : [];
    this.availablePrinters = printers;

    if (printers.length === 0) {
      this.printerDetectionError = 'No printers were detected. Check the printer connection and try again.';
      if (isUserInitiated) {
        this.swal.error('Error', this.printerDetectionError);
      }
      return;
    }

    // Preserve the current selection if it's still in the refreshed list; never auto-pick one.
    if (this.selectedPrinter && !printers.some((p) => p.name === this.selectedPrinter)) {
      this.selectedPrinter = null;
      this.printerDetectionError = 'The previously selected printer is no longer available. Please choose another.';
    }
  }

  onPrinterChange() {
    this.fieldErrors.printer = undefined;
    this.persistSettings();
  }

  onSettingChange() {
    this.persistSettings();
  }

  // ===== Saved settings (per-browser; there is no per-user backend store for this yet) =====

  private hasSavedSettings(): boolean {
    try {
      return !!localStorage.getItem(SAVED_SETTINGS_KEY);
    } catch {
      return false;
    }
  }

  private restoreSavedPrinterSettings() {
    try {
      const raw = localStorage.getItem(SAVED_SETTINGS_KEY);
      if (!raw) {
        return;
      }
      const saved = JSON.parse(raw);
      this.selectedPrinter = saved.selectedPrinter ?? null;
      this.density = this.clamp(Number(saved.density ?? this.density), this.densityMin, this.densityMax);
      this.speed = this.clamp(Number(saved.speed ?? this.speed), this.speedMin, this.speedMax);
      this.gapMm = Number(saved.gapMm ?? this.gapMm);
      this.offsetMm = Number(saved.offsetMm ?? this.offsetMm);
    } catch {
      // Corrupt/unavailable storage — fall back to defaults silently.
    }
  }

  private persistSettings() {
    try {
      localStorage.setItem(SAVED_SETTINGS_KEY, JSON.stringify({
        selectedPrinter: this.selectedPrinter,
        density: this.density,
        speed: this.speed,
        gapMm: this.gapMm,
        offsetMm: this.offsetMm
      }));
    } catch {
      // Storage unavailable (private mode, quota, etc.) — settings just won't persist.
    }
  }

  private clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      return min;
    }
    return Math.min(Math.max(value, min), max);
  }

  // ===== Validation (spec section 7) =====

  private validateSettings(): boolean {
    const errors: FieldErrors = {};

    if (!this.selectedPrinter) {
      errors.printer = 'Select a printer before printing.';
    }
    if (!this.mfgDate || Number.isNaN(new Date(this.mfgDate).getTime())) {
      errors.mfgDate = 'Enter a valid manufacturing date.';
    }
    if (!Number.isFinite(this.density) || this.density < this.densityMin || this.density > this.densityMax) {
      errors.density = `Density must be between ${this.densityMin} and ${this.densityMax}.`;
    }
    if (!Number.isFinite(this.speed) || this.speed < this.speedMin || this.speed > this.speedMax) {
      errors.speed = `Speed must be between ${this.speedMin} and ${this.speedMax}.`;
    }
    if (!Number.isFinite(this.gapMm) || this.gapMm < 0) {
      errors.gap = 'Gap must be a valid positive number.';
    }
    if (!Number.isFinite(this.offsetMm)) {
      errors.offset = 'Offset must be a valid number.';
    }

    this.fieldErrors = errors;
    return Object.keys(errors).length === 0;
  }

  // ===== Label quantity =====

  onLabelCountChange() {
    if (!this.labelCount || this.labelCount < 1) {
      this.labelCount = 1;
    }
    this.labelCount = Math.min(Math.floor(this.labelCount), this.maxLabelCount);
  }

  onCopiesChange() {
    if (!this.copies || this.copies < 1) {
      this.copies = 1;
    }
    this.copies = Math.min(Math.floor(this.copies), this.maxCopies);
  }

  get totalPhysicalPrints(): number {
    return Number(this.labelCount || 0) * Number(this.copies || 0);
  }

  // ===== Preview (reserves Label Numbers from the backend, never generates them locally) =====

  get isReserved(): boolean {
    return this.reservedLabels.length > 0;
  }

  get previewLabel(): ReservedLabel | null {
    return this.reservedLabels[this.previewIndex] || null;
  }

  get labelAspectRatio(): string {
    return `${this.labelWidthMM} / ${this.labelHeightMM}`;
  }

  /** Section widths as real percentages from the active template — never hard-coded, so the preview
   *  can never drift from the same printable-area split the backend uses when it builds the actual
   *  printer command (see printerCommandService.buildTsplCommand). */
  get labelGridColumns(): string {
    return `${this.template.brandSectionWidth}% 1fr ${this.template.hologramSectionWidth}%`;
  }

  /** Visual hint of the printer's position offset. offsetMm shifts content along the label's feed
   *  direction (Y), matching printerCommandService.buildTsplCommand server-side — it is a vertical
   *  registration adjustment, not a horizontal one, so the preview must shift vertically too. */
  get previewOffsetTransform(): string {
    if (!this.offsetMm) {
      return 'translateY(0)';
    }
    const pct = (this.offsetMm / this.labelHeightMM) * 100;
    return `translateY(${pct}%)`;
  }

  preview() {
    this.onLabelCountChange();
    this.onCopiesChange();

    if (this.isReserved) {
      // Already reserved for this batch — nothing new to request, just (re)render the preview.
      this.renderPreviewQr();
      return;
    }

    this.batchStatus = 'Reserving';
    this.batchError = '';
    this.appComponent.showLoading('Reserving label numbers...');

    const payload = { labelCount: this.labelCount };
    this.apiservice.reserveLabelNumbers(payload).subscribe(
      (res: any) => {
        this.appComponent.hideLoading();
        if (res?.success && Array.isArray(res.labels) && res.labels.length === this.labelCount) {
          this.reservedLabels = res.labels.map((l: any) => ({ labelNumber: l.labelNumber, qrValue: l.qrValue }));
          this.previewIndex = 0;
          this.batchStatus = 'Reserved';
          this.renderPreviewQr();
          return;
        }

        this.batchStatus = 'Failed';
        this.batchError = this.getErrorMessage(res, 'Unable to reserve label numbers. Please try again.');
        console.error('POST label/reserveLabelNumbers returned an unexpected response:', res);
        this.swal.error('Error', this.batchError);
      },
      (error: any) => {
        this.appComponent.hideLoading();
        this.batchStatus = 'Failed';
        this.batchError = this.getErrorMessage(error, 'Unable to reserve label numbers. Please try again.');
        console.error('POST label/reserveLabelNumbers failed:', {
          url: `${this.apiservice.baseURL}label/reserveLabelNumbers`,
          method: 'POST',
          payload,
          status: error?.status,
          error: error?.error
        });
        this.swal.error('Error', this.batchError);
      }
    );
  }

  private renderPreviewQr() {
    const label = this.previewLabel;
    if (!label) {
      this.previewQrDataUrl = '';
      return;
    }
    QRCode.toDataURL(label.qrValue, { margin: 1, width: 180 })
      .then((url: string) => (this.previewQrDataUrl = url))
      .catch(() => (this.previewQrDataUrl = ''));
  }

  // ===== Print =====

  get isPrinting(): boolean {
    return this.batchStatus === 'Printing';
  }

  get printError(): string {
    return this.batchStatus === 'Failed' ? this.batchError : '';
  }

  print() {
    if (!this.validateSettings()) {
      this.swal.error('Error', 'Please fix the highlighted fields before printing.');
      return;
    }

    if (!this.isReserved) {
      this.swal.error('Error', 'Click Preview first to reserve label numbers before printing.');
      return;
    }

    Swal.fire({
      title: 'Print Confirmation',
      html: `
        <div style="text-align:left; font-size: 0.95rem; line-height: 1.6;">
          <div>Unique Labels: <strong>${this.reservedLabels.length}</strong></div>
          <div>Copies Per Label: <strong>${this.copies}</strong></div>
          <div>Total Physical Prints: <strong>${this.totalPhysicalPrints}</strong></div>
          <hr style="margin: 8px 0;">
          <div>Printer: <strong>${this.selectedPrinter}</strong></div>
          <div>Label Size: <strong>${this.labelWidthMM} &times; ${this.labelHeightMM} mm</strong></div>
          <div>Gap: <strong>${this.gapMm} mm</strong></div>
          <div>Offset: <strong>${this.offsetMm} mm</strong></div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#016DB0',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Print'
    }).then((result) => {
      if (result.isConfirmed) {
        this.executePrint();
      }
    });
  }

  private executePrint() {
    this.batchStatus = 'Printing';
    this.batchError = '';

    const payload = {
      labelNumbers: this.reservedLabels.map((l) => l.labelNumber),
      copies: this.copies,
      printerName: this.selectedPrinter,
      mfgDate: this.mfgDate,
      density: this.density,
      speed: this.speed,
      gapMm: this.gapMm,
      offsetMm: this.offsetMm,
      labelWidthMm: this.labelWidthMM,
      labelHeightMm: this.labelHeightMM
    };

    this.appComponent.showLoading('Printing labels...');
    this.apiservice.printLabels(payload).subscribe(
      (res: any) => {
        this.appComponent.hideLoading();
        if (res?.success) {
          this.batchStatus = 'Printed';
          this.swal.success_timer('Print job completed successfully');
          // These exact Label Numbers are now Printed and can never be printed again (the backend
          // rejects a reprint), so re-enabling this same Print button would only ever fail. Reset
          // the batch shortly after so the screen is immediately ready for the next Label Count.
          setTimeout(() => this.startNewBatch(), 1200);
          return;
        }

        this.batchStatus = 'Failed';
        this.batchError = this.getErrorMessage(res, 'Printing failed.');
        console.error('POST label/print returned failure:', res);
        this.swal.error('Print Error', this.batchError);
      },
      (error: any) => {
        this.appComponent.hideLoading();
        this.batchStatus = 'Failed';
        this.batchError = this.getErrorMessage(error, 'Printing failed.');
        console.error('POST label/print failed:', {
          url: `${this.apiservice.baseURL}label/print`,
          method: 'POST',
          payload,
          status: error?.status,
          error: error?.error
        });
        this.swal.error('Print Error', this.batchError);
      }
    );
  }

  retry() {
    // Reuses the exact same reserved labelNumbers/QR values — never requests new ones.
    this.executePrint();
  }

  cancel() {
    if (!this.isReserved && this.batchStatus === 'Idle') {
      return;
    }
    Swal.fire({
      title: 'Cancel this batch?',
      text: 'The reserved label numbers will not be printed. They stay reserved on the backend and will not be reused.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#016DB0',
      confirmButtonText: 'Yes, cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.startNewBatch();
      }
    });
  }

  /** Clears the current reservation/print batch so the screen is ready for a new Label Count —
   *  used both by Cancel and automatically right after a successful print. */
  private startNewBatch() {
    this.reservedLabels = [];
    this.previewIndex = 0;
    this.previewQrDataUrl = '';
    this.batchStatus = 'Idle';
    this.batchError = '';
  }

  private getErrorMessage(source: any, fallback: string): string {
    return source?.error?.message || source?.message || fallback;
  }
}
