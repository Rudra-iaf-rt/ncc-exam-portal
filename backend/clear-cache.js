require('dotenv').config({ path: './.env' });
const Redis = require('ioredis');

async function clearCache() {
  if (!process.env.REDIS_URL) {
    console.log("No REDIS_URL found. Assuming in-memory cache.");
    return;
  }
  const redis = new Redis(process.env.REDIS_URL);
  
  try {
    const keys = await redis.keys('leaderboard:unit:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log('Cleared keys:', keys);
    } else {
      console.log('No cache keys found.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
clearCache().catch(console.error);
