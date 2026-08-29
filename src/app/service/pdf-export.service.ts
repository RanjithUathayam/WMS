import { Injectable } from '@angular/core';
import * as jspdf from 'jspdf';
import html2canvas from 'html2canvas';
import 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {

  constructor() { }

  exportToPdf(data: any[], fileName: string): void {
    const tableRows = [];
    data.forEach(item => {
      const row = [];
      for (const key in item) {
        if (item.hasOwnProperty(key)) {
          row.push(item[key]);
        }
      }
      tableRows.push(row);
    });
    const doc: any = new jspdf.default();
    const totalPagesExp = '{total_pages_count_string}';

    doc.autoTable({
      head: [Object.keys(data[0])],
      body: tableRows,
      didDrawPage: data => {
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(10);
        doc.text('Page ' + data.pageNumber + ' of ' + pageCount, data.settings.margin.left, doc.internal.pageSize.height - 10);
      },
      margin: { top: 40 }
    });

    // Set page number to footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.text(10, 10, `Page ${i} of ${totalPages}`);
    }

    doc.save(fileName + '.pdf');
  }
}
