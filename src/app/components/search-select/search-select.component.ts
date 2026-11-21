import { Component, ElementRef, forwardRef, HostListener, Input, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SearchSelectOption {
  value: any;
  label: string;
}

/**
 * Lightweight searchable dropdown (no jQuery) that works with formControlName / ngModel.
 * Type to filter, Arrow keys to move, Enter to pick, Esc to close.
 */
@Component({
  selector: 'app-search-select',
  templateUrl: './search-select.component.html',
  styleUrls: ['./search-select.component.css'],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SearchSelectComponent), multi: true }]
})
export class SearchSelectComponent implements ControlValueAccessor {
  @Input() options: SearchSelectOption[] = [];
  @Input() placeholder = 'Select';
  @Input() searchPlaceholder = 'Search...';
  /** Label for the "no selection" entry (value ''); set to null to hide it. */
  @Input() allLabel: string | null = 'All';
  @Input() inputId?: string;

  @ViewChild('searchBox') searchBox?: ElementRef<HTMLInputElement>;

  value: any = '';
  open = false;
  disabled = false;
  term = '';
  activeIndex = 0;

  private onChange: (v: any) => void = () => { };
  private onTouched: () => void = () => { };

  constructor(private elementRef: ElementRef) { }

  get selectedLabel(): string {
    const match = this.options.find((o) => o.value === this.value);
    if (match) return match.label;
    return this.value === '' || this.value == null ? (this.allLabel ?? this.placeholder) : String(this.value);
  }

  get filtered(): SearchSelectOption[] {
    const t = this.term.trim().toLowerCase();
    const list = t ? this.options.filter((o) => o.label.toLowerCase().includes(t)) : this.options;
    return this.allLabel !== null && !t ? [{ value: '', label: this.allLabel }, ...list] : list;
  }

  toggle(): void {
    if (this.disabled) return;
    this.open ? this.close() : this.openPanel();
  }

  openPanel(): void {
    this.open = true;
    this.term = '';
    const idx = this.filtered.findIndex((o) => o.value === this.value);
    this.activeIndex = idx >= 0 ? idx : 0;
    setTimeout(() => {
      this.searchBox?.nativeElement.focus();
      this.scrollActiveIntoView();
    });
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.onTouched();
  }

  select(option: SearchSelectOption): void {
    this.value = option.value;
    this.onChange(this.value);
    this.close();
  }

  onTermChange(term: string): void {
    this.term = term;
    this.activeIndex = 0;
  }

  onKeydown(event: KeyboardEvent): void {
    const list = this.filtered;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex = Math.min(this.activeIndex + 1, list.length - 1);
      this.scrollActiveIntoView();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex = Math.max(this.activeIndex - 1, 0);
      this.scrollActiveIntoView();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (list[this.activeIndex]) this.select(list[this.activeIndex]);
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      this.close();
    }
  }

  private scrollActiveIntoView(): void {
    setTimeout(() => {
      const el = this.elementRef.nativeElement.querySelector('.ss-option.is-active');
      el?.scrollIntoView({ block: 'nearest' });
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open && !this.elementRef.nativeElement.contains(event.target)) this.close();
  }

  // ControlValueAccessor
  writeValue(v: any): void { this.value = v ?? ''; }
  registerOnChange(fn: (v: any) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }
}
