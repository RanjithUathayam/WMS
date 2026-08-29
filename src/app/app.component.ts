import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router'; 
import { ApiService } from './service/api.service';
import Swal from 'sweetalert2'; 
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'myapp';
  redirect: any;

  private userActive: boolean = true;
  private readonly LOGOUT_TIME: number = 2700 * 1000; // 10 seconds for testing, adjust as needed (e.g., 1800000 for 30 minutes)
  private timer: any;

  status = 'ONLINE'; 
  isConnected: boolean = true;
  offline_status: boolean = false;
  moduleName: string = '';

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit() { 
    window.electronAPI.getMacAddress().then(mac => {
        let reqObj = {
          "MacAddress": mac
        }
        this.apiService.getPickStationData(reqObj).subscribe((res:any) => {
            if(res.status == 1)
            {
               environment.pickStationData = res.data;
            }
        })
    });
    
    this.startTimer();

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) { 
          this.onRouteChange(event.urlAfterRedirects); 
      }
  });

   // Listen for changes in internet connection status
   window.addEventListener('online', this.onOnlineStatusChange.bind(this));
   window.addEventListener('offline', this.onOfflineStatusChange.bind(this));

   // Check initial internet connection status
   this.checkConnectionStatus();
  } 

  onRouteChange(currentRoute: string) { 
    const routeToModuleName: { [key: string]: string } = {
      '/login': 'Login',
      '/mainpage/home': 'Home',
      '/mainpage/prebinning_status': 'Prebinning Status',   
      '/mainpage/grn_pushing': 'GRN Pushing',
      '/mainpage/label_print': 'Label Print',
      '/mainpage/item': 'Item Master',
      '/mainpage/itemtransaction_list': 'Item Transaction ',
      '/mainpage/inventory_list/Inventory': 'Inventory List',
      '/mainpage/palletrequest_list': 'Bin Request List',
      '/mainpage/toteliftRequest_list': 'Totelift Request List',
      '/mainpage/rejectedpallet_history': 'Rejected Bin History',
      '/mainpage/maintenancehistory': 'Maintenance History',
      '/mainpage/userlog': 'User Log',
      '/mainpage/user_entry_log': 'User Entry Log',
      '/mainpage/alarm_history': 'Alarm History',
      '/mainpage/storage_retrieval_history': 'Storage Retrieval History', 
      '/mainpage/pallet_relocation': 'Bin Relocation', 
      '/mainpage/emergency_operations': 'Emergency Operations',
      '/mainpage/location_maintenance': 'Location Maintenance',
      '/mainpage/user_management': 'User Management', 
      '/mainpage/stock_adjustment': 'Stock Verification', 
      '/mainpage/pallet_storage': 'Store Details',
      '/mainpage/storage_details': 'Store', 
      '/mainpage/retrieve_pallets': 'Retrieve',
      '/mainpage/location_status': 'Location Information',
      '/mainpage/user-control': 'User Control', 
      '/mainpage/schedule': 'Schedule', 
      '/mainpage/prebinning_aaproval': 'Binning Approval',
      '/mainpage/consolidation_bin': 'Bin Consolidation',
      '/mainpage/emptybin_inout': 'Empty Bin In/Out', 
      '/mainpage/order_approval': 'Order Approval',
      '/mainpage/stockverifications': 'Stock Adjustment',
      '/mainpage/live_tracking': 'Live Tracking', 
      '/mainpage/binWiseOrder_Summary': 'Order Wise Bin Summary',
      '/mainpage/picking': 'Picking',
      // 'mainpage/hht_device_rights': 'HHT Device Rights'
  };
  
  // Assign the module name based on the current route
  this.moduleName = routeToModuleName[currentRoute] || 'Unknown Module';

  const date = new Date();
  const dateString = date.toISOString().split('T')[0] + ' ' + date.toTimeString().split(' ')[0] + '.' + date.getMilliseconds().toString().padStart(3, '0');

  const loggedInUser = localStorage.getItem('UserName');  
 

  let obj = {
    AccessDateTime : dateString,
    Type: this.moduleName,
    UserName: loggedInUser,
    MacAddress: '',
  }
  
  this.apiService.insertUserEntryLog(obj).subscribe((res: any) => {
    
  });

}

  @HostListener('document:mousemove', ['$event'])
  onMouseMove() { 
    this.userActive = true;
    //this.resetTimer();
  }

  resetTimer() {
    clearTimeout(this.timer);
    
    this.startTimer();
  }

  startTimer() {
    this.timer = setTimeout(() => { 
      this.logout();
    }, this.LOGOUT_TIME);
  }

  async logout() { 
    const sessionId = localStorage.getItem('session_id');
    if (sessionId) {
      const data: any = await this.apiService.useLogOut({ 'session_id': JSON.parse(sessionId) });
      this.router.navigate(['/mainpage/home']);
    } 
    else{ 
    }
  }

  showLoading(message: string) {
    $('#loaderPage').show();
    $("#loaderText").text(' Please Wait ' + message);
  }

  hideLoading() {
    $('#loaderPage').hide();
    $("#loaderText").text('');
  }


  // Check connection status initially
  checkConnectionStatus() {
    if (!navigator.onLine) {
      this.showOfflineAlert();
    }
  }

  // When the user goes offline
  onOfflineStatusChange() {
    this.offline_status = true;
    this.isConnected = false;
    this.showOfflineAlert();
  }

  // When the user comes back online
  onOnlineStatusChange() {
    this.offline_status = false;
    this.isConnected = true;
    Swal.fire({
        icon: 'success',
        title: 'Online!!!',
        text: 'User Back Online',
        showConfirmButton: true,
      //   timer: 3000,
      }); 
  }

  // Show an alert if the user is offline
  showOfflineAlert() {
    Swal.fire({
      icon: 'error',
      title: 'No Internet Connection',
      text: 'You are currently offline. Please check your connection.',
      showConfirmButton: true,
    //   timer: 3000,
    });
  }
 
}
