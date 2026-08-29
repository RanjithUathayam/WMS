import { Component, OnInit, AfterViewInit, inject, TemplateRef, ElementRef, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SwalService } from '../service/swal.service';
import { ApiService } from '../service/api.service';
import { ModalDismissReasons, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ExportModalComponent } from '../components/export-modal/export-modal.component';
import { ExcelExportService } from '../service/excel-export.service';
import { PdfExportService } from '../service/pdf-export.service';
import { CsvExportService } from '../service/csv-export.service';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { environment } from 'src/environments/environment';
import { Options } from 'select2';
import { Select2OptionData } from 'ng-select2';
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-item',
  templateUrl: './item.component.html',
  styleUrls: ['./item.component.css']
})
export class ItemComponent implements OnInit, AfterViewInit {
  itemsPerPage: any = 14;
  submitted: boolean = false;
  itemId: any = '';
  itemList: any = [];
  itemForm !: FormGroup;
  totalCount: any = '';
  itemGroupData: Select2OptionData[] | any = [];
  uomData: Select2OptionData[] | any = [];
  groupKeyword = 'PartGrp';
  uomKeyword = 'UOM';
  tableHeader: any = [];
  exportTitle: any = 'Item-list';
  filterHeader: any = []
  filteredArray: any = [];
  searchItemCode: any = '';
  searchItemName: any = '';
  searchItemGroup: any = '';
  closeResult: string;
  selectedItemGroup: any = '';
  @ViewChild('fileInput') fileInput: ElementRef;
  excelDataOriginal: any[] = [];
  excelDataArray: any[] = [];
  initialTotalDataCount: number = 0;
  @ViewChild('myModal', { static: false }) modal: ElementRef;
  p: number = 1;
  filters: { [key: string]: string } = {};
  baseURL = environment.baseURL;
  @ViewChild('tableBody') tableBody: any;
  btnRights: any = {};
  @ViewChild('fabGroup') fabGroup: ElementRef;
  @ViewChild('mainBtn') mainBtn: ElementRef;
  flagset: boolean = false;
  public options: Options = {
    theme: 'classic',
    width: '330',
  }
  flagset1: boolean = false;

  activatedPage: string;
  debounceTimer: any;
  constructor(private formbuilder: FormBuilder, private modalService: NgbModal, private excelExportService: ExcelExportService,
    private apiservice: ApiService, private csvExportService: CsvExportService, private router: Router, private swal: SwalService,
    private pdfExportService: PdfExportService, private appComponent: AppComponent) {


  }
  ngOnInit(): void { 
    // (document.body.style as any).zoom = "60%";
    // this.itemId = '';
    // this.itemForm = this.formbuilder.group({
    //   item_code: ['', Validators.required],
    //   item_name: ['', Validators.required],
    //   item_group: ['', Validators.required],
    //   storage_area: [{ value: 'ASRS', disabled: true }],
    //   item_weight: [''],
    //   uom: ['', Validators.required],
    //   item_category: [''],
    //   pack_size: ['', Validators.required],
    // })


    this.itemForm = this.formbuilder.group({
      item_code: ['', Validators.required],
      item_name: ['', Validators.required],
      item_group: ['', Validators.required],
      category: ['', Validators.required],
      description: ['', Validators.required],
      color: ['', Validators.required],
      size: ['', Validators.required],
      style: ['', Validators.required],
      bin_capacity: ['', Validators.required]
    });

    // setTimeout(() => {
      this.get_ItemLlist();
    // }, 500)
    // this.calculateItemsPerPageOnResize()
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
    

  }
  // export(data: any) {
  //   window.open(this.baseURL + 'master/MasterPart' + '?exportFormat=' + data, '_blank');
  // }
  // open() {
  //   // const modalRef = this.modalService.open(NgbModal);
  //   // modalRef.componentInstance.name = 'World';

  //   this.modalService.dismissAll();
  //   this.modalService
  //     .open(ExportModalComponent, { ariaLabelledBy: 'modal-basic-title', size: 'sm', centered: true })
  //     .result.then(
  //       (result) => {
  //         this.closeResult = `Closed with: ${result}`;
  //         window.open(this.baseURL + 'masterPartLoad' + '&exportFormat=' + result, '_blank');
  //         // if (result == 'excel') {
  //         //   this.excelExportService.exportToExcel(this.filteredArray, 'Item-Master-List');
  //         // } else if (result == 'pdf') {
  //         //   this.pdfExportService.exportToPdf(this.filteredArray, 'Item-Master-List');
  //         // } else {
  //         //   this.csvExportService.exportToCsv(this.filteredArray, 'Item-Master-List');
  //         // }
  //       },
  //       (reason) => {
  //         this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
  //       }
  //     );
  // }

  close() {
    const modal = document.getElementById('myModal');
    modal.style.display = 'none';
  }
  getColumnWidth(header: string): string {
    // Adjust the width calculation as needed
    return `${Math.max(100, header.length * 10)}px`;
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
  ngAfterViewInit(): void {
    this.setupEventListeners();
    if (this.tableBody) {
      const tableBodyHeight = this.tableBody.nativeElement.offsetHeight; 
    }
    if(this.mainBtn){
      this.mainBtn.nativeElement.addEventListener('click', () => {
        this.fabGroup.nativeElement.classList.toggle('active');
      });
    }
    // this.mainBtn.nativeElement.addEventListener('click', () => {
    //   this.fabGroup.nativeElement.classList.toggle('active');
    // });

  }


  calculateItemsPerPage(): number {
    const tableElement = this.tableBody.nativeElement;
    const tableRowHeight = 45; // Adjust as per your table row height
    const availableHeight = tableElement.clientHeight;
    return Math.floor(availableHeight / tableRowHeight);
  }


  calculateItemsPerPageOnResize() {
    this.itemsPerPage = this.calculateItemsPerPage();
    window.addEventListener('resize', () => {
      this.itemsPerPage = this.calculateItemsPerPage();
    });

  }

  private setupEventListeners(): void {
    const arrows = document.querySelectorAll<HTMLElement>('.arrow');

    arrows.forEach((arrow) => {
      arrow.addEventListener('click', (e) => {
        const arrowParent = (e.target as HTMLElement).parentElement?.parentElement; // selecting main parent of arrow
        if (arrowParent) {
          arrowParent.classList.toggle('showMenu');
        }
      });
    });

    const sidebar = document.querySelector<HTMLElement>('.sidebar');
    const sidebarBtn = document.querySelector<HTMLElement>('.open-modal');
 

    if (sidebarBtn) {
      sidebarBtn.addEventListener('click', () => {
        if (sidebar) {
          sidebar.classList.toggle('close');
        }
      });
    }
  }

  activeInactive(id: any, status: any) {
    let msg = '';
    let confirm = '';
    let newStatus: number;

    if (status == 1) {
      msg = 'Are you sure you want to Deactivate it?';
      confirm = 'Yes, Deactivate it!';
      // newStatus = 0; // Deactivate
    } else {
      msg = 'Are you sure you want to Activate it?';
      confirm = 'Yes, Activate it!';
      // newStatus = 1; // Activate
    }

    Swal.fire({
      title: msg,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: confirm
    }).then((result) => {
      if (result.isConfirmed) {
        let obj: any = {
          id: id,
          isDelete: status // Update status
        };
        this.appComponent.showLoading('Item Data Loading...');
        this.apiservice.updateItemMasterStatus(obj, 'master/MasterPart/' + id).subscribe((res: any) => {
          if (res.status == 1) {
            this.appComponent.hideLoading();
            this.filteredArray = res.data.items;
            this.itemList = res.data.items;
            let currentPage = 1;
            let start: any = (currentPage * 10) - this.itemsPerPage;
            if (this.filteredArray) {
              this.filteredArray.forEach((element: any) => {
                element.sno = start;
                start++;
              });
            }
            let successMsg = status ? 'Deactivated' : 'Activated';
            this.swal.success_ok('Success', `Item ${successMsg} successfully`, true);
          } else {
            this.appComponent.hideLoading();
            this.swal.error('Error', res.message);
          }
        }, (err => {
          this.appComponent.hideLoading();
          this.swal.error('Error', err.message);
        }));
      }
      else {
        const checkbox = document.getElementById('cbx' + id) as HTMLInputElement;
        checkbox.checked = !checkbox.checked;
      }
    });
  }

  open(data: any) {
    if (data.Status == 1) {
      this.openSidebar(data);
    } else {
      this.swal.error('Error', 'Selected Item is Inactivated');
    }
  }



  // openSidebar(data: any) {
  //   this.flagset1 = true
  //   this.submitted = false;
  //   if (data == '') {
  //     this.itemId = '';
  //     this.itemForm.reset();
  //   } else {
  //     this.itemId = data.id;
  //     this.itemForm.controls['item_code'].setValue(data.ItemCode);
  //     this.itemForm.controls['item_name'].setValue(data.ItemName);
  //     this.itemForm.controls['item_group'].setValue(data.ItemGroup);
  //     this.itemForm.controls['Category'].setValue(data.Category);
  //     this.itemForm.controls['Description'].setValue(data.Description);
  //     this.itemForm.controls['Color'].setValue(data.Color);
  //     this.itemForm.controls['Size'].setValue(data.Size);
  //     this.itemForm.controls['Style'].setValue(data.Style);
  //     this.itemForm.controls['BinCapacity'].setValue(data.BinCapacity);
  //   }
  //   const sidebar = document.querySelector<HTMLElement>('.sidebar');
  //   sidebar?.classList.toggle('close');
  //   this.get_ItemGrouplist();
  //   this.get_uomList();
  // }

  openSidebar(data: any) {
    this.flagset1 = true;
    this.submitted = false;
    if (!data) {
      this.itemId = '';
      this.itemForm.reset();
    } else {
      this.itemId = data.id;
      this.itemForm.patchValue({
        item_code: data.ItemCode,
        item_name: data.ItemName,
        item_group: data.ItemGroup,
        category: data.Category,
        description: data.Description,
        color: data.Color,
        size: data.Size,
        style: data.Style,
        bin_capacity: data.BinCapacity
      });
    }
    const sidebar = document.querySelector<HTMLElement>('.sidebar');
    sidebar?.classList.toggle('close');
  }


  get f(): { [key: string]: AbstractControl } {
    return this.itemForm.controls;
  }
  closeModal() {
    const sidebar = document.querySelector<HTMLElement>('.sidebar');
    this.flagset1 = false
    sidebar.classList.toggle('close');
  }
  get_ItemLlist() {

    this.filteredArray = [];
    this.itemList = [];
    const filterValue = Object.keys(this.filters).filter(key => {
        const value = this.filters[key];
        return value != null && value !== undefined && value.trim() !== '';
    })
   
    let ReqObj = {
        ItemCode: filterValue.includes('ItemCode') ? this.filters['ItemCode'] : '',
        ItemName: filterValue.includes('ItemName') ? this.filters['ItemName'] : '',
        ItemGroup: filterValue.includes('ItemGroup') ? this.filters['ItemGroup'] : ''
    };
    this.appComponent.showLoading("Item Master is Loading")
    this.apiservice.getitemMasterData('master/MasterPart', ReqObj).subscribe((res: any) => {
      if (res.status == 1) { 
        this.filterHeader = JSON.parse(res.headers);
        this.filteredArray = res.data;
        this.itemList = res.data;
        this.totalCount = res.totalCount;
        
        let currentPage = 1;
        let start: any = (currentPage * 10) - this.itemsPerPage; 
        if (this.filteredArray) {
          this.filteredArray.forEach((element: any) => {
            element.sno = start;
            start++;
          })
        }
        
        this.calculateItemsPerPageOnResize();
        this.appComponent.hideLoading()
      }
      else if(res.status == 0){
        this.appComponent.hideLoading()
        this.swal.error('Error', res.message);
      }
    }, (err: any) => {
      this.appComponent.hideLoading()
      this.swal.error('Error', err.message);
    })

  }

  renderPage(event: number) {
    // this.pagination = event;
    this.get_ItemLlist();
  }

  falseSet1() {
    this.closeModal()
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
    } else if (type == 'Integer') {
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

  get_uomList() {
    this.uomData = [];
    this.appComponent.showLoading('UOM Data Loading...');
    this.apiservice.getUOMData().subscribe((res: any) => {
      if (res.status == 1) {
        // this.uomData = res.data;
        this.appComponent.hideLoading()
        this.uomData = res.data.map((element: any) => ({
          id: element.UOM,
          text: element.UOM
        }));
      }
      else{
        this.appComponent.hideLoading()
        this.swal.error('Error', res.message);
      }
    }, (err: any) => {
      this.appComponent.hideLoading()
      this.swal.error('Error', err.message);
    })
  }

  call(index: any) { 
    return index;
  }

  submit() {
    this.submitted = true;
    this.flagset1 = false
    if (this.itemForm.valid) {
      const formValue = this.itemForm.value;
      let obj: any = {
        "ItemCode": formValue.item_code,
        "ItemName": formValue.item_name,
        "ItemGroup": formValue.item_group,
        "Category": formValue.category,
        "Description": formValue.description,
        "Color": formValue.color,
        "Size": formValue.size,
        "Style": formValue.style,
        "BinCapacity": formValue.bin_capacity,
        "UserName": "testing",
        "isDelete": 0
      };

      if (this.itemId === '') {
        this.apiservice.createitemMasterData(obj).subscribe((res: any) => {
          this.get_ItemLlist()
          this.handleResponse(res);
        }, (err: any) => {
          this.handleError(err);
        });
      } 
      else {
        obj.id = this.itemId;
        this.apiservice.updateitemMasterData(obj).subscribe((res: any) => {
          this.get_ItemLlist()
          this.handleResponse(res);
        }, (err: any) => {
          this.appComponent.hideLoading();
          this.handleError(err);
        });
      }
    } else {
      return;
    }
  }

  handleResponse(res: any) {
    if (res.status == 1) 
      {
      this.swal.success_ok('Success', res.message, true);
      this.itemForm.reset();
      this.itemId = '';
      this.closeModal();
      this.filteredArray = res?.data?.items;
      this.itemList = res?.data?.items;
      let currentPage = 1;
      let start: any = (currentPage * 10) - this.itemsPerPage;
      if (this.filteredArray) {
        this.filteredArray.forEach((element: any) => {
          element.sno = start;
          start++;
        });
      }
    } else {
      this.swal.error('Error', res.message);
    }
  }

  handleError(err: any) {
    this.swal.error('Error', err.message);
  }

  selectGroup(ev: any) {
    this.selectedItemGroup = ev.PartGrp;
  }
  filterByPattern(key) {
    let pattern = '';
    if (key == 'PartNo') {
      pattern = this.searchItemCode;
    } else if (key == 'PartName') {
      pattern = this.searchItemName;
    } else {
      pattern = this.searchItemGroup;
    }

    let list = this.itemList;
    if (this.searchItemGroup != "") {
      list = list.filter(item => item.PartGroup == this.searchItemGroup);
    }

    if (this.searchItemName != "") {
      list = list.filter(items => items.PartName == this.searchItemName);
    }
    if (this.searchItemCode != "") {
      list = list.filter(items => items.PartNo == this.searchItemCode);
    }
 
    this.filteredArray = [];
    // const regex = new RegExp(pattern, 'i'); // 'i' for case-insensitive matching
    // this.filteredArray = list.filter(item => regex.test(item[key]));
    const regex = new RegExp(pattern, 'i'); // 'i' for case-insensitive matching
    this.filteredArray = list;
  }
  importExcel(): void {
    this.fileInput.nativeElement.click();
  }
  onFileChange(event: any) {
    const file = event.target.files[0];

    if (file) {
      this.readExcel(file);
    }
  }
  readExcel(file: File) {
    const reader: FileReader = new FileReader();

    reader.onload = (e: any) => {
      const data: string = e.target.result;
      const workbook: XLSX.WorkBook = XLSX.read(data, { type: 'binary' });

      const sheetName = workbook.SheetNames[0];
      const worksheet: XLSX.WorkSheet = workbook.Sheets[sheetName];
      const excelData = XLSX.utils.sheet_to_json(worksheet);

      this.excelDataOriginal = excelData;
      this.excelDataArray = this.excelDataOriginal;

      // Set the initial total count
      this.initialTotalDataCount = this.excelDataArray.length; 

      const modal = document.getElementById('myModal');
      modal.style.display = 'block';
    };

    reader.readAsBinaryString(file);

  }
  exportexcel(): void {
    /* pass here the table id */
    let element = document.getElementById('exportdata');
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(element);

    /* generate workbook and add the worksheet */
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    /* save to file */
    XLSX.writeFile(wb, 'mandatory.xlsx');
    this.excelDataArray = [];
  }
  applyFilters() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
        this.get_ItemLlist()
    },500) 
  }
  sendToServer(): void {
    
    const rowsWithMandatoryData = this.excelDataOriginal.filter(dataRow =>
      dataRow['PalletId'] && dataRow['PartName'] && dataRow['PackSize'] && dataRow['InQuantity'] && dataRow['PalletRejectionFlag']
    );
 

    const requestBody = rowsWithMandatoryData.map(dataRow => {
      return {
        "PalletId": dataRow['PalletId'],
        "PartName": dataRow['PartName'],
        "PartNo": dataRow['PartGroup'],
        "PartGroup": dataRow['PartCategory'],
        "PartCategory": dataRow['BatchNo'],
        "BatchNo": dataRow['PackSize'],
        "PackSize": dataRow['InQuantity'],
        "InQuantity": dataRow['GrossWeight'],
        "PalletRejectionFlag": dataRow['PalletRejectionFlag'],
        "PalletHeight": dataRow['PalletHeight'],
      };
    });

    // this.http.post('http://172.16.8.154:3300/api/operationRouter/storageExcelUpload', requestBody)
    //   .subscribe(response => { 

    //     const nullValuesArray = this.excelDataArray.filter(item => !item.PalletId || !item.PartName || !item.PackSize || !item.InQuantity || !item.PalletRejectionFlag);

    //     this.excelDataArray = nullValuesArray;
    //     this.excelDataOriginal = rowsWithMandatoryData; 

    //     this.remainingData = this.excelDataOriginal.filter(dataRow =>
    //       !dataRow['PalletRejectionFlag']
    //     );
 
    //     this.totalDataCount = this.excelDataArray.length;
    //     this.submittedFieldsCount = this.excelDataOriginal.length;
    //     this.exportButtonEnabled = true;
    //   });
  }
  falseSet() {
    // this.fabGroup.nativeElement.classList.remove('active');
    this.dropdownOpen = false
    this.flagset = false
    this.flagset1 = false
  }

  exportFile() {
    this.flagset = !this.flagset 
  }

  export(data: any) {
    window.open(this.baseURL + 'masterExport/MasterPart/' + data, '_blank');
  }

  formatDateTime(dateTimeString: string): string {
    const dateTime = new Date(dateTimeString);
    const formattedDate = `${dateTime.getDate().toString().padStart(2, '0')}-${(dateTime.getMonth() + 1).toString().padStart(2, '0')}-${dateTime.getFullYear()}`;
    const formattedTime = `${dateTime.getHours().toString().padStart(2, '0')}:${dateTime.getMinutes().toString().padStart(2, '0')}`;
    return `${formattedDate} & ${formattedTime}`;
  }

  dropdownOpen = false;

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen; 

  }
}
