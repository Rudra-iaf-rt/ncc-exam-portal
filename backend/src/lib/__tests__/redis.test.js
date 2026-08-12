// We mock ioredis to ensure it doesn't try to connect to a real server if REDIS_URL happens to be set
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      on: jest.fn(),
      get: jest.fn(),
      set: jest.fn()
    };
  });
});

describe('redis dummy mock', () => {
  const ORIGINAL_ENV = process.env;
  let redisModule;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    // Force the dummy mock to load by unsetting REDIS_URL
    delete process.env.REDIS_URL;
    process.env.NODE_ENV = 'development'; // allow missing REDIS_URL

    jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    redisModule = require('../redis');
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  it('should log a warning and return dummy implementation if REDIS_URL is not set', () => {
    const { redis } = redisModule;
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('REDIS_URL is not set'));
    expect(redis.get).toBeDefined(); // dummy methods
    expect(redis.set).toBeDefined();
  });

  it('should throw in production if REDIS_URL is not set', () => {
    jest.resetModules();
    process.env.NODE_ENV = 'production';
    expect(() => {
      require('../redis');
    }).toThrow('REDIS_URL is required in production');
  });

  it('dummy implementation should get/set basic string values', async () => {
    const { redis } = redisModule;
    
    await redis.set('mykey', 'myvalue');
    const result = await redis.get('mykey');
    
    expect(result).toBe('myvalue');
  });

  it('dummy set NX should not overwrite existing key', async () => {
    const { redis } = redisModule;
    
    await redis.set('nxkey', 'first');
    const result1 = await redis.set('nxkey', 'second', 'EX', 10, 'NX'); // Should fail and return null
    const val = await redis.get('nxkey');
    
    expect(result1).toBeNull();
    expect(val).toBe('first');
  });

  it('dummy set NX should set if key does not exist', async () => {
    const { redis } = redisModule;
    
    const result = await redis.set('new_nxkey', 'hello', 'EX', 10, 'NX');
    const val = await redis.get('new_nxkey');
    
    expect(result).toBe('OK');
    expect(val).toBe('hello');
  });

  it('dummy sadd and smembers should work correctly', async () => {
    const { redis } = redisModule;
    
    await redis.sadd('myset', 'a', 'b');
    const added = await redis.sadd('myset', 'b', 'c');
    
    expect(added).toBe(1); // 'b' was already there, only 'c' added
    
    const members = await redis.smembers('myset');
    expect(members.sort()).toEqual(['a', 'b', 'c']);
  });

  it('dummy del should delete keys and sets', async () => {
    const { redis } = redisModule;
    
    await redis.set('k1', 'v1');
    await redis.sadd('s1', 'm1');
    
    const deleted = await redis.del('k1', 's1', 'nonexistent');
    expect(deleted).toBe(1); // only k1 counts for memoryMap deletion in the fake logic (based on the provided implementation)
    
    expect(await redis.get('k1')).toBeNull();
    expect(await redis.smembers('s1')).toEqual([]);
  });

  it('dummy incr should increment values correctly', async () => {
    const { redis } = redisModule;
    
    const v1 = await redis.incr('counter');
    const v2 = await redis.incr('counter');
    
    expect(v1).toBe(1);
    expect(v2).toBe(2);
  });
});
