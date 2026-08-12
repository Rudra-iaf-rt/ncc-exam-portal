const { cacheGetJson, cacheSetJson, cacheGetOrFetch, cacheDel, cacheDelNamespace, withCacheLock, trackKey } = require('../cache');
const { redis } = require('../redis');
const { getPerfContext } = require('../perf-context');

jest.mock('../redis', () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    sadd: jest.fn(),
    smembers: jest.fn(),
    incr: jest.fn()
  }
}));

jest.mock('../perf-context', () => ({
  getPerfContext: jest.fn()
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cacheGetJson', () => {
    it('should return null if key is not provided', async () => {
      const result = await cacheGetJson(null);
      expect(result).toBeNull();
      expect(redis.get).not.toHaveBeenCalled();
    });

    it('should return parsed JSON when key exists in redis', async () => {
      // Arrange
      const mockData = { user: 1 };
      redis.get.mockResolvedValueOnce(JSON.stringify(mockData));
      getPerfContext.mockReturnValueOnce({ cache_checked: false, cache_time_ms: 0, cache_hit: false });

      // Act
      const result = await cacheGetJson('testKey');

      // Assert
      expect(redis.get).toHaveBeenCalledWith('testKey');
      expect(result).toEqual(mockData);
    });

    it('should return null when key does not exist', async () => {
      // Arrange
      redis.get.mockResolvedValueOnce(null);

      // Act
      const result = await cacheGetJson('missingKey');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle redis errors gracefully and return null', async () => {
      // Arrange
      redis.get.mockRejectedValueOnce(new Error('Redis is down'));

      // Act
      const result = await cacheGetJson('errorKey');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('cacheSetJson', () => {
    it('should set JSON value in redis with ttl', async () => {
      // Arrange
      redis.setex.mockResolvedValueOnce('OK');
      
      // Act
      await cacheSetJson('setKey', 60, { hello: 'world' });

      // Assert
      expect(redis.setex).toHaveBeenCalledWith('setKey', 60, JSON.stringify({ hello: 'world' }));
    });

    it('should track key if namespace is provided', async () => {
      // Arrange
      redis.setex.mockResolvedValueOnce('OK');
      redis.sadd.mockResolvedValueOnce(1);
      
      // Act
      await cacheSetJson('nsKey', 60, { a: 1 }, 'testNamespace');

      // Assert
      expect(redis.setex).toHaveBeenCalledWith('nsKey', 60, JSON.stringify({ a: 1 }));
      expect(redis.sadd).toHaveBeenCalledWith('keys:testNamespace', 'nsKey');
    });
  });

  describe('cacheGetOrFetch', () => {
    it('should fetch and set if key is not in redis (test env avoids l1 cache)', async () => {
      // Arrange
      redis.get.mockResolvedValueOnce(null);
      redis.setex.mockResolvedValueOnce('OK');
      const fetchFn = jest.fn().mockResolvedValue({ fetched: true });

      // Act
      const result = await cacheGetOrFetch('fetchKey', 30, fetchFn);

      // Assert
      expect(redis.get).toHaveBeenCalledWith('fetchKey');
      expect(fetchFn).toHaveBeenCalled();
      expect(redis.setex).toHaveBeenCalledWith('fetchKey', 30, JSON.stringify({ fetched: true }));
      expect(result).toEqual({ fetched: true });
    });

    it('should return from redis without calling fetchFn if key exists', async () => {
      // Arrange
      redis.get.mockResolvedValueOnce(JSON.stringify({ cached: true }));
      const fetchFn = jest.fn();

      // Act
      const result = await cacheGetOrFetch('hitKey', 30, fetchFn);

      // Assert
      expect(fetchFn).not.toHaveBeenCalled();
      expect(result).toEqual({ cached: true });
    });
  });

  describe('cacheDel', () => {
    it('should call redis.del with all keys', async () => {
      // Arrange
      redis.del.mockResolvedValueOnce(2);

      // Act
      await cacheDel(['key1', 'key2']);

      // Assert
      expect(redis.del).toHaveBeenCalledWith('key1', 'key2');
    });
  });

  describe('cacheDelNamespace', () => {
    it('should delete all keys in the namespace set, then delete the set', async () => {
      // Arrange
      redis.smembers.mockResolvedValueOnce(['k1', 'k2']);
      redis.del.mockResolvedValue('OK');

      // Act
      await cacheDelNamespace('myNamespace');

      // Assert
      expect(redis.smembers).toHaveBeenCalledWith('keys:myNamespace');
      expect(redis.del).toHaveBeenCalledWith('k1', 'k2'); // deletes members
      expect(redis.del).toHaveBeenCalledWith('keys:myNamespace'); // deletes set
    });
  });

  describe('withCacheLock', () => {
    it('should execute callback if lock is acquired', async () => {
      // Arrange
      redis.set.mockResolvedValueOnce('OK'); // lock acquired
      redis.del.mockResolvedValueOnce(1); // lock released
      const callback = jest.fn().mockResolvedValue('done');

      // Act
      const result = await withCacheLock('myLock', 10, callback);

      // Assert
      expect(redis.set).toHaveBeenCalledWith('lock:myLock', '1', 'EX', 10, 'NX');
      expect(callback).toHaveBeenCalled();
      expect(result).toBe('done');
      expect(redis.del).toHaveBeenCalledWith('lock:myLock');
    });

    it('should not execute callback and return null if lock is not acquired', async () => {
      // Arrange
      redis.set.mockResolvedValueOnce(null); // lock not acquired
      const callback = jest.fn();

      // Act
      const result = await withCacheLock('myLock', 10, callback);

      // Assert
      expect(redis.set).toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
      expect(result).toBeNull();
      expect(redis.del).not.toHaveBeenCalled(); // doesn't delete if didn't acquire
    });
  });
});
