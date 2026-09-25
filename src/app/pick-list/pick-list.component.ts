import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AppComponent } from '../app.component';
import { PickListHeader, PickListStatus, TransferRequestDocument, TransferRequestLine } from './pick-list.models';
import { PickListService } from './pick-list.service';

interface RequestDocGroup extends TransferRequestDocument {
  fromWarehouseName: string;
  toWarehouseName: string;
  lines: TransferRequestLine[];
}

interface CombinedItem {
  itemCode: string;
  itemName: string;
  totalQty: number;
  docNums: number[];
}

type PickListTab = 'requests' | 'picklists';

/** Errors after which the request list is out of date (someone else reserved or closed the lines). */
const STALE_REQUEST_CODES = ['DUPLICATE_PICKLIST', 'DOCUMENT_CLOSED', 'NO_OPEN_LINES', 'DOCUMENT_NOT_FOUND', 'INVALID_DOCUMENT'];

@Component({
  selector: 'app-pick-list',
  templateUrl: './pick-list.component.html',
  styleUrls: ['./pick-list.shared.css', './pick-list.component.css']
})
export class PickListComponent implements OnInit {
  activeTab: PickListTab = 'requests';

  // ---- Stock Transfer Request selection
  fromWarehouse = '';
  toWarehouse = '';
  documents: RequestDocGroup[] = [];
  groups: RequestDocGroup[] = [];
  searchText = '';
  onlyAvailable = true;
  isLoadingRequests = false;
  requestsError = '';
  isGenerating = false;
  /** Selected DocEntries — a Set makes duplicate selection of a document impossible. */
  selection = new Set<number>();
  /** DocEntries whose line rows are shown; documents start collapsed. */
  expanded = new Set<number>();
  /** Filter for the combined-items preview in the review step. */
  combinedSearch = '';

  // ---- Pick list register
  pickLists: PickListHeader[] = [];
  statusFilter: PickListStatus | '' = '';
  isLoadingPickLists = false;
  pickListsError = '';
  pickListSearch = '';
  readonly statusOptions: { value: PickListStatus | ''; label: string }[] = [
    { value: '', label: 'All statuses' },
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'PICKED', label: 'Picked (awaiting DC / SAP)' },
    { value: 'DC_CREATED', label: 'DC Created (awaiting SAP)' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  lastUpdated = new Date();

  constructor(
    public pickListService: PickListService,
    private appComponent: AppComponent,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    this.setTab(tab === 'picklists' ? 'picklists' : 'requests');
  }

  setTab(tab: PickListTab) {
    this.activeTab = tab;
    if (tab === 'requests') {
      this.loadRequests();
    } else {
      this.loadPickLists();
    }
  }

  // ================================================================ requests

  loadRequests() {
    this.isLoadingRequests = true;
    this.requestsError = '';
    this.pickListService.getTransferRequests(this.onlyAvailable).subscribe({
      next: result => {
        this.isLoadingRequests = false;
        this.lastUpdated = new Date();
        this.fromWarehouse = result.fromWarehouse;
        this.toWarehouse = result.toWarehouse;
        this.documents = result.documents.map(doc => {
          const lines = result.lines.filter(l => l.docEntry === doc.docEntry);
          return {
            ...doc,
            fromWarehouseName: lines[0]?.fromWarehouseName || '',
            toWarehouseName: lines[0]?.toWarehouseName || '',
            lines
          };
        });
        // Keep the user's selection across a refresh, but only for documents that are still eligible.
        const eligible = new Set(this.documents.filter(d => this.isEligible(d)).map(d => d.docEntry));
        this.selection = new Set([...this.selection].filter(e => eligible.has(e)));
        this.applySearch();
      },
      error: err => {
        this.isLoadingRequests = false;
        this.documents = [];
        this.groups = [];
        this.requestsError = err.message;
      }
    });
  }

  applySearch() {
    const term = this.searchText.trim().toLowerCase();
    this.groups = !term ? this.documents : this.documents.filter(doc =>
      String(doc.docNum).includes(term)
      || doc.lines.some(l => l.itemCode.toLowerCase().includes(term) || l.itemName.toLowerCase().includes(term)));
  }

  isEligible(doc: RequestDocGroup): boolean {
    return doc.availableForPickListQty > 0;
  }

  isSelected(doc: RequestDocGroup): boolean {
    return this.selection.has(doc.docEntry);
  }

  isExpanded(doc: RequestDocGroup): boolean {
    return this.expanded.has(doc.docEntry);
  }

  toggleExpand(doc: RequestDocGroup) {
    if (this.expanded.has(doc.docEntry)) {
      this.expanded.delete(doc.docEntry);
    } else {
      this.expanded.add(doc.docEntry);
    }
  }

  get allExpanded(): boolean {
    return this.groups.length > 0 && this.groups.every(g => this.expanded.has(g.docEntry));
  }

  toggleExpandAll() {
    if (this.allExpanded) {
      this.expanded.clear();
    } else {
      this.groups.forEach(g => this.expanded.add(g.docEntry));
    }
  }

  toggleDoc(doc: RequestDocGroup) {
    if (!this.isEligible(doc)) {
      return;
    }
    if (this.selection.has(doc.docEntry)) {
      this.selection.delete(doc.docEntry);
    } else {
      this.selection.add(doc.docEntry);
    }
  }

  /** Eligible documents in the current (searched) list. */
  get visibleEligible(): RequestDocGroup[] {
    return this.groups.filter(g => this.isEligible(g));
  }

  get allVisibleSelected(): boolean {
    const eligible = this.visibleEligible;
    return eligible.length > 0 && eligible.every(g => this.selection.has(g.docEntry));
  }

  toggleSelectAll() {
    const select = !this.allVisibleSelected;
    this.visibleEligible.forEach(g => select ? this.selection.add(g.docEntry) : this.selection.delete(g.docEntry));
  }

  removeDoc(docEntry: number) {
    this.selection.delete(docEntry);
  }

  clearSelection() {
    this.selection.clear();
  }

  get selectedDocs(): RequestDocGroup[] {
    return this.documents.filter(d => this.selection.has(d.docEntry));
  }

  /** Preview only — the server re-reads SAP and the reservations when the Pick List is created. */
  get combinedItems(): CombinedItem[] {
    const byItem = new Map<string, CombinedItem>();
    this.selectedDocs.forEach(doc => doc.lines.filter(l => l.availableForPickListQty > 0).forEach(line => {
      const item = byItem.get(line.itemCode) || { itemCode: line.itemCode, itemName: line.itemName, totalQty: 0, docNums: [] };
      item.totalQty += line.availableForPickListQty;
      if (!item.docNums.includes(line.docNum)) {
        item.docNums.push(line.docNum);
      }
      byItem.set(line.itemCode, item);
    }));
    return [...byItem.values()];
  }

  get filteredCombinedItems(): CombinedItem[] {
    const term = this.combinedSearch.trim().toLowerCase();
    const items = this.combinedItems;
    return !term ? items : items.filter(i =>
      i.itemCode.toLowerCase().includes(term) || i.itemName.toLowerCase().includes(term));
  }

  get combinedTotalQty(): number {
    return this.combinedItems.reduce((sum, i) => sum + i.totalQty, 0);
  }

  get selectedLineCount(): number {
    return this.selectedDocs.reduce((sum, d) => sum + d.lines.filter(l => l.availableForPickListQty > 0).length, 0);
  }

  get eligibleDocCount(): number {
    return this.documents.filter(d => this.isEligible(d)).length;
  }

  generatePickList() {
    if (this.selection.size === 0 || this.isGenerating) {
      return;
    }
    const docs = this.selectedDocs;
    const docList = docs.map(d => d.docNum).join(', ');
    Swal.fire({
      title: 'Generate Pick List?',
      html: `<p>${docs.length} document(s), ${this.selectedLineCount} line(s), ${this.combinedItems.length} item(s), total qty <b>${this.combinedTotalQty}</b></p>`
        + `<p>Source DocNum(s): <b>${this.escape(docList)}</b></p>`
        + '<p style="font-size:0.85em;color:#64748b">Each line takes its remaining open quantity that is not already on another Pick List.</p>',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#016DB0',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Generate'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }
      this.isGenerating = true;
      this.appComponent.showLoading('Generating Pick List...');
      this.pickListService.createPickList(docs.map(d => ({ docEntry: d.docEntry, docNum: d.docNum }))).subscribe({
        next: header => {
          this.appComponent.hideLoading();
          this.isGenerating = false;
          this.selection.clear();
          Swal.fire({
            icon: 'success',
            title: 'Pick List generated',
            html: `Pick List No: <b>${this.escape(header.pickListNumber)}</b>`,
            confirmButtonColor: '#016DB0',
            confirmButtonText: 'Open Pick List'
          }).then(() => this.openPickList(header.pickListId));
        },
        error: err => {
          this.appComponent.hideLoading();
          this.isGenerating = false;
          const title = err.code === 'DUPLICATE_PICKLIST' ? 'Already on another Pick List' : 'Pick List not generated';
          Swal.fire({ icon: 'error', title, text: err.message });
          if (STALE_REQUEST_CODES.includes(err.code)) {
            this.loadRequests();
          }
        }
      });
    });
  }

  // ================================================================ pick lists

  loadPickLists() {
    this.isLoadingPickLists = true;
    this.pickListsError = '';
    this.pickListService.getPickLists(this.statusFilter).subscribe({
      next: rows => {
        this.isLoadingPickLists = false;
        this.lastUpdated = new Date();
        this.pickLists = rows;
      },
      error: err => {
        this.isLoadingPickLists = false;
        this.pickLists = [];
        this.pickListsError = err.message;
      }
    });
  }

  get filteredPickLists(): PickListHeader[] {
    const term = this.pickListSearch.trim().toLowerCase();
    if (!term) {
      return this.pickLists;
    }
    return this.pickLists.filter(p =>
      p.pickListNumber.toLowerCase().includes(term) || p.sourceDocNums.some(d => d.includes(term)));
  }

  progress(p: PickListHeader): number {
    return p.totalRequestedQty > 0 ? Math.min(100, Math.round((p.totalPickedQty / p.totalRequestedQty) * 100)) : 0;
  }

  openPickList(pickListId: number) {
    this.router.navigate(['/mainpage/pick_list', pickListId]);
  }

  refresh() {
    this.setTab(this.activeTab);
  }

  trackByDoc(_: number, doc: RequestDocGroup) {
    return doc.docEntry;
  }

  private escape(value: string): string {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }
}
