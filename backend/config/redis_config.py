import redis.asyncio as redis
import os

redis_client: redis.Redis = None
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

async def init_redis():
    global redis_client
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    await redis_client.ping()
    print("✅ Redis connected via URL")
    try:
        await redis_client.config_set('maxmemory-policy', 'allkeys-lru')
        print("✅ Redis memory policy configured")
    except Exception as e:
        print(f"⚠️ Could not configure Redis memory policy: {e}")

async def close_redis():
    if redis_client:
        await redis_client.close()
        print("❌ Redis disconnected")

def get_redis() -> redis.Redis:
    return redis_client

async def clear_cache_pattern(pattern: str):
    try:
        keys = await redis_client.keys(pattern)
        if keys:
            await redis_client.delete(*keys)
            print(f"🗑️ Cleared {len(keys)} cache entries matching pattern: {pattern}")
    except Exception as e:
        print(f"❌ Error clearing cache pattern {pattern}: {e}")

async def get_cache_stats():
    try:
        info = await redis_client.info('memory')
        return {
            'used_memory': info.get('used_memory_human', 'Unknown'),
            'used_memory_peak': info.get('used_memory_peak_human', 'Unknown'),
            'keyspace': await redis_client.dbsize()
        }
    except Exception as e:
        print(f"❌ Error getting cache stats: {e}")
        return {}
