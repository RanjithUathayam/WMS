import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DataService } from '../service/data.service';
import { ApiService } from '../service/api.service';
import { SwalService } from '../service/swal.service';
import { count } from 'rxjs';
import { AppComponent } from '../app.component';

interface PrebinningItem {
  GRNType: string;
  GRNNo: string;
  ItemCode: string;
  ItemName: string;
  ItemGroup: string;
  BinID: string;
  reqQty?: number;
  binnedQty?: number;
  ItemStatus: string;
  selected?: boolean;
}

@Component({
  selector: 'app-prebinning-status',
  templateUrl: './prebinning-status.component.html',
  styleUrls: ['./prebinning-status.component.css']
})
export class PrebinningStatusComponent implements OnInit {

  @ViewChild('scrollableDiv') scrollableDiv!: ElementRef;
  requestbody: { EquipmentNo: any; };
  itemsPerPage = 12;
  getprebinning: PrebinningItem[] = [];
  grndetails: any;
  filters: { [key: string]: string } = {};
  filteredArray: any = [];
  filterHeader: any = [{ data: 'GRNNo', search: true }, { data: 'GRNType', search: true }, { data: 'ItemCode', search: true }, { data: 'BinID', search: true }];
  itemList: any;
  lastUpdatedDateTime: any = new Date().toLocaleString()
  debounceTimer: any;

  constructor(private dataService: DataService, private apiservice: ApiService, private swal: SwalService, private appComponent: AppComponent) {

  }


  p = 1; // Current page, initialize to the first page


  onCheckboxChange(item: PrebinningItem) { 
    // Additional logic to handle checkbox change can be added here
  }

  ngOnInit(): void {
    this.dataService.getData().subscribe((data: any) => {
      this.dataService.currentData.subscribe(data => this.getprebinning = data);

      this.prebinningdata();

    });

  }


  applyFilters() {
    // this.filteredArray = [];
    // this.filteredArray = this.grndetails.filter(record => {
    //   return Object.keys(this.filters).every(key => {
    //     if (this.filters[key] === null || this.filters[key] === undefined || this.filters[key] === '') {
    //       return true; // Don't apply filter if it's empty
    //     }
    //     const filterValue = String(this.filters[key]).toLowerCase(); 
    //     const recordValue = String(record[key]).toLowerCase();
        
    //     if (this.filterHeader.find(header => header.data === key)?.search) {
    //       return recordValue.includes(filterValue);
    //     } else {
    //       // If the column is not searchable, just return true to include the record
    //       return true;
    //     }
    //   });

    // }); 
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
        this.prebinningdata()
    },500) 
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
  
  this.filteredArray = this.sortArrayByKey(this.filteredArray, key, type);
  
  if (!this.isAscending) {
    this.filteredArray.reverse();
  }
 
}

onSort(key: string, type: string): void {
  this.sortData(key, type);
}

// new sorting code
  prebinningdata() {
    this.lastUpdatedDateTime = new Date().toLocaleString();
    this.appComponent.showLoading('Data Loading...');
    let requestBody:any = { GRNNo: "All" }

    const filterValue = Object.keys(this.filters).filter(key => {
        const value = this.filters[key];
        return value != null && value !== undefined && value.trim() !== '';
    })
   
    requestBody.FilterGRNNo = filterValue.includes('GRNNo') ? this.filters['GRNNo'] : '';
    requestBody.ItemCode = filterValue.includes('ItemCode') ? this.filters['ItemCode'] : '';
    requestBody.BinID = filterValue.includes('BinID') ? this.filters['BinID'] : '';

    this.appComponent.showLoading('Data Loading...');
    this.apiservice.getgrndetails(requestBody).subscribe(
        (response: any) => {
        if(response.status === 1) {
            this.appComponent.hideLoading();
            this.grndetails = response.data; 
            this.filteredArray = this.grndetails;
        }
        else if(response.status === 0) {
            this.appComponent.hideLoading();
            this.swal.error('Error', response.message);
        }
        },
        (error: any) => {
        this.appComponent.hideLoading(); 
        }
    );
  }



}
