import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { JwtService } from '@nestjs/jwt';
import { SystemLogsService } from '../system-logs/services/system-logs.service';
import { NotificationService } from '../notifications/services/notification.service';
import { ConsultantService } from './consultant.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('test-token'),
          },
        },
        {
          provide: SystemLogsService,
          useValue: {
            createLog: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {},
        },
        {
          provide: ConsultantService,
          useValue: {},
        },
        {
          provide: getModelToken('Organization'),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sanitizeUser', () => {
    it('should include permissions in sanitized user object', () => {
      const mockUser: any = {
        _id: '123',
        email: 'test@example.com',
        phoneNumber: '1234567890',
        status: 'active',
        registrationStatus: 'complete',
        isPhoneVerified: true,
        isEmailVerified: true,
        firstName: 'Test',
        lastName: 'User',
        permissions: {
          '/my-projects': ['read', 'write'],
          '/projects': [],
        },
        toObject: function() { return this; }
      };
      
      const sanitizedUser = (service as any).sanitizeUser(mockUser);
      
      expect(sanitizedUser.permissions).toBeDefined();
      expect(sanitizedUser.permissions['/my-projects']).toEqual(['read', 'write']);
      expect(sanitizedUser.permissions['/projects']).toEqual([]);
    });
  });
});
