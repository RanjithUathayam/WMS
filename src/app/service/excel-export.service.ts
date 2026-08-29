// import { Injectable } from '@angular/core';
// import * as ExcelJS from 'exceljs';

// @Injectable({
//   providedIn: 'root'
// })
// export class ExcelExportService {
//   constructor() { }

//   exportToExcel(htmlTableId: string, fileName: string): void {
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('Data');

//     const htmlTable = document.getElementById(htmlTableId);
//     const rows = htmlTable.querySelectorAll('tr');

//     rows.forEach(row => {
//       const cells = row.querySelectorAll('th, td');
//       const rowData = [];
//       cells.forEach(cell => {
//         rowData.push(cell.textContent.trim());
//       });
//       worksheet.addRow(rowData);
//     });

//     workbook.xlsx.writeBuffer().then((buffer: ArrayBuffer) => {
//       const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
//       const url = window.URL.createObjectURL(blob);
//       const anchor = document.createElement('a');
//       anchor.href = url;
//       anchor.download = fileName + '.xlsx';
//       anchor.click();
//       window.URL.revokeObjectURL(url);
//     });
//   }
// }
import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {

  constructor() { }

  exportToExcel(data: any[], fileName: string): void {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Add headers
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);

    // Add data
    data.forEach((item: any) => {
      const row = [];
      headers.forEach((header: string) => {
        row.push(item[header]);
      });
      worksheet.addRow(row);
    });

    // Generate Excel file
    workbook.xlsx.writeBuffer().then((buffer: ArrayBuffer) => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName + '.xlsx';
      anchor.click();
      window.URL.revokeObjectURL(url);
    });
  }
}
