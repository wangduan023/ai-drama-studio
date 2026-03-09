/**
 * Redis Client Factory for SSE
 */

import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

/**
 * Create a Redis publisher client
 */
export function createPublisher(): Redis {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) return null
      return Math.min(times * 100, 3000)
    },
  })
}

/**
 * Create a Redis subscriber client
 */
export function createSubscriber(): Redis {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) return null
      return Math.min(times * 100, 3000)
    },
  })
}

/**
 * Get or create shared subscriber instance (singleton pattern)
 */
type GlobalWithSubscriber = typeof globalThis & {
  __dramaStudioSharedSubscriber?: Redis
}

const globalForSubscriber = globalThis as GlobalWithSubscriber

export function getSharedSubscriber(): Redis {
  if (!globalForSubscriber.__dramaStudioSharedSubscriber) {
    globalForSubscriber.__dramaStudioSharedSubscriber = createSubscriber()
  }
  return globalForSubscriber.__dramaStudioSharedSubscriber
}
