import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
// import Observer from "rxjs";
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';
import { data } from 'jquery';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

    token = localStorage.getItem('Token');

    option = new HttpHeaders().set('authenticatetoken', this.token);

    getauthenticateToken() {
        this.token = localStorage.getItem('Token');
        this.option = new HttpHeaders().set('authenticatetoken', this.token);
        return this.option
    }

    constructor(private http: HttpClient) { }

    baseURL = environment.baseURL;
    baseURL2 = environment.realTimeURL;

    uom(data: any) {
        return this.http.post(this.baseURL + "/uom", data, { 'headers': this.option });
    }
    getMasterTableData(apiCall: string, ReqObj: any ) {
        const queryParams = new URLSearchParams();
        for (const key in ReqObj) {
            if (ReqObj.hasOwnProperty(key)) 
            {
                queryParams.set(key, ReqObj[key]);
            }
        }
        const fullUrl = `${this.baseURL + apiCall}?${queryParams.toString()}`;
        return this.http.get(fullUrl, { 'headers': this.option});
    }
    postMasterData(data: any, apiCall: string) {
        return this.http.post(this.baseURL + apiCall, data, { 'headers': this.option });
    }
    deleteMasterData(apiCall: any) {
        return this.http.delete(this.baseURL + apiCall, { 'headers': this.option });
    }
    updateMasterData(apiCall: any, data: any) {
        return this.http.put(this.baseURL + apiCall, data, { 'headers': this.option });
    }


  result: any;


  getItemTransactionList(apiData: any, exportFormat: string) {
    const queryParams = new URLSearchParams({ ...apiData, exportFormat }).toString();
    const url = `${this.baseURL}transaction/item?${queryParams}`;

    return this.http.get(url, { headers: this.option, responseType: 'blob' as 'json' }).subscribe(
      (response: Blob) => {
        const blobUrl = window.URL.createObjectURL(response);
        const a = document.createElement('a');
        a.href = blobUrl;
        const now = new Date();
        let filename = `Item_Transaction_List_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
        filename += exportFormat === 'excel' ? '.xlsx' : `.${exportFormat}`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      },
      error => {
        Swal.fire({
            title: 'Error',
            text: 'Error fetching item transaction list.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
      }
    );
  }

  getTotalInventory(inventoryType: any, exportApi: any, data: any, searchData: any) {
    let url = `${this.baseURL}${exportApi}?type=${inventoryType}&exportFormat=${data}`;
    if (searchData?.itemCode) {
      url += `&itemCode=${searchData?.itemCode}`;
    }
    if (searchData?.itemname) {
      url += `&itemname=${searchData?.itemname}`;
    }
    if (searchData?.itemgroup) {
      url += `&itemgroup=${searchData?.itemgroup}`;
    }
    if (searchData?.craneid) {
      url += `&craneid=${searchData?.craneid}`;
    }
    if (searchData?.binid) {
      url += `&binid=${searchData?.binid}`;
    }
 
    this.http.get(url, { headers: this.option, responseType: 'blob' as 'json' }).subscribe(
      (response: Blob) => {
        const blobUrl = window.URL.createObjectURL(response);
        const a = document.createElement('a');
        a.href = blobUrl;
        const now = new Date();
        let filename = `Inventory_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
        filename += data === 'excel' ? '.xlsx' : `.${data}`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
 
        // Add a slight delay to ensure the download is complete before showing the alert
        // setTimeout(() => {
        //   Swal.fire({
        //     title: 'Download Complete',
        //     text: 'The inventory file has been downloaded successfully!',
        //     icon: 'success',
        //     confirmButtonText: 'OK'
        //   });
        // }, 500); // Delay of 500ms (adjust if needed)
      },
      error => {
        Swal.fire({
          title: 'Error',
          text: 'There was an error downloading the file. Please try again later.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    );
  }


  getUserLog(apiData: any, exportFormat: string) {
    const queryParams = new URLSearchParams({ ...apiData, exportFormat }).toString();
    const url = `${this.baseURL}history/userLog?${queryParams}`;

    return this.http.get(url, { headers: this.option, responseType: 'blob' as 'json' }).subscribe(
      (response: Blob) => {
        const blobUrl = window.URL.createObjectURL(response);
        const a = document.createElement('a');
        a.href = blobUrl;
        const now = new Date();
        let filename = `User_Log_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
        filename += exportFormat === 'excel' ? '.xlsx' : `.${exportFormat}`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      },
      error => {
        Swal.fire({
            title: 'Error',
            text: 'Error fetching user log data.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
      }
    );
  }

  getAlarmHistoryData(apiCall: any, data: any) { 
    const queryParams = new URLSearchParams();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        queryParams.append(key, data[key]);
      }
    });
    const urlWithParams = `${this.baseURL}${apiCall}?${queryParams.toString()}`;
    return this.http.get(urlWithParams, { headers: this.option });
  }

  getAlarmHistory(apiCall: any, apiData: any) {
    const result = {
      type: '',
      errorCode: apiData.errorCode,
      EquipmentType: apiData.EquipmentType,
      Contype: apiData.Contype,
      CraneID: apiData.CraneID,
      FromDate: apiData.FromDate,
      ToDate: apiData.ToDate,
      AlarmType: apiData.AlarmType,
      page: apiData.page,
      pagesize: apiData.pagesize,
      exportFormat: '',
      BinID: apiData.BinID
    }

    return this.http.post(this.baseURL + apiCall, result, { headers: this.option });
  }

  getTransactionList(apiCall: string, data: any) { 
    const queryParams = new URLSearchParams();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        queryParams.append(key, data[key]);
      }
    });
    const urlWithParams = `${this.baseURL}${apiCall}?${queryParams.toString()}`; 
    return this.http.get(urlWithParams, { headers: this.option });
  }

    // Item Master
  getitemMasterData(apiCall: string, ReqObj: any) { 
    let url = `${this.baseURL + apiCall}?ItemCode=${ReqObj.ItemCode}&ItemName=${ReqObj.ItemName}&ItemGroup=${ReqObj.ItemGroup}`
    return this.http.get(url, { 'headers': this.option });
  }
  createitemMasterData(data: any) {
    return this.http.post(this.baseURL + 'master/MasterPart', data, { 'headers': this.option });
  }
  updateitemMasterData(data: any) {
    return this.http.put(this.baseURL + 'master/MasterPart' + '/' + data.id, data, { 'headers': this.option });
  }
  updateItemMasterStatus(data: string, url: any) {
    return this.http.put(this.baseURL + url, data, { 'headers': this.option });
  }

  // Location Master (Warehouse / Row / Location)
  getWarehouseList() {
    return this.http.get(this.baseURL + 'location/warehouses', { 'headers': this.option });
  }
  createWarehouse(data: any) {
    return this.http.post(this.baseURL + 'location/warehouses', data, { 'headers': this.option });
  }
  updateWarehouse(data: any) {
    return this.http.put(this.baseURL + 'location/warehouses' + '/' + data.warehouseCode, data, { 'headers': this.option });
  }
  updateWarehouseStatus(data: any, warehouseCode: any) {
    return this.http.put(this.baseURL + 'location/warehouses/' + warehouseCode + '/status', data, { 'headers': this.option });
  }

  getRowList(warehouseCode: any) {
    return this.http.get(this.baseURL + 'location/warehouse/' + warehouseCode + '/rows', { 'headers': this.option });
  }
  createRow(data: any) {
    return this.http.post(this.baseURL + 'master/MasterRow', data, { 'headers': this.option });
  }
  updateRow(data: any) {
    return this.http.put(this.baseURL + 'master/MasterRow' + '/' + data.id, data, { 'headers': this.option });
  }
  updateRowStatus(data: any, id: any) {
    return this.http.put(this.baseURL + 'master/MasterRow/' + id + '/status', data, { 'headers': this.option });
  }

  getLocationList(warehouseCode: any, rowCode: any) {
    return this.http.get(this.baseURL + 'location/warehouse/' + warehouseCode + '/row/' + rowCode + '/positions', { 'headers': this.option });
  }
  createLocation(data: any) {
    return this.http.post(this.baseURL + 'location/', data, { 'headers': this.option });
  }
  activateLocation(id: any) {
    return this.http.patch(this.baseURL + 'location/' + id + '/activate', {}, { 'headers': this.option });
  }
  deactivateLocation(id: any) {
    return this.http.patch(this.baseURL + 'location/' + id + '/deactivate', {}, { 'headers': this.option });
  }

  getDashboardData() {
    return this.http.get(this.baseURL + 'data/dashboardHeader', { 'headers': this.option });
  }

  getUOMData() {
    return this.http.get(this.baseURL + 'master/uom', { 'headers': this.option });
  }
  
  
  dashboardData() {
    return this.http.get(this.baseURL + 'data/dashboardchart', { 'headers': this.getauthenticateToken() });
  }
 
  getInventoryData(apiCall: string, data: any) { 
    const queryParams = new URLSearchParams();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== '') {
        queryParams.append(key, data[key]);
      }
    });
    const urlWithParams = `${this.baseURL}${apiCall}?${queryParams.toString()}`;
    return this.http.get(urlWithParams, { 'headers': this.option });
  }

//   UserManagement
  getUserGroupData(apiCall: string) {
    return this.http.get(this.baseURL + apiCall, { 'headers': this.option });
  }

  getUserManagementData(apiCall: string) {
    return this.http.get(this.baseURL + apiCall, { 'headers': this.option });
  }

  addUserGroup(data: string) {
    return this.http.post(this.baseURL + 'master/UserGroup', data, { 'headers': this.option });
  }

  addUser(data: string) {
    return this.http.post(this.baseURL + 'master/UserManagement', data, { 'headers': this.option });
  }

  updateUserGroup(data: any) {
    return this.http.put(this.baseURL + 'master/UserGroup/' + data.id, data, { 'headers': this.option });
  }

  userGrpStatusUpdate(data: any) {
    return this.http.put(this.baseURL + 'master/UserGroup/' + data.id, data, { 'headers': this.option });
  }
  userStatusUpdate(data: any) {
    return this.http.put(this.baseURL + 'master/UserManagement/' + data.Id, data, { 'headers': this.option });
  }
  masterStatusUpdate(data: any, url: any) {
    return this.http.put(this.baseURL + url, data, { 'headers': this.option });
  }

  updateUser(data: any) {
    return this.http.put(this.baseURL + 'master/UserManagement/' + data.id, data, { 'headers': this.option });
  }

  getRights(groupId: any) {
    return this.http.get(this.baseURL + 'data/rightsList/' + groupId, { 'headers': this.option });
  }
  changePassword(data: any) {
    return this.http.post(this.baseURL + 'changePassword', data, { 'headers': this.option });
  }
  //Prebinnign approval
  getdataforprebinning(data: any) {
    let URL = this.baseURL + `operation/PreBinningApprove?GRNNo=${data.GRNNo}&ItemCode=${data.ItemCode}&BinID=${data.BinID}`;
    return this.http.get(URL, { 'headers': this.option });
  }
  approveprebinning(data: any) {
    return this.http.post(this.baseURL + 'operation/PreBinApproveStatus', data, { 'headers': this.option });
  }



  mergedData: any[] = [];


  useLogOut(data: any) { 
    return new Promise((resolve, reject) => {
      this.http.post(environment.baseURL + 'logout', data).subscribe(resData => {
        resolve(resData)
      }, (error: HttpErrorResponse) => {
        resolve(error)
      })
    });
  }

  getgrndetails(requestBody?: any): Observable<any> {
    if (requestBody) {
      return this.http.post(this.baseURL + 'HHT/getGRNDetails', requestBody, { headers: this.option });
    } else {
      return this.http.post(this.baseURL + 'HHT/getGRNDetails', {}, { headers: this.option });
    }
  }

  // useLogOut(data: any): Observable<any> {
  //   return this.http.post(this.baseURL+'logOut', data);
  // }

  getEmptyBinPageData() {
    let data = {}
    return this.http.post(this.baseURL + 'operation/EmptyBinPageData', data, { 'headers': this.option })
  }

  getEmptyBinCount(data: any) {
    return this.http.post(this.baseURL + 'operation/getEmptyBinCount', data, { 'headers': this.option })
  }

  submitEmptyBinRetrieve(data: any) {
    return this.http.post(this.baseURL + 'operation/emptyBinRequest', data, { 'headers': this.option });
  }

  updateRetrieveQueue(data: any) {
    return this.http.post(this.baseURL + 'operation/updateRetriveQueueList', data, { 'headers': this.option });
  }
  getStockAdjustmentData() {
    return this.http.get(this.baseURL + 'operation/stockAdjustmentBin', { 'headers': this.option })
  }

    stockAdjustmentRetrieval(data: any) {
        return this.http.post(this.baseURL + 'operation/stockAdjustmentBinRequest', data, { 'headers': this.option })
    }
    
    submitNextTrolley(data: any) { 
        return this.http.post(this.baseURL + 'ERP/nextTrolley', data, { 'headers': this.option });
    }

    getPendingTrolleyData(data: any) {
        return this.http.post(this.baseURL + 'ERP/getPendingTrolleyData', data, { 'headers': this.option });
    }

    getBinwiseOrderSummaryData() {
        return this.http.get(this.baseURL + 'operation/orderwiseBinSummary', { 'headers': this.option });   //to change
    }

    movetoPreBinning(data: any) {
        return this.http.post(this.baseURL + 'operation/MoveToPreBinning', data, { 'headers': this.option });
    }

    getDeviceList() {
        return this.http.get(this.baseURL + 'HHT/getDeveiceDetails', { 'headers': this.option });
    }

    updateDeviceRights(data: any) {
        return this.http.post(this.baseURL + 'HHT/giveDeviceRights', data, { 'headers': this.option });
    }

    getUserEntryLogList(data: any) {
        return this.http.post(this.baseURL + 'history/userEntryLog', data, { 'headers': this.option });
    }

    getLocationMaintenanceList(data: any) {
        return this.http.post(this.baseURL + 'status/locationMaintenance', data, { 'headers': this.option });
    }

    updateLocationMaintenance(data: any) {
        return this.http.post(this.baseURL + 'status/updateLocationMaintenance', data, { 'headers': this.option });
    }

    insertUserEntryLog(data: any) {
        return this.http.post(this.baseURL + 'history/insertUserEntryLog', data, { 'headers': this.option });
    }

    updateEmergencySemiautoCommand(data :any){
        return this.http.post(this.baseURL + 'status/updateEmergencySemiautoCommand', data, { 'headers': this.option });
    }

    updateEmergencyScreenData(data: any){
        return this.http.post(this.baseURL+ 'status/updateEmergencyScreenData', data, { 'headers': this.option });
    }

    getWCSAlarm(data: any) {
        return this.http.post(this.baseURL + 'status/getWCSAlarmData', data, { 'headers': this.option });
    }

    dataCancelProcess(data: any) {
        return this.http.post(this.baseURL + 'status/dataCancelProcess', data, { 'headers': this.option });
    }

    BinPresent(data: any) {
        return this.http.post(this.baseURL + 'status/BinPresent', data, { 'headers': this.option });
    }

    dataCancelFreeLocation(data: any) {
        return this.http.post(this.baseURL + 'status/dataCancelFreeLocation', data, { 'headers': this.option });
    }

    binMoveConfirm(data: any) {
        return this.http.post(this.baseURL + 'operation/binMoveConfirm', data, { 'headers': this.option });
    }

    binMoveRetry(data: any) {
        return this.http.post(this.baseURL + 'operation/binMoveRetry', data, { 'headers': this.option });
    }

    resetAlarm(data: any) {
        return this.http.post(this.baseURL + 'history/resetAlarm', data, { 'headers': this.option });
    }
    
    getAutoPalletRead(data: any)
    {
        return this.http.post(this.baseURL + 'status/getAutoPalletData', data, {'headers': this.option})
    }

    getLoadStationBuffer(data: any)
    {
      return this.http.post(this.baseURL + 'status/getLoadStationBuffer', data, {headers: this.option})
    }
 
    getUnloadStationBuffer(data: any)
    {
      return this.http.post(this.baseURL + 'status/getUnloadStationBuffer', data, {headers: this.option})
    }
 
    getLiftReachedBin(data: any)
    {
      return this.http.post(this.baseURL + 'status/getLiftReachedBin', data, {headers: this.option})
    }
 
    getLoadConveyorBuffer(data: any)
    {
      return this.http.post(this.baseURL + 'status/getLoadConveyorBuffer', data, {headers: this.option})
    }
 
    getWCSMLSSend(data: any)
    {
      return this.http.post(this.baseURL + 'status/getWCSMLSSend', data, {headers: this.option})
    }
 
    getWCSTLSend(data: any)
    {
      return this.http.post(this.baseURL + 'status/getWCSTLSend', data, {headers: this.option})
    }

    wcsAlarmReset()
    {
      return this.http.get(this.baseURL + 'status/wcsAlarmReset', {headers: this.option})
    }

    getERPConfirmation(data: any)
    {
        return this.http.post(this.baseURL + 'transaction/getERPConfirmation',data, {headers: this.option})
    }

    getGroundConveyor(data: any)
    {
        return this.http.post(this.baseURL + 'status/getGroundConveyor', data, {headers: this.option})
    }

    getBinData(data: any)
    {
        return this.http.post(this.baseURL + '/status/getBinData', data, {headers: this.option})
    }

    binWiseRetrieval(data: any)
    {
        return this.http.post(this.baseURL + 'status/binWiseRetrieval', data, {headers: this.option})
    }

    getAddressRegisterData(data: any)
    {
        return this.http.post(this.baseURL + 'config/addressDataLoad', data, {headers: this.option})
    }

    updateRegisterAddress(data: any)
    {
        return this.http.post(this.baseURL + 'config/updateRegisterAddress', data, {headers: this.option})
    }
    
    getbinRetrievalData(data: any)
    {
        return this.http.post(this.baseURL + 'operation/getBinRetrievalData', data, {headers: this.option})
    }

    unloadBin(data: any)
    {
        return this.http.post(this.baseURL + 'operation/unloadBin', data, {headers: this.option})
    }

    getMLSAutoCommandStore(data: any)
    {
      return this.http.post(this.baseURL + 'status/getMLSAutocmdData', data, {headers: this.option})
    } 

    getMLSError(data: any)
    {
      return this.http.post(this.baseURL + 'status/getMLSError', data, {headers: this.option})
    }

    getTLAutoCommandStore(data: any)
    {
      return this.http.post(this.baseURL + 'status/getTLAutocmdData', data, {headers: this.option})
    } 

    getTLError(data: any)
    {
      return this.http.post(this.baseURL + 'status/getTLError', data, {headers: this.option})
    }

    getTLSemiAutoCmd(data: any)
    {
      return this.http.post(this.baseURL + 'status/getTLSemiAutoCmd', data, {headers: this.option})
    }

    getMLSSemiAutoCmd(data: any)
    {
      return this.http.post(this.baseURL + 'status/getMLSSemiAutoCmd', data, {headers: this.option})
    }

    getWCSSendModbus(data: any)
    {
      return this.http.post(this.baseURL + 'status/getWCSSendModbus', data, {headers: this.option})
    }

    getOrderApproval(data: any)
    {
      return this.http.post(this.baseURL + 'operation/getOrderApproval',data, {headers: this.option})
    }

    getCraneMovement(data: any)
    {
      return this.http.post(this.baseURL + 'status/getCraneMovement', data, {headers: this.option})
    }

    getEquipmentDetails(data :any)
    {
      return this.http.post(this.baseURL + 'status/getEquipmentRequest', data, { headers: this.option})
    }

    getOeeTransaction(data: any)
    {
      return this.http.post(this.baseURL + 'transaction/getStoreRetrieveSummary', data, {headers: this.option})
    }

    getOrderProcessingSummary(data: any, exportFormat: string) { 
      const queryParams = new URLSearchParams(); 
      Object.keys(data).forEach(key => {
          queryParams.append(key, data[key]);
      }); 
      queryParams.append('exportFormat', exportFormat);   
  
      const url = `${this.baseURL}transaction/getOrderProcessingSummary?${queryParams.toString()}`;
      return this.http.get(url, { headers: this.option });
  }
  
 
    exportOrderProcessingSummary(apiData: any, exportFormat: string) {
    const queryParams = new URLSearchParams({ ...apiData, exportFormat }).toString();
    const url = `${this.baseURL}transaction/getOrderProcessingSummary?${queryParams}`;

    return this.http.get(url, { headers: this.option, responseType: 'blob' as 'json' }).subscribe(
      (response: Blob) => {
        const blobUrl = window.URL.createObjectURL(response);
        const a = document.createElement('a');
        a.href = blobUrl;
        const now = new Date();
        let filename = `OrderProcessingSummary_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
        filename += exportFormat === 'excel' ? '.xlsx' : `.${exportFormat}`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      },
      error => {
        Swal.fire({
            title: 'Error',
            text: 'Error fetching empty bin data.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
      }
    );
  }

   
  getPreBinningSummary(data: any, exportFormat: string) {
    const queryParams = new URLSearchParams();
    Object.keys(data).forEach(key => {
        queryParams.append(key, data[key]);
    });
    queryParams.append('exportFormat', exportFormat);  
 
    const url = `${this.baseURL}transaction/getPreBinningSummary?${queryParams.toString()}`;
    return this.http.get(url, { headers: this.option });
  }

  getRetrieveApprove(data: any)
  {
    return this.http.post(this.baseURL + 'operation/getRetrievalOrderData', data, {headers: this.option})
  }

  RetrievalOrderStart(data: any)
  {
    return this.http.post(this.baseURL + 'operation/retrievalOrderStart', data, {headers: this.option})
  }

  orderReExecute(data: any)
  {
    return this.http.post(this.baseURL + 'operation/orderReExecute', data, {headers: this.option})
  }


  RetrievalOrderHold(data: any)
  {
    return this.http.post(this.baseURL + 'operation/retrievalOrderHold', data, {headers: this.option})
  }

  RetrievalOrderDetails(data: any)
  {
    return this.http.post(this.baseURL + 'operation/RetrievalOrderDetails', data, {headers: this.option})
  }

//   getRetrievalOrderDetails(data: any)
//   {
//     return this.http.post(this.baseURL + 'operation/getRetrievalOrderDetails', data, {headers: this.option})
//   }

  TrolleyReprint(data: any)
  {
    return this.http.post(this.baseURL + 'ERP/getTrolleyReprint', data, {headers: this.option})
  }

   
  getEquipmentData(data: any)
  {
    return this.http.post(this.baseURL + 'config/getEquipmentData', data, {headers: this.option})
  }
 
  updateEquipmentData(data: any)
  {
    return this.http.post(this.baseURL + 'config/updateEquipmentData', data, {headers: this.option})
  }
 
  getEquipmentIPConfigData()
  {
    return this.http.get(this.baseURL + 'config/getEquipmentIPConfigData', {headers: this.option})
  }
 
  updateEquipmentIPConfigData(data: any)
  {
    return this.http.post(this.baseURL + 'config/updateEquipmentIPConfigData', data, {headers: this.option})
  }

    getAddressRegisterDataForOpc(data: any)
    {
        return this.http.post(this.baseURL + 'config/addressDataLoadOpc', data, {headers: this.option})
    }

    getPickingOrderBinDetails(data: any)
    {
        return this.http.post(this.baseURL + 'operation/getPickingOrderBinDetails', data, {headers: this.option})
    }
    
    downloadExportData(FileName: any, data: any, apiCall: any)
    {
      let url = `${this.baseURL}${apiCall}`;
      let exportFormat = data?.Type || 'xlsx'; // Default format if Type is undefined
      this.http.post(url, data , { headers: this.option, responseType: 'blob' }).subscribe(
        (response: Blob) => {
          const blobUrl = window.URL.createObjectURL(response);
          const a = document.createElement('a');
          a.href = blobUrl;

          const now = new Date();
          let filename = `${FileName}_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
          filename += exportFormat === 'excel' ? '.xlsx' : `.${exportFormat}`;

          a.download = filename;
          a.style.display = 'none'; // Hide element
          document.body.appendChild(a);
          a.click();

          // Cleanup
          window.URL.revokeObjectURL(blobUrl);
          document.body.removeChild(a);
        },
        error => {
          Swal.fire({
            title: 'Error',
            text: 'Error fetching data.',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      );
    }

  getPreBinningDataForRejection(data: any)
  {
        return this.http.post(this.baseURL + 'operation/binWisePreBinningReject', data, {headers: this.option})
  }
 
  rejectPreBinningData(data: any)
  {
        return this.http.post(this.baseURL + 'operation/rejectPreBinning', data, {headers: this.option})
  }

  getGrnPushingList(data: any)
  {
      return this.http.post(this.baseURL + 'ERP/getGRNPushingList', data, {headers: this.option})
  }

  getGrnPushingDetails(data: any)
  {
      return this.http.post(this.baseURL + 'ERP/getGRNPushingDetails', data, {headers: this.option})
  }

  submitGrnPushingRequest(data: any)
  {
      return this.http.post(this.baseURL + 'ERP/createGRNPushingTransaction', data, {headers: this.option})
  }

    // data cancel
    semiAutoCommand(data: any) {
        return this.http.post(this.baseURL + 'operation/semiAutoCommand', data, { headers: this.option });
    }
  
    wcsAlarmWrite(data: any) {
        return this.http.post(this.baseURL + 'operation/wcsAlarmWrite', data, { headers: this.option });
    }

    dataCancelProcessForBin_Moved5(data: any) {
        return this.http.post(this.baseURL + 'operation/dataCancelProcessForBin_Moved5', data, { headers: this.option });
    }

    getStoreRetrieveDashboard(data: any) {
        return this.http.post(this.baseURL + 'transaction/getStoreRetrieveDashboard', data, { headers: this.option });
    }

    getRetrieveReAssign(data: any) {
        return this.http.post(this.baseURL + 'operation/getRetrieveReAssign', data, { headers: this.option });
    }

    updateStationConfigData(data: any)
    {
        return this.http.post(this.baseURL + 'config/updateStationConfig', data, {headers: this.option})
    }
    
    getStationIPConfigData()
    {
        return this.http.get(this.baseURL + 'config/getStationConfig', {headers: this.option})
    }

    getPickStationData(data: any)
    {
        return this.http.post(this.baseURL + 'config/getPickStationData', data, {headers: this.option})
    }

    getPickingOrderDetails(data: any)
    {
        return this.http.post(this.baseURL + 'operation/getPickingOrderDetails', data, {headers: this.option})
    }

    uploadAlarmData(data: any) {
        return this.http.post(this.baseURL + 'config/addAlarmData', data, { headers: this.option });
    }

    // Label Print
    getLabelPrintConfig() {
        return this.http.get(this.baseURL + 'label-print/config', { headers: this.option });
    }

    getLabelPrinters() {
        return this.http.get(this.baseURL + 'label/printers', { headers: this.option });
    }

    detectLabelPrinters() {
        return this.http.post(this.baseURL + 'label/printers/detect', {}, { headers: this.option });
    }

    reserveLabelNumbers(data: any) {
        return this.http.post(this.baseURL + 'label/reserveLabelNumbers', data, { headers: this.option });
    }

    printLabels(data: any) {
        return this.http.post(this.baseURL + 'label/print', data, { headers: this.option });
    }
}
