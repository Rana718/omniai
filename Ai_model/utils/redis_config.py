import redis.asyncio as redis
import os
import asyncio

redis_client: redis.Redis = None
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

async def init_redis():
    global redis_client
    try:
        print(f"🔄 Attempting to connect to Redis at: {REDIS_URL}")
        
        redis_client = redis.from_url(
            REDIS_URL, 
            decode_responses=True,
            socket_timeout=5,
            socket_connect_timeout=5,
            retry_on_timeout=True,
            health_check_interval=30
        )
        
        await asyncio.wait_for(redis_client.ping(), timeout=10)
        print("✅ Redis connected successfully via URL")
        
        try:
            await redis_client.config_set('maxmemory-policy', 'allkeys-lru')
            print("✅ Redis memory policy configured")
        except Exception as e:
            print(f"⚠️ Could not configure Redis memory policy: {e}")
            
        await redis_client.set("test_key", "test_value", ex=10)
        test_value = await redis_client.get("test_key")
        if test_value == "test_value":
            print("✅ Redis read/write operations working")
            await redis_client.delete("test_key")
        else:
            print("⚠️ Redis read/write test failed")
            
    except asyncio.TimeoutError:
        print(f"❌ Redis connection timeout after 10 seconds")
        print(f"   URL: {REDIS_URL}")
        print("   Make sure Redis server is running and accessible")
        redis_client = None
        raise
    except redis.ConnectionError as e:
        print(f"❌ Redis connection error: {e}")
        print(f"   URL: {REDIS_URL}")
        print("   Check if Redis server is running on the specified host/port")
        redis_client = None
        raise
    except redis.AuthenticationError as e:
        print(f"❌ Redis authentication failed: {e}")
        print("   Check Redis username/password in connection URL")
        redis_client = None
        raise
    except Exception as e:
        print(f"❌ Unexpected Redis error: {type(e).__name__}: {e}")
        print(f"   URL: {REDIS_URL}")
        redis_client = None
        raise

async def close_redis():
    global redis_client
    if redis_client:
        try:
            await redis_client.close()
            print("✅ Redis disconnected gracefully")
        except Exception as e:
            print(f"⚠️ Error during Redis disconnect: {e}")
        finally:
            redis_client = None
    else:
        print("ℹ️ Redis was not connected, no cleanup needed")

def get_redis() -> redis.Redis:
    if redis_client is None:
        print("⚠️ Redis client is None - check connection status")
    return redis_client

async def is_redis_connected() -> bool:
    """Check if Redis is connected and responsive"""
    if redis_client is None:
        return False
    try:
        await redis_client.ping()
        return True
    except Exception as e:
        print(f"⚠️ Redis health check failed: {e}")
        return False

async def clear_cache_pattern(pattern: str):
    if not await is_redis_connected():
        print(f"❌ Cannot clear cache pattern {pattern}: Redis not connected")
        return
        
    try:
        keys = await redis_client.keys(pattern)
        if keys:
            await redis_client.delete(*keys)
            print(f"🗑️ Cleared {len(keys)} cache entries matching pattern: {pattern}")
        else:
            print(f"ℹ️ No keys found matching pattern: {pattern}")
    except Exception as e:
        print(f"❌ Error clearing cache pattern {pattern}: {e}")

async def get_cache_stats():
    if not await is_redis_connected():
        print("❌ Cannot get cache stats: Redis not connected")
        return {"status": "disconnected"}
        
    try:
        info = await redis_client.info('memory')
        dbsize = await redis_client.dbsize()
        return {
            'status': 'connected',
            'used_memory': info.get('used_memory_human', 'Unknown'),
            'used_memory_peak': info.get('used_memory_peak_human', 'Unknown'),
            'keyspace': dbsize,
            'url': REDIS_URL
        }
    except Exception as e:
        print(f"❌ Error getting cache stats: {e}")
        return {"status": "error", "error": str(e)}