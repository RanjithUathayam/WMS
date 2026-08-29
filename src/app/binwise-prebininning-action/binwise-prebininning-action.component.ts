import { ChangeDetectorRef, Component, ElementRef, OnInit, Renderer2 } from '@angular/core';
import Swal from 'sweetalert2';
import { ApiService } from '../service/api.service';
import { SwalService } from '../service/swal.service';
import { Options } from 'select2';
import { AppComponent } from '../app.component';
import { FormBuilder, FormGroup } from '@angular/forms';
const moment = require('moment-timezone');

@Component({
  selector: 'app-binwise-prebininning-action',
  templateUrl: './binwise-prebininning-action.component.html',
  styleUrls: ['./binwise-prebininning-action.component.css']
})
export class BinwisePrebininningActionComponent {
  p: number = 1;
  itemsPerPage: any = 10;
  selectedRows: any[] = [];
  selectedOption: string = '';
  filters: { [key: string]: string } = {};
  filteredArray: any[];
  selectedStation: string = '';
  stationQueue: any = [];
  flagset: boolean = false
  popupTableHeader: any[] = [
      // {"header":"Floor","data":"Floor","search":false,"date":false, "Type": "text" },
      // {"header":"Station","data":"Station","search":false,"date":false, "Type": "text" },
      // {"header":"BinID","data":"BinID","search":true,"date":false, "Type": "text" },
      // {"header":"Item Code","data":"ItemCode","search":true,"date":false, "Type": "text" },
      { "header": "Item Name", "data": "ItemName", "search": true, "date": false, "Type": "text" },
      { "header": "Req Quantity", "data": "Quantity", "search": true, "date": false, "Type": "text" },
      { "header": "Picked Quantity", "data": "PickingQty", "search": true, "date": false, "Type": "text" },
      { "header": "TrolleyNo", "data": "TrolleyNo", "search": true, "date": false, "Type": "text" },
      // {"header":"Status","data":"ProcessStatus","search":true,"date":false, "Type": "text" }
  ]
  isShowExportBtn: boolean = false

  // fromDate: any = new Date().toISOString().split('T')[0];

  fromDate: any = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  toDate: any = new Date().toISOString().split('T')[0];
  minDate: Date;
  maxDate: Date = new Date();
  lastUpdatedDateTime: any = new Date().toLocaleString();
  tableData: any[] = []
  tableHeader: any[] = []

  filterForm!: FormGroup;

  public options: Options = {
      theme: 'classic',
      placeholder: "Select an option",
  }
  orderDetailView: any[] = [];
  groupedOrderDetails: any = [];
  detailOrderNo: any = ''
  orderQty: any = 0
  PickingQty: any = 0
  constructor(private apiservice: ApiService, private swal: SwalService, private cdr: ChangeDetectorRef, private appComponent: AppComponent, private fb: FormBuilder) { }
  ngOnInit(): void {
      this.filterForm = this.fb.group({
          fromDate: [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]],
          toDate: [new Date().toISOString().split('T')[0]],
          // scanStatus: ['All'],
      });

      this.searchData(); 

      // setInterval(() => {
      //     this.searchData();
      //   }, 300000);
  }

  // new sorting code

  currentSortKey: string = '';
  isAscending: boolean = true;

  sortArrayByKey(data: any[], key: string, type: string): any[] {
      return data.sort((a, b) => {
          const aValue = a[key];
          const bValue = b[key];

          if (type === 'text') {
              return aValue.localeCompare(bValue);
          } else if (type == 'number') {

              return Number(aValue) - Number(bValue);
          } else if (type === 'date') {
              return new Date(aValue).getTime() - new Date(bValue).getTime();
          } else {
              return 0; // Fallback case for unknown types
          }
      });
  }

  sortData(key: string, type: string): void {
      if (this.currentSortKey === key) {
          this.isAscending = !this.isAscending;
      } else {
          this.currentSortKey = key;
          this.isAscending = true;
      }

      this.tableData = this.sortArrayByKey(this.tableData, key, type);

      if (!this.isAscending) {
          this.tableData.reverse();
      }

  }

  onSort(key: string, type: string): void {
      this.sortData(key, type);
  }


  // new sorting code
  openSidebar() {
      const sidebar = document.querySelector<HTMLElement>('.sidebar_Request');
      this.flagset = true
      sidebar?.classList.toggle('close');
  }

  // Filter Code
  searchData(){
      this.appComponent.showLoading('Data Loading !!!')
        let obj = { 
      }
      this.apiservice.getPreBinningDataForRejection(obj).subscribe((res: any)=>{
          if(res.status)
          {
            this.tableData = res.data; 
            this.filteredArray = res.data
            this.tableHeader = JSON.parse(res.header)
            this.appComponent.hideLoading()
          }
          else
          {
            this.appComponent.hideLoading()
          }
      }, (err)=>{
        this.appComponent.hideLoading()
      })
  }

  // Apply Filter  -- not used
  applyFilters() {
      this.filteredArray = [];
      this.filteredArray = this.tableData.filter(record => {
          return Object.keys(this.filters).every(key => {
              if (this.filters[key] === null || this.filters[key] === undefined || this.filters[key].trim() === '') {
                  return true; // Don't apply filter if it's empty
              }
              const filterValue = String(this.filters[key]).toLowerCase();
              const recordValue = String(record[key]).toLowerCase();

              if (this.tableHeader.find(header => header.data === key)?.search) {
                  return recordValue.includes(filterValue);
              }
              else {
                  // If the column is not searchable, just return true to include the record
                  return true;
              }
          })
      })
  }

  clear() {

      this.filterForm.reset();
  }

  toggleRowSelection(row: any) {
      const index = this.selectedRows.indexOf(row);
      if (index === -1) {
          this.selectedRows.push(row);
      }
      else {
          this.selectedRows.splice(index, 1);
      }
  }

  rejectprebinningdata(){
      Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, reject it!'
      }).then((result) => {
        if (result.isConfirmed) {
          this.appComponent.showLoading('Data Loading !!!') 
          this.apiservice.rejectPreBinningData(this.selectedRows).subscribe((res: any)=>{
              if(res.status)
              { 
                this.appComponent.hideLoading()
                this.searchData()
              }
              else
              {
                this.appComponent.hideLoading()
              }
        })
        }
      })
    }


  closesidebar() {
      const sidebar = document.querySelector<HTMLElement>('.sidebar');
      this.flagset = false
      sidebar.classList.toggle('close');
  }

  falseSet() {
      this.closesidebar()
  }
}
