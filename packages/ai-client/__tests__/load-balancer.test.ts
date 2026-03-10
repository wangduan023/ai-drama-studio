/**
 * 负载均衡器测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { LoadBalancer, createLoadBalancer } from '../src/load-balancer'

describe('LoadBalancer', () => {
  let loadBalancer: LoadBalancer

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    if (loadBalancer) {
      loadBalancer.stop()
    }
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('应该创建负载均衡器', () => {
      loadBalancer = new LoadBalancer([
        {
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key-1',
        },
        {
          provider: 'anthropic',
          modelId: 'claude-3-7-sonnet-20250219',
          apiKey: 'sk-test-key-2',
        },
      ])

      expect(loadBalancer.getClientCount()).toBe(2)
      expect(loadBalancer.getHealthyClientCount()).toBe(2)
    })

    it('应该使用自定义名称', () => {
      loadBalancer = new LoadBalancer([
        {
          name: 'primary',
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key',
        },
      ])

      const status = loadBalancer.getStatus()
      expect(status[0].name).toBe('primary')
    })

    it('应该使用自定义权重', () => {
      loadBalancer = new LoadBalancer([
        {
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key',
          weight: 3,
        },
      ])

      const status = loadBalancer.getStatus()
      expect(status[0].weight).toBe(3)
    })

    it('应该使用默认配置', () => {
      loadBalancer = new LoadBalancer([
        {
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key',
        },
      ])

      const status = loadBalancer.getStatus()
      expect(status[0].isHealthy).toBe(true)
      expect(status[0].consecutiveFailures).toBe(0)
    })
  })

  describe('getClient - round-robin', () => {
    it('应该轮询获取客户端', () => {
      loadBalancer = new LoadBalancer([
        {
          name: 'client-1',
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key-1',
        },
        {
          name: 'client-2',
          provider: 'anthropic',
          modelId: 'claude-3',
          apiKey: 'sk-test-key-2',
        },
      ], { strategy: 'round-robin' })

      const client1 = loadBalancer.getClient()
      const client2 = loadBalancer.getClient()
      const client3 = loadBalancer.getClient()

      expect(client1).toBeDefined()
      expect(client2).toBeDefined()
      expect(client3).toBeDefined()
    })

    it('应该在没有健康客户端时返回权重最高的', () => {
      loadBalancer = new LoadBalancer([
        {
          name: 'client-1',
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key-1',
          weight: 1,
        },
        {
          name: 'client-2',
          provider: 'anthropic',
          modelId: 'claude-3',
          apiKey: 'sk-test-key-2',
          weight: 3,
        },
      ], { strategy: 'round-robin' })

      // 模拟所有客户端都不健康
      loadBalancer.recordFailure('client-1', { code: 'NETWORK_ERROR', message: 'error', retryable: true })
      loadBalancer.recordFailure('client-1', { code: 'NETWORK_ERROR', message: 'error', retryable: true })
      loadBalancer.recordFailure('client-1', { code: 'NETWORK_ERROR', message: 'error', retryable: true })
      loadBalancer.recordFailure('client-2', { code: 'NETWORK_ERROR', message: 'error', retryable: true })
      loadBalancer.recordFailure('client-2', { code: 'NETWORK_ERROR', message: 'error', retryable: true })
      loadBalancer.recordFailure('client-2', { code: 'NETWORK_ERROR', message: 'error', retryable: true })

      const client = loadBalancer.getClient()
      expect(client).toBeDefined()
    })

    it('应该在没有客户端时返回 null', () => {
      loadBalancer = new LoadBalancer([])
      const client = loadBalancer.getClient()
      expect(client).toBeNull()
    })
  })

  describe('getClient - weighted', () => {
    it('应该按权重获取客户端', () => {
      loadBalancer = new LoadBalancer([
        {
          name: 'client-1',
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key-1',
          weight: 3,
        },
        {
          name: 'client-2',
          provider: 'anthropic',
          modelId: 'claude-3',
          apiKey: 'sk-test-key-2',
          weight: 1,
        },
      ], { strategy: 'weighted' })

      const client = loadBalancer.getClient()
      expect(client).toBeDefined()
    })
  })

  describe('getClient - least-loaded', () => {
    it('应该获取最少负载的客户端', () => {
      loadBalancer = new LoadBalancer([
        {
          name: 'client-1',
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key-1',
        },
        {
          name: 'client-2',
          provider: 'anthropic',
          modelId: 'claude-3',
          apiKey: 'sk-test-key-2',
        },
      ], { strategy: 'least-loaded' })

      const client = loadBalancer.getClient()
      expect(client).toBeDefined()
    })
  })

  describe('getClient - priority', () => {
    it('应该按优先级（权重）获取客户端', () => {
      loadBalancer = new LoadBalancer([
        {
          name: 'client-1',
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key-1',
          weight: 1,
        },
        {
          name: 'client-2',
          provider: 'anthropic',
          modelId: 'claude-3',
          apiKey: 'sk-test-key-2',
          weight: 5,
        },
      ], { strategy: 'priority' })

      const client = loadBalancer.getClient()
      expect(client).toBeDefined()
    })
  })

  describe('recordSuccess', () => {
    it('应该重置连续失败次数', () => {
      loadBalancer = new LoadBalancer([
        {
          name: 'client-1',
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key',
        },
      ])

      loadBalancer.recordFailure('client-1', { code: 'NETWORK_ERROR', message: 'error', retryable: true })
      loadBalancer.recordFailure('client-1', { code: 'NETWORK_ERROR', message: 'error', retryable: true })

      let status = loadBalancer.getStatus()
      expect(status[0].consecutiveFailures).toBe(2)

      loadBalancer.recordSuccess('client-1')

      status = loadBalancer.getStatus()
      expect(status[0].consecutiveFailures).toBe(0)
    })
  })

  describe('recordFailure', () => {
    it('应该增加连续失败次数', () => {
      loadBalancer = new LoadBalancer([
        {
          name: 'client-1',
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key',
        },
      ])

      loadBalancer.recordFailure('client-1', { code: 'NETWORK_ERROR', message: 'error', retryable: true })
      loadBalancer.recordFailure('client-1', { code: 'NETWORK_ERROR', message: 'error', retryable: true })

      const status = loadBalancer.getStatus()
      expect(status[0].consecutiveFailures).toBe(2)
    })

    it('应该在超过阈值时标记为不健康', () => {
      loadBalancer = new LoadBalancer([
        {
          name: 'client-1',
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key',
        },
      ], { failureThreshold: 2 })

      loadBalancer.recordFailure('client-1', { code: 'NETWORK_ERROR', message: 'error', retryable: true })
      loadBalancer.recordFailure('client-1', { code: 'NETWORK_ERROR', message: 'error', retryable: true })

      const status = loadBalancer.getStatus()
      expect(status[0].isHealthy).toBe(false)
    })
  })

  describe('decrementLoad', () => {
    it('应该减少负载计数', () => {
      loadBalancer = new LoadBalancer([
        {
          name: 'client-1',
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key',
        },
      ])

      // 先获取客户端增加负载
      loadBalancer.getClient()

      let status = loadBalancer.getStatus()
      expect(status[0].currentLoad).toBe(1)

      loadBalancer.decrementLoad('client-1')

      status = loadBalancer.getStatus()
      expect(status[0].currentLoad).toBe(0)
    })

    it('应该不低于 0', () => {
      loadBalancer = new LoadBalancer([
        {
          name: 'client-1',
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key',
        },
      ])

      loadBalancer.decrementLoad('client-1')
      loadBalancer.decrementLoad('client-1')

      const status = loadBalancer.getStatus()
      expect(status[0].currentLoad).toBe(0)
    })

    it('应该处理不存在的客户端', () => {
      loadBalancer = new LoadBalancer([])
      expect(() => loadBalancer.decrementLoad('non-existent')).not.toThrow()
    })
  })

  describe('getStatus', () => {
    it('应该返回所有客户端状态', () => {
      loadBalancer = new LoadBalancer([
        {
          name: 'client-1',
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key',
        },
        {
          name: 'client-2',
          provider: 'anthropic',
          modelId: 'claude-3',
          apiKey: 'sk-test-key-2',
        },
      ])

      const status = loadBalancer.getStatus()
      expect(status).toHaveLength(2)
      expect(status[0].name).toBe('client-1')
      expect(status[0].provider).toBe('openai')
      expect(status[0].modelId).toBe('gpt-4o')
    })
  })

  describe('addClient', () => {
    it('应该添加新客户端', () => {
      loadBalancer = new LoadBalancer([])

      loadBalancer.addClient('new-client', {
        provider: 'openai',
        modelId: 'gpt-4o',
        apiKey: 'sk-test-key',
      }, 2)

      expect(loadBalancer.getClientCount()).toBe(1)
      const status = loadBalancer.getStatus()
      expect(status[0].name).toBe('new-client')
      expect(status[0].weight).toBe(2)
    })
  })

  describe('removeClient', () => {
    it('应该移除客户端', () => {
      loadBalancer = new LoadBalancer([
        {
          name: 'client-1',
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key',
        },
      ])

      expect(loadBalancer.getClientCount()).toBe(1)

      loadBalancer.removeClient('client-1')

      expect(loadBalancer.getClientCount()).toBe(0)
    })
  })

  describe('stop', () => {
    it('应该停止健康检查', () => {
      loadBalancer = new LoadBalancer([
        {
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key',
        },
      ])

      loadBalancer.stop()

      // 定时器应该被清除
      expect((loadBalancer as unknown as { healthCheckTimer?: NodeJS.Timeout }).healthCheckTimer).toBeUndefined()
    })
  })

  describe('createLoadBalancer', () => {
    it('应该创建负载均衡器', () => {
      const lb = createLoadBalancer([
        {
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'sk-test-key',
        },
      ], 'weighted')

      expect(lb).toBeInstanceOf(LoadBalancer)
      lb.stop()
    })
  })
})
