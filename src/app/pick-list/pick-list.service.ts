import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ApiService } from '../service/api.service';
import {
  BoxScan,
  CompletionResult,
  PalletScan,
  PickListDetail,
  PickListError,
  PickListHeader,
  PickListInventory,
  PickListLine,
  PickListStatus,
  SavePickRequest,
  SavedPick,
  ScannedStock,
  TransferRequests
} from './pick-list.models';

/**
 * Pick List API client — Uathayam_api routes/pickingRoutes.js, mounted at /api/picking
 * (API_DOCUMENTATION.md §4.16a). All routes need the `picking_creates` right.
 *
 * Every business rule (open/reserved qty, pallet/box ownership, stock, over-pick, duplicate picks,
 * DC / SAP Stock Transfer) is enforced by the backend; this service only transports and normalises.
 */
@Injectable({
  providedIn: 'root'
})
export class PickListService {
  private readonly baseURL = environment.baseURL + 'picking';

  private static readonly STATUS_LABELS: { [status: string]: string } = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    PICKED: 'Picked',
    DC_CREATED: 'DC Created',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled'
  };

  /** Used when the backend sends no message (it normally does, with specifics such as quantities). */
  private static readonly ERROR_MESSAGES: { [code: string]: string } = {
    INSUFFICIENT_STOCK: 'Insufficient stock is available.',
    PALLET_NOT_FOUND: 'Invalid pallet. The scanned pallet does not exist.',
    PALLET_NOT_AVAILABLE: 'This pallet is not available for picking.',
    PALLET_NOT_APPLICABLE: 'This pallet does not hold any item required by the Pick List.',
    BOX_NOT_FOUND: 'Invalid box. The scanned box does not exist.',
    BOX_NOT_IN_PALLET: 'The scanned box does not belong to the selected pallet.',
    BOX_NOT_APPLICABLE: 'This box does not contain any item required by the Pick List.',
    ITEM_NOT_FOUND: 'The item is not available in the selected box.',
    ITEM_NOT_IN_PICKLIST: 'The scanned item does not belong to this Pick List.',
    LINE_ALREADY_PICKED: 'This Pick List line is already fully picked.',
    PICK_QTY_EXCEEDS_REMAINING: 'Quantity exceeds the Pick List requirement.',
    INVALID_PICK_QTY: 'Enter a valid pick quantity greater than zero.',
    WAREHOUSE_MISMATCH: 'This box is in a different warehouse from the Pick List.',
    LOCATION_MISMATCH: 'The pallet is not at the expected location.',
    DOCUMENT_NOT_FOUND: 'A selected Stock Transfer Request was not found.',
    DOCUMENT_CLOSED: 'A selected Stock Transfer Request is closed or cancelled.',
    NO_OPEN_LINES: 'A selected Stock Transfer Request has no open lines.',
    DUPLICATE_PICKLIST: 'The remaining quantity is already on another Pick List.',
    TOO_MANY_DOCUMENTS: 'Too many documents selected for one Pick List.',
    PICKLIST_BUSY: 'Another Pick List is being generated. Please retry.',
    PICKLIST_NOT_FOUND: 'Pick List was not found.',
    PICKLIST_CLOSED: 'This Pick List can no longer be picked.',
    PICKLIST_CANCELLED: 'This Pick List has been cancelled.',
    PICKLIST_PROCESSING: 'This Pick List is already being completed. Please wait and refresh.',
    PICKING_INCOMPLETE: 'All required quantities must be picked before completing the Pick List.',
    PICK_AUDIT_MISMATCH: 'Picked quantities do not match the pick transactions. Contact support.',
    DC_GENERATION_FAILED: 'DC generation failed. The Pick List was not completed.',
    SAP_STOCK_TRANSFER_FAILED: 'Stock Transfer generation failed in SAP. The Pick List was not completed.',
    NETWORK_ERROR: 'Unable to reach the server. Check the network connection and try again.'
  };

  constructor(private http: HttpClient, private apiService: ApiService) {}

  // ---------------------------------------------------------------- requests

  getTransferRequests(onlyAvailable = false): Observable<TransferRequests> {
    const params = onlyAvailable ? new HttpParams().set('onlyAvailable', 'true') : undefined;
    return this.get('/stock-transfer-requests', params).pipe(map(d => ({
      fromWarehouse: this.str(d?.fromWarehouse),
      toWarehouse: this.str(d?.toWarehouse),
      documents: this.arr(d?.documents).map(x => ({
        docEntry: this.num(x.docEntry),
        docNum: this.num(x.docNum),
        docDate: this.str(x.docDate),
        docDueDate: this.str(x.docDueDate),
        fromWarehouse: this.str(x.fromWarehouse),
        toWarehouse: this.str(x.toWarehouse),
        lineCount: this.num(x.lineCount),
        openQty: this.num(x.openQty),
        availableForPickListQty: this.num(x.availableForPickListQty)
      })),
      lines: this.arr(d?.lines).map(x => ({
        docEntry: this.num(x.docEntry),
        docNum: this.num(x.docNum),
        docDate: this.str(x.docDate),
        docDueDate: this.str(x.docDueDate),
        lineNum: this.num(x.lineNum),
        itemCode: this.str(x.itemCode),
        itemName: this.str(x.itemName),
        requestedQty: this.num(x.requestedQty),
        openQty: this.num(x.openQty),
        reservedQty: this.num(x.reservedQty),
        availableForPickListQty: this.num(x.availableForPickListQty),
        fromWarehouse: this.str(x.fromWarehouse),
        fromWarehouseName: this.str(x.fromWarehouseName),
        toWarehouse: this.str(x.toWarehouse),
        toWarehouseName: this.str(x.toWarehouseName),
        lineStatus: this.str(x.lineStatus)
      }))
    })));
  }

  /** The server decides line quantities (each line's unreserved open qty); we only name the documents. */
  createPickList(documents: { docEntry: number; docNum: number }[]): Observable<PickListHeader> {
    return this.post('/picklist', { documents }).pipe(map(d => this.toHeader(d)));
  }

  getPickLists(status?: PickListStatus | '', limit = 200): Observable<PickListHeader[]> {
    let params = new HttpParams().set('limit', String(limit));
    if (status) {
      params = params.set('status', status);
    }
    return this.get('/picklist', params).pipe(map(d => this.arr(d).map(r => this.toHeader(r))));
  }

  getPickList(pickListId: number | string): Observable<PickListDetail> {
    return this.get(`/picklist/${pickListId}`).pipe(map(d => {
      const details = this.arr(d?.details).map(x => this.toLine(x));
      const header = this.toHeader(d);
      if (header.sourceDocNums.length === 0) {
        header.sourceDocNums = [...new Set(details.map(l => String(l.sourceDocNum)))];
      }
      return {
        ...header,
        stockTransferNumber: header.stockTransferNumber || this.optStr(d?.stockTransferDocNum),
        stockTransferDocNum: this.optStr(d?.stockTransferDocNum),
        details,
        transactions: this.arr(d?.transactions).map(t => ({
          pickTransactionId: this.num(t.pickTransactionId),
          pickListDetailId: this.num(t.pickListDetailId),
          sourceDocEntry: this.num(t.sourceDocEntry),
          sourceDocNum: this.num(t.sourceDocNum),
          sourceLineNum: this.num(t.sourceLineNum),
          itemCode: this.str(t.itemCode),
          warehouse: this.str(t.warehouse),
          location: this.str(t.location),
          palletNumber: this.str(t.palletNumber),
          boxNumber: this.str(t.boxNumber),
          availableQty: this.num(t.availableQty),
          pickQty: this.num(t.pickQty),
          createdBy: this.str(t.createdBy),
          createdDate: this.str(t.createdDate)
        })),
        dc: d?.dc ? {
          dcId: this.num(d.dc.dcId),
          dcNumber: this.str(d.dc.dcNumber),
          dcDate: this.str(d.dc.dcDate),
          totalQty: this.num(d.dc.totalQty),
          status: this.str(d.dc.status)
        } : null,
        processLog: this.arr(d?.processLog).map(l => ({
          stage: this.str(l.stage),
          result: this.str(l.result),
          message: this.str(l.message),
          createdBy: this.str(l.createdBy),
          createdDate: this.str(l.createdDate)
        }))
      };
    }));
  }

  getInventory(pickListId: number | string): Observable<PickListInventory> {
    return this.get(`/picklist/${pickListId}/inventory`).pipe(map(d => ({
      items: this.arr(d?.items).map(i => ({
        pickListDetailId: this.num(i.pickListDetailId),
        itemCode: this.str(i.itemCode),
        itemName: this.str(i.itemName),
        requiredQty: this.num(i.requiredQty),
        pickedQty: this.num(i.pickedQty),
        remainingQty: this.num(i.remainingQty),
        totalAvailableQty: this.num(i.totalAvailableQty),
        inventory: this.arr(i.inventory).map(p => ({
          inventoryId: this.num(p.inventoryId),
          warehouse: this.str(p.warehouse),
          location: this.str(p.location),
          palletNumber: this.str(p.palletNumber),
          boxNumber: this.str(p.boxNumber),
          availableQty: this.num(p.availableQty)
        }))
      })),
      itemSummary: this.arr(d?.itemSummary).map(s => ({
        itemCode: this.str(s.itemCode),
        itemName: this.str(s.itemName),
        warehouse: this.str(s.warehouse),
        requiredQty: this.num(s.requiredQty),
        pickedQty: this.num(s.pickedQty),
        remainingQty: this.num(s.remainingQty),
        availableQty: this.num(s.availableQty),
        shortageQty: this.num(s.shortageQty)
      }))
    })));
  }

  scanPallet(pickListId: number, palletNumber: string): Observable<PalletScan> {
    return this.post('/pick/pallet', { pickListId, palletNumber }).pipe(map(d => ({
      palletNumber: this.str(d?.palletNumber),
      locations: this.arr(d?.locations).map(String),
      boxNumbers: this.arr(d?.boxNumbers).map(String),
      items: this.arr(d?.items).map(i => this.toScannedStock(i))
    })));
  }

  scanBox(pickListId: number, palletNumber: string, boxNumber: string): Observable<BoxScan> {
    return this.post('/pick/box', { pickListId, palletNumber, boxNumber }).pipe(map(d => ({
      palletNumber: this.str(d?.palletNumber),
      boxNumber: this.str(d?.boxNumber),
      items: this.arr(d?.items).map(i => this.toScannedStock(i))
    })));
  }

  /** A repeated clientRequestId returns the original pick with duplicate: true instead of picking twice. */
  savePick(request: SavePickRequest): Observable<SavedPick> {
    return this.post('/pick', request).pipe(map(d => ({
      pickTransactionId: this.num(d?.pickTransactionId),
      pickListDetailId: this.num(d?.pickListDetailId),
      itemCode: this.str(d?.itemCode),
      pickQty: this.num(d?.pickQty),
      pickedQty: this.num(d?.pickedQty),
      remainingQty: this.num(d?.remainingQty),
      pickListStatus: d?.pickListStatus || null,
      inventoryRemainingQty: d?.inventoryRemainingQty !== undefined && d?.inventoryRemainingQty !== null ? Number(d.inventoryRemainingQty) : null,
      duplicate: !!d?.duplicate
    })));
  }

  /** Idempotent and resumable: after a DC / SAP failure, calling it again retries from the failed step. */
  completePickList(pickListId: number | string): Observable<CompletionResult> {
    return this.post(`/picklist/${pickListId}/complete`, {}).pipe(map(d => ({
      pickListNumber: this.str(d?.pickListNumber),
      status: d?.status as PickListStatus,
      dcNumber: this.optStr(d?.dcNumber),
      stockTransferDocEntry: d?.stockTransferDocEntry ?? null,
      stockTransferNumber: this.optStr(d?.stockTransferNumber),
      alreadyCompleted: !!d?.alreadyCompleted
    })));
  }

  // ---------------------------------------------------------------- helpers

  newRequestId(): string {
    const random = Math.random().toString(36).slice(2, 10);
    return `WEB-${Date.now().toString(36)}-${random}`;
  }

  statusLabel(status: string): string {
    return PickListService.STATUS_LABELS[status] || status;
  }

  /** Converts any HTTP / backend failure into a code + user-friendly message. */
  toError(error: any): PickListError {
    if (error && typeof error.code === 'string' && typeof error.message === 'string' && !(error instanceof HttpErrorResponse)
      && 'data' in error && !('success' in error)) {
      return error as PickListError;
    }
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return { code: 'NETWORK_ERROR', message: PickListService.ERROR_MESSAGES['NETWORK_ERROR'], data: null };
    }
    const body = error instanceof HttpErrorResponse ? error.error : error;
    let code: string = body?.errorCode || body?.code || '';
    if (!code && error instanceof HttpErrorResponse) {
      code = error.status === 401 || error.status === 403 ? 'UNAUTHORIZED' : error.status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN';
    }
    const message = (typeof body?.message === 'string' && body.message)
      || PickListService.ERROR_MESSAGES[code]
      || 'Something went wrong. Please try again.';
    return { code: code || 'UNKNOWN', message, data: body?.data ?? null };
  }

  private get(path: string, params?: HttpParams): Observable<any> {
    return this.http.get(this.baseURL + path, { headers: this.apiService.getauthenticateToken(), params })
      .pipe(map(res => this.unwrap(res)), catchError(err => throwError(() => this.toError(err))));
  }

  private post(path: string, body: any): Observable<any> {
    return this.http.post(this.baseURL + path, body, { headers: this.apiService.getauthenticateToken() })
      .pipe(map(res => this.unwrap(res)), catchError(err => throwError(() => this.toError(err))));
  }

  /** Success envelope: { success: true, message, data }. A 200 with success: false is still an error. */
  private unwrap(res: any): any {
    if (res && (res.success === false || res.status === 0)) {
      throw this.toError(res);
    }
    return res?.data !== undefined ? res.data : res;
  }

  private arr(value: any): any[] {
    return Array.isArray(value) ? value : [];
  }

  private num(value: any): number {
    return Number(value ?? 0) || 0;
  }

  private str(value: any): string {
    return value === undefined || value === null ? '' : String(value);
  }

  private optStr(value: any): string | null {
    return value === undefined || value === null || value === '' ? null : String(value);
  }

  private toHeader(h: any): PickListHeader {
    return {
      pickListId: this.num(h?.pickListId),
      pickListNumber: this.str(h?.pickListNumber),
      status: (this.str(h?.status).toUpperCase() || 'OPEN') as PickListStatus,
      fromWarehouse: this.str(h?.fromWarehouse),
      toWarehouse: this.str(h?.toWarehouse),
      totalRequestedQty: this.num(h?.totalRequestedQty),
      totalPickedQty: this.num(h?.totalPickedQty),
      createdBy: this.str(h?.createdBy),
      createdDate: this.str(h?.createdDate),
      completedBy: this.optStr(h?.completedBy),
      completedDate: this.optStr(h?.completedDate),
      dcNumber: this.optStr(h?.dcNumber),
      stockTransferDocEntry: h?.stockTransferDocEntry ?? null,
      stockTransferNumber: this.optStr(h?.stockTransferNumber),
      lastError: h?.lastError ? {
        stage: this.str(h.lastError.stage),
        message: this.str(h.lastError.message),
        date: this.str(h.lastError.date)
      } : null,
      retryCount: this.num(h?.retryCount),
      lineCount: this.num(h?.lineCount ?? h?.details?.length),
      sourceDocNums: this.arr(h?.sourceDocNums).map(String)
    };
  }

  private toLine(d: any): PickListLine {
    return {
      pickListDetailId: this.num(d.pickListDetailId),
      sourceDocEntry: this.num(d.sourceDocEntry),
      sourceDocNum: this.num(d.sourceDocNum),
      sourceLineNum: this.num(d.sourceLineNum),
      itemCode: this.str(d.itemCode),
      itemName: this.str(d.itemName),
      requestedQty: this.num(d.requestedQty),
      pickedQty: this.num(d.pickedQty),
      remainingQty: this.num(d.remainingQty),
      fromWarehouse: this.str(d.fromWarehouse),
      toWarehouse: this.str(d.toWarehouse),
      status: this.str(d.status)
    };
  }

  private toScannedStock(i: any): ScannedStock {
    return {
      inventoryId: this.num(i.inventoryId),
      itemCode: this.str(i.itemCode),
      itemName: this.str(i.itemName),
      warehouseCode: this.str(i.warehouseCode),
      locationCode: this.str(i.locationCode),
      palletNumber: this.str(i.palletNumber ?? i.palletId),
      boxNumber: this.str(i.boxNumber),
      pickableQty: this.num(i.pickableQty),
      remainingRequiredQty: this.num(i.remainingRequiredQty),
      suggestedPickQty: this.num(i.suggestedPickQty),
      pickListLines: this.arr(i.pickListLines).map(l => ({
        pickListDetailId: this.num(l.pickListDetailId),
        sourceDocEntry: this.num(l.sourceDocEntry),
        sourceDocNum: this.num(l.sourceDocNum),
        sourceLineNum: this.num(l.sourceLineNum),
        requiredQty: this.num(l.requiredQty),
        pickedQty: this.num(l.pickedQty),
        remainingQty: this.num(l.remainingQty)
      }))
    };
  }
}
