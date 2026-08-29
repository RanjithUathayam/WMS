import { Component, OnInit, ViewChild, ElementRef, HostListener, Renderer2 } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { ApiService } from '../service/api.service';
import { DataService } from '../service/data.service';
import Swal from 'sweetalert2';
import { AppComponent } from '../app.component';
import { AuthService } from '../auth.service';
import { SwalService } from '../service/swal.service';
import { environment } from 'src/environments/environment';

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
  selector: 'app-mainpage',
  templateUrl: './mainpage.component.html',
  styleUrls: ['./mainpage.component.css']
})
export class MainpageComponent implements OnInit {
  isOperationsTabActive: boolean = false;
  isEquipmentTabActive: boolean = false;
  isReportsTabActive: boolean = false;
  isStatusTabActive: boolean = false;
  showMegaMenu: boolean = false;
  currentDate: string;
  currentTime: string;
  selectedTab: string = 'Masters';
  activeTab: string;
  mySelectedTab: string | null = null;
  showTabs: boolean = false;
  craneStatus: any = {};
  progress_data: number = 0
  progressValue: number = 0;
  aisleOptions: string[] = ['Aisle 1', 'Aisle 2', 'Aisle 3', 'Aisle 3'];
  selectedAisle: string = 'Aisle 1';
  numberOfRows: number = 25; // Define the number of rows
  numberOfColumns: number = 45; // Define the number of columns
  rowData: number[][] = []; // Array to hold data for each cell (declare as number[][])
  palletList: number[] = []; // Updated to hold numbers
  showDropdown = true;
  selectedSide: string = 'Side 1';
  selectedLocation: string = 'All';
  imagePath: string;
  showFilters: boolean = false;
  showSelectLocationFilter: boolean = false;
  transactionFilter: boolean = false;
  historyFilter: boolean = false;
  counterArray: number[];
  @ViewChild('myModal2') modal: any;
  menuRights: any = {};
  userData: any = {};
  lengthOfBay: number = 0;
  lengthOfLevel: number = 0;
  loggedUname: string = '';
  showFilters2: boolean = false;
  mobileSidebarOpen = false;
  sidebarCollapsed = false;

  tagEmergency: string = '';
  vesrion: string = environment.appVesrion;
  // menuRights = {
  //   operation_module: true,
  //   operation_store_list: true,
  //   operation_storedetails_list: true,
  //   operation_retrive_list: true,
  //   operation_schedule_list: true,
  //   operation_relocation_list: true
  // };


  // menuList: any = [
  //   { "name": 'Masters', "pattern": "master_", "status": false, "icon": "fa fa-database mr-2", "changeTab": 'Masters', "selectTab": 'item', "routerLink": '/mainpage/item' },
  //   { "name": 'Transactions', "pattern": "transaction_", "status": false, "icon": "fa fa-exchange mr-2", "changeTab": 'Transactions', "selectTab": 'transaction', "routerLink": '/mainpage/itemtransaction_list' },
  //   { "name": 'Inventory', "pattern": "inventory_", "status": false, "icon": "fa fa-list-check mr-2", "changeTab": 'Inventory', "selectTab": 'Inventory', "routerLink": '/mainpage/inventory_list/Inventory' },
  //   { "name": 'History', "pattern": "history_", "status": false, "icon": "fa fa-sticky-note mr-2", "changeTab": 'History', "selectTab": 'Storage', "routerLink": '/mainpage/storage_retrieval_history' },
  //   { "name": 'Operations', "pattern": "operation_", "status": false, "icon": "fa fa-cogs mr-2", "changeTab": 'Operations', "selectTab": 'Pallets', "routerLink": '/mainpage/pallet_storage' },
  //   { "name": 'Status', "pattern": "status_", "status": false, "icon": "fa fa-ticket fa-rotate-90 mr-2", "changeTab": 'Status', "selectTab": 'Location', "routerLink": '/mainpage/location_status' },
  //   { "name": 'Reports', "pattern": "reports_", "status": false, "icon": "fa fa-outdent fa-rotate-180 mr-2", "changeTab": '', "selectTab": '', "routerLink": '' }];

  // masterSubmenu: any = [
  //   { "name": 'Item Master', "pattern": "master_item_list", "status": false, "icon": "fa fa-table mr-1", "selectTab": 'item', "routerLink": '/mainpage/item' },
  //   { "name": 'Item Group', "pattern": "master_itemgroup_list", "status": false, "icon": "fa-solid fa-folder-open mr-1", "selectTab": 'masterpartgroup', "routerLink": '/mainpage/master/masterpartgroup' },
  //   { "name": 'uom', "pattern": "master_uom_list", "status": false, "icon": "fa fa-list-check mr-2", "selectTab": 'uom', "routerLink": 'fa fa-balance-scale mr-1' },
  //   { "name": 'Pallet', "pattern": "master_pallet_list", "status": false, "icon": "fa fa-cart-plus mr-1", "selectTab": 'masterpallet', "routerLink": '/mainpage/master/masterpallet' }];

  // transactionSubmenu: any = [
  //   { "name": 'Item Transaction', "pattern": "transaction_item_list", "status": false, "icon": "fa fa-table mr-1", "selectTab": 'item', "routerLink": '/mainpage/item' },
  //   { "name": 'Pallet Request', "pattern": "transaction_palletrequest_list", "status": false, "icon": "fa-solid fa-folder-open mr-1", "selectTab": 'masterpartgroup', "routerLink": '/mainpage/master/masterpartgroup' },
  //   { "name": 'Stock Adjustment', "pattern": "transaction_stockadjustment_list", "status": false, "icon": "fa fa-list-check mr-2", "selectTab": 'uom', "routerLink": 'fa fa-balance-scale mr-1' }];

  // inventorySubmenu: any = [
  //   { "name": 'Inventory List', "pattern": "inventory_item_list", "status": false, "icon": "fa fa-table mr-1", "selectTab": 'item', "routerLink": '/mainpage/item' },
  //   { "name": 'Inventory Item Summary', "pattern": "inventory_itemsummary_list", "status": false, "icon": "fa-solid fa-folder-open mr-1", "selectTab": 'masterpartgroup', "routerLink": '/mainpage/master/masterpartgroup' }];

  // historySubmenu: any = [ 
  //   { "name": 'Storage / Retrieval History', "pattern": "history_storageretrival_list", "status": false, "icon": "fa fa-table mr-1", "selectTab": 'item', "routerLink": '/mainpage/item' },
  //   { "name": 'Alarm History', "pattern": "history_alarm_list", "status": false, "icon": "fa-solid fa-folder-open mr-1", "selectTab": 'masterpartgroup', "routerLink": '/mainpage/master/masterpartgroup' },
  //   { "name": 'Rejected Pallet History', "pattern": "history_rejectedpallet_list", "status": false, "icon": "fa fa-list-check mr-2", "selectTab": 'uom', "routerLink": 'fa fa-balance-scale mr-1' },
  //   { "name": 'Maintenance History', "pattern": "history_maintenance_list", "status": false, "icon": "fa fa-list-check mr-2", "selectTab": 'uom', "routerLink": 'fa fa-balance-scale mr-1' },
  //   { "name": 'Expiry Alert', "pattern": "history_expiryalert_list", "status": false, "icon": "fa fa-list-check mr-2", "selectTab": 'uom', "routerLink": 'fa fa-balance-scale mr-1' },
  //   { "name": 'User Log', "pattern": "history_userlog_list", "status": false, "icon": "fa fa-cart-plus mr-1", "selectTab": 'masterpallet', "routerLink": '/mainpage/master/masterpallet' }];

  // operationSubmenu: any = [
  //   { "name": 'Store Details', "pattern": "operation_storedetails_list", "status": false, "icon": "fa fa-table mr-1", "selectTab": 'item', "routerLink": '/mainpage/item' },
  //   { "name": 'Store', "pattern": "operation_store_list", "status": false, "icon": "fa-solid fa-folder-open mr-1", "selectTab": 'masterpartgroup', "routerLink": '/mainpage/master/masterpartgroup' },
  //   { "name": 'Retrieve', "pattern": "operation_retrive_list", "status": false, "icon": "fa fa-list-check mr-2", "selectTab": 'uom', "routerLink": 'fa fa-balance-scale mr-1' },
  //   { "name": 'Relocation', "pattern": "operation_relocation_list", "status": false, "icon": "fa fa-list-check mr-2", "selectTab": 'uom', "routerLink": 'fa fa-balance-scale mr-1' },
  //   { "name": 'Schedule', "pattern": "operation_schedule_list", "status": false, "icon": "fa fa-list-check mr-2", "selectTab": 'uom', "routerLink": 'fa fa-balance-scale mr-1' }];

  // statusSubmenu: any = [
  //   { "name": 'Location Information', "pattern": "status_location_list", "status": false, "icon": "fa fa-table mr-1", "selectTab": 'item', "routerLink": '/mainpage/item' },
  //   { "name": 'Crane Status', "pattern": "status_crane_list", "status": false, "icon": "fa-solid fa-folder-open mr-1", "selectTab": 'masterpartgroup', "routerLink": '/mainpage/master/masterpartgroup' },
  //   { "name": 'Equipment Status', "pattern": "status_equipment_list", "status": false, "icon": "fa fa-list-check mr-2", "selectTab": 'uom', "routerLink": 'fa fa-balance-scale mr-1' }];

  constructor(private router: Router, private route: ActivatedRoute, private dataService: DataService, private apiservice: ApiService, private appComponent: AppComponent, private authService: AuthService, private eRef: ElementRef
    , private renderer: Renderer2, private swal: SwalService
  ) {
    let user_rights: any = localStorage.getItem('WMS-Rights');
    let userData = localStorage.getItem('userDetails');
    this.userData = JSON.parse(userData);
    //this.menuRights = JSON.parse(user_rights);
    if (user_rights != null) {
      const data = JSON.parse(user_rights);
      const resultss = data.map(key => ({ [key]: true }))
        .reduce((acc, obj) => ({ ...acc, ...obj }), {});

      const menus = {
        master_module: (data.some(right => right.includes('master_'))) ? true : false,
        transaction_module: (data.some(right => right.includes('transaction_'))) ? true : false,
        inventory_module: (data.some(right => right.includes('inventory_'))) ? true : false,
        operation_module: (data.some(right => right.includes('operation_'))) ? true : false,
        history_module: (data.some(right => right.includes('history_'))) ? true : false,
        status_module: (data.some(right => right.includes('status_'))) ? true : false,
        user_module: (data.some(right => right.includes('user_'))) ? true : false,
        tracking_module: (data.some(right => right.includes('master_'))) ? true : false,
        ...resultss
      };
 
      this.menuRights = menus;
    }
 
    this.tagEmergency = router.url.split('/')[2];
    
    // let master: boolean = false;
    // this.menuList.forEach(element => {
    //   if (this.menuRights.some(right => (right.includes(element.pattern)))) {
    //     master = true;
    //     element.status = true;
    //   }
    // });
    // if (master) {
    //   this.masterSubmenu.forEach(element => {
    //     if (this.menuRights.some(right => (right.includes(element.pattern)))) {
    //       element.status = true;
    //     }
    //   }); 

    // }

    this.updateDateTime();
    this.populateRowData();
    this.selectedLocation = 'All';
    this.counterArray = Array(10).fill(0);
  }
  ngOnInit(): void {

    // const div = this.el.nativeElement.querySelector('#myDiv') as HTMLElement;
    // if (div) { 
    //   (div.style as any).zoom = "80%"; 
    // }
    ;

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isOperationsTabActive = false;
      }
    });


    this.loggedUname = localStorage.getItem('UserName');

    this.dataService.getData().subscribe((data: any) => {
      if (data == 'alarmReset') {
        this.mySelectedTab = 'History';
        this.selectedTab = 'alarm_history';
        this.selectTab('alarm_history');
        this.showSelectedTab();
      } else if (data == 'redirecttransaction') {
        this.mySelectedTab = 'Transactions';
        this.selectedTab = 'transaction';
        this.selectTab('transaction');
        this.showSelectedTab();
      }
    });

    this.updateImagePath();

    // Checking current URL to set appropriate filters
    if (this.router.url == '/mainpage/location_status') {
      this.showFilters = true;
      this.showFilters2 = false;

    }



    else if (this.router.url == '/mainpage/stock_adjustment') {
      this.transactionFilter = false;
      this.historyFilter = false;
      this.showSelectLocationFilter = true;
      this.selectLocation('All');
    } else if (this.router.url == '/mainpage/expiry_alert') {
      this.transactionFilter = false;
      this.historyFilter = false;
    } else {
      this.showFilters = false;
      this.showSelectLocationFilter = false;
      this.transactionFilter = true;
      this.historyFilter = true;
    }

    if (this.router.url == '/mainpage/prebinning_status') {
      this.showFilters = false;
      this.showFilters2 = true;
    }

    // Subscribe to lengthOfLevel and lengthOfBay updates
    this.dataService.lengthOfLevel$.subscribe(length => {
      this.lengthOfLevel = length; 
    });

    this.dataService.lengthOfBay$.subscribe(length => {
      this.lengthOfBay = length; 
    });

    this.showTabs = true;

    // Get the current active page from local storage
    let currentPage: any = localStorage.getItem('WMS-ActivePage');
    if (currentPage) {
      currentPage = JSON.parse(currentPage);
      const hiddenMenus = ['Status', 'Equipment'];
      if (hiddenMenus.includes(currentPage.menu)) {
        this.mySelectedTab = 'Operations';
        this.selectedTab = 'grn_pushing';
        localStorage.setItem('WMS-ActivePage', JSON.stringify({ menu: 'Operations', submenu: 'grn_pushing' }));
      } else {
        this.mySelectedTab = currentPage.menu;
        this.selectedTab = currentPage.submenu;
      }
    }

    // Additional check for the URL to set the tab and submenu
    if (this.router.url.includes('mainpage/item')) {
      this.mySelectedTab = 'Masters';
      this.selectedTab = 'item';
    }
    if (this.router.url.includes('mainpage/LocationMaster')) {
      this.mySelectedTab = 'Masters';
      this.selectedTab = 'LocationMaster';
    }
    if (this.router.url.includes('mainpage/itemtransaction_list')) {
      this.mySelectedTab = 'Transactions';
      this.selectedTab = 'itemtransaction_list';
    }
    if (this.router.url.includes('mainpage/palletrequest_list')) {
      this.mySelectedTab = 'Transactions';
      this.selectedTab = 'palletrequest_list';
    }
    if (this.router.url.includes('mainpage/inventory_list/Inventory')) {
      this.mySelectedTab = 'Inventory';
      this.selectedTab = 'Inventory';
    }
    if (this.router.url.includes('mainpage/orderApproval')) {
      this.mySelectedTab = 'orderApproval';
      this.selectedTab = 'orderApproval';
    }

    if (this.router.url.includes('mainpage/storage_retrieval_history')) {
      this.mySelectedTab = 'Transactions';
      this.selectedTab = 'storage_retrieval_history';
    }
    if (this.router.url.includes('mainpage/alarm_history')) {
      this.mySelectedTab = 'Transactions';
      this.selectedTab = 'alarm_history';
    }
    if (this.router.url.includes('mainpage/rejectedpallet_history')) {
      this.mySelectedTab = 'Transactions';
      this.selectedTab = 'rejectedpallet_history';
    }
    if (this.router.url.includes('mainpage/maintenancehistory')) {
      this.mySelectedTab = 'Transactions';
      this.selectedTab = 'maintenancehistory';
    }
    if (this.router.url.includes('mainpage/expiry_alert')) {
      this.mySelectedTab = 'Transactions';
      this.selectedTab = 'expiry_alert';
    }
    if (this.router.url.includes('mainpage/userlog')) {
      this.mySelectedTab = 'Transactions';
      this.selectedTab = 'userlog';
    }

    if (this.router.url.includes('mainpage/storage_details')) {
      this.mySelectedTab = 'Operations';
      this.selectedTab = 'storage_details';
    }

    if (this.router.url.includes('mainpage/pallet_storage')) {
      this.mySelectedTab = 'Operations';
      this.selectedTab = 'pallet_storage';
    }
    if (this.router.url.includes('mainpage/grn_pushing')) {
      this.mySelectedTab = 'Operations';
      this.selectedTab = 'grn_pushing';
    }
    if (this.router.url.includes('mainpage/label_print')) {
      this.mySelectedTab = 'Operations';
      this.selectedTab = 'label_print';
    }
    if (this.router.url.includes('mainpage/orderApproval')) {
      this.mySelectedTab = 'Operations';
      this.selectedTab = 'order_approval';
    }
    if (this.router.url.includes('mainpage/prebinning_aaproval')) {
      this.mySelectedTab = 'Operations';
      this.selectedTab = 'prebinning_aaproval';
    }
    if (this.router.url.includes('mainpage/retrieve_pallets')) {
      this.mySelectedTab = 'Operations';
      this.selectedTab = 'retrieve_pallets';
    }
    if (this.router.url.includes('mainpage/schedule')) {
      this.mySelectedTab = 'Operations';
      this.selectedTab = 'schedule';
    }
    if (this.router.url.includes('mainpage/pallet_relocation')) {
      this.mySelectedTab = 'Operations';
      this.selectedTab = 'pallet_relocation';
    }
    if (this.router.url.includes('mainpage/consolidation_bin')) {
      this.mySelectedTab = 'Operations';
      this.selectedTab = 'consolidation_bin';
    } if (this.router.url.includes('mainpage/emptybin_inout')) {
      this.mySelectedTab = 'Operations';
      this.selectedTab = 'emptybin_inout';
    }
    if (this.router.url.includes('mainpage/stockverifications')) {
      this.mySelectedTab = 'Operations';
      this.selectedTab = 'stockverifications';
    }
    if (this.router.url.includes('mainpage/stock_adjustment')) {
      this.mySelectedTab = 'Operations';
      this.selectedTab = 'stock_adjustment';
    }
    if (this.router.url.includes('mainpage/location_status')) {
      this.mySelectedTab = 'Inventory';
      this.selectedTab = 'location_status';
    }
    if (this.router.url.includes('mainpage/prebinning_status')) {
      this.mySelectedTab = 'Operations';
      this.selectedTab = 'prebinning_status';
    }

    this.showSelectedTab(); // Ensure that the selected tab is highlighted

    this.updateProgress();

    // Populate the container with div elements
    const container = document.getElementById('container');
    if (container) {
      for (let i = 0; i < 10; i++) {
        const div = document.createElement('div');
        container.appendChild(div);
      }
    }

    // Retrieve the selected tab from local storage if it exists
    const storedTab = localStorage.getItem('selectedTab');
    if (storedTab) {
      this.selectedTab = storedTab;
    }

    this.selectgrn();

  }


  grnData: PrebinningItem[] = [
    { GRNType: 'Type1', GRNNo: 'GRN001', ItemCode: 'IC001', ItemName: 'Item 1', ItemGroup: 'Group 1', BinID: 'Bin001', reqQty: 100, binnedQty: 50, ItemStatus: 'Pending' },
    { GRNType: 'Type2', GRNNo: 'GRN002', ItemCode: 'IC002', ItemName: 'Item 2', ItemGroup: 'Group 2', BinID: 'Bin002', reqQty: 200, binnedQty: 150, ItemStatus: 'Completed' }
  ];

  hhtData: PrebinningItem[] = [
    { GRNType: 'Type3', GRNNo: 'GRN003', ItemCode: 'IC003', ItemName: '2321890087', ItemGroup: 'Group 3', BinID: 'Bin003', reqQty: 300, binnedQty: 300, ItemStatus: 'Completed' },
    { GRNType: 'Type4', GRNNo: 'GRN004', ItemCode: 'IC004', ItemName: '8965650089', ItemGroup: 'Group 4', BinID: 'Bin004', reqQty: 400, binnedQty: 400, ItemStatus: 'Completed' }
  ];

  binData: PrebinningItem[] = [
    { GRNType: 'Type5', GRNNo: 'GRN005', ItemCode: 'IC005', ItemName: 'bin004', ItemGroup: 'Group 5', BinID: 'Bin005', reqQty: 500, binnedQty: 500, ItemStatus: 'Completed' },
    { GRNType: 'Type6', GRNNo: 'GRN006', ItemCode: 'IC006', ItemName: 'bin002', ItemGroup: 'Group 6', BinID: 'Bin006', reqQty: 600, binnedQty: 600, ItemStatus: 'Completed' }
  ];


  isAnyTabActive(): boolean {
    return this.selectedTab === 'retrieve_pallets' ||
      this.selectedTab === 'schedule' ||
      this.selectedTab === 'order_approval' ||
      this.selectedTab === 'prebinning_aaproval' ||
      this.selectedTab === 'grn_pushing' ||
      this.selectedTab === 'label_print' ||
      this.selectedTab === 'pallet_storage' ||
      this.selectedTab === 'storage_details' ||
      this.selectedTab === 'pallet_relocation' ||
      this.selectedTab === 'consolidation_bin' ||
      this.selectedTab === 'emptybin_inout' ||
      this.selectedTab === 'picking' ||
      this.selectedTab === 'stockverifications' ||
      this.selectedTab === 'stock_adjustment';
  }
  // setLocation(location: string) {
  //   this.dataService.setLocation(location);
  // }

  populateRowData(): void {
    for (let i = 0; i < this.numberOfRows; i++) {
      let row: number[] = [i + 1];
      for (let j = 1; j <= this.numberOfColumns; j++) {
        if (this.selectedSide === 'Side 1') {
          row.push(1 / 2); // For Side 1, always push 1/2
        } else if (this.selectedSide === 'Side 2') {
          row.push((j + 1) / 2); // For Side 2, increment the numerator for each cell
        }
      }
      this.rowData.push(row);
    }
  }

  navigateToRoute(route: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: route },
      queryParamsHandling: 'merge'
    });
  }

  // isAnyTabActive(): boolean {
  //   return this.selectedTab === 'retrieve_pallets' || this.selectedTab === 'schedule';
  // }




  updateImagePath(): void {
    // Set the image path based on the selected side
    this.imagePath = this.selectedSide === 'Side 1' ? 'assets/images/box-1.png' : 'assets/images/box-2.png';
  }

  
  updateProgress(): void {
    setInterval(() => {
      this.progressValue = Math.random() * 100; // Random value between 0 and 100 for percentage
    }, 3000);
  }

  getRotationAngle(): string {
    const angle = (this.progressValue / 100) * 180; // Convert progress value to an angle
    return `rotate(${angle}deg)`;
  }

  changeTab(data: any) {
    let submenu = ''
    if (data == 'Masters') {
      submenu = 'item'
    }
    else if (data == 'Transactions') {
      submenu = 'transaction'
    }
    let currentTab: any = {
      'menu': data,
      'submenu': submenu
    }

    // if (data != 'Tracking') {
    //   localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab)); 
    // }
    if (data != 'Operation') {
      // localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
    }
    this.mySelectedTab = data;
    this.showSelectedTab();
  }

  logSwal() {

    this.authService.clearSessionLogout();
    Swal.fire({
      title: `Do you want to Logout?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'YES',
      cancelButtonText: 'NO',
    }).then(async (result: any) => {
      if (result.isConfirmed) {
        // this.appComponent.showLoading('Page getting Logout')
        // this.router.navigateByUrl('login')
        // this.appComponent.hideLoading()



        const sessionId = localStorage.getItem('session_id');
        if (sessionId) {
          const data: any = await this.apiservice.useLogOut({ 'session_id': JSON.parse(sessionId) });
          if (this.router.url !== '/login' && data.status) {
            this.router.navigate(['/login']);
            // localStorage.clear();
          }
          else { 
            this.router.navigate(['/login']);
          }
        }
        else { 
          this.router.navigate(['/login']);
        }
      }
    })
  }
  clearTabContents(): void {
    let currentTab: any = {
      'menu': '',
      'submenu': ''
    }
    localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
    this.mySelectedTab = null;
    this.selectedTab = null;
    this.showSelectedTab();
  }





  masterMenu() {
    document.getElementById("master").style.display = "block";
  }

  private updateDateTime() {
    const now = new Date();
    this.currentDate = this.formatDate(now);
    this.currentTime = this.formatTime(now);

    // Update every minute (60000 milliseconds)
    setInterval(() => {
      const updatedNow = new Date();
      this.currentDate = this.formatDate(updatedNow);
      this.currentTime = this.formatTime(updatedNow);
    }, 0);
  }

  private formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  private formatTime(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return date.toLocaleTimeString('en-US', options);
  }

  private showSelectedTab(): void {
    const elements = document.getElementsByClassName("city"); 
    if (this.mySelectedTab == "Operations") {

    }
    for (let i = 0; i < elements.length; i++) {
      (elements[i] as HTMLElement).style.display = "none";
    }

    if (this.mySelectedTab) {
      const selectedCity = document.getElementById(this.mySelectedTab);
      if (selectedCity) {
        selectedCity.style.display = "block";
      }
    }
  }

  showHide_Filters(data: any) {

    if (data == 'itemtransaction_list') {
      this.transactionFilter = true;
      this.historyFilter = false;
      this.showFilters = false;
      this.showSelectLocationFilter = false;
    } else if (data == 'palletrequest_list') {
      this.transactionFilter = true;
      this.historyFilter = false;
      this.showFilters = false;
      this.showSelectLocationFilter = false;
    } else if (data == 'stock_adjustment') {
      this.transactionFilter = false;
      this.historyFilter = false;
      this.showSelectLocationFilter = true;
      this.showFilters = false;
    }
    else if (data == 'storage_retrieval_history' || data == 'alarm_history' || data == 'rejectedpallet_history' || data == 'maintenancehistory' || data == 'userlog') {
      this.transactionFilter = false;
      this.historyFilter = true;
      this.showFilters = false;
    }
    else if (data == 'storage_retrieval_history') {
      this.transactionFilter = false;
      this.historyFilter = true;
      this.showFilters = false;
    } else if (data == 'location_status') {
      this.transactionFilter = false;
      this.historyFilter = false;
      this.showSelectLocationFilter = false;
      this.showFilters = true;
      this.showFilters2 = false;
    } else if (data == 'prebinning_status') {
      this.transactionFilter = false;
      this.historyFilter = false;
      this.showSelectLocationFilter = false;
      this.showFilters = false;
      this.showFilters2 = true;
    }
    else {
      this.transactionFilter = false;
      this.historyFilter = false;
      this.showSelectLocationFilter = false;
      this.showFilters = false;
      this.showFilters2 = false;

    }

  }

  selectTab(data: any): void {
  
    let submenu = data; 
   
    if (data == '') 
    {
      if (this.mySelectedTab == 'Masters') 
        {
        if (this.menuRights?.master_item_list) {
          submenu = 'item';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu

          } 
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/item');
          return;
        }
      } else if (this.mySelectedTab == 'Transactions') {
        if (this.menuRights?.transaction_item_list) {
          submenu = 'itemtransaction_list';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.showSelectLocationFilter = false;
          this.transactionFilter = true;
          this.historyFilter = false;
          this.router.navigateByUrl('/mainpage/itemtransaction_list');
          return;
        }

        if (this.menuRights?.transaction_binrequest_list) {
          submenu = 'palletrequest_list';
          this.showHide_Filters(submenu);

          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.showSelectLocationFilter = false;
          this.transactionFilter = true;
          this.historyFilter = false;
          this.router.navigateByUrl('/mainpage/palletrequest_list');
          return;
        }
        if (this.menuRights?.transaction_toteliftRequest_list) {
          submenu = 'toteliftRequest_list';
          this.showHide_Filters(submenu);

          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.showSelectLocationFilter = false;
          this.transactionFilter = true;
          this.historyFilter = false;
          this.router.navigateByUrl('/mainpage/toteliftRequest_list');
          return;
        }


        if (this.menuRights?.transaction_toteliftRequest_list) {
          submenu = 'binWiseOrder_Summary';
          this.showHide_Filters(submenu);

          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.showSelectLocationFilter = false;
          this.transactionFilter = true;
          this.historyFilter = false;
          this.router.navigateByUrl('/mainpage/binWiseOrder_Summary');
          return;
        }

        if (this.menuRights?.transaction_retrievalConfirmation_list) {
            submenu = 'retrievalConfirmation';
            this.showHide_Filters(submenu);
  
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.showSelectLocationFilter = false;
            this.transactionFilter = true;
            this.historyFilter = false;
            this.router.navigateByUrl('/mainpage/retrievalConfirmation');
            return;
          }


          if (this.menuRights?.transaction_orderProcessingSummary_list) {
            submenu = 'transaction_orderProcessingSummary';
            this.showHide_Filters(submenu);
  
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.showSelectLocationFilter = false;
            this.transactionFilter = true;
            this.historyFilter = false;
            this.router.navigateByUrl('/mainpage/transaction_orderProcessingSummary');
            return;
          }

          if (this.menuRights?.transaction_prebinningSummary_list) {
            submenu = 'transaction_prebinningSummary';
            this.showHide_Filters(submenu);
  
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.showSelectLocationFilter = false;
            this.transactionFilter = true;
            this.historyFilter = false;
            this.router.navigateByUrl('/mainpage/transaction_prebinningSummary');
            return;
          }


        if (this.menuRights?.transaction_stockadjustment_list) {
          submenu = 'stockverifications';
          this.showHide_Filters(submenu);

          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.showSelectLocationFilter = true;
          this.transactionFilter = false;
          this.historyFilter = false;
          this.router.navigate(['/mainpage/stockverifications']);
          return;
        }
        if (this.menuRights?.transaction_stockadjustment_list) {
          submenu = 'stock_adjustment';
          this.showHide_Filters(submenu);

          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.showSelectLocationFilter = true;
          this.transactionFilter = false;
          this.historyFilter = false;
          this.router.navigate(['/mainpage/stock_adjustment']);
          return;
        }

        if (this.menuRights?.transaction_oeeTransaction_list) {
          submenu = 'transaction_oeeTransaction';
          this.showHide_Filters(submenu);

          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.showSelectLocationFilter = true;
          this.transactionFilter = false;
          this.historyFilter = false;
          this.router.navigate(['/mainpage/transaction_binSummary']);
          return;
        }

        if (this.menuRights?.transaction_oeeTransaction_list) {
          submenu = 'transaction_oeeTransaction';
          this.showHide_Filters(submenu);

          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.showSelectLocationFilter = true;
          this.transactionFilter = false;
          this.historyFilter = false;
          this.router.navigate(['/mainpage/transaction_oeeTransaction']);
          return;
        }
      }
      else if (this.mySelectedTab == 'Inventory') 
     {
        if (this.menuRights?.inventory_item_list) 
        {
          submenu = 'Inventory';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/inventory_list/Inventory');
          return;
        }
      } else if (this.mySelectedTab == 'History') {
        if (this.menuRights?.history_storageretrival_list) {
          submenu = 'storage_retrieval_history';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/storage_retrieval_history');
          return;
        }
        if (this.menuRights?.history_alarm_list) {
          submenu = 'alarm_history';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/alarm_history');
          return;
        }
        if (this.menuRights?.history_rejectedbin_list) {
          submenu = 'rejectedpallet_history';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/rejectedpallet_history');
          return;
        }
        if (this.menuRights?.history_maintenance_list) {
          submenu = 'maintenancehistory';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/maintenancehistory');
          return;
        }
        if (this.menuRights?.history_expiryalert_list) {
          submenu = 'expiry_alert';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/expiry_alert');
          return;
        }
        if (this.menuRights?.history_userlog_list) {
          submenu = 'userlog';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/userlog');
          return;
        }
      } else if (this.mySelectedTab == 'Operations') {

        this.toggleOperationsDropdown(); 

        if (this.menuRights?.operation_storedetails_list) {
          submenu = 'pallet_storage';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/pallet_storage');
          return;
        }
        if (this.menuRights?.operation_store_list) {
          submenu = 'storage_details';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/storage_details');
          return;
        }
        if (this.menuRights?.operation_retrive_list) {
          submenu = 'retrieve_pallets';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/retrieve_pallets');
          return;
        }
        if (this.menuRights?.operation_binWiseRetrieval_list) {
          submenu = 'binwiseRetrieval';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/binwiseRetrieval');
          return;
        }
        if (this.menuRights?.operation_retrieveSummary_list) {
            submenu = 'operation_retrieveSummary';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/operation_retrieveSummary');
            return;
          }
          if (this.menuRights?.operation_retrieveSummary_list) {
            submenu = 'operation_reassign';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/operation_reassign');
            return;
          }
        if (this.menuRights?.operation_relocation_list) {
          submenu = 'pallet_relocation';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/pallet_relocation');
          return;
        }
        if (this.menuRights?.operation_schedule_list) {
          submenu = 'schedule';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/schedule');
          return;
        }
        if (this.menuRights?.operation_emptybin_list) {
          submenu = 'emptybin';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/emptybin_inout');
          return;
        }
 
        if (this.menuRights?.operation_schedule_list) {
          submenu = 'orderapproval';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/orderApproval');
          return;
        }

        if (this.menuRights?.operation_binwisePrebinningReject_list) {
          submenu = 'operation_binwisePrebinningReject';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/operation_binwisePrebinningReject');
          return;
        }


        if (this.menuRights?.operation_tvDisplay_list) {
            submenu = 'tvDisplay';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/tvDisplay');
            return;
          }
        if (this.menuRights?.operation_Picking_list) {
          submenu = 'picking';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/main_page/picking');
          return;
        }

      } else if (this.mySelectedTab == 'Status') {
        if (this.menuRights?.status_location_list) {
          submenu = 'location_status';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/location_status');
          return;
        }
        if (this.menuRights?.status_crane_list) {
          submenu = 'crane_status';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/crane_status');
          return;
        }
        if (this.menuRights?.status_equipment_list) {
          submenu = 'equipment_status';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/equipment_status');
          return;
        }
        if (this.menuRights?.status_prebinning_list) {
          submenu = 'prebinning_status';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/prebinning_status');
          return;
        }
        if (this.menuRights?.status_liveTracking_list) {
          submenu = 'live_tracking';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/live_tracking');
          return;
        }
        if (submenu == 'station-config') {
          // submenu = 'live_tracking';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/station_config');
          return;
        }
        else if (submenu == 'wcs_alarm') {
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/wcs_alarm');
          return;
        }

        else if(submenu == 'autoPalletRead')
          {
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/autoPalletRead');
            return;
          }
 

        if(this.menuRights?.status_status_locationMaintenance_list){
          submenu = 'location_maintenance';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/location_maintenance');
          return;
        } 
      }
      else if(this.mySelectedTab == 'Emergency')
      {
        if (this.menuRights?.equipment_loadStationBuffer_list) {
          submenu = 'loadBuffer';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/loadBuffer');
          return;
        }
        if(this.menuRights?.equipment_unloadStationBuffer_list){
          submenu = 'unloadBuffer';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/unloadBuffer');
          return;
        }
        if(this.menuRights?.equipment_mlsMovement_list){
          submenu = 'equipment_mlsMovement';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/equipment_mlsMovement');
          return;
        }
        if(this.menuRights?.equipment_liftReachedBin_list){
          submenu = 'liftReachedBin';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/liftReachedBin');
          return;
        }
        if(this.menuRights?.equipment_loadConveyorBuffer_list){
          submenu = 'loadConveyorBuffer';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/loadConveyorBuffer');
          return;
        }
        if(this.menuRights?.equipment_mlsSend_list){
          submenu = 'mlsSend';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/mlsSend');
          return;
        }
        if(this.menuRights?.status_groundConveyor_list){
            submenu = 'groundConveyor';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/groundConveyor');
            return;
          }
          if(this.menuRights?.equipment_mlsAutoCommandStore_list){
            submenu = 'equipment_mlsAutoCommandStore';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/equipment_mlsAutoCommandStore');
            return;
          }
          if(this.menuRights?.equipment_mlsError_list){
            submenu = 'equipment_mlsError';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/equipment_mlsError');
            return;
          }
          if(this.menuRights?.equipment_toteliftAutoCmd_list){
            submenu = 'equipment_toteliftAutoCmd';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/equipment_toteliftAutoCmd');
            return;
          }
          if(this.menuRights?.equipment_tlError_list){
            submenu = 'equipment_tlError';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/equipment_tlError');
            return;
          }
          if(this.menuRights?.equipment_mlsSemiAutoCmd_list){
            submenu = 'equipment_mlsSemiAutoCmd';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/equipment_mlsSemiAutoCmd');
            return;
          }
          if(this.menuRights?.equipment_toteliftSemiAutoCmd_list){
            submenu = 'equipment_toteliftSemiAutoCmd';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/equipment_toteliftSemiAutoCmd');
            return;
          }
          if(this.menuRights?.equipment_idleEquipmentstatus_list){
            submenu = 'equipment_idleEquipmentstatus';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/equipment_idleEquipmentstatus');
            return;
          }
          if(this.menuRights?.equipment_currentEquipmentstatus_list){
            submenu = 'equipment_currentEquipmentstatus';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/equipment_currentEquipmentstatus');
            return;
          }
          if(this.menuRights?.equipment_overallEquipmentstatus_list){
            submenu = 'equipment_overallEquipmentstatus';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/equipment_overallEquipmentstatus');
            return;
          }
          if(this.menuRights?.equipment_wcsSendModbus_list){
            submenu = 'equipment_wcsSendModbus';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/equipment_wcsSendModbus');
            return;
          }
          if(this.menuRights?.equipment_requestdetails_list){
            submenu = 'equipment_requestdetails';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/equipment_requestdetails');
            return;
          }
          if(this.menuRights?.status_groundConveyor_list){
            submenu = 'status_conveyorAddressDetails';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/status_conveyorAddressDetails');
            return;
          }
          if(this.menuRights?.status_groundConveyor_list){
            submenu = 'status_conveyorAddressDetails_opc';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/status_conveyorAddressDetails_opc');
            return;
          }
          if(this.menuRights?.status_eqErrorUpload_list){
            submenu = 'status_eqErrorUpload';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/status_eqErrorUpload');
            return;
          }
          if(this.menuRights?.equipment_config_list){
            submenu = 'equipment_config';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/equipment_config');
            return;
          }
          if(this.menuRights?.equipment_config_list){
            submenu = 'equipment_ip_config';
            this.showHide_Filters(submenu);
            let currentTab: any = {
              'menu': this.mySelectedTab,
              'submenu': submenu
            }
            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            this.selectedTab = submenu;
            this.router.navigateByUrl('/mainpage/equipment_ip_config');
            return;
          }
        if(this.menuRights?.equipment_toteLiftSend_list){
          submenu = 'toteLiftSend';
          this.showHide_Filters(submenu);
          let currentTab: any = {
            'menu': this.mySelectedTab,
            'submenu': submenu
          }
          localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
          this.selectedTab = submenu;
          this.router.navigateByUrl('/mainpage/toteLiftSend');
          return;
        }
      }
      // else if (this.mySelectedTab == 'emergency') {
      //   if (this.menuRights?.status_location_list) {
      //     submenu = 'emergency_operations';
      //     this.showHide_Filters(submenu);
      //     let currentTab: any = {
      //       'menu': this.mySelectedTab,
      //       'submenu': submenu
      //     }
      //     localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
      //     this.selectedTab = submenu;
      //     this.router.navigateByUrl('/mainpage/emergency_operations');
      //     return;
      //   }
      // }

    } 
    else 
    {
      this.showHide_Filters(submenu);
      let currentTab: any = {
        'menu': this.mySelectedTab,
        'submenu': submenu
      }
      localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
      this.selectedTab = data;
      if (data == 'itemtransaction_list') {
        this.showSelectLocationFilter = false;
        this.transactionFilter = true;
        this.historyFilter = false;
      } else if (data == 'palletrequest_list') {
        this.showSelectLocationFilter = false;
        this.transactionFilter = true;
        this.historyFilter = false;
      } else if (data == 'stock_adjustment') {
        this.showSelectLocationFilter = true;
        this.transactionFilter = false;
        this.historyFilter = false;
      }
      if (data == 'Inventory') {
        this.router.navigateByUrl('/mainpage/inventory_list/' + data);
      } else {
        this.router.navigateByUrl('/mainpage/' + data);
      }

    }

    // this.toggleOperationsDropdown();

    //this.dataService.setData('');
    //this.showSelectedTab2();
  }

  getRotation(): number {

    return (this.progress_data ?? 0) * 1.8;
  }

  selectSide(side: string): void {
    this.selectedSide = side;
    let obj: any = {
      type: 'side',
      value: side
    }
    this.appComponent.showLoading("Data Loading!!!")
    this.dataService.setData(obj);
    // this.rowData = []; // Clear previous data
    // this.populateRowData(); // Repopulate data based on selected side
    // this.updateImagePath(); // Update the image path when side changes
  }

  selectAisle(aisle: string): void {

    this.selectedAisle = aisle;
    this.selectedSide = 'Side 1';
    let obj: any = {
      type: 'aisle',
      value: aisle
    }
    this.dataService.setData(obj);
  }


  selectLocation(data: any): void {
    this.selectedLocation = data;
    this.dataService.setData(data);
  }

  openFilter(menu: any) {
    if (menu == 'itemtransaction_list') {
      this.dataService.setTransactionListData('itemtransactionFilter_open');
    }
    else if (menu == 'palletrequest_list') {
      this.dataService.setPalletrequestListData('palletrequestFilter_open');
    }
    // else if (menu == 'toteliftRequest_list') {
    //     this.dataService.setToteliftRequestListData('toteliftRequestFilter_open');
    // }  
    else if (menu == 'storage_retrieval_history') {
      this.dataService.setStorageRetrivalData('open');
    }
    else if (menu == 'alarm_history') {
      this.dataService.setAlarmHistoryData('open');
    }
    else if (menu == 'rejectedpallet_history') {
      this.dataService.setRejectedPalletData('open');
    }
    else if (menu == 'maintenancehistory') {
      this.dataService.setMaintenanceHistoryData('open');
    }
    else if (menu == 'userlog') {
      this.dataService.setUserlogData('open');
    }

  }
  closeModal() {
    this.modal.close(); // Call the close() method to close the modal
  }

  gotoSrs() {
    this.mySelectedTab = 'Reports';
    this.showSelectedTab();
    let currentTab: any = {
      'menu': 'Reports',
      'submenu': ''
    }
    localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
    window.open('http://172.16.8.43:4200/srs/mainpage/dashboard', '_blank').focus();
  }

  toggleMegaMenu(tab: string): void {
    if (this.activeTab === tab) {
      this.showMegaMenu = !this.showMegaMenu;
    } else {
      this.activeTab = tab;
      this.showMegaMenu = true;
    }
  }

  // toggleOperationsDropdown() {
  //   this.isOperationsTabActive = !this.isOperationsTabActive;
  // }

  closeOperationsDropdown(): void {
    this.isOperationsTabActive = false;
  }

  closeStatusDropdown(): void {
    this.isStatusTabActive = false;
  }

  closeReportsDropdown(): void {
    this.isReportsTabActive = false;
  }

  closeEquipmentDropdown(): void {
    this.isEquipmentTabActive = false;
  }

  toggleOperationsDropdown() {
    this.isOperationsTabActive = !this.isOperationsTabActive; 

    if (this.isOperationsTabActive) {
      // Attach the event listener to detect clicks outside the dropdown
      this.renderer.listen('document', 'click', this.onClickOutside.bind(this));
    }
  }

  toggleEquipmentDropdown() {
    this.isEquipmentTabActive = !this.isEquipmentTabActive; 

    if (this.isEquipmentTabActive) {
      // Attach the event listener to detect clicks outside the dropdown
      this.renderer.listen('document', 'click', this.onClickOutside.bind(this));
    }
  }

  toggleReportsDropdown() {
    this.isReportsTabActive = !this.isReportsTabActive;
    if (this.isReportsTabActive) {
      // Attach the event listener to detect clicks outside the dropdown
      this.renderer.listen('document', 'click', this.onClickOutside.bind(this));
    }
  }

  toggleStatusDropdown() {
    this.isStatusTabActive = !this.isStatusTabActive;

    if (this.isStatusTabActive) {
      // Attach the event listener to detect clicks outside the dropdown
      this.renderer.listen('document', 'click', this.onClickOutside.bind(this));
    }

  } // Toggle Status Dropdown

  closeAllMenus(): void {
    this.isOperationsTabActive = false;
    this.isStatusTabActive = false;
    this.isReportsTabActive = false;
    this.isEquipmentTabActive = false;
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen = false;
  }

  toggleSidebar(): void {
    if (window.innerWidth <= 991) {
      this.mobileSidebarOpen = !this.mobileSidebarOpen;
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }
  }

  activateMenu(menu: string): void {
    this.closeAllMenus();
    this.mySelectedTab = menu;
  }

  openReportsMenu(): void {
    this.mySelectedTab = 'Transactions';
    this.isOperationsTabActive = false;
    this.isStatusTabActive = false;
    this.isEquipmentTabActive = false;
    this.isReportsTabActive = !this.isReportsTabActive;
  }

  openOperationsMenu(): void {
    this.mySelectedTab = 'Operations';
    this.isReportsTabActive = false;
    this.isStatusTabActive = false;
    this.isEquipmentTabActive = false;
    this.isOperationsTabActive = !this.isOperationsTabActive;
  }

  navigateAndClose(tab: string): void {
    this.closeAllMenus();
    this.selectTab(tab);
  }

  onClickOutside(event: MouseEvent) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      // Close the dropdown if click is outside
      this.isOperationsTabActive = false;

    }
    if (!this.eRef.nativeElement.contains(event.target)) {
      // Close the dropdown if click is outside
      this.isStatusTabActive = false;
    }

    if (!this.eRef.nativeElement.contains(event.target)) {
      // Close the dropdown if click is outside
      this.isReportsTabActive = false;
    }

    if (!this.eRef.nativeElement.contains(event.target)) {
      // Close the dropdown if click is outside
      this.isEquipmentTabActive = false;
    }
  }

  selectgrn() {
    this.selectedSide = 'Side 1';
    this.dataService.changeData(this.grnData);
  }

  selecthht() {
    this.selectedSide = 'Side 2';
    this.dataService.changeData(this.hhtData); 
  }

  selectbin() {
    this.selectedSide = 'Side 3';
    this.dataService.changeData(this.binData);
  }

  exitFullScreen: boolean = true;
  toggleFullScreen() {
    if (!document.fullscreenElement) {
      this.exitFullScreen = false;
      document.documentElement.requestFullscreen().catch((err) => { 
        this.swal.error('Error', err.message);
      });
    } else {
      document.exitFullscreen();
      this.exitFullScreen = true;
    }
  }


}

// const totalItems: number = 600;
// const itemsDone: number = 400;
// const percentage: number = (itemsDone * 100) / totalItems;
// const circle: HTMLElement | null = document.querySelector(".pgbrbar");

// // alert()
// if (circle) {
//   // alert("1221");
//     circle.style.transform = `rotate(${45 + (percentage * 1.8)}deg)`;
// }

// const percentageProgress: HTMLElement | null = document.querySelector(".pgbrnumber");
