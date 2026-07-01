import { Redis } from '@upstash/redis'

/**
 * Lazily-created Upstash Redis client. Reads UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN from the environment at first use — NOT at module
 * load — so `next build` doesn't fail when those vars aren't present at build
 * time.
 */
let client: Redis | null = null

export function getRedis(): Redis {
  if (!client) client = Redis.fromEnv()
  return client
}
