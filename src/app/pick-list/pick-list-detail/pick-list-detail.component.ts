import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import {
  BoxScan,
  InventoryPosition,
  PalletScan,
  PickListDetail,
  PickListError,
  PickListInventory,
  PickListLine,
  ScanLineRef,
  ScannedStock
} from '../pick-list.models';
import { PickListService } from '../pick-list.service';

type ScanStage = 'pallet' | 'box' | 'item' | 'qty';
type BottomTab = 'transactions' | 'sources' | 'log';

/** Item-level view: the same item can be on several Pick List lines (one per source STR line). */
interface ItemRow {
  itemCode: string;
  itemName: string;
  requiredQty: number;
  pickedQty: number;
  remainingQty: number;
  availableQty: number;
  shortageQty: number;
  warehouse: string;
  locations: string[];
  pallets: string[];
  boxes: string[];
  positions: InventoryPosition[];
  lines: PickListLine[];
}

/** Statuses in which picking is allowed (backend PICKABLE_STATUSES). */
const PICKABLE_STATUSES = ['OPEN', 'IN_PROGRESS'];
/** Statuses from which Complete may be (re)tried — PICKED / DC_CREATED mean a previous attempt failed part-way. */
const COMPLETABLE_STATUSES = ['OPEN', 'IN_PROGRESS', 'PICKED', 'DC_CREATED'];

/** Error codes after which the on-screen quantities are probably stale and must be reloaded. */
const STALE_DATA_CODES = [
  'INSUFFICIENT_STOCK', 'PICK_QTY_EXCEEDS_REMAINING', 'LINE_ALREADY_PICKED', 'LOCATION_MISMATCH',
  'WAREHOUSE_MISMATCH', 'PICKLIST_CLOSED', 'PICKLIST_CANCELLED', 'BOX_NOT_APPLICABLE', 'PALLET_NOT_AVAILABLE'
];

@Component({
  selector: 'app-pick-list-detail',
  templateUrl: './pick-list-detail.component.html',
  styleUrls: ['../pick-list.shared.css', './pick-list-detail.component.css']
})
export class PickListDetailComponent implements OnInit, OnDestroy {
  @ViewChild('itemInput') itemInput?: ElementRef<HTMLInputElement>;
  @ViewChild('palletInput') palletInput?: ElementRef<HTMLInputElement>;
  @ViewChild('boxInput') boxInput?: ElementRef<HTMLInputElement>;
  @ViewChild('qtyInput') qtyInput?: ElementRef<HTMLInputElement>;

  pickListId = 0;
  detail: PickListDetail | null = null;
  isLoading = false;
  loadError = '';

  inventory: PickListInventory | null = null;
  isLoadingInventory = false;
  inventoryError = '';
  itemRows: ItemRow[] = [];

  bottomTab: BottomTab = 'transactions';
  selectedItemCode = '';

  // ---- Scan form
  scan = { palletNumber: '', boxNumber: '', itemCode: '', pickQty: null as number | null };
  stage: ScanStage = 'pallet';
  palletScan: PalletScan | null = null;
  /** Server-validated contents of the scanned box. */
  boxScan: BoxScan | null = null;
  /** Server-validated stock for the scanned item in the scanned box. */
  stock: ScannedStock | null = null;
  selectedLineId: number | null = null;
  scanError: PickListError | null = null;
  scanNotice = '';
  lastPickMessage = '';
  isScanning = false;
  isSaving = false;
  /** Reused when retrying the same pick after a network error so the backend can de-duplicate it. */
  private clientRequestId = '';

  isCompleting = false;
  completionError: PickListError | null = null;

  private subscriptions = new Subscription();

  constructor(
    public pickListService: PickListService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(this.route.paramMap.subscribe(params => {
      this.pickListId = Number(params.get('id')) || 0;
      this.detail = null;
      this.inventory = null;
      this.itemRows = [];
      this.selectedItemCode = '';
      this.completionError = null;
      this.resetScan();
      this.loadAll(() => this.focusStage());
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ================================================================ loading

  /** Reloads the Pick List (header, lines, transactions, DC, log) and its stock. */
  loadAll(after?: () => void) {
    let pending = 2;
    const done = () => {
      if (--pending === 0) {
        after?.();
      }
    };
    this.loadDetail(done);
    this.loadInventory(done);
  }

  loadDetail(after?: () => void) {
    this.isLoading = true;
    this.loadError = '';
    this.pickListService.getPickList(this.pickListId).subscribe({
      next: detail => {
        this.isLoading = false;
        this.detail = detail;
        this.buildItemRows();
        if (!this.isEditable) {
          this.resetScan();
        }
        after?.();
      },
      error: err => {
        this.isLoading = false;
        this.loadError = err.message;
        after?.();
      }
    });
  }

  loadInventory(after?: () => void) {
    this.isLoadingInventory = true;
    this.inventoryError = '';
    this.pickListService.getInventory(this.pickListId).subscribe({
      next: inventory => {
        this.isLoadingInventory = false;
        this.inventory = inventory;
        this.buildItemRows();
        after?.();
      },
      error: err => {
        this.isLoadingInventory = false;
        this.inventoryError = err.message;
        after?.();
      }
    });
  }

  refresh() {
    this.loadAll();
  }

  /** Merges Pick List lines (quantities) with the server's stock view (availability + positions) per item. */
  private buildItemRows() {
    const lines = this.detail?.details || [];
    const rows = new Map<string, ItemRow>();
    for (const line of lines) {
      const key = line.itemCode.toUpperCase();
      let row = rows.get(key);
      if (!row) {
        row = {
          itemCode: line.itemCode, itemName: line.itemName, requiredQty: 0, pickedQty: 0, remainingQty: 0,
          availableQty: 0, shortageQty: 0, warehouse: line.fromWarehouse,
          locations: [], pallets: [], boxes: [], positions: [], lines: []
        };
        rows.set(key, row);
      }
      row.requiredQty += line.requestedQty;
      row.pickedQty += line.pickedQty;
      row.remainingQty += line.remainingQty;
      row.lines.push(line);
    }

    for (const row of rows.values()) {
      const summary = this.inventory?.itemSummary.find(s => s.itemCode.toUpperCase() === row.itemCode.toUpperCase());
      row.availableQty = summary?.availableQty ?? 0;
      row.shortageQty = summary?.shortageQty ?? Math.max(row.remainingQty - row.availableQty, 0);
      // Every line of the same item/warehouse lists the same stock — de-duplicate by inventory row.
      const positions = new Map<number, InventoryPosition>();
      this.inventory?.items
        .filter(i => i.itemCode.toUpperCase() === row.itemCode.toUpperCase())
        .forEach(i => i.inventory.forEach(p => positions.set(p.inventoryId, p)));
      row.positions = [...positions.values()];
      row.locations = [...new Set(row.positions.map(p => p.location).filter(Boolean))];
      row.pallets = [...new Set(row.positions.map(p => p.palletNumber))];
      row.boxes = [...new Set(row.positions.map(p => p.boxNumber))];
    }
    this.itemRows = [...rows.values()];
  }

  // ================================================================ derived state

  get isEditable(): boolean {
    return !!this.detail && PICKABLE_STATUSES.includes(this.detail.status);
  }

  get isCompleted(): boolean {
    return this.detail?.status === 'COMPLETED';
  }

  /** PICKED / DC_CREATED: picking is done but DC or SAP Stock Transfer has not finished. */
  get isAwaitingPosting(): boolean {
    return this.detail?.status === 'PICKED' || this.detail?.status === 'DC_CREATED';
  }

  get totals() {
    const lines = this.detail?.details || [];
    const required = lines.reduce((s, l) => s + l.requestedQty, 0);
    const picked = lines.reduce((s, l) => s + l.pickedQty, 0);
    const remaining = lines.reduce((s, l) => s + l.remainingQty, 0);
    return {
      required,
      picked,
      remaining,
      itemCount: this.itemRows.length,
      pendingItems: this.itemRows.filter(i => i.remainingQty > 0).length,
      progress: required > 0 ? Math.min(100, Math.round((picked / required) * 100)) : 0
    };
  }

  get allPicked(): boolean {
    const lines = this.detail?.details || [];
    return lines.length > 0 && lines.every(l => l.remainingQty <= 0);
  }

  get canComplete(): boolean {
    return !!this.detail && COMPLETABLE_STATUSES.includes(this.detail.status) && this.allPicked
      && !this.isCompleting && !this.isSaving;
  }

  get selectedItem(): ItemRow | undefined {
    return this.findItem(this.selectedItemCode);
  }

  get selectedLine(): ScanLineRef | undefined {
    return this.stock?.pickListLines.find(l => l.pickListDetailId === this.selectedLineId);
  }

  get openLinesForStock(): ScanLineRef[] {
    return (this.stock?.pickListLines || []).filter(l => l.remainingQty > 0);
  }

  get maxPickQty(): number {
    if (!this.stock || !this.selectedLine) {
      return 0;
    }
    return Math.min(this.stock.pickableQty, this.selectedLine.remainingQty);
  }

  itemState(item: ItemRow): 'done' | 'short' | 'partial' | 'pending' {
    if (item.remainingQty <= 0) {
      return 'done';
    }
    if (item.shortageQty > 0) {
      return 'short';
    }
    return item.pickedQty > 0 ? 'partial' : 'pending';
  }

  itemStateLabel(item: ItemRow): string {
    return { done: 'Picked', short: 'Short stock', partial: 'Partial', pending: 'Pending' }[this.itemState(item)];
  }

  itemProgress(item: ItemRow): number {
    return item.requiredQty > 0 ? Math.min(100, Math.round((item.pickedQty / item.requiredQty) * 100)) : 0;
  }

  itemName(itemCode: string): string {
    return this.findItem(itemCode)?.itemName || '';
  }

  pickedFromBox(itemCode: string, palletNumber: string, boxNumber: string): number {
    return (this.detail?.transactions || [])
      .filter(t => t.itemCode === itemCode && t.palletNumber === palletNumber && t.boxNumber === boxNumber)
      .reduce((s, t) => s + t.pickQty, 0);
  }

  // ================================================================ item selection

  /** Clicking an item row shows its stock; if a box is already scanned, the item is picked from it. */
  selectItem(item: ItemRow) {
    this.selectedItemCode = item.itemCode;
    if (!this.isEditable) {
      return;
    }
    this.clearMessages();
    this.lastPickMessage = '';
    if (item.remainingQty <= 0) {
      this.scanNotice = `${item.itemCode} is fully picked.`;
    } else if (this.boxScan) {
      this.selectBoxItem(item.itemCode);
      return;
    }
    this.focusStage();
  }

  /** "Pick" on a stock row — fills pallet/box, validates the box and selects the item with its full quantity. */
  pickFromPosition(item: ItemRow, position: InventoryPosition) {
    if (!this.isEditable || item.remainingQty <= 0) {
      return;
    }
    this.clearMessages();
    this.lastPickMessage = '';
    this.selectedItemCode = item.itemCode;
    this.palletScan = null;
    this.scan.palletNumber = position.palletNumber;
    this.scan.boxNumber = position.boxNumber;
    this.loadBox(false, item.itemCode);
  }

  // ================================================================ scanning
  // Flow: 1. Pallet → 2. Box → 3. Item (each further scan of the same item adds 1) → 4. Qty → Save.

  /** Step 1 — POST /pick/pallet: pallet exists, is pickable and holds an item this Pick List still needs. */
  onPalletScanned(silent = false) {
    const palletNumber = this.scan.palletNumber.trim();
    if (!silent) {
      this.clearMessages();
    }
    if (!palletNumber || this.isScanning) {
      return;
    }
    this.scan.palletNumber = palletNumber;
    this.clearBox();
    this.palletScan = null;
    this.isScanning = true;
    this.pickListService.scanPallet(this.pickListId, palletNumber).subscribe({
      next: result => {
        this.isScanning = false;
        if (this.scan.palletNumber !== palletNumber) {
          return; // re-scanned while in flight
        }
        if (!result.items.some(i => this.isNeeded(i))) {
          if (silent) {
            this.scanNotice = `Pallet ${palletNumber} has nothing more for this Pick List. Scan the next pallet.`;
          } else {
            this.scanError = { code: 'PALLET_NOT_NEEDED', message: `Pallet ${palletNumber} has no stock of any item still needed.`, data: null };
          }
          this.scan.palletNumber = '';
          this.stage = 'pallet';
          this.focusStage();
          return;
        }
        this.palletScan = result;
        this.stage = 'box';
        this.focusStage();
      },
      error: (err: PickListError) => {
        this.isScanning = false;
        this.scanError = err;
        this.scan.palletNumber = '';
        this.stage = 'pallet';
        this.focusStage();
      }
    });
  }

  /** Step 2 — the box on the scanned pallet. */
  onBoxScanned() {
    this.scan.boxNumber = this.scan.boxNumber.trim();
    if (this.scan.boxNumber) {
      this.loadBox();
    }
  }

  /** Boxes on the scanned pallet that hold an item still needed — a hint for the operator. */
  get boxHints(): string[] {
    return [...new Set((this.palletScan?.items || []).filter(i => this.isNeeded(i)).map(i => i.boxNumber))];
  }

  /** Items in the scanned box that are still needed — a hint for the operator. */
  get itemHints(): ScannedStock[] {
    return (this.boxScan?.items || []).filter(i => this.isNeeded(i));
  }

  /**
   * POST /pick/box: box exists, is on the pallet and holds a required item with stock.
   * `presetItem` selects that item straight away (used by "Pick" on a stock row); `silent` is used after a save.
   */
  loadBox(silent = false, presetItem = '') {
    if (!silent) {
      this.clearMessages();
    }
    const { palletNumber, boxNumber } = this.scan;
    if (!palletNumber || !boxNumber || this.isScanning) {
      return;
    }
    this.isScanning = true;
    this.clearItem();
    this.boxScan = null;
    this.pickListService.scanBox(this.pickListId, palletNumber, boxNumber).subscribe({
      next: result => {
        this.isScanning = false;
        if (this.scan.palletNumber !== palletNumber || this.scan.boxNumber !== boxNumber) {
          return;
        }
        if (!result.items.some(i => this.isNeeded(i))) {
          this.onBoxExhausted(silent, boxNumber);
          return;
        }
        this.boxScan = result;
        this.stage = 'item';
        if (presetItem) {
          this.selectBoxItem(presetItem, true);
        } else {
          this.focusStage();
        }
      },
      error: (err: PickListError) => {
        this.isScanning = false;
        if (silent && err.code === 'INSUFFICIENT_STOCK') {
          this.onBoxExhausted(true, boxNumber);
          return;
        }
        this.scanError = err;
        if (err.code.startsWith('PALLET_')) {
          this.scan.palletNumber = '';
          this.palletScan = null;
          this.clearBox();
          this.stage = 'pallet';
        } else {
          this.clearBox();
          this.stage = 'box';
        }
        this.focusStage();
      }
    });
  }

  /** The box has nothing more this Pick List needs: after a save move on quietly, otherwise report it. */
  private onBoxExhausted(silent: boolean, boxNumber: string) {
    this.clearBox();
    if (!silent) {
      this.scanError = { code: 'BOX_NOT_NEEDED', message: `Box ${boxNumber} has no item still needed on this Pick List.`, data: null };
      this.stage = 'box';
      this.focusStage();
      return;
    }
    this.scanNotice = `Box ${boxNumber} is done. Scan the next box.`;
    // Refresh the pallet so the box hints only list boxes that still hold something needed.
    this.onPalletScanned(true);
  }

  /** Step 3 — the item. Scanning the item that is already selected adds 1 to the pick quantity. */
  onItemScanned() {
    const code = this.scan.itemCode.trim();
    if (!code) {
      return;
    }
    if (this.stock && this.sameCode(code, this.stock.itemCode)) {
      this.scan.itemCode = this.stock.itemCode;
      this.changeQty(1);
      this.focusStage('item');
      return;
    }
    this.selectBoxItem(code);
  }

  /** UX shortcut only; /pick re-checks item, box and quantities on the server. */
  private selectBoxItem(code: string, fillMax = false) {
    this.clearMessages();
    const unsaved = this.stock && Number(this.scan.pickQty) > 0 ? this.stock.itemCode : '';
    const item = this.findItem(code);
    const fail = (errorCode: string, message: string) => {
      this.scanError = { code: errorCode, message, data: null };
      this.scan.itemCode = this.stock?.itemCode || '';
      this.focusStage('item');
    };
    if (!item) {
      return fail('ITEM_NOT_IN_PICKLIST', `Item ${code} does not belong to this Pick List.`);
    }
    if (item.remainingQty <= 0) {
      return fail('LINE_ALREADY_PICKED', `Item ${item.itemCode} is already fully picked.`);
    }
    const stock = this.boxScan?.items.find(i => this.sameCode(i.itemCode, item.itemCode) && this.isNeeded(i));
    if (!stock) {
      return fail('ITEM_NOT_IN_BOX', `Item ${item.itemCode} is not available in box ${this.scan.boxNumber}.`);
    }

    this.stock = stock;
    this.clientRequestId = this.pickListService.newRequestId();
    this.selectedLineId = stock.pickListLines.find(l => l.remainingQty > 0)?.pickListDetailId ?? null;
    this.scan.itemCode = stock.itemCode;
    this.selectedItemCode = stock.itemCode;
    this.scan.pickQty = fillMax ? this.maxPickQty : Math.min(1, this.maxPickQty);
    this.stage = 'qty';

    if (unsaved && !this.sameCode(unsaved, stock.itemCode)) {
      this.scanNotice = `Switched from ${unsaved} (not saved) to ${stock.itemCode}.`;
    } else {
      const already = this.pickedFromBox(stock.itemCode, stock.palletNumber, stock.boxNumber);
      if (already > 0) {
        this.scanNotice = `${already} of ${stock.itemCode} was already picked from box ${stock.boxNumber} on this Pick List.`;
      }
    }
    // Keep the scanner on the item field so the next scan of the same item adds 1.
    this.focusStage(fillMax ? 'qty' : 'item');
  }

  /** Step 4 — adjust the pick quantity (item re-scan, +/- buttons). */
  changeQty(delta: number) {
    if (!this.stock) {
      return;
    }
    const max = this.maxPickQty;
    const next = (Number(this.scan.pickQty) || 0) + delta;
    if (next > max) {
      this.scan.pickQty = max;
      this.scanNotice = `Maximum reached: ${max} (${this.stock.pickableQty < (this.selectedLine?.remainingQty || 0) ? 'box stock' : 'still required'}).`;
      return;
    }
    this.scanNotice = '';
    this.scan.pickQty = Math.max(next, Math.min(1, max));
  }

  setMaxQty() {
    if (this.stock) {
      this.scan.pickQty = this.maxPickQty;
      this.scanNotice = '';
    }
  }

  onItemFocus() {
    if (!this.stock) {
      this.stage = 'item';
    }
  }

  onLineChange() {
    const qty = Number(this.scan.pickQty) || 1;
    this.scan.pickQty = Math.min(qty, this.maxPickQty);
    this.clientRequestId = this.pickListService.newRequestId();
  }

  /** UX-only check — the backend performs the authoritative validation. */
  get qtyError(): string {
    if (!this.stock || !this.selectedLine || this.scan.pickQty === null || String(this.scan.pickQty) === '') {
      return '';
    }
    const qty = Number(this.scan.pickQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      return 'Enter a quantity greater than 0.';
    }
    if (qty > this.stock.pickableQty) {
      return `Quantity exceeds available stock (${this.stock.pickableQty}).`;
    }
    if (qty > this.selectedLine.remainingQty) {
      return `Quantity exceeds Pick List requirement (${this.selectedLine.remainingQty} remaining on DocNum ${this.selectedLine.sourceDocNum}).`;
    }
    return '';
  }

  get canSavePick(): boolean {
    return this.isEditable && !!this.stock && !!this.selectedLine && !this.isSaving && !this.isScanning
      && this.scan.pickQty !== null && Number(this.scan.pickQty) > 0 && !this.qtyError;
  }

  /** POST /pick. */
  savePick() {
    if (!this.canSavePick || !this.stock || !this.selectedLine) {
      return;
    }
    this.clearMessages();
    this.isSaving = true;
    const line = this.selectedLine;
    const request = {
      pickListId: this.pickListId,
      pickListDetailId: line.pickListDetailId,
      itemCode: this.stock.itemCode,
      palletNumber: this.stock.palletNumber || this.scan.palletNumber,
      boxNumber: this.stock.boxNumber || this.scan.boxNumber,
      location: this.stock.locationCode,
      pickQty: Number(this.scan.pickQty),
      clientRequestId: this.clientRequestId || this.pickListService.newRequestId()
    };
    this.clientRequestId = request.clientRequestId;

    this.pickListService.savePick(request).subscribe({
      next: saved => {
        this.isSaving = false;
        this.clientRequestId = '';
        this.lastPickMessage = saved.duplicate
          ? 'This pick was already saved.'
          : `Picked ${request.pickQty} × ${request.itemCode} from ${request.palletNumber} / ${request.boxNumber} for DocNum ${line.sourceDocNum} line ${line.sourceLineNum}.`;
        this.afterPickSaved();
      },
      error: (err: PickListError) => {
        this.isSaving = false;
        this.scanError = err;
        if (err.code !== 'NETWORK_ERROR') {
          // Keep the id only on network errors, where the first attempt may have gone through.
          this.clientRequestId = '';
        }
        if (STALE_DATA_CODES.includes(err.code)) {
          this.loadAll();
          this.clearBox();
          this.stage = 'box';
        }
        this.focusStage();
      }
    });
  }

  /** Refreshes quantities in place and stays on the same box for the next item, or moves to the next box / pallet. */
  private afterPickSaved() {
    this.loadAll(() => {
      if (!this.isEditable || this.allPicked) {
        this.resetScan();
        return;
      }
      this.clearItem();
      this.loadBox(true);
    });
  }

  /** Clears the item and quantity (steps 3–4). */
  private clearItem() {
    this.scan.itemCode = '';
    this.scan.pickQty = null;
    this.stock = null;
    this.selectedLineId = null;
    this.clientRequestId = '';
  }

  /** Clears the box and everything after it (steps 2–4). */
  private clearBox() {
    this.scan.boxNumber = '';
    this.boxScan = null;
    this.clearItem();
  }

  resetScan() {
    this.scan = { palletNumber: '', boxNumber: '', itemCode: '', pickQty: null };
    this.palletScan = null;
    this.clearBox();
    this.stage = 'pallet';
    this.scanError = null;
    this.scanNotice = '';
  }

  cancelScan() {
    this.resetScan();
    this.lastPickMessage = '';
    this.focusStage();
  }

  private clearMessages() {
    this.scanError = null;
    this.scanNotice = '';
  }

  /** Stock row that an open Pick List line can still use. */
  private isNeeded(stock: ScannedStock): boolean {
    return stock.pickableQty > 0 && stock.pickListLines.some(l => l.remainingQty > 0);
  }

  private sameCode(a: string, b: string): boolean {
    return (a || '').trim().toUpperCase() === (b || '').trim().toUpperCase();
  }

  private findItem(code: string): ItemRow | undefined {
    return this.itemRows.find(i => this.sameCode(i.itemCode, code));
  }

  focusStage(target: ScanStage = this.stage) {
    setTimeout(() => {
      const input = { item: this.itemInput, pallet: this.palletInput, box: this.boxInput, qty: this.qtyInput }[target];
      input?.nativeElement.focus();
      input?.nativeElement.select();
    });
  }

  // ================================================================ completion

  completePickList() {
    if (!this.canComplete || !this.detail) {
      return;
    }
    this.completionError = null;
    const retry = this.isAwaitingPosting;
    Swal.fire({
      title: retry ? 'Retry completion?' : 'Complete Pick List?',
      text: retry
        ? 'Picking is already complete. This retries DC and Stock Transfer generation from the step that failed.'
        : 'Are you sure you want to complete this Pick List? After completion, DC and Stock Transfer will be generated automatically.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#15803d',
      cancelButtonColor: '#64748b',
      confirmButtonText: retry ? 'Yes, retry' : 'Yes, complete',
      cancelButtonText: 'Not yet'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }
      this.isCompleting = true;
      this.pickListService.completePickList(this.pickListId).subscribe({
        next: completion => {
          this.isCompleting = false;
          this.loadAll(); // the summary reflects exactly what the backend persisted
          Swal.fire({
            icon: 'success',
            title: completion.alreadyCompleted ? 'Pick List was already completed' : 'Pick List completed',
            html: `DC No: <b>${this.escape(completion.dcNumber || '—')}</b><br>`
              + `Stock Transfer No: <b>${this.escape(completion.stockTransferNumber || '—')}</b>`,
            confirmButtonColor: '#016DB0'
          });
        },
        error: (err: PickListError) => {
          this.isCompleting = false;
          this.completionError = err;
          const titles: { [code: string]: string } = {
            DC_GENERATION_FAILED: 'DC generation failed',
            SAP_STOCK_TRANSFER_FAILED: 'Stock Transfer generation failed',
            PICKING_INCOMPLETE: 'Picking not complete',
            PICKLIST_PROCESSING: 'Already being completed',
            PICK_AUDIT_MISMATCH: 'Pick audit mismatch',
            NETWORK_ERROR: 'Network error'
          };
          const pending = err.code === 'PICKING_INCOMPLETE' && Array.isArray(err.data?.pendingLines)
            ? ` (${err.data.pendingLines.length} line(s) pending)` : '';
          Swal.fire({ icon: 'error', title: titles[err.code] || 'Pick List not completed', text: err.message + pending });
          // Show the real state — after a DC/SAP failure the Pick List stays PICKED / DC_CREATED and can be retried.
          this.loadAll();
        }
      });
    });
  }

  back() {
    this.router.navigate(['/mainpage/pick_list'], { queryParams: { tab: 'picklists' } });
  }

  trackByItem(_: number, item: ItemRow) {
    return item.itemCode;
  }

  trackByPosition(_: number, p: InventoryPosition) {
    return p.inventoryId;
  }

  private escape(value: string): string {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }
}
