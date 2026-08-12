const { sendMail } = require('../mailer.service');

describe('mailer.service', () => {
  let originalEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    originalEnv = process.env;
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('sendMail', () => {
    it('should throw if SMTP_FROM and SMTP_USER are not set', async () => {
      delete process.env.SMTP_FROM;
      delete process.env.SMTP_USER;
      process.env.BREVO_API_KEY = 'test-key';

      await expect(sendMail({ to: 'test@example.com', subject: 'sub', text: 'text', html: 'html' }))
        .rejects.toThrow('SMTP_FROM or SMTP_USER is required');
    });

    it('should throw if BREVO_API_KEY and SMTP_PASS are not set', async () => {
      process.env.SMTP_FROM = 'no-reply@example.com';
      delete process.env.BREVO_API_KEY;
      delete process.env.SMTP_PASS;

      await expect(sendMail({ to: 'test@example.com', subject: 'sub', text: 'text', html: 'html' }))
        .rejects.toThrow('BREVO_API_KEY or SMTP_PASS is required');
    });

    it('should call fetch with correct parameters', async () => {
      process.env.SMTP_FROM = 'no-reply@example.com';
      process.env.BREVO_API_KEY = 'test-key';

      global.fetch.mockResolvedValueOnce({ ok: true });

      await sendMail({ to: 'test@example.com', subject: 'Subject', text: 'Text', html: '<p>HTML</p>' });

      expect(global.fetch).toHaveBeenCalledWith('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': 'test-key'
        },
        body: JSON.stringify({
          sender: { email: 'no-reply@example.com', name: 'NCC Exam Portal' },
          to: [{ email: 'test@example.com' }],
          subject: 'Subject',
          textContent: 'Text',
          htmlContent: '<p>HTML</p>'
        })
      });
    });

    it('should throw if fetch returns not ok', async () => {
      process.env.SMTP_FROM = 'no-reply@example.com';
      process.env.BREVO_API_KEY = 'test-key';

      global.fetch.mockResolvedValueOnce({ 
        ok: false, 
        status: 400,
        text: async () => 'Bad Request' 
      });

      await expect(sendMail({ to: 'test@example.com', subject: 'sub', text: 'text', html: 'html' }))
        .rejects.toThrow('Brevo API error: 400 Bad Request');
    });
  });
});
