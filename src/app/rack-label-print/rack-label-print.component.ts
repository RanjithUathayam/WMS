import { Component, OnInit } from '@angular/core';
import * as QRCode from 'qrcode';
import Swal from 'sweetalert2';
import { AppComponent } from '../app.component';
import { SwalService } from '../service/swal.service';

// Loaded globally via a <script> tag in index.html (https://qz.io) — same QZ Tray bridge the
// Label Print screen uses to reach printers attached to this machine.
declare var qz: any;

interface RackRow {
  row: string;
  count: number;
}

interface RackGroup {
  prefix: string;
  rows: RackRow[];
}

interface PrinterOption {
  name: string;
  isDefault: boolean;
}

// Physical rack layout. Codes are generated as <prefix>-<row><nn>, e.g. ATTM-A01 … THDW-E66.
const RACK_GROUPS: RackGroup[] = [
  {
    prefix: 'ATTM',
    rows: [
      { row: 'A', count: 16 },
      { row: 'B', count: 16 },
      { row: 'C', count: 16 },
      { row: 'D', count: 16 }
    ]
  },
  {
    prefix: 'THDW',
    rows: [
      { row: 'A', count: 33 },
      { row: 'B', count: 66 },
      { row: 'C', count: 33 },
      { row: 'D', count: 33 },
      { row: 'E', count: 66 },
      { row: 'F', count: 33 }
    ]
  }
];

const SAVED_SETTINGS_KEY = 'rackLabelPrint.settings.v1';

// Print resolution of the rendered sheet images — matches a 300 dpi label printer head; lower-dpi
// printers simply downscale.
const PRINT_DPI = 300;
const PREVIEW_DPI = 96;
// Sheets sent to QZ Tray per print job, so a full 300+ label run never sits in memory at once.
const PAGES_PER_JOB = 10;

@Component({
  selector: 'app-rack-label-print',
  templateUrl: './rack-label-print.component.html',
  styleUrls: ['../label-print/label-print.component.css', './rack-label-print.component.css']
})
export class RackLabelPrintComponent implements OnInit {

  readonly rackGroups = RACK_GROUPS;

  // ===== Printer =====
  selectedPrinter: string | null = null;
  availablePrinters: PrinterOption[] = [];
  isDetectingPrinters = false;
  printerDetectionError = '';

  // ===== Label stock — one physical sheet holds `labelsPerPage` rack labels stacked vertically =====
  pageWidthMm = 150;
  pageHeightMm = 150;
  labelsPerPage = 2;
  readonly maxLabelsPerPage = 4;

  // ===== Selection =====
  selectedRows: { [key: string]: boolean } = {};
  rangeFrom: number | null = null;
  rangeTo: number | null = null;
  customCodesText = '';
  copies = 1;
  readonly maxCopies = 10;

  codes: string[] = [];

  // ===== Preview =====
  previewPageIndex = 0;
  previewDataUrl = '';
  private previewToken = 0;

  isPrinting = false;

  constructor(
    private swal: SwalService,
    private appComponent: AppComponent
  ) { }

  ngOnInit(): void {
    this.restoreSavedSettings();
    this.rebuildCodes();
    this.loadPrinters(false);
  }

  // ===== Printer detection (QZ Tray) =====

  loadPrinters(isUserInitiated: boolean) {
    this.isDetectingPrinters = true;
    this.printerDetectionError = '';
    this.ensureQzConnected()
      .then(() => Promise.all([qz.printers.find(), qz.printers.getDefault().catch(() => null)]))
      .then(([found, defaultName]: [any, any]) => {
        this.isDetectingPrinters = false;
        const names: string[] = (Array.isArray(found) ? found : [found]).filter((n: any) => !!n);
        this.availablePrinters = names.map((name) => ({ name, isDefault: name === defaultName }));
        if (this.availablePrinters.length === 0) {
          this.printerDetectionError = 'No printers were detected. Check the printer connection and try again.';
        } else if (this.selectedPrinter && !names.includes(this.selectedPrinter)) {
          this.selectedPrinter = null;
          this.printerDetectionError = 'The previously selected printer is no longer available. Please choose another.';
        }
        if (isUserInitiated && this.printerDetectionError) {
          this.swal.error('Error', this.printerDetectionError);
        }
      })
      .catch((error: any) => {
        this.isDetectingPrinters = false;
        this.availablePrinters = [];
        this.printerDetectionError = this.getQzErrorMessage(
          error,
          'Unable to detect printers. Make sure QZ Tray is installed and running on this computer.'
        );
        console.error('QZ Tray printer detection failed:', error);
        if (isUserInitiated) {
          this.swal.error('Error', this.printerDetectionError);
        }
      });
  }

  private ensureQzConnected(): Promise<void> {
    if (typeof qz === 'undefined') {
      return Promise.reject(new Error('QZ Tray did not load in this browser. Check your connection and reload the page.'));
    }
    if (qz.websocket.isActive()) {
      return Promise.resolve();
    }
    return qz.websocket.connect();
  }

  private getQzErrorMessage(error: any, fallback: string): string {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    return fallback;
  }

  // ===== Saved settings (per-browser) =====

  private restoreSavedSettings() {
    try {
      const raw = localStorage.getItem(SAVED_SETTINGS_KEY);
      if (!raw) {
        return;
      }
      const saved = JSON.parse(raw);
      this.selectedPrinter = saved.selectedPrinter ?? null;
      this.pageWidthMm = Number(saved.pageWidthMm ?? this.pageWidthMm);
      this.pageHeightMm = Number(saved.pageHeightMm ?? this.pageHeightMm);
      this.labelsPerPage = this.clamp(Number(saved.labelsPerPage ?? this.labelsPerPage), 1, this.maxLabelsPerPage);
    } catch {
      // Corrupt/unavailable storage — fall back to defaults silently.
    }
  }

  private persistSettings() {
    try {
      localStorage.setItem(SAVED_SETTINGS_KEY, JSON.stringify({
        selectedPrinter: this.selectedPrinter,
        pageWidthMm: this.pageWidthMm,
        pageHeightMm: this.pageHeightMm,
        labelsPerPage: this.labelsPerPage
      }));
    } catch {
      // Storage unavailable — settings just won't persist.
    }
  }

  onPrinterChange() {
    this.persistSettings();
  }

  onStockChange() {
    this.labelsPerPage = this.clamp(Math.floor(Number(this.labelsPerPage)), 1, this.maxLabelsPerPage);
    this.persistSettings();
    this.previewPageIndex = Math.min(this.previewPageIndex, Math.max(this.pageCount - 1, 0));
    this.renderPreview();
  }

  private clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      return min;
    }
    return Math.min(Math.max(value, min), max);
  }

  // ===== Rack selection =====

  rowKey(group: RackGroup, row: RackRow): string {
    return `${group.prefix}-${row.row}`;
  }

  groupTotal(group: RackGroup): number {
    return group.rows.reduce((sum, r) => sum + r.count, 0);
  }

  isGroupFullySelected(group: RackGroup): boolean {
    return group.rows.every((r) => this.selectedRows[this.rowKey(group, r)]);
  }

  toggleGroup(group: RackGroup) {
    const select = !this.isGroupFullySelected(group);
    group.rows.forEach((r) => (this.selectedRows[this.rowKey(group, r)] = select));
    this.rebuildCodes();
  }

  clearSelection() {
    this.selectedRows = {};
    this.rangeFrom = null;
    this.rangeTo = null;
    this.customCodesText = '';
    this.rebuildCodes();
  }

  onCopiesChange() {
    this.copies = this.clamp(Math.floor(Number(this.copies)), 1, this.maxCopies);
    this.rebuildCodes();
  }

  /** Rebuilds the flat print list: selected rack rows (optionally limited to the From/To position
   *  range), then any custom codes, each repeated `copies` times. */
  rebuildCodes() {
    const unique: string[] = [];
    const from = this.rangeFrom && this.rangeFrom > 0 ? Math.floor(this.rangeFrom) : 1;
    const to = this.rangeTo && this.rangeTo > 0 ? Math.floor(this.rangeTo) : Number.MAX_SAFE_INTEGER;

    for (const group of this.rackGroups) {
      for (const r of group.rows) {
        if (!this.selectedRows[this.rowKey(group, r)]) {
          continue;
        }
        for (let n = from; n <= Math.min(to, r.count); n++) {
          unique.push(`${group.prefix}-${r.row}${String(n).padStart(2, '0')}`);
        }
      }
    }

    const custom = this.customCodesText
      .split(/[\n,]+/)
      .map((c) => c.trim().toUpperCase())
      .filter((c) => !!c);
    for (const c of custom) {
      if (!unique.includes(c)) {
        unique.push(c);
      }
    }

    this.codes = [];
    for (const code of unique) {
      for (let i = 0; i < this.copies; i++) {
        this.codes.push(code);
      }
    }

    this.previewPageIndex = Math.min(this.previewPageIndex, Math.max(this.pageCount - 1, 0));
    this.renderPreview();
  }

  get uniqueLabelCount(): number {
    return this.codes.length / (this.copies || 1);
  }

  get pageCount(): number {
    return Math.ceil(this.codes.length / this.labelsPerPage);
  }

  get labelHeightMm(): number {
    return Math.round((this.pageHeightMm / this.labelsPerPage) * 10) / 10;
  }

  private pageCodes(pageIndex: number): string[] {
    const start = pageIndex * this.labelsPerPage;
    return this.codes.slice(start, start + this.labelsPerPage);
  }

  // ===== Preview =====

  prevPage() {
    if (this.previewPageIndex > 0) {
      this.previewPageIndex--;
      this.renderPreview();
    }
  }

  nextPage() {
    if (this.previewPageIndex < this.pageCount - 1) {
      this.previewPageIndex++;
      this.renderPreview();
    }
  }

  private renderPreview() {
    const token = ++this.previewToken;
    if (!this.isStockValid()) {
      this.previewDataUrl = '';
      return;
    }
    // Empty selection still previews a sample so the layout is visible before choosing racks.
    const codes = this.codes.length ? this.pageCodes(this.previewPageIndex) : ['ATTM-A01', 'THDW-B66'].slice(0, this.labelsPerPage);
    this.renderPage(codes, PREVIEW_DPI * 2)
      .then((url) => {
        if (token === this.previewToken) {
          this.previewDataUrl = url;
        }
      })
      .catch((e) => console.error('Rack label preview render failed:', e));
  }

  // ===== Rendering — one sheet = one PNG, so preview and print are pixel-identical =====

  private async renderPage(codes: string[], dpi: number): Promise<string> {
    const pxPerMm = dpi / 25.4;
    const width = Math.round(this.pageWidthMm * pxPerMm);
    const height = Math.round(this.pageHeightMm * pxPerMm);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const slotHeight = height / this.labelsPerPage;
    for (let i = 0; i < codes.length; i++) {
      await this.drawRackLabel(ctx, codes[i], i * slotHeight, width, slotHeight, pxPerMm);
    }
    return canvas.toDataURL('image/png');
  }

  /** Mirrors the physical rack label: thin border, QR code on the left, location code in large
   *  heavy type filling the rest of the width. */
  private async drawRackLabel(ctx: CanvasRenderingContext2D, code: string, top: number,
    width: number, height: number, pxPerMm: number) {
    // Keep clear of the die-cut edge so nothing is clipped if the stock drifts slightly.
    const margin = 4 * pxPerMm;
    const boxX = margin;
    const boxY = top + margin;
    const boxW = width - margin * 2;
    const boxH = height - margin * 2;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, 0.5 * pxPerMm);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    const pad = Math.min(boxH, boxW) * 0.1;
    const qrSize = Math.floor(Math.min(boxH - pad * 2, boxW * 0.35));
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, code, { margin: 0, width: qrSize, errorCorrectionLevel: 'M' });
    const qrX = boxX + pad;
    const qrY = boxY + (boxH - qrSize) / 2;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    const textLeft = qrX + qrSize + pad;
    const textRight = boxX + boxW - pad;
    const maxTextWidth = textRight - textLeft;
    let fontPx = boxH * 0.5;
    ctx.font = `900 ${fontPx}px Arial, Helvetica, sans-serif`;
    const measured = ctx.measureText(code).width;
    if (measured > maxTextWidth) {
      fontPx = fontPx * (maxTextWidth / measured);
      ctx.font = `900 ${fontPx}px Arial, Helvetica, sans-serif`;
    }
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(code, (textLeft + textRight) / 2, boxY + boxH / 2);
  }

  // ===== Print =====

  private isStockValid(): boolean {
    return Number.isFinite(this.pageWidthMm) && Number.isFinite(this.pageHeightMm)
      && this.pageWidthMm >= 20 && this.pageHeightMm >= 20;
  }

  private validateForPrint(requirePrinter: boolean): boolean {
    if (!this.codes.length) {
      this.swal.error('Error', 'Select at least one rack row or enter a custom rack code.');
      return false;
    }
    if (!this.isStockValid()) {
      this.swal.error('Error', 'Label width and height must be at least 20 mm.');
      return false;
    }
    if (requirePrinter && !this.selectedPrinter) {
      this.swal.error('Error', 'Select a printer before printing.');
      return false;
    }
    return true;
  }

  print() {
    if (!this.validateForPrint(true)) {
      return;
    }
    Swal.fire({
      title: 'Print Confirmation',
      html: `
        <div style="text-align:left; font-size: 0.95rem; line-height: 1.6;">
          <div>Rack Labels: <strong>${this.uniqueLabelCount}</strong></div>
          <div>Copies Per Label: <strong>${this.copies}</strong></div>
          <div>Sheets (${this.labelsPerPage} per sheet): <strong>${this.pageCount}</strong></div>
          <hr style="margin: 8px 0;">
          <div>Printer: <strong>${this.selectedPrinter}</strong></div>
          <div>Sheet Size: <strong>${this.pageWidthMm} &times; ${this.pageHeightMm} mm</strong></div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#016DB0',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Print'
    }).then((result) => {
      if (result.isConfirmed) {
        this.executeQzPrint();
      }
    });
  }

  private async executeQzPrint() {
    this.isPrinting = true;
    try {
      await this.ensureQzConnected();
      const config = qz.configs.create(this.selectedPrinter, {
        size: { width: this.pageWidthMm, height: this.pageHeightMm },
        units: 'mm',
        margins: 0,
        scaleContent: true,
        colorType: 'blackwhite',
        interpolation: 'nearest-neighbor',
        jobName: 'Rack Labels'
      });

      for (let start = 0; start < this.pageCount; start += PAGES_PER_JOB) {
        const end = Math.min(start + PAGES_PER_JOB, this.pageCount);
        this.appComponent.showLoading(`Printing sheets ${start + 1}–${end} of ${this.pageCount}...`);
        const data = [];
        for (let p = start; p < end; p++) {
          const url = await this.renderPage(this.pageCodes(p), PRINT_DPI);
          data.push({ type: 'pixel', format: 'image', flavor: 'base64', data: url.split(',')[1] });
        }
        await qz.print(config, data);
      }

      this.appComponent.hideLoading();
      this.swal.success_timer('Rack labels sent to the printer');
    } catch (error: any) {
      this.appComponent.hideLoading();
      const message = this.getQzErrorMessage(error, 'Sending the print job to the printer failed.');
      console.error('QZ Tray rack label print failed:', error);
      this.swal.error('Print Error', message);
    } finally {
      this.isPrinting = false;
    }
  }

  /** Fallback for machines without QZ Tray: prints the same sheet images through the browser's own
   *  print dialog, with the page size set to the label stock. */
  async browserPrint() {
    if (!this.validateForPrint(false)) {
      return;
    }
    this.isPrinting = true;
    this.appComponent.showLoading('Preparing rack labels...');
    try {
      const images: string[] = [];
      for (let p = 0; p < this.pageCount; p++) {
        images.push(await this.renderPage(this.pageCodes(p), PRINT_DPI));
      }

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow!.document;
      doc.open();
      doc.write(`<!doctype html><html><head><title>Rack Labels</title><style>
        @page { size: ${this.pageWidthMm}mm ${this.pageHeightMm}mm; margin: 0; }
        html, body { margin: 0; padding: 0; }
        img { display: block; width: ${this.pageWidthMm}mm; height: ${this.pageHeightMm}mm; page-break-after: always; }
        img:last-child { page-break-after: auto; }
      </style></head><body>${images.map((src) => `<img src="${src}">`).join('')}</body></html>`);
      doc.close();

      await Promise.all(Array.from(doc.images).map((img) => img.decode().catch(() => undefined)));
      this.appComponent.hideLoading();
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    } catch (error: any) {
      this.appComponent.hideLoading();
      console.error('Browser rack label print failed:', error);
      this.swal.error('Print Error', 'Unable to prepare the rack labels for printing.');
    } finally {
      this.isPrinting = false;
    }
  }
}
