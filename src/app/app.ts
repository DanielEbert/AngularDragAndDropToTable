import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { parquetReadObjects } from 'hyparquet';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './app.html',
    styleUrls: ['./app.scss'],
})
export class App {
    isDragging = false;
    isDropZoneVisible = true;
    csvInput = '';

    headers: string[] = [];
    originalRows: any[][] = [];
    filteredRows: any[][] = [];

    sortColumnIndex: number | null = null;
    sortDirection: 'asc' | 'desc' | null = null;

    filterTexts: string[] = [];

    paginatedRows: any[][] = [];
    currentPage = 1;
    itemsPerPage = 10;

    onDragOver(event: DragEvent): void {
        event.preventDefault();
    }

    hasAnyFilter(): boolean {
        return Array.isArray(this.filterTexts) && this.filterTexts.some(t => t !== '');
    }

    onDragEnter(event: DragEvent): void {
        event.preventDefault();
        this.isDragging = true;
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        this.isDragging = false;
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        this.isDragging = false;
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.name.endsWith('.parquet')) {
                this.readParquetFile(file);
            } else {
                this.readFileAsText(file);
            }
        }
    }

    readFileAsText(file: File): void {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            const csvContent = e.target?.result as string;
            this.csvInput = csvContent;
            this.processCsvData(csvContent);
        };
        reader.readAsText(file);
    }

    async readParquetFile(file: File): Promise<void> {
        try {
            const buffer = await file.arrayBuffer();
            const rows = await parquetReadObjects({ file: buffer });
            const csv = this.convertToCSV(rows);
            this.csvInput = csv;
            this.processCsvData(csv);
        } catch (e) {
            console.error('Error reading parquet file:', e);
        }
    }

    convertToCSV(data: any[]): string {
        if (data.length === 0) return '';
        console.log(data);
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        for (const row of data) {
            const values = headers.map((header) => {
                const cellValue = row[header];
                const escaped = (cellValue === null || cellValue === undefined ? '' : '' + cellValue).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }
        return csvRows.join('\n');
    }

    processCsvData(csvString: string): void {
        if (!csvString) return;
        const lines = csvString.trim().split('\n');
        this.headers = lines.shift()?.split(',') || [];
        this.originalRows = lines.map((line) =>
            line.split(',').map((cell) => cell.replace(/^"|"$/g, ''))
        );
        this.filterTexts = new Array(this.headers.length).fill('');
        this.applyFiltersAndSort();
    }

    sortData(columnIndex: number): void {
        if (this.sortColumnIndex === columnIndex) {
            if (this.sortDirection === 'asc') {
                this.sortDirection = 'desc';
            } else if (this.sortDirection === 'desc') {
                this.sortDirection = null; // Third click resets sorting
                this.sortColumnIndex = null;
            }
        } else {
            this.sortColumnIndex = columnIndex;
            this.sortDirection = 'asc';
        }
        this.applyFiltersAndSort();
    }

    applyFiltersAndSort(): void {
        let processedRows = [...this.originalRows];

        // Filtering
        this.filterTexts.forEach((filter, index) => {
            if (filter) {
                const operatorRegex = /^(>=|<=|>|<|=)\s*(-?\d+(\.\d+)?)$/;
                const match = filter.trim().match(operatorRegex);

                if (match) {
                    const operator = match[1];
                    const value = parseFloat(match[2]);
                    processedRows = processedRows.filter((row) => {
                        const cellValue = parseFloat(row[index]);
                        if (isNaN(cellValue)) return false;
                        switch (operator) {
                            case '>=':
                                return cellValue >= value;
                            case '<=':
                                return cellValue <= value;
                            case '>':
                                return cellValue > value;
                            case '<':
                                return cellValue < value;
                            case '=':
                                return cellValue === value;
                            default:
                                return false;
                        }
                    });
                } else {
                    const lowerCaseFilter = filter.toLowerCase();
                    processedRows = processedRows.filter((row) =>
                        (row[index] || '').toString().toLowerCase().includes(lowerCaseFilter)
                    );
                }
            }
        });

        // Sorting
        if (this.sortColumnIndex !== null && this.sortDirection !== null) {
            processedRows.sort((a, b) => {
                const valA = a[this.sortColumnIndex!] ?? '';
                const valB = b[this.sortColumnIndex!] ?? '';
                const isNum = valA !== '' && valB !== '' && !isNaN(Number(valA)) && !isNaN(Number(valB));

                const aCompare = isNum ? Number(valA) : valA.toString().toLowerCase();
                const bCompare = isNum ? Number(valB) : valB.toString().toLowerCase();

                if (aCompare < bCompare) return this.sortDirection === 'asc' ? -1 : 1;
                if (aCompare > bCompare) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        this.filteredRows = processedRows;
        this.currentPage = 1;
        this.updatePaginatedRows();
    }

    updatePaginatedRows(): void {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        this.paginatedRows = this.filteredRows.slice(startIndex, endIndex);
    }

    previousPage(): void {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePaginatedRows();
        }
    }

    nextPage(): void {
        if (this.currentPage < this.getTotalPages()) {
            this.currentPage++;
            this.updatePaginatedRows();
        }
    }

    goToFirstPage(): void {
        if (this.currentPage > 1) {
            this.currentPage = 1;
            this.updatePaginatedRows();
        }
    }

    goToLastPage(): void {
        if (this.currentPage < this.getTotalPages()) {
            this.currentPage = this.getTotalPages();
            this.updatePaginatedRows();
        }
    }

    getTotalPages(): number {
        if (this.filteredRows.length === 0) return 1;
        return Math.ceil(this.filteredRows.length / this.itemsPerPage);
    }

    onItemsPerPageChange(event: Event): void {
        const target = event.target as HTMLSelectElement;
        const value = Number(target.value);
        this.itemsPerPage = value === 0 ? Number.MAX_SAFE_INTEGER : value;
        this.currentPage = 1;
        this.updatePaginatedRows();
    }

    toggleDropZone(): void {
        this.isDropZoneVisible = !this.isDropZoneVisible;
    }
}
