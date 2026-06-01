/**
 * Email + signup verification integration tests.
 * Run: npm test -- --testPathPattern=email.integration
 *
 * Uses mocked nodemailer — no real SMTP required.
 */
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { configuration } from '../src/config/configuration';
import { EmailService } from '../src/modules/invitations/email.service';

const sendMailMock = jest.fn().mockResolvedValue({ messageId: 'test-id', response: '250 OK' });
const verifyMock = jest.fn().mockResolvedValue(true);

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: sendMailMock,
    verify: verifyMock,
  })),
}));

describe('EmailService (integration)', () => {
  let emailService: EmailService;

  beforeEach(async () => {
    sendMailMock.mockClear();
    verifyMock.mockClear();
    process.env.SMTP_HOST = 'localhost';
    process.env.SMTP_PORT = '1025';
    process.env.SMTP_FROM = 'test@example.com';

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
      ],
      providers: [EmailService],
    }).compile();

    emailService = moduleRef.get(EmailService);
    await emailService.onModuleInit();
  });

  it('sendVerificationEmail calls transporter.sendMail with verify link', async () => {
    await emailService.sendVerificationEmail({
      to: 'user@example.com',
      fullName: 'Test User',
      verifyUrl: 'http://localhost:3001/verify-email?token=abc123',
      verifyPageUrl: 'http://localhost:3001/verify-email',
      shortCode: '482913',
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mail = sendMailMock.mock.calls[0][0];
    expect(mail.to).toBe('user@example.com');
    expect(mail.subject).toContain('Verify your email');
    expect(mail.html).toContain('verify-email?token=abc123');
  });

  it('sendInvitation calls transporter.sendMail with accept link', async () => {
    const acceptUrl = 'http://3.110.214.243:3000/invite/token456';
    await emailService.sendInvitation({
      to: 'invitee@example.com',
      organizationName: 'Acme Corp',
      inviterName: 'Owner',
      role: 'member',
      acceptUrl,
      directAppUrl: acceptUrl,
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mail = sendMailMock.mock.calls[0][0];
    expect(mail.to).toBe('invitee@example.com');
    expect(mail.subject).toContain('Acme Corp');
    expect(mail.html).toContain('/invite/token456');
    expect(mail.html).toContain(`href="${acceptUrl}"`);
    expect(mail.html).toContain('display:block');
    expect(mail.html).toContain('Not spam');
  });

  it('propagates SMTP send failures instead of swallowing them', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(
      emailService.sendInvitation({
        to: 'fail@example.com',
        organizationName: 'Org',
        inviterName: 'Admin',
        role: 'member',
        acceptUrl: 'http://localhost:3001/invite/x',
        directAppUrl: 'http://localhost:3001/invite/x',
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining('Could not send email'),
    });
  });
});

describe('buildInviteAcceptUrls', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    jest.resetModules();
  });

  it('uses frontend /invite for button and copy-paste (ignores PUBLIC_API_URL)', async () => {
    process.env.APP_MODE = 'production';
    process.env.FRONTEND_URL_PRODUCTION = 'http://3.110.214.243:3000';
    process.env.PUBLIC_API_URL = 'http://3.110.214.243:3007';
    const { buildInviteAcceptUrls } = await import(
      '../src/common/utils/frontend-url.util'
    );
    const { acceptUrl, directAppUrl } = buildInviteAcceptUrls('abc');
    const expected = 'http://3.110.214.243:3000/invite/abc';
    expect(acceptUrl).toBe(expected);
    expect(directAppUrl).toBe(expected);
  });
});

describe('getFrontendUrl', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    jest.resetModules();
  });

  it('uses FRONTEND_URL when set', async () => {
    process.env.FRONTEND_URL = 'https://app.example.com/';
    const { getFrontendUrl } = await import('../src/common/utils/frontend-url.util');
    expect(getFrontendUrl()).toBe('https://app.example.com');
  });

  it('uses FRONTEND_URL_LOCAL in development mode', async () => {
    delete process.env.FRONTEND_URL;
    process.env.APP_MODE = 'development';
    process.env.FRONTEND_URL_LOCAL = 'http://localhost:3008';
    const { getFrontendUrl } = await import('../src/common/utils/frontend-url.util');
    expect(getFrontendUrl()).toBe('http://localhost:3008');
  });

  it('uses FRONTEND_URL_PRODUCTION in production mode', async () => {
    delete process.env.FRONTEND_URL;
    process.env.APP_MODE = 'production';
    process.env.FRONTEND_URL_PRODUCTION = 'http://3.110.214.243:3000';
    const { getFrontendUrl } = await import('../src/common/utils/frontend-url.util');
    expect(getFrontendUrl()).toBe('http://3.110.214.243:3000');
  });
});
