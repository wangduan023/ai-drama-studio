/**
 * Shared Subscriber for SSE Channels
 *
 * Manages Redis subscriptions with reference counting to support
 * multiple SSE clients sharing the same subscription.
 */

import { logError } from './logger'
import type { Redis } from 'ioredis'

type MessageHandler = (message: string) => void

/**
 * Creates a new Redis subscriber instance
 */
function createSubscriber(): Redis {
  const Redis = require('ioredis')
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  return new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 3) return null
      return Math.min(times * 100, 3000)
    },
  })
}

export class SharedSubscriber {
  private readonly subscriber: Redis
  private readonly listeners = new Map<string, Map<number, MessageHandler>>()
  private listenerSeq = 1

  constructor() {
    this.subscriber = createSubscriber()

    // Handle incoming messages
    this.subscriber.on('message', (channel, message) => {
      const channelListeners = this.listeners.get(channel)
      if (!channelListeners || channelListeners.size === 0) return

      for (const handler of channelListeners.values()) {
        try {
          handler(message)
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error)
          logError(`[SSE:shared] listener error channel=${channel} error=${message}`)
        }
      }
    })

    // Handle Redis errors
    this.subscriber.on('error', (error) => {
      logError(`[SSE:shared] redis error: ${error?.message || 'unknown'}`)
    })
  }

  /**
   * Add a listener to a channel
   * @param channel - Channel name to subscribe to
   * @param handler - Message handler function
   * @returns Unsubscribe function
   */
  async addChannelListener(
    channel: string,
    handler: MessageHandler
  ): Promise<() => Promise<void>> {
    let channelListeners = this.listeners.get(channel)
    if (!channelListeners) {
      channelListeners = new Map<number, MessageHandler>()
      this.listeners.set(channel, channelListeners)
    }

    const listenerId = this.listenerSeq++
    channelListeners.set(listenerId, handler)

    try {
      // Only subscribe if this is the first listener
      if (channelListeners.size === 1) {
        await this.subscriber.subscribe(channel)
      }
    } catch (error) {
      channelListeners.delete(listenerId)
      if (channelListeners.size === 0) {
        this.listeners.delete(channel)
      }
      throw error
    }

    // Return unsubscribe function
    return async () => {
      const listeners = this.listeners.get(channel)
      if (!listeners) return

      listeners.delete(listenerId)
      if (listeners.size > 0) return

      // Unsubscribe if no more listeners
      this.listeners.delete(channel)
      try {
        await this.subscriber.unsubscribe(channel)
      } catch {
        // Ignore unsubscribe errors
      }
    }
  }

  /**
   * Get the number of listeners for a channel
   */
  getListenerCount(channel: string): number {
    const channelListeners = this.listeners.get(channel)
    return channelListeners?.size || 0
  }

  /**
   * Clean up and close the subscriber
   */
  async cleanup(): Promise<void> {
    this.listeners.clear()
    await this.subscriber.quit()
  }
}

// Singleton pattern for global subscriber
type GlobalWithSubscriber = typeof globalThis & {
  __dramaStudioSharedSubscriber?: SharedSubscriber
}

const globalForSharedSubscriber = globalThis as GlobalWithSubscriber

export function getSharedSubscriber(): SharedSubscriber {
  if (!globalForSharedSubscriber.__dramaStudioSharedSubscriber) {
    globalForSharedSubscriber.__dramaStudioSharedSubscriber = new SharedSubscriber()
  }
  return globalForSharedSubscriber.__dramaStudioSharedSubscriber
}
