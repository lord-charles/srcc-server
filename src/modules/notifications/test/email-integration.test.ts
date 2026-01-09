import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../services/notification.service';

describe('NotificationService Email Integration', () => {
  let service: NotificationService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'EMAIL_SERVICE_URL':
                  return 'https://emails.safravo.co.ke';
                case 'SMTP_USER':
                  return 'test@example.com';
                case 'SMTP_PASS':
                  return 'test-password';
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize email client with correct URL', () => {
    expect(configService.get).toHaveBeenCalledWith('EMAIL_SERVICE_URL');
  });

  // Note: Add actual integration tests here when email service is deployed
  // These would test actual email sending functionality

  describe('Email Service Integration', () => {
    it('should have email client configured', () => {
      expect(service['emailClient']).toBeDefined();
    });

    // Uncomment and modify when ready to test with real email service
    /*
    it('should send email successfully', async () => {
      const result = await service.sendEmail(
        'test@example.com',
        'Test Subject',
        'Test message'
      );
      expect(result).toBe(true);
    });

    it('should send email with attachments', async () => {
      const attachments = [
        {
          filename: 'test.txt',
          content: Buffer.from('test content'),
        },
      ];
      
      const result = await service.sendEmailWithAttachments(
        'test@example.com',
        'Test Subject',
        'Test message',
        attachments
      );
      expect(result).toBe(true);
    });
    */
  });
});
