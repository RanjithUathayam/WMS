import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AboutComponent } from './about/about.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { InventoryListComponent } from './inventory-list/inventory-list.component';
import { UserlogComponent } from './userlog/userlog.component';
import { MainpageComponent } from './mainpage/mainpage.component';
import { UserControlComponent } from './main/user-control/user-control.component';
import { ItemComponent } from './item/item.component';
import { TableConfigComponent } from './table-config/table-config.component';
import { PrebinningApprovalComponent } from './prebinning-approval/prebinning-approval.component';
import { PrebinningStatusComponent } from './prebinning-status/prebinning-status.component';
import { UserEntryLogComponent } from './user-entry-log/user-entry-log.component';
import { AuthGuard } from './auth.guard';
import { BinwisePrebininningActionComponent } from './binwise-prebininning-action/binwise-prebininning-action.component';
import { GrnPushingComponent } from './grn-pushing/grn-pushing.component';
import { LabelPrintComponent } from './label-print/label-print.component';
import { LocationMasterComponent } from './location-master/location-master.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'developer', component: TableConfigComponent },
  {
    path: 'mainpage', component: MainpageComponent,  canActivate: [AuthGuard], children: [
        { path: 'home', component: HomeComponent },
        { path: 'about', component: AboutComponent },
        { path: 'user_entry_log', component: UserEntryLogComponent },
        { path: 'userlog', component: UserlogComponent },
        { path: 'inventory_list/:id', component: InventoryListComponent },
        { path: 'operation_binwisePrebinningReject', component: BinwisePrebininningActionComponent},
        { path: 'grn_pushing', component: GrnPushingComponent },
        { path: 'label_print', component: LabelPrintComponent },
        { path: 'prebinning_aaproval', component: PrebinningApprovalComponent },
        { path: 'prebinning_status', component: PrebinningStatusComponent },
        { path: 'user-control', component: UserControlComponent },
        { path: 'item', component: ItemComponent },
        { path: 'LocationMaster', component: LocationMasterComponent },
    ]
  }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})


export class AppRoutingModule { }
