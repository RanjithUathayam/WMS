import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';


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

@Injectable({
  providedIn: 'root'
})
export class DataService {


  private dataSource = new BehaviorSubject<PrebinningItem[]>([]);
  currentData = this.dataSource.asObservable();
  private lengthOfLevelSource = new BehaviorSubject<number>(null);
  private lengthOfBaySource = new BehaviorSubject<number>(null);
  private formDataSubject = new BehaviorSubject<any>(null);
  private dataSubject = new BehaviorSubject<string>('');
  private TransactionListdataSubject = new BehaviorSubject<string>('');
  private PalletrequestListdataSubject = new BehaviorSubject<string>('');
  private StorageRetrivaldataSubject = new BehaviorSubject<string>('');
  private AlarmHistorydataSubject = new BehaviorSubject<string>('');
  private RejectedPalletdataSubject = new BehaviorSubject<string>('');
  private MaintenanceHistorydataSubject = new BehaviorSubject<string>('');
  private UserLogdataSubject = new BehaviorSubject<string>('');
  private OrderWiseBinSummarydataSubject = new BehaviorSubject<string>('');

  lengthOfLevel$ = this.lengthOfLevelSource.asObservable();
  lengthOfBay$ = this.lengthOfBaySource.asObservable();

  setLengthOfLevel(length: number) {
    this.lengthOfLevelSource.next(length);
  }

  setLengthOfBay(length: number) {
    this.lengthOfBaySource.next(length);
  }

  setData(data: string): void {
    this.dataSubject.next(data);
  }
  getData(): Observable<string> {
    return this.dataSubject.asObservable();
  }
  setTransactionListData(data: string): void {
    this.TransactionListdataSubject.next(data);
  }
  getTransactionListData(): Observable<string> {
    return this.TransactionListdataSubject.asObservable();
  }

  setPalletrequestListData(data: string): void {
    this.PalletrequestListdataSubject.next(data);
  }
  getPalletrequestListData(): Observable<string> {
    return this.PalletrequestListdataSubject.asObservable();
  }

  setOrderWiseBinSummarydataSubject(data: string): void {
    this.OrderWiseBinSummarydataSubject.next(data);
  }
  getOrderWiseBinSummarydataSubject(): Observable<string> {
    return this.OrderWiseBinSummarydataSubject.asObservable();
  }

  setStorageRetrivalData(data: string): void {
    this.StorageRetrivaldataSubject.next(data);
  }
  getStorageRetrivalData(): Observable<string> {
    return this.StorageRetrivaldataSubject.asObservable();
  }

  setAlarmHistoryData(data: string): void {
    this.AlarmHistorydataSubject.next(data);
  }
  getAlarmHistoryData(): Observable<string> {
    return this.AlarmHistorydataSubject.asObservable();
  }

  setRejectedPalletData(data: string): void {
    this.RejectedPalletdataSubject.next(data);
  }
  getRejectedPalletData(): Observable<string> {
    return this.RejectedPalletdataSubject.asObservable();
  }

  setMaintenanceHistoryData(data: string): void {
    this.MaintenanceHistorydataSubject.next(data);
  }
  getMaintenanceHistoryData(): Observable<string> {
    return this.MaintenanceHistorydataSubject.asObservable();
  }

  setUserlogData(data: string): void {
    this.UserLogdataSubject.next(data);
  }
  getUserlogData(): Observable<string> {
    return this.UserLogdataSubject.asObservable();
  }

  mergedData: any[] = []
  recieveScheduledData(scheduleData: any, selectStation: any, selectShift: any, selectDate: any, typeSelect: any) {
    this.mergedData = {
      ...scheduleData,
      Station: selectStation,
      shuffleTime: selectShift,
      scheduleTime: selectDate,
      reqtype: typeSelect
    }; 
  }

  sendDataToSchedule() {
    return this.mergedData;
  }

  emptyBinData: any[] = []
  receivedatafromemptybin(data: any): void { 
    this.emptyBinData = data;
    this.formDataSubject.next(data);
  }

  getFormData(): Observable<any> {
    return this.formDataSubject.asObservable();
  }

  getEmptyBinData() {
    return this.emptyBinData;
  }


  changeData(data: PrebinningItem[]) {
    this.dataSource.next(data); 
  }

}
