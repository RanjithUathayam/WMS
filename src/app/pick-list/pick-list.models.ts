/** T_PICK_LIST.Status — see Uathayam_api sql/PickList_Schema.sql. */
export type PickListStatus = 'OPEN' | 'IN_PROGRESS' | 'PICKED' | 'DC_CREATED' | 'COMPLETED' | 'CANCELLED';

// ------------------------------------------------------------ GET /stock-transfer-requests

/** One open WTQ1 line (OWTQ + WTQ1 + OWHS). */
export interface TransferRequestLine {
  docEntry: number;
  docNum: number;
  docDate: string;
  docDueDate: string;
  lineNum: number;
  itemCode: string;
  itemName: string;
  requestedQty: number;
  openQty: number;
  /** Already on other (non-cancelled) Pick Lists. */
  reservedQty: number;
  /** openQty − reservedQty: what a new Pick List would take for this line. */
  availableForPickListQty: number;
  fromWarehouse: string;
  fromWarehouseName: string;
  toWarehouse: string;
  toWarehouseName: string;
  lineStatus: string;
}

export interface TransferRequestDocument {
  docEntry: number;
  docNum: number;
  docDate: string;
  docDueDate: string;
  fromWarehouse: string;
  toWarehouse: string;
  lineCount: number;
  openQty: number;
  availableForPickListQty: number;
}

export interface TransferRequests {
  fromWarehouse: string;
  toWarehouse: string;
  documents: TransferRequestDocument[];
  lines: TransferRequestLine[];
}

// ------------------------------------------------------------ Pick List

export interface PickListLastError {
  stage: string;
  message: string;
  date: string;
}

export interface PickListHeader {
  pickListId: number;
  pickListNumber: string;
  status: PickListStatus;
  fromWarehouse: string;
  toWarehouse: string;
  totalRequestedQty: number;
  totalPickedQty: number;
  createdBy: string;
  createdDate: string;
  completedBy: string | null;
  completedDate: string | null;
  dcNumber: string | null;
  stockTransferDocEntry: number | null;
  stockTransferNumber: string | null;
  lastError: PickListLastError | null;
  retryCount: number;
  lineCount: number;
  sourceDocNums: string[];
}

/** T_PICK_LIST_DETAIL — one row per source STR line. */
export interface PickListLine {
  pickListDetailId: number;
  sourceDocEntry: number;
  sourceDocNum: number;
  sourceLineNum: number;
  itemCode: string;
  itemName: string;
  requestedQty: number;
  pickedQty: number;
  remainingQty: number;
  fromWarehouse: string;
  toWarehouse: string;
  /** OPEN | PARTIAL | PICKED */
  status: string;
}

export interface PickTransaction {
  pickTransactionId: number;
  pickListDetailId: number;
  sourceDocEntry: number;
  sourceDocNum: number;
  sourceLineNum: number;
  itemCode: string;
  warehouse: string;
  location: string;
  palletNumber: string;
  boxNumber: string;
  /** Server-side available qty in the box at pick time, before deduction. */
  availableQty: number;
  pickQty: number;
  createdBy: string;
  createdDate: string;
}

export interface DeliveryChallan {
  dcId: number;
  dcNumber: string;
  dcDate: string;
  totalQty: number;
  status: string;
}

export interface ProcessLogEntry {
  stage: string;
  result: string;
  message: string;
  createdBy: string;
  createdDate: string;
}

export interface PickListDetail extends PickListHeader {
  stockTransferDocNum: string | null;
  details: PickListLine[];
  transactions: PickTransaction[];
  dc: DeliveryChallan | null;
  processLog: ProcessLogEntry[];
}

// ------------------------------------------------------------ GET /picklist/:id/inventory

export interface InventoryPosition {
  inventoryId: number;
  warehouse: string;
  location: string;
  palletNumber: string;
  boxNumber: string;
  availableQty: number;
}

export interface PickListInventoryLine {
  pickListDetailId: number;
  itemCode: string;
  itemName: string;
  requiredQty: number;
  pickedQty: number;
  remainingQty: number;
  totalAvailableQty: number;
  inventory: InventoryPosition[];
}

export interface ItemSummary {
  itemCode: string;
  itemName: string;
  warehouse: string;
  requiredQty: number;
  pickedQty: number;
  remainingQty: number;
  availableQty: number;
  shortageQty: number;
}

export interface PickListInventory {
  items: PickListInventoryLine[];
  itemSummary: ItemSummary[];
}

// ------------------------------------------------------------ POST /pick/pallet, /pick/box

export interface ScanLineRef {
  pickListDetailId: number;
  sourceDocEntry: number;
  sourceDocNum: number;
  sourceLineNum: number;
  requiredQty: number;
  pickedQty: number;
  remainingQty: number;
}

/** One inventory row on the scanned pallet/box that an open Pick List line can use. */
export interface ScannedStock {
  inventoryId: number;
  itemCode: string;
  itemName: string;
  warehouseCode: string;
  locationCode: string;
  palletNumber: string;
  boxNumber: string;
  pickableQty: number;
  remainingRequiredQty: number;
  suggestedPickQty: number;
  pickListLines: ScanLineRef[];
}

export interface PalletScan {
  palletNumber: string;
  locations: string[];
  boxNumbers: string[];
  items: ScannedStock[];
}

export interface BoxScan {
  palletNumber: string;
  boxNumber: string;
  items: ScannedStock[];
}

// ------------------------------------------------------------ POST /pick, /picklist/:id/complete

export interface SavePickRequest {
  pickListId: number;
  pickListDetailId: number;
  itemCode: string;
  palletNumber: string;
  boxNumber: string;
  location: string;
  pickQty: number;
  clientRequestId: string;
}

export interface SavedPick {
  pickTransactionId: number;
  pickListDetailId: number;
  itemCode: string;
  pickQty: number;
  pickedQty: number;
  remainingQty: number;
  pickListStatus: PickListStatus | null;
  /** Qty left in the box after this pick; null on a duplicate replay. */
  inventoryRemainingQty: number | null;
  duplicate: boolean;
}

export interface CompletionResult {
  pickListNumber: string;
  status: PickListStatus;
  dcNumber: string | null;
  stockTransferDocEntry: number | null;
  stockTransferNumber: string | null;
  alreadyCompleted: boolean;
}

/** Normalised error surfaced to the UI. `data` carries extra detail such as PICKING_INCOMPLETE.pendingLines. */
export interface PickListError {
  code: string;
  message: string;
  data: any;
}
