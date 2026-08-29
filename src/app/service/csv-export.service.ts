import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CsvExportService {

  constructor() { }

  exportToCsv(data: any[], fileName: string): void {
    const csvData = this.convertToCsv(data);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName + '.csv';
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private convertToCsv(data: any[]): string {
    const header = Object.keys(data[0]).join(',');
    const rows = data.map(item => Object.values(item).join(','));
    return header + '\n' + rows.join('\n');
  }
}
