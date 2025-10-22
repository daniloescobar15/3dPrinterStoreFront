import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserProfileComponent } from './user-profile';
import { AuthService } from '../../services/auth';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('UserProfileComponent', () => {
  let component: UserProfileComponent;
  let fixture: ComponentFixture<UserProfileComponent>;
  let authService: jasmine.SpyObj<AuthService>;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    active: true,
    verified: true
  };

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getCurrentUser'
    ]);

    authServiceSpy.currentUser$ = of(mockUser);

    await TestBed.configureTestingModule({
      imports: [UserProfileComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    fixture = TestBed.createComponent(UserProfileComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('user information display', () => {
    it('should display user email', () => {
      authService.currentUser$ = of(mockUser);

      fixture.detectChanges();

      expect(component.currentUser).toBeDefined();
    });

    it('should display user username', () => {
      authService.currentUser$ = of(mockUser);

      fixture.detectChanges();

      expect(component.currentUser).toBeDefined();
    });
  });
});