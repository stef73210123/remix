import { Redis } from '@upstash/redis'

/**
 * Upstash Redis client. Reads UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN from the environment.
 */
export const redis = Redis.fromEnv()
