import { vi } from 'vitest';

// Mock environmental variables
process.env.JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-chars';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-that-is-at-least-thirty-two-chars';
process.env.SESSION_SECRET = 'test-session-secret-that-is-at-least-thirty-two-chars';


// Mock S3 / AWS SDK
vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: class {
      send = vi.fn();
    },
    PutObjectCommand: class {},
    DeleteObjectCommand: class {},
    GetObjectCommand: class {},
  };
});
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://mock-s3-url.com/file'),
}));

// Mock Resend Email
vi.mock('resend', () => {
  return {
    Resend: class {
      emails = {
        send: vi.fn().mockResolvedValue({ id: 'mock-email-id' }),
      };
    },
  };
});

// Mock Google Calendar API
vi.mock('@googleapis/calendar', () => {
  return {
    calendar: vi.fn().mockReturnValue({
      events: {
        insert: vi.fn().mockResolvedValue({ data: { hangoutLink: 'https://meet.google.com/mock', id: 'mock-event' } }),
        delete: vi.fn().mockResolvedValue({}),
      },
    }),
    auth: {
      OAuth2: class {
        setCredentials = vi.fn();
      },
    },
  };
});

// Clean up mocks after every test
import { afterEach } from 'vitest';
afterEach(() => {
  vi.clearAllMocks();
});
