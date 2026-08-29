import { AsyncPipe, DecimalPipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NgbAlertModule, NgbDropdownModule, NgbModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { AutocompleteLibModule } from 'angular-ng-autocomplete';
import { NgSelect2Module } from 'ng-select2';
import { NgxPaginationModule } from 'ngx-pagination';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AboutComponent } from './about/about.component';
import { BinwisePrebininningActionComponent } from './binwise-prebininning-action/binwise-prebininning-action.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { DynamicTableComponent } from './components/dynamic-table/dynamic-table.component';
import { ExportModalComponent } from './components/export-modal/export-modal.component';
import { PopupComponent } from './components/popup/popup.component';
import { GrnPushingComponent } from './grn-pushing/grn-pushing.component';
import { HeaderComponent } from './header/header.component';
import { LabelPrintComponent } from './label-print/label-print.component';
import { HhtDeviceRightsComponent } from './hht-device-rights/hht-device-rights.component';
import { HomeComponent } from './home/home.component';
import { InventoryListComponent } from './inventory-list/inventory-list.component';
import { LocationMasterComponent } from './location-master/location-master.component';
import { UserControlComponent } from './main/user-control/user-control.component';
import { MainpageComponent } from './mainpage/mainpage.component';
import { ItemComponent } from './item/item.component';
import { LoginComponent } from './login/login.component';
import { NavComponent } from './nav/nav.component';
import { PrebinningApprovalComponent } from './prebinning-approval/prebinning-approval.component';
import { PrebinningStatusComponent } from './prebinning-status/prebinning-status.component';
import { PrebinningSummaryComponent } from './prebinning-summary/prebinning-summary.component';
import { ShortcutsComponent } from './shortcuts/shortcuts.component';
import { SidenavComponent } from './sidenav/sidenav.component';
import { TableConfigComponent } from './table-config/table-config.component';
import { UserEntryLogComponent } from './user-entry-log/user-entry-log.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { UserlogComponent } from './userlog/userlog.component';

@NgModule({
  declarations: [
    AppComponent,
    AboutComponent,
    BinwisePrebininningActionComponent,
    ChangePasswordComponent,
    DynamicTableComponent,
    ExportModalComponent,
    GrnPushingComponent,
    HeaderComponent,
    HhtDeviceRightsComponent,
    HomeComponent,
    InventoryListComponent,
    ItemComponent,
    LabelPrintComponent,
    LocationMasterComponent,
    LoginComponent,
    MainpageComponent,
    NavComponent,
    PopupComponent,
    PrebinningApprovalComponent,
    PrebinningStatusComponent,
    PrebinningSummaryComponent,
    ShortcutsComponent,
    SidenavComponent,
    TableConfigComponent,
    UserControlComponent,
    UserEntryLogComponent,
    UserManagementComponent,
    UserlogComponent
  ],
  imports: [
    AppRoutingModule,
    AsyncPipe,
    AutocompleteLibModule,
    BrowserAnimationsModule,
    BrowserModule,
    DecimalPipe,
    DragDropModule,
    FormsModule,
    HttpClientModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
    NgbAlertModule,
    NgbDropdownModule,
    NgbModule,
    NgbPaginationModule,
    NgSelect2Module,
    NgxPaginationModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent],
  schemas: [NO_ERRORS_SCHEMA]
})
export class AppModule {}
