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
  /** Full-box quantity planned at generation (required + whole-box excess); null on older Pick Lists. */
  plannedQty: number | null;
  /** Actual picked quantity — full boxes, so it can exceed requestedQty. */
  pickedQty: number;
  /** max(requested − picked, 0). */
  remainingQty: number;
  /** max(picked − requested, 0): extra quantity that came with full boxes. */
  excessQty: number;
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
  /** Server-side available qty in the box at pick time, before deduction (the full box qty for full-box picks). */
  availableQty: number;
  pickQty: number;
  /** Picked by Full Box Picking. */
  fullBox: boolean;
  createdBy: string;
  createdDate: string;
}

export interface DeliveryChallan {
  dcId: number;
  dcNumber: string;
  dcDate: string;
  /** Actual picked quantity (full boxes), not the required quantity. */
  totalQty: number;
  totalRequestedQty: number;
  totalExcessQty: number;
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

/** A whole box the server suggests for what is still required. */
export interface SuggestedBox {
  inventoryId: number;
  location: string;
  palletNumber: string;
  boxNumber: string;
  boxQty: number;
}

export interface ItemSummary {
  itemCode: string;
  itemName: string;
  warehouse: string;
  requiredQty: number;
  plannedQty: number;
  pickedQty: number;
  remainingQty: number;
  excessQty: number;
  availableQty: number;
  shortageQty: number;
  /** Full Box Picking suggestion for the remaining quantity. */
  suggestedBoxes: SuggestedBox[];
  suggestedPickQty: number;
  suggestedExcessQty: number;
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
  /** The whole quantity of this item in the box — what a full-box pick takes. */
  fullBoxQty: number;
  suggestedPickQty: number;
  /** fullBoxQty beyond what is still required. */
  excessQty: number;
  /** False when the box also holds items not on this Pick List (it cannot be picked whole). */
  fullBoxPickable: boolean;
  /** How the full box quantity is split over the source lines (box scan only). */
  allocations: BoxAllocation[];
  pickListLines: ScanLineRef[];
}

export interface BoxAllocation {
  pickListDetailId: number;
  sourceDocNum: number;
  sourceLineNum: number;
  qty: number;
  excessQty: number;
}

export interface PalletScan {
  palletNumber: string;
  locations: string[];
  boxNumbers: string[];
  /** Boxes that also hold items not on this Pick List — they cannot be picked whole. */
  blockedBoxNumbers: string[];
  items: ScannedStock[];
}

/** POST /pick/box — server preview of a full-box pick (same rules as POST /pick). */
export interface BoxScan {
  palletNumber: string;
  boxNumber: string;
  warehouse: string;
  location: string;
  totalBoxQty: number;
  /** Part of the box that covers still-required quantity. */
  totalRequiredQty: number;
  totalExcessQty: number;
  items: ScannedStock[];
}

// ------------------------------------------------------------ POST /pick, /picklist/:id/complete

/** Full Box Picking: no item / quantity — the server picks the whole box. */
export interface SavePickRequest {
  pickListId: number;
  palletNumber: string;
  boxNumber: string;
  location: string;
  /** Box quantity the operator confirmed; the server rejects the pick (BOX_QTY_CHANGED) if the box changed. */
  confirmedBoxQty: number;
  clientRequestId: string;
}

export interface SavedPickItem {
  itemCode: string;
  boxQty: number;
  excessQty: number;
}

export interface SavedPick {
  boxNumber: string;
  boxQty: number;
  excessQty: number;
  items: SavedPickItem[];
  pickListStatus: PickListStatus | null;
  /** Excess warning from the server, or null. */
  warning: string | null;
  duplicate: boolean;
}

export interface CompletionResult {
  pickListNumber: string;
  status: PickListStatus;
  dcNumber: string | null;
  dcQty: number | null;
  requiredQty: number | null;
  pickedQty: number | null;
  excessQty: number;
  stockTransferDocEntry: number | null;
  stockTransferNumber: string | null;
  alreadyCompleted: boolean;
}

/** POST /picklist — full box plan per item, returned with the created header. */
export interface BoxPlanItem {
  itemCode: string;
  itemName: string;
  requiredQty: number;
  plannedQty: number;
  excessQty: number;
  shortageQty: number;
  boxes: { palletNumber: string; boxNumber: string; location: string; boxQty: number }[];
}

export interface CreatedPickList extends PickListHeader {
  totalPlannedQty: number;
  boxPlan: BoxPlanItem[];
  warnings: string[];
}

/** Normalised error surfaced to the UI. `data` carries extra detail such as PICKING_INCOMPLETE.pendingLines. */
export interface PickListError {
  code: string;
  message: string;
  data: any;
}
