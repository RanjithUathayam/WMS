import { Component, ElementRef, Renderer2, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../service/api.service';
import Swal from 'sweetalert2';
import { SwalService } from '../service/swal.service';
import { AppComponent } from '../app.component';
import { Options } from 'select2';
import { Select2OptionData } from 'ng-select2';

@Component({
  selector: 'app-prebinning-approval',
  templateUrl: './prebinning-approval.component.html',
  styleUrls: ['./prebinning-approval.component.css']
})
export class PrebinningApprovalComponent implements OnInit {
  filteredArray: any[] = []; // Array to hold filtered data
  p: number = 1;
  selectedItems: any[] = [];
  itemsPerPage: any = 15;
  storeQueueDetails: any = [];
  @ViewChild('tableBody') tableBody: ElementRef;
  storeProcessingDetails: any = [];
  getprebinning: any[] = [];
  filteredData: any[] = [];
  filterHeader: any[] = [
    { data: 'GRNNo', search: true },
    { data: 'GRNType', search: true },
    { data: 'ItemCode', search: true },
    { data: 'BinID', search: true },
  ];

  public remarksData: Array<Select2OptionData>;
  public options: Options = {
    theme: 'classic',
    width: '330',
  }
  lastUpdatedDateTime: any = new Date().toLocaleString();
  filters: { [key: string]: string } = {};
  debounceTimer: any;

  constructor(private apiservice: ApiService, private swal: SwalService, private appComponent: AppComponent) { }

  ngOnInit(): void {
    this.calculateItemsPerPageOnResize();
    this.getprebinningdata();
  }

  calculateItemsPerPage(): number {
    const tableElement = this.tableBody.nativeElement;
    const tableRowHeight = 45; // Adjust as per your table row height
    const availableHeight = tableElement.clientHeight;
    return Math.floor(availableHeight / tableRowHeight);
  }

  calculateItemsPerPageOnResize() {
    window.addEventListener('resize', () => {
      this.itemsPerPage = this.calculateItemsPerPage();
    });
  }

  activeInactive(id: number, status: string): void {
    // Logic to activate or deactivate the record
    const item = this.filteredArray.find(item => item.sno === id);
    if (item) {
      item.Status = status === 'Active' ? 'Inactive' : 'Active';
    }
  }

  selectItem(item: any): void {
    // Check if the item is already selected
    const index = this.selectedItems.findIndex(selectedItem => selectedItem.sno === item.sno);
    if (index === -1) {
      // If not selected, add it to the selectedItems array
      this.selectedItems.push(item);
    } else {
      // If already selected, remove it from the selectedItems array
      this.selectedItems.splice(index, 1);
    }
  }

  newSelectedArray: any = [];
  flag: boolean = false;

  onCheckboxChange(item: any) {
    if (item.selected) {
      this.flag = true;
      this.newSelectedArray.push(item);
    } else {
      const index = this.newSelectedArray.indexOf(item);
      if (index > -1) {
        this.newSelectedArray.splice(index, 1);
      }
    }
  }


  applyFilters() {
    // this.filteredData = []; 
    // this.filteredData = this.getprebinning.filter(record => {
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
        this.getprebinningdata()
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
  
  this.filteredData = this.sortArrayByKey(this.filteredData, key, type);
  
  if (!this.isAscending) {
    this.filteredData.reverse();
  }
 
}

onSort(key: string, type: string): void {
    this.sortData(key, type)
}


// new sorting code

  getprebinningdata() {
    this.lastUpdatedDateTime = new Date().toLocaleString();
    const filterValue = Object.keys(this.filters).filter(key => {
        const value = this.filters[key];
        return value != null && value !== undefined && value.trim() !== '';
    })
   
    let ReqObj = {
        GRNNo: filterValue.includes('GRNNo') ? this.filters['GRNNo'] : '',
        ItemCode: filterValue.includes('ItemCode') ? this.filters['ItemCode'] : '',
        BinID: filterValue.includes('BinID') ? this.filters['BinID'] : ''
    };

    this.appComponent.showLoading('Prebinning Data Loading...');
    this.apiservice.getdataforprebinning(ReqObj).subscribe((res: any) => {
        if (res.status === 1) { // Adjusted status check to integer
            if (Array.isArray(res.data)) 
            {
                this.remarksData = res.remarks.map(item => ({
                    id: item.ReasonID,
                    text: item.ReasonDescription
                }));
                this.getprebinning = res.data.map((item, index) => ({
                    ...item,
                    BinID: item.BinID.join(',')
                }));
            } 
            else 
            {
                console.error('Expected an array but got:', typeof res.data); 
            }

            this.filteredData = this.getprebinning;
            
            this.appComponent.hideLoading();  
        } 
        else if (res.status === 0) {
          this.appComponent.hideLoading();
          this.swal.error('Error', res.message);
        }
      },
      (error) => {
        this.appComponent.hideLoading();
      }
    );
  }


  approveprebinningdata(sendStatus: string) {
    // Constructing the request body from the getprebinning data
    if (this.flag) {
      const data = this.newSelectedArray.map(item => ({
        ItemCode: item.ItemCode,
        GRNNo: item.GRNNo,
        status: sendStatus,
        remark: item.remark
      }));

      Swal.fire({
        title: `Are you sure to ${sendStatus}?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes"
      }).then((result) => {
        if (result.isConfirmed) {
          // Sending the constructed request body to the API
          this.appComponent.showLoading("Approving Prebinning...");
          this.apiservice.approveprebinning({ data }).subscribe(
            (res: any) => {     
                this.newSelectedArray = []  
                this.flag = false;         
                this.appComponent.hideLoading();
                if(res.status == 1) 
                {
                    Swal.fire({
                        title: 'Success',
                        text: 'Prebinning Approved Successfully',
                        icon: 'success',
                        showConfirmButton: false,
                        timer: 1000,
                        timerProgressBar: true,
                    })
                    this.getprebinningdata();                 
                }
                else
                {
                    this.swal.error('Error', res.message);
                    
                }
            },
            (error) => {
              this.appComponent.hideLoading();
              this.swal.error('Error', error.message);
            }
          );
        }
      });
    }
    else {
      Swal.fire({
        title: "Warning !",
        text: "Please Select Atleast a Item !",
        icon: "info"
      });
    }
  }

    movetoPreBinning()
    {
        if(this.newSelectedArray.length > 0)
        {
            this.appComponent.showLoading("Moving to Prebinning...");
            this.apiservice.movetoPreBinning(this.newSelectedArray[0]).subscribe(
                (res: any) => {  
                    this.newSelectedArray = []         
                    this.flag = false;       
                    this.appComponent.hideLoading();
                    if(res.status == 1) 
                    {
                        this.getprebinningdata();                    
                    }
                    else
                    {
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
            Swal.fire({
                title: "Warning !",
                text: "Please Select Atleast a Item !",
                icon: "info"
            });
        }
    }

    selectRemarks(ev: any, data: any, idx: number) {
        const result = this.remarksData.find(item => item.id == ev);
        this.getprebinning[idx].remark = result.id;
        // if (ev) {
        //   item.ReasonID = ev.id;
        //   item.ReasonDescription = ev.text;
        // }
    }

}
