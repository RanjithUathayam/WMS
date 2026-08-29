import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { ModalDismissReasons, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ExportModalComponent } from '../export-modal/export-modal.component';
import { ExcelExportService } from '../../service/excel-export.service';
import { PdfExportService } from '../../service/pdf-export.service';
import { CsvExportService } from '../../service/csv-export.service';
import { ApiService } from 'src/app/service/api.service';
import { SwalService } from 'src/app/service/swal.service';
import { AppComponent } from 'src/app/app.component';
import { environment } from 'src/environments/environment';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import * as moment from 'moment';

@Component({
  selector: 'app-dynamic-table',
  templateUrl: './dynamic-table.component.html',
  styleUrls: ['./dynamic-table.component.css']
})
export class DynamicTableComponent {
 
  @Input() tableHeader: any = [];
  @Input() alarmApiFilter: any = [];
  @Input() userEntryFilter: any = [];
  @Input() binFilterApiData: any = [];
  @Input() inventoryType: any = [];
  @Input() tableData: any = [];
  @Input() exportTitle: any = '';
  @Input() exportApi: any = [];
  @Input() isShowExportBtn: any = [];
  @Input() maintenanceHistoryApiDataFilter: any = [];
  @Input() filterDataApi: any = [];
  @Input() storageRetrievalApiDataFilter: any = [];
  @Input() userLogApiDataFilter: any = [];
  @Input() rejectedDataFilter: any = [];
  @Input() totRec: any = false;
  p: number = 1;
  closeResult: string;
  filteredRecords = [...this.tableData];
  filters: { [key: string]: string } = {};
  baseURL = environment.baseURL;
  @ViewChild('fabGroup') fabGroup: ElementRef;
  @ViewChild('mainBtn') mainBtn: ElementRef;
  flagset: boolean = false;
  currentPage: any;
  maxPageSize: number | undefined;
  btnRights: any = {};
  itemsPerPage: any = 5;
  expandedRows: { [key: string]: boolean } = {};
  @Input() isExpandable: boolean = false;
  searchApiCall: any = '';
  debounceTimer: any;
  invObj: any;
  itemTransactionFilterCall: any = {};
  storageHistorySearchCall: any = {};
  storageHistoryLoadUnloadList: any[] = [];
  storageHistoryCraneIDArray: any[] = [];
  storageHistoryShuttleIDArray: any[] = [];

  toggleExpand(item: any): void {
    if (!item.ItemName) return;
    this.expandedRows[item.ItemName] = !this.expandedRows[item.ItemName];
  }
  constructor(private modalService: NgbModal, private apiservice: ApiService, private swal: SwalService, private appComponent: AppComponent, private breakpointObserver: BreakpointObserver) {
    this.expandedRows = {};
  }
 
  offlineDownload: any = false;
 
  ngOnInit() {
 
 
    let user_rights: any = localStorage.getItem('WMS-Rights');
    if (user_rights != null) {
      const data = JSON.parse(user_rights);
 
      const resultss = data.map(key => ({ [key]: true }))
        .reduce((acc, obj) => ({ ...acc, ...obj }), {});
 
      this.btnRights = {
        master_item_deletes: (data.some(right => right.includes('master_item_deletes'))) ? true : false,
        master_item_modifies: (data.some(right => right.includes('master_item_modifies'))) ? true : false,
        ...resultss
      };
    };
 
    // this.setRights(this.btnRights);
    this.breakpointObserver.observe([Breakpoints.Medium]).subscribe(result => {
      if (result.matches) {
        this.maxPageSize = 5; // Medium screen: show 3 page buttons
        this.itemsPerPage = 11;
      } else {
        if (this.exportApi === 'transaction/inventory') {
          this.itemsPerPage = 50;
        }
        this.maxPageSize = 5; // Other screens: show all page buttons
        this.itemsPerPage = 50;
      }
    });
 
 
 
  }
 
  ngOnChanges() {
    if (this.tableData.length != 0) {
      // this.appComponent.showLoading("Data Loading!!!")
    }
    setTimeout(() => {
      this.filteredRecords = this.tableData;
      //this.appComponent.hideLoading()
    }, 500)
 
  }
 
  // setRights(rights) {
  //   this.currentPage = window.location.pathname.split('/').pop();
  //   if (this.currentPage == 'alarm') {
  //     this.isShowExportBtn = false;
  //   }
 
  // }
  applyFilters() {
    if(this.exportApi === 'transaction/inventory') 
    {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {

            if (this.exportApi === 'transaction/inventory') 
            {
                const filterKeys = Object.keys(this.filters).filter(key => {
                    const value = this.filters[key];
                    return value != null && value !== undefined && value.trim() !== '';
                });

                const allValuesValidLength = filterKeys.every(
                    key => String(this.filters[key]).trim().length >= 3
                );

                let obj = {
                    type: 'Inventory',
                    itemCode: filterKeys.includes('MaterialCode') ? this.filters['MaterialCode'] : '',
                    itemname: filterKeys.includes('MaterialName') ? this.filters['MaterialName'] : '',
                    itemgroup: filterKeys.includes('MaterialGroup') ? this.filters['MaterialGroup'] : '',
                    binid: filterKeys.includes('BinID') ? this.filters['BinID'] : '',
                    craneid: ''
                };

                this.invObj = obj;

                this.searchApiCall = `transaction/inventory`;
                this.appComponent.showLoading('Inventory Data Loading...');

                this.apiservice.getInventoryData(this.searchApiCall, obj).subscribe((res: any) => {
                        this.appComponent.hideLoading();

                        if (res.status === 1) {
                            this.tableHeader = JSON.parse(res.header);
                            this.totRec = res.totalRecord;
                            this.tableData = res.data.map((element: any, index: number) => {
                            const loc = element.LocationID || '';
                            let formattedLocation = loc;

                            if (loc.length === 9) {
                                formattedLocation = `${loc.substring(0, 2)}-${loc.substring(2, 5)}-${loc.substring(5, 7)}-${loc.substring(7, 9)}`;
                            }

                            return {
                                ...element,
                                sno: index + 1,
                                LocationID: formattedLocation
                            };
                            });

                            // Apply filtering on client-side
                            if (filterKeys.length > 0 && allValuesValidLength) {
                            this.filteredRecords = this.tableData.filter(record => {
                                return filterKeys.every(key => {
                                const filterValue = String(this.filters[key]).toLowerCase();
                                const recordValue = String(record[key]).toLowerCase();
                                return recordValue.includes(filterValue);
                                });
                            });
                            } else {
                            this.filteredRecords = this.tableData;
                            }

                        } 
                        else {
                            this.filteredRecords = this.tableData;
                            this.swal.error('Error', res.message);
                        }
                    },
                    (err: any) => {
                        this.appComponent.hideLoading();
                        this.filteredRecords = this.tableData;
                        this.swal.error('Error', err.message);
                    }
                );
                return;
            }
            this.offlineDownload = false;
            return;

        }, 500); 
        return; 
    }
    else if(this.exportApi === 'transaction/item') 
    {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {

            if (this.exportApi === 'transaction/item') 
            {
                const filterValue = Object.keys(this.filters).filter(key => {
                    const value = this.filters[key];
                    return value != null && value !== undefined && value.trim() !== '';
                })
            
                let obj = { ...this.itemTransactionFilterCall }
                obj['PartGrp'] = filterValue.includes('ItemGroup') ? this.filters['ItemGroup'] : ''
                obj['BinID'] = filterValue.includes('BinID') ? this.filters['BinID'] : ''

                this.searchApiCall = `transaction/item`;
                this.appComponent.showLoading('Item Transaction Data Loading...');
                this.apiservice.getTransactionList(this.searchApiCall, obj).subscribe((res: any) => {
                    if (res.status == 1) {
                        this.appComponent.hideLoading();
                        this.tableData = res.data;
                        this.tableHeader = JSON.parse(res.header); 
                        let currentPage = 1;
                        let start: any = (currentPage * 10) - 9;
                        if (this.tableData) 
                        {
                            this.tableData.forEach((element: any) => {
                                element.sno = start;
                                start++;
                            })
                        }

                        this.filteredRecords = this.tableData.filter(record => {
                            return filterValue.every(key => {
                            const filterValue = String(this.filters[key]).toLowerCase();
                            const recordValue = String(record[key]).toLowerCase();
                            return recordValue.includes(filterValue);
                            });
                        });
                    }
                    else if (res.status == 0) 
                    {
                        this.appComponent.hideLoading();
                        this.swal.error('Error', res.message);
                    } 
                }, (err: any) => {
                    this.appComponent.hideLoading()
                    this.swal.error('Error', err.message);
                })
                return;
            }
            this.offlineDownload = false;
            return;

        }, 500); 
        return; 
    }
    else if(this.exportApi === 'history/loadUnLoad') 
    {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {

            if (this.exportApi === 'history/loadUnLoad') 
            {
                const filterValue = Object.keys(this.filters).filter(key => {
                    const value = this.filters[key];
                    return value != null && value !== undefined && value.trim() !== '';
                })
            
                let obj = { ...this.storageHistorySearchCall }
                obj['BinID'] = filterValue.includes('BinID') ? this.filters['BinID'] : ''

                this.searchApiCall = `history/loadUnLoad`;
                this.appComponent.showLoading('Item Transaction Data Loading...');
                this.apiservice.getAlarmHistoryData(this.searchApiCall, obj).subscribe((res: any) => {
                    if (res.status == 1) {
                        this.storageHistoryLoadUnloadList = res.data;
                        this.tableData = this.storageHistoryLoadUnloadList
                        this.tableHeader = JSON.parse(res.header);
                        this.storageHistoryCraneIDArray = ['All', ...Array.from(new Set(this.storageHistoryLoadUnloadList.map(item => item.AisleNo)))];
                        this.storageHistoryShuttleIDArray = ['All', ...Array.from(new Set(this.storageHistoryLoadUnloadList.map(item => item.ShuttleID)))];
                    
                        if (this.storageHistoryLoadUnloadList) {
                            let i = 1
                            this.storageHistoryLoadUnloadList.forEach((element: any) => {
                                element.sno = i
                                i++
                            })
                        }
                        
                        this.appComponent.hideLoading();
                    }
                    else if (res.status == 0) {
                        this.appComponent.hideLoading();
                        this.swal.error('Error', res.message);
                    }
                }, (err: any) => {
                    this.appComponent.hideLoading()
                    this.swal.error('Error', err.message);
                })
                return;
            }
            this.offlineDownload = false;
            return;

        }, 500); 
        return; 
    }

    this.filteredRecords = this.tableData.filter(record => {
        return Object.keys(this.filters).every(key => {
            if (this.filters[key] === null || this.filters[key] === undefined || this.filters[key].trim() === '') {
                return true; // Don't apply filter if it's empty
            }

            this.offlineDownload = true
            const filterValue = String(this.filters[key]).toLowerCase();
            const recordValue = String(record[key]).toLowerCase();
            if (this.tableHeader.find(header => header.data === key)?.search) {
                return recordValue.includes(filterValue);
            } 
            else 
            {
                // If the column is not searchable, just return true to include the record
                return true;
            }
        });
    }); 
  }

  ngAfterViewInit(): void {
    if (this.mainBtn) {
      this.mainBtn.nativeElement.addEventListener('click', () => {
        this.fabGroup.nativeElement.classList.toggle('active');
      });
 
    }
  }
  falseSet() {
    this.fabGroup.nativeElement.classList.remove('active');
    this.flagset = false
  }
  exportFile() {
    this.flagset = !this.flagset
  }
  open() {
    this.modalService.dismissAll();
    this.modalService
      .open(ExportModalComponent, { ariaLabelledBy: 'modal-basic-title', size: 'md', centered: true })
      .result.then(
        (result) => {
          this.closeResult = `Closed with: ${result}`;
          window.open(this.baseURL + this.exportApi + '&exportFormat=' + result, '_blank');
          // this.apiservice.getAlarmHistory(exportApiCall).subscribe((res: any) => {
          //   //this.downloadCSV(res);
          //   window.open('http://stackoverflow.com', '_blank');
          // })
        },
        (reason) => {
          this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
        }
      );
  }
  export(data: any) {

    if(this.offlineDownload == true)
    {
        this.swal.error('Export Disabled', 'Offline export formatter is not available in this workspace.');
        return;
    }
     
 
    if (this.exportApi == 'transaction/item') {
      this.apiservice.getItemTransactionList(this.filterDataApi, data);
    }
 
    if (this.exportApi === 'transaction/inventory') {
      this.apiservice.getTotalInventory(this.inventoryType, this.exportApi, data, this.invObj);
    }
 
 
    if (this.exportApi == 'history/userLog') {
      this.apiservice.getUserLog(this.userLogApiDataFilter, data);
    }
   
 
  }
  getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }
 
  //    sorting code
 
 
 
 
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
        const parseDate = (dateString: string) => {
          // Check if the date is in DD/MM/YYYY HH:mm:ss format
          if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(dateString)) {
            const [day, month, yearAndTime] = dateString.split('/');
            const [year, time] = yearAndTime.split(' ');
            return new Date(`${year}-${month}-${day}T${time}.400Z`).getTime();
          }
          // For already valid ISO dates
          return new Date(dateString).getTime();
        };
 
        const aTime = parseDate(aValue);
        const bTime = parseDate(bValue);
        return aTime - bTime;
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

    if(this.exportApi == 'transaction/inventory'){
      return;
    }
 
    this.filteredRecords = this.sortArrayByKey(this.filteredRecords, key, type);
 
    if (!this.isAscending) {
      this.filteredRecords.reverse();
    }
  }
 
  onSort(key: string, type: string): void {
    this.sortData(key, type);

    if(this.exportApi == 'transaction/inventory')
    {
      let obj = {
        type: 'Inventory',
        itemCode: this.filters['MaterialCode'] || '',
        itemname: this.filters['MaterialName'] || '',
        itemgroup: this.filters['MaterialGroup'] || '',
        binid: this.filters['BinID'] || '',
        craneid: '',
        sortKey: key || '',
        sortFormat: this.isAscending ? 'asc' : 'desc'
      }
      this.appComponent.showLoading('Inventory Data Loading...');

      this.searchApiCall = `transaction/inventory`;

      this.apiservice.getInventoryData(this.searchApiCall, obj).subscribe((res: any) => {
        if (res.status === 1) {
          this.tableHeader = JSON.parse(res.header);
          this.appComponent.hideLoading();
          this.totRec = res.totalRecord;
          this.tableData = res.data.map((element: any, index: number) => {
            const loc = element.LocationID || '';
            let formattedLocation = loc;
 
            // Format LocationID: 01-001-01-01
            if (loc.length === 9) {
              formattedLocation = `${loc.substring(0, 2)}-${loc.substring(2, 5)}-${loc.substring(5, 7)}-${loc.substring(7, 9)}`;
            }
 
            return {
              ...element,
              sno: index + 1,
              LocationID: formattedLocation // Override original with formatted
            };
          });
          this.filteredRecords = this.tableData;
        }
        else if (res.status == 0) {
          this.appComponent.hideLoading();
          this.filteredRecords = this.tableData; // Reset to original data if no results found
          this.swal.error('Error', res.message);
        }
      },
        (error) => {
          this.appComponent.hideLoading();
          this.filteredRecords = this.tableData; // Reset to original data if error occurs
          this.swal.error('Error', error.message);
        }   
      );
      return;
    } 
    
  }
 
  mlsReset() {
    let reqObj = {
      EquipmentType: 'MLS',
      Type: 'Whole'
    }
    this.apiservice.resetAlarm(reqObj).subscribe((res: any) => {
      if (res.status === 1) {
        this.appComponent.hideLoading();
        this.swal.success_ok('Success', res.message, true);
      }
      else if (res.status == 0) {
        this.appComponent.hideLoading();
        this.swal.error('Error', res.message);
      }
    },
      (error) => {
        this.appComponent.hideLoading();
        this.swal.error('Error', error.message);
      }
    );
  }
 
  conveyorReset() {
    if(environment.selectedEquipmentType == 'Conveyor')
    {
        let reqObj = {
            EquipmentType: 'Conveyor',
            ConvEquipmentNo: environment.selectedEquipment === 'All' ? 0 : parseInt(environment.selectedEquipment) ?? 0,
            Type: 'Whole'
          }
          this.apiservice.resetAlarm(reqObj).subscribe((res: any) => {
            if (res.status === 1) {
              this.appComponent.hideLoading();
              this.swal.success_ok('Success', res.message, true);
            }
            else if (res.status == 0) {
              this.appComponent.hideLoading();
              this.swal.error('Error', res.message);
            }
          },
            (error) => {
              this.appComponent.hideLoading();
              this.swal.error('Error', error.message);
            }
          );
    }
    else
    {
        this.swal.error('Error', 'Please Select Equipment Type Conveyor');
    }
  }
 
  liftReset() {
    let reqObj = {
      EquipmentType: 'Lift',
      Type: 'Whole_Reset'
    }
    this.apiservice.resetAlarm(reqObj).subscribe((res: any) => {
      if (res.status === 1) {
        this.appComponent.hideLoading();
        this.swal.success_ok('Success', res.message, true);
      }
      else if (res.status == 0) {
        this.appComponent.hideLoading();
        this.swal.error('Error', res.message);
      }
    },
      (error) => {
        this.appComponent.hideLoading();
        this.swal.error('Error', error.message);
      }
    );
  }
 
  // new sorting code
 
 
 
 
  // sorting code
}
