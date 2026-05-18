const { redis } = require("./redis");

const CACHE_TIMEOUT_MS = Number(process.env.CACHE_TIMEOUT_MS || 120);

async function withTimeout(promise, fallback = null) {
  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), CACHE_TIMEOUT_MS);
  });

  // Attach a catch handler to the input promise to prevent it from causing
  // an unhandled promise rejection if it rejects in the background after the timeout has resolved.
  if (promise && typeof promise.catch === "function") {
    promise.catch((err) => {
      console.warn("[Redis Cache Background Error]", err.message);
    });
  }

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function cacheGetJson(key) {
  if (!key) return null;
  try {
    const raw = await withTimeout(redis.get(key), null);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("[Redis] GET error", err);
    return null;
  }
}

async function cacheSetJson(key, ttlSec, value) {
  if (!key || !ttlSec) return;
  try {
    const payload = JSON.stringify(value);
    withTimeout(redis.setex(key, ttlSec, payload), null).catch((err) => {
      console.error("[Redis Cache Set Background Failure]", err.message);
    });
  } catch (_err) {
    // Best-effort write only.
  }
}

async function cacheDel(keys) {
  if (!keys || keys.length === 0) return;
  try {
    await Promise.all(
      keys.map((key) =>
        withTimeout(redis.del(key), null).catch((err) => {
          console.error("[Redis Cache Del Background Failure]", err.message);
        })
      )
    );
  } catch (_err) {
    // Best-effort invalidation only.
  }
}

async function cacheDelPattern(pattern) {
  if (!pattern) return;
  
  return new Promise((resolve) => {
    try {
      if (redis && typeof redis.scanStream === "function") {
        const stream = redis.scanStream({
          match: pattern,
          count: 100
        });

        const deletePromises = [];

        stream.on("data", (resultKeys) => {
          if (resultKeys && resultKeys.length > 0) {
            const p = withTimeout(redis.del(...resultKeys), null).catch((err) => {
              console.error("[Redis Cache Pattern Del Batch Failure]", err.message);
            });
            deletePromises.push(p);
          }
        });

        stream.on("end", async () => {
          try {
            await Promise.all(deletePromises);
          } catch (err) {
            console.error("[Redis Cache Pattern Del Wait Failure]", err.message);
          }
          resolve();
        });

        stream.on("error", (err) => {
          console.error("[Redis Cache Pattern Del Stream Error]", err.message);
          resolve();
        });
      } else if (redis && typeof redis.keys === "function") {
        // Fallback for simpler custom mock/test redis objects
        withTimeout(redis.keys(pattern), [])
          .then(async (keys) => {
            if (keys && keys.length > 0) {
              await withTimeout(redis.del(...keys), null);
            }
            resolve();
          })
          .catch((err) => {
            console.error("[Redis Cache Pattern Del Keys Fallback Failure]", err.message);
            resolve();
          });
      } else {
        resolve();
      }
    } catch (err) {
      console.error("[Redis Cache Pattern Del Failure]", err.message);
      resolve();
    }
  });
}

module.exports = {
  cacheGetJson,
  cacheSetJson,
  cacheDel,
  cacheDelPattern,
};

