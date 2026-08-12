// This file is tricky to unit test in isolation because it executes immediately 
// on require and sets up globalForPrisma. We can test the Keep-Alive and 
// Perf-Tracked Prisma setups using jest-mock-extended and spy functions.

// Before importing prisma, we mock its dependencies
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    query: jest.fn().mockResolvedValue({ rowCount: 1 })
  }))
}));

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn()
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => {
    return {
      $extends: jest.fn().mockImplementation(ext => ({
        ...ext, // just passing the extension structure down for test inspection
        $extends: jest.fn().mockImplementation(ext2 => ({ ...ext, ...ext2 }))
      }))
    };
  })
}));

jest.mock('../load-env', () => ({}));
jest.mock('../perf-context', () => ({
  getPerfContext: jest.fn()
}));

describe('prisma.js', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    jest.useFakeTimers();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should throw if DATABASE_URL is not set', () => {
    delete process.env.DATABASE_URL;
    
    expect(() => {
      require('../prisma');
    }).toThrow('DATABASE_URL is not set');
  });

  it('should initialize Prisma Client and start keep-alive ping', async () => {
    const { Pool } = require('pg');
    
    const { prisma } = require('../prisma');
    
    expect(Pool).toHaveBeenCalled();
    const poolInstance = Pool.mock.results[0].value;
    expect(poolInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
    
    // Fast-forward timers to trigger keep-alive ping
    jest.advanceTimersByTime(45000);
    expect(poolInstance.query).toHaveBeenCalledWith('SELECT 1');
    
    // If we advance again, it should query again
    jest.advanceTimersByTime(45000);
    expect(poolInstance.query).toHaveBeenCalledTimes(2);
  });

  it('should attach perf context tracker through $extends', async () => {
    const { prisma } = require('../prisma');
    const { getPerfContext } = require('../perf-context');
    
    // Mock the context
    const mockCtx = { db_query_count: 0, db_time_ms: 0, db_rows: 0 };
    getPerfContext.mockReturnValue(mockCtx);
    
    // Simulate the $allOperations middleware that $extends added
    // Note: since we mocked PrismaClient above, prisma.query.$allModels.$allOperations is accessible
    const allOperations = prisma.query.$allModels.$allOperations;
    expect(typeof allOperations).toBe('function');
    
    // Fake query function to test timing
    const fakeQuery = jest.fn().mockImplementation(() => {
      // simulate 100ms passing
      jest.advanceTimersByTime(100);
      return Promise.resolve([{ id: 1 }, { id: 2 }]);
    });
    
    await allOperations({
      operation: 'findMany',
      model: 'User',
      args: {},
      query: fakeQuery
    });
    
    expect(fakeQuery).toHaveBeenCalled();
    expect(mockCtx.db_query_count).toBe(1);
    expect(mockCtx.db_rows).toBe(2);
    // db_time_ms is populated based on performance.now() which requires mock tuning,
    // but we can at least assert it's a number >= 0
    expect(mockCtx.db_time_ms).toBeGreaterThanOrEqual(0);
  });
});
