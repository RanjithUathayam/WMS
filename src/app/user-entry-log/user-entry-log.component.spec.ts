import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserEntryLogComponent } from './user-entry-log.component';

describe('UserEntryLogComponent', () => {
  let component: UserEntryLogComponent;
  let fixture: ComponentFixture<UserEntryLogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [UserEntryLogComponent]
    });
    fixture = TestBed.createComponent(UserEntryLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
