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
  ScannedStock,
  SuggestedBox
} from '../pick-list.models';
import { PickListService } from '../pick-list.service';

/** Full Box Picking: 1. Pallet → 2. Box → 3. Confirm the whole box. The operator never enters a quantity. */
type ScanStage = 'pallet' | 'box' | 'confirm';
type BottomTab = 'transactions' | 'sources' | 'log';

/** Item-level view: the same item can be on several Pick List lines (one per source STR line). */
interface ItemRow {
  itemCode: string;
  itemName: string;
  requiredQty: number;
  plannedQty: number;
  pickedQty: number;
  remainingQty: number;
  /** Picked beyond the requirement because boxes are picked whole. */
  excessQty: number;
  availableQty: number;
  shortageQty: number;
  warehouse: string;
  locations: string[];
  pallets: string[];
  boxes: string[];
  positions: InventoryPosition[];
  /** Whole boxes the server suggests for what is still required. */
  suggestedBoxes: SuggestedBox[];
  suggestedPickQty: number;
  suggestedExcessQty: number;
  lines: PickListLine[];
}

/** Statuses in which picking is allowed (backend PICKABLE_STATUSES). */
const PICKABLE_STATUSES = ['OPEN', 'IN_PROGRESS'];
/** Statuses from which Complete may be (re)tried — PICKED / DC_CREATED mean a previous attempt failed part-way. */
const COMPLETABLE_STATUSES = ['OPEN', 'IN_PROGRESS', 'PICKED', 'DC_CREATED'];

/** Error codes after which the on-screen quantities are probably stale and must be reloaded. */
const STALE_DATA_CODES = [
  'INSUFFICIENT_STOCK', 'LINE_ALREADY_PICKED', 'LOCATION_MISMATCH', 'WAREHOUSE_MISMATCH', 'PICKLIST_CLOSED',
  'PICKLIST_CANCELLED', 'BOX_NOT_APPLICABLE', 'PALLET_NOT_AVAILABLE', 'BOX_ALREADY_PICKED', 'BOX_QTY_CHANGED'
];

@Component({
  selector: 'app-pick-list-detail',
  templateUrl: './pick-list-detail.component.html',
  styleUrls: ['../pick-list.shared.css', './pick-list-detail.component.css']
})
export class PickListDetailComponent implements OnInit, OnDestroy {
  @ViewChild('palletInput') palletInput?: ElementRef<HTMLInputElement>;
  @ViewChild('boxInput') boxInput?: ElementRef<HTMLInputElement>;
  @ViewChild('confirmButton') confirmButton?: ElementRef<HTMLButtonElement>;

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
  scan = { palletNumber: '', boxNumber: '' };
  stage: ScanStage = 'pallet';
  palletScan: PalletScan | null = null;
  /** Server preview of the full-box pick for the scanned box (same rules the save applies). */
  boxScan: BoxScan | null = null;
  scanError: PickListError | null = null;
  scanNotice = '';
  lastPickMessage = '';
  /** Excess warning of the last saved pick (full box gave more than required). */
  lastPickWarning = '';
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
          itemCode: line.itemCode, itemName: line.itemName, requiredQty: 0, plannedQty: 0, pickedQty: 0, remainingQty: 0,
          excessQty: 0, availableQty: 0, shortageQty: 0, warehouse: line.fromWarehouse,
          locations: [], pallets: [], boxes: [], positions: [], suggestedBoxes: [], suggestedPickQty: 0, suggestedExcessQty: 0, lines: []
        };
        rows.set(key, row);
      }
      row.requiredQty += line.requestedQty;
      row.plannedQty += line.plannedQty ?? line.requestedQty;
      row.pickedQty += line.pickedQty;
      row.remainingQty += line.remainingQty;
      row.excessQty += line.excessQty;
      row.lines.push(line);
    }

    for (const row of rows.values()) {
      const summary = this.inventory?.itemSummary.find(s => s.itemCode.toUpperCase() === row.itemCode.toUpperCase());
      row.availableQty = summary?.availableQty ?? 0;
      row.shortageQty = summary?.shortageQty ?? Math.max(row.remainingQty - row.availableQty, 0);
      row.suggestedBoxes = row.remainingQty > 0 ? summary?.suggestedBoxes ?? [] : [];
      row.suggestedPickQty = summary?.suggestedPickQty ?? 0;
      row.suggestedExcessQty = summary?.suggestedExcessQty ?? 0;
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
    const excess = lines.reduce((s, l) => s + l.excessQty, 0);
    // Progress counts only the part of the requirement that is covered — excess does not inflate it.
    const covered = lines.reduce((s, l) => s + Math.min(l.pickedQty, l.requestedQty), 0);
    return {
      required,
      planned: lines.reduce((s, l) => s + (l.plannedQty ?? l.requestedQty), 0),
      picked,
      remaining,
      excess,
      itemCount: this.itemRows.length,
      pendingItems: this.itemRows.filter(i => i.remainingQty > 0).length,
      progress: required > 0 ? Math.min(100, Math.round((covered / required) * 100)) : 0
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

  /** The server suggests this box (whole boxes covering the remaining quantity). */
  isSuggestedBox(item: ItemRow, p: InventoryPosition): boolean {
    return item.suggestedBoxes.some(b => b.inventoryId === p.inventoryId);
  }

  // ================================================================ item selection

  /** Clicking an item row shows its stock by location / pallet / box and the suggested full boxes. */
  selectItem(item: ItemRow) {
    this.selectedItemCode = item.itemCode;
    if (!this.isEditable) {
      return;
    }
    this.clearMessages();
    if (item.remainingQty <= 0) {
      this.scanNotice = `${item.itemCode} is fully picked.`;
    }
    this.focusStage();
  }

  /** "Pick box" on a stock row — fills pallet/box and asks the server for the full-box preview. */
  pickFromPosition(item: ItemRow, position: InventoryPosition) {
    if (!this.isEditable || item.remainingQty <= 0) {
      return;
    }
    this.clearMessages();
    this.lastPickMessage = '';
    this.lastPickWarning = '';
    this.selectedItemCode = item.itemCode;
    this.palletScan = null;
    this.scan.palletNumber = position.palletNumber;
    this.scan.boxNumber = position.boxNumber;
    this.loadBox();
  }

  // ================================================================ scanning
  // Flow: 1. Pallet → 2. Box → 3. Confirm — the whole box is picked (Enter on the confirm button or Save).

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
          const message = result.blockedBoxNumbers.length
            ? `Pallet ${palletNumber}: the boxes with needed items (${result.blockedBoxNumbers.join(', ')}) also hold items not on this Pick List and cannot be picked whole.`
            : `Pallet ${palletNumber} has no stock of any item still needed.`;
          if (silent) {
            this.scanNotice = `Pallet ${palletNumber} has nothing more for this Pick List. Scan the next pallet.`;
          } else {
            this.scanError = { code: 'PALLET_NOT_NEEDED', message, data: null };
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

  /** Boxes on the scanned pallet that can be picked whole and hold an item still needed — a hint for the operator. */
  get boxHints(): string[] {
    return [...new Set((this.palletScan?.items || []).filter(i => this.isNeeded(i)).map(i => i.boxNumber))];
  }

  /** Boxes on the scanned pallet that hold needed items but also items not on the Pick List. */
  get blockedBoxHints(): string[] {
    return this.palletScan?.blockedBoxNumbers || [];
  }

  /**
   * POST /pick/box — server-side full-box preview: the whole box, every item in it, the excess, and how it is
   * split over the source lines. Moves to the confirm step.
   */
  loadBox() {
    this.clearMessages();
    const { palletNumber, boxNumber } = this.scan;
    if (!palletNumber || !boxNumber || this.isScanning) {
      return;
    }
    this.isScanning = true;
    this.boxScan = null;
    this.clientRequestId = '';
    this.pickListService.scanBox(this.pickListId, palletNumber, boxNumber).subscribe({
      next: result => {
        this.isScanning = false;
        if (this.scan.palletNumber !== palletNumber || this.scan.boxNumber !== boxNumber) {
          return;
        }
        this.boxScan = result;
        this.clientRequestId = this.pickListService.newRequestId();
        this.stage = 'confirm';
        const already = result.items
          .map(i => ({ code: i.itemCode, qty: this.pickedFromBox(i.itemCode, result.palletNumber, result.boxNumber) }))
          .filter(x => x.qty > 0);
        if (already.length) {
          this.scanNotice = `Already picked from box ${boxNumber} on this Pick List: ${already.map(x => `${x.qty} ${x.code}`).join(', ')}.`;
        }
        this.focusStage();
      },
      error: (err: PickListError) => {
        this.isScanning = false;
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

  get canSavePick(): boolean {
    return this.isEditable && !!this.boxScan && this.boxScan.totalBoxQty > 0 && !this.isSaving && !this.isScanning;
  }

  /** POST /pick — picks the whole box. No item / quantity is sent; the server reads them under lock. */
  savePick() {
    if (!this.canSavePick || !this.boxScan) {
      return;
    }
    this.clearMessages();
    this.isSaving = true;
    const box = this.boxScan;
    const request = {
      pickListId: this.pickListId,
      palletNumber: box.palletNumber || this.scan.palletNumber,
      boxNumber: box.boxNumber || this.scan.boxNumber,
      location: box.location,
      confirmedBoxQty: box.totalBoxQty,
      clientRequestId: this.clientRequestId || this.pickListService.newRequestId()
    };
    this.clientRequestId = request.clientRequestId;

    this.pickListService.savePick(request).subscribe({
      next: saved => {
        this.isSaving = false;
        this.clientRequestId = '';
        const items = saved.items.length
          ? saved.items.map(i => `${i.boxQty} × ${i.itemCode}`).join(', ')
          : `${saved.boxQty}`;
        this.lastPickMessage = saved.duplicate
          ? `Box ${request.boxNumber} was already saved.`
          : `Full box ${request.boxNumber} picked from ${request.palletNumber}: ${items}.`;
        this.lastPickWarning = saved.duplicate ? '' : (saved.warning || '');
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

  /** Refreshes quantities and moves on to the next box of the same pallet (or the next pallet). */
  private afterPickSaved() {
    this.clearBox();
    this.loadAll(() => {
      if (!this.isEditable || this.allPicked) {
        this.resetScan();
        return;
      }
      this.stage = 'box';
      // Refresh the pallet so the box hints only list boxes that still hold something needed.
      this.onPalletScanned(true);
    });
  }

  /** Clears the box and the preview (steps 2–3). */
  private clearBox() {
    this.scan.boxNumber = '';
    this.boxScan = null;
    this.clientRequestId = '';
  }

  /** Back from the confirm step to scanning another box on the same pallet. */
  cancelBox() {
    this.clearMessages();
    this.clearBox();
    this.stage = this.scan.palletNumber ? 'box' : 'pallet';
    this.focusStage();
  }

  resetScan() {
    this.scan = { palletNumber: '', boxNumber: '' };
    this.palletScan = null;
    this.clearBox();
    this.stage = 'pallet';
    this.scanError = null;
    this.scanNotice = '';
  }

  cancelScan() {
    this.resetScan();
    this.lastPickMessage = '';
    this.lastPickWarning = '';
    this.focusStage();
  }

  private clearMessages() {
    this.scanError = null;
    this.scanNotice = '';
  }

  /** Stock row that an open Pick List line can still use, in a box that can be picked whole. */
  private isNeeded(stock: ScannedStock): boolean {
    return stock.pickableQty > 0 && stock.fullBoxPickable && stock.pickListLines.some(l => l.remainingQty > 0);
  }

  private sameCode(a: string, b: string): boolean {
    return (a || '').trim().toUpperCase() === (b || '').trim().toUpperCase();
  }

  private findItem(code: string): ItemRow | undefined {
    return this.itemRows.find(i => this.sameCode(i.itemCode, code));
  }

  focusStage(target: ScanStage = this.stage) {
    setTimeout(() => {
      if (target === 'confirm') {
        this.confirmButton?.nativeElement.focus();
        return;
      }
      const input = { pallet: this.palletInput, box: this.boxInput }[target];
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
    const t = this.totals;
    const excessNote = t.excess > 0
      ? `<p style="margin-top:10px;padding:8px;border-radius:6px;background:#fef3c7;color:#92400e;font-size:0.9em">`
        + `<b>Full box picking picked more than required.</b><br>Required ${t.required}, picked <b>${t.picked}</b> `
        + `(excess ${t.excess}). The DC and the Stock Transfer will use the picked quantity <b>${t.picked}</b>.</p>`
      : '';
    Swal.fire({
      title: retry ? 'Retry completion?' : 'Complete Pick List?',
      html: (retry
        ? 'Picking is already complete. This retries DC and Stock Transfer generation from the step that failed.'
        : 'Are you sure you want to complete this Pick List? After completion, DC and Stock Transfer will be generated automatically.')
        + excessNote,
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
          const qty = completion.dcQty ?? completion.pickedQty;
          Swal.fire({
            icon: 'success',
            title: completion.alreadyCompleted ? 'Pick List was already completed' : 'Pick List completed',
            html: `DC No: <b>${this.escape(completion.dcNumber || '—')}</b>`
              + (qty !== null ? ` · DC qty <b>${qty}</b>` : '') + '<br>'
              + `Stock Transfer No: <b>${this.escape(completion.stockTransferNumber || '—')}</b>`
              + (completion.excessQty > 0 ? `<br><span style="font-size:0.85em;color:#92400e">Includes ${completion.excessQty} full-box excess over the required ${completion.requiredQty}.</span>` : ''),
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
