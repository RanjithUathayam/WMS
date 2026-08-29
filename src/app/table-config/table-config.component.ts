import { Component,ViewChild, ElementRef } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { SwalService } from '../service/swal.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-table-config',
  templateUrl: './table-config.component.html',
  styleUrls: ['./table-config.component.css']
})
export class TableConfigComponent {

  tableInputs: any = [];
  outsideInputValue: any = '';

  @ViewChild('outsideInput') outsideInput: ElementRef;
  tableData: any[] = [{ header: '', data: '', search: true }]; // Initial row
  constructor(private swal : SwalService){}

  addRowAfterIndex(index: number) {
    const newRow = { header: '', data: '', search: true };
    this.tableData.splice(index + 1, 0, newRow); // Insert new row below the clicked row
  }
  
  deleteRow(index: number) {
    if (this.tableData.length > 1) {
      this.tableData.splice(index, 1); // Remove the row at the specified index
    } else { 
      Swal.fire("Deletion failed: Only one row exists!");

    }
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.tableData, event.previousIndex, event.currentIndex);
  }

  clearFields() {
    // Loop through each row and reset the values to empty strings
    this.tableData.forEach(row => {
      row.header = '';
      row.data = '';
      row.search = true; // Assuming you want to reset the search select to "True"
    });
    if (this.outsideInput) {
      this.outsideInput.nativeElement.value = ''; // Clear the value of the input box
    }
  }

  submitForm() {
    const emptyFields = this.tableData.some(row => row.header.trim() === '' || row.data.trim() === '');
    if (emptyFields) { 
      Swal.fire({
        title: "Validation Error?",
        text: "Fill every required fields",
        icon: "question"
      });
    } else {
      this.outsideInputValue = this.outsideInput.nativeElement.value;
  
      this.tableInputs = this.tableData.map(row => ({ header: row.header, data: row.data, search: row.search })); 
    }
  }
}
