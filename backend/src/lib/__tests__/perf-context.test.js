const { getPerfContext, runWithPerfContext, createPerfContext } = require('../perf-context');

describe('perf-context', () => {
  it('should return null when called outside a context', () => {
    // Act
    const ctx = getPerfContext();

    // Assert
    expect(ctx).toBeNull();
  });

  it('createPerfContext should return a zeroed-out context object', () => {
    // Act
    const ctx = createPerfContext();

    // Assert
    expect(ctx).toEqual({
      db_query_count: 0,
      db_time_ms: 0,
      db_rows: 0,
      cache_checked: false,
      cache_hit: false,
      cache_time_ms: 0,
    });
  });

  it('should return the provided context when inside runWithPerfContext', (done) => {
    // Arrange
    const ctx = createPerfContext();
    ctx.db_query_count = 5; // mutate to verify it's the same instance

    // Act
    runWithPerfContext(ctx, () => {
      const retrievedCtx = getPerfContext();

      // Assert
      expect(retrievedCtx).toBe(ctx);
      expect(retrievedCtx.db_query_count).toBe(5);
      
      // Complete async test
      done();
    });
  });

  it('should maintain distinct contexts across asynchronous boundaries', async () => {
    // Arrange
    const ctx1 = createPerfContext();
    ctx1.db_query_count = 1;

    const ctx2 = createPerfContext();
    ctx2.db_query_count = 2;

    // Act & Assert
    const p1 = new Promise((resolve) => {
      runWithPerfContext(ctx1, async () => {
        // simulate async work
        await new Promise((r) => setTimeout(r, 10));
        expect(getPerfContext()).toBe(ctx1);
        resolve();
      });
    });

    const p2 = new Promise((resolve) => {
      runWithPerfContext(ctx2, async () => {
        // simulate async work
        await new Promise((r) => setTimeout(r, 10));
        expect(getPerfContext()).toBe(ctx2);
        resolve();
      });
    });

    await Promise.all([p1, p2]);
    
    // Outside context
    expect(getPerfContext()).toBeNull();
  });
});
