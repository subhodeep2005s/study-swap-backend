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

const redisStore = new Map<string, string>();

vi.mock('@/config/redis', () => ({
  redis: {
    get: vi.fn().mockImplementation((key) => Promise.resolve(redisStore.get(key) ?? null)),
    set: vi.fn().mockImplementation((key, val, ...args) => {
      if (args.includes('NX') && redisStore.has(key)) return Promise.resolve(null);
      redisStore.set(key, val.toString());
      return Promise.resolve('OK');
    }),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockImplementation((key) => {
      redisStore.delete(key);
      return Promise.resolve(1);
    }),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    on: vi.fn().mockReturnThis(),
    quit: vi.fn().mockResolvedValue('OK'),
    subscribe: vi.fn(),
    publish: vi.fn(),
    psubscribe: vi.fn().mockResolvedValue(1),
    punsubscribe: vi.fn().mockResolvedValue(1),
    smembers: vi.fn().mockResolvedValue([]),
    duplicate: vi.fn().mockReturnThis(),
    ttl: vi.fn().mockImplementation((key: string) => {
      return Promise.resolve(redisStore.has(key) ? 300 : -2);
    }),
    keys: vi.fn().mockImplementation((pattern: string) => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return Promise.resolve(Array.from(redisStore.keys()).filter(k => regex.test(k)));
    }),
    multi: vi.fn().mockImplementation(() => {
      const chain = {
        get: vi.fn().mockReturnThis(),
        set: function(key: string, val: any, ...args: any[]) {
          if (args.includes('NX') && redisStore.has(key)) return this;
          redisStore.set(key, val.toString());
          return this;
        },
        setex: vi.fn().mockReturnThis(),
        del: vi.fn().mockReturnThis(),
        incr: function(key: string) {
          const val = parseInt(redisStore.get(key) || '0') + 1;
          redisStore.set(key, val.toString());
          return this;
        },
        expire: vi.fn().mockReturnThis(),
        sadd: vi.fn().mockReturnThis(),
        srem: vi.fn().mockReturnThis(),
        zadd: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      return chain;
    }),
  },
  closeRedis: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('ioredis', () => {
  const RedisMock = class {
    get = vi.fn().mockImplementation((key) => Promise.resolve(redisStore.get(key) ?? null));
    set = vi.fn().mockImplementation((key, val, ...args) => {
      if (args.includes('NX') && redisStore.has(key)) return Promise.resolve(null);
      redisStore.set(key, val.toString());
      return Promise.resolve('OK');
    });
    setex = vi.fn().mockResolvedValue('OK');
    del = vi.fn().mockImplementation((key) => {
      redisStore.delete(key);
      return Promise.resolve(1);
    });
    incr = vi.fn().mockResolvedValue(1);
    expire = vi.fn().mockResolvedValue(1);
    on = vi.fn().mockReturnThis();
    quit = vi.fn().mockResolvedValue('OK');
    duplicate = vi.fn().mockReturnThis();
    psubscribe = vi.fn().mockResolvedValue(1);
    punsubscribe = vi.fn().mockResolvedValue(1);
    smembers = vi.fn().mockResolvedValue([]);
    ttl = vi.fn().mockImplementation((key: string) => {
      return Promise.resolve(redisStore.has(key) ? 300 : -2);
    });
    keys = vi.fn().mockImplementation((pattern: string) => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return Promise.resolve(Array.from(redisStore.keys()).filter(k => regex.test(k)));
    });
    multi = vi.fn().mockImplementation(() => {
      const chain = {
        get: vi.fn().mockReturnThis(),
        set: function(key: string, val: any, ...args: any[]) {
          if (args.includes('NX') && redisStore.has(key)) return this;
          redisStore.set(key, val.toString());
          return this;
        },
        setex: vi.fn().mockReturnThis(),
        del: vi.fn().mockReturnThis(),
        incr: function(key: string) {
          const val = parseInt(redisStore.get(key) || '0') + 1;
          redisStore.set(key, val.toString());
          return this;
        },
        expire: vi.fn().mockReturnThis(),
        sadd: vi.fn().mockReturnThis(),
        srem: vi.fn().mockReturnThis(),
        zadd: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      return chain;
    });
  };
  return { default: RedisMock, Redis: RedisMock };
});

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
