jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation((name) => ({
      name,
      add: jest.fn().mockResolvedValue({ id: 'real-job' })
    }))
  };
});

describe('queue', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  it('should export a mock assignmentQueue when dummy redis is used', async () => {
    // Dummy redis is used when REDIS_URL is absent
    delete process.env.REDIS_URL;
    process.env.NODE_ENV = 'development';
    
    // Require the queue
    const { assignmentQueue } = require('../queue');
    
    // Assert it has mock behavior
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('BullMQ queues are disabled'));
    
    const result = await assignmentQueue.add('testJob', { data: 123 });
    expect(result.id).toContain('mock-job-');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[Queue Mock] Job 'testJob' enqueued with data:"), { data: 123 });
  });

  it('should export real BullMQ Queue when real redis is used', () => {
    // Provide a REDIS_URL so real ioredis is used
    process.env.REDIS_URL = 'redis://localhost:6379';
    
    // We also need to mock ioredis so it doesn't really connect
    jest.mock('ioredis', () => {
      return jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        status: 'connecting' // Need a property to make isDummyRedis evaluate to false
      }));
    });
    
    const { assignmentQueue } = require('../queue');
    const { Queue } = require('bullmq');
    
    expect(Queue).toHaveBeenCalledWith('exam-assignments', expect.any(Object));
    // The Queue constructor sets up a real queue
    expect(assignmentQueue.name).toBe('exam-assignments');
  });
});
