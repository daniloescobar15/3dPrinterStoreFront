import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { FooterComponent } from './footer';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render footer element', () => {
    fixture.detectChanges();

    const footer = fixture.nativeElement.querySelector('footer');
    expect(footer).toBeTruthy();
  });

  it('should display company information', () => {
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toBeTruthy();
  });

  it('should include copyright notice', () => {
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent.toLowerCase();
    const hasCopyright = content.includes('copyright') || content.includes('©');
    expect(hasCopyright).toBeTrue();
  });
});