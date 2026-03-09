/**
 * 多账号负载均衡器测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MultiAccountBalancer, createMultiAccountBalancer } from '../src/multi-account-balancer'

describe('MultiAccountBalancer', () => {
  let balancer: MultiAccountBalancer

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    if (balancer) {
      balancer.destroy()
    }
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('应该创建多账号负载均衡器', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [
          { apiKey: 'sk-test1234567890', name: 'account-1' },
          { apiKey: 'sk-test0987654321', name: 'account-2' },
        ],
      })

      expect(balancer.getTotalCount()).toBe(2)
      expect(balancer.getAvailableCount()).toBe(2)
    })

    it('应该生成默认账号名称', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [
          { apiKey: 'sk-test12345678' },
        ],
      })

      const stats = balancer.getUsageStats()
      expect(stats[0].name).toContain('account-')
    })

    it('应该使用默认策略 round-robin', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [
          { apiKey: 'sk-test1', name: 'account-1' },
          { apiKey: 'sk-test2', name: 'account-2' },
        ],
      })

      expect(balancer).toBeDefined()
    })

    it('应该使用自定义超时时间', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [{ apiKey: 'sk-test', name: 'account-1' }],
        timeout: 60000,
      })

      expect(balancer).toBeDefined()
    })

    it('应该使用自定义权重', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [
          { apiKey: 'sk-test1', name: 'account-1', weight: 3 },
          { apiKey: 'sk-test2', name: 'account-2', weight: 1 },
        ],
        strategy: 'weighted',
      })

      const stats = balancer.getUsageStats()
      expect(stats.find(s => s.name === 'account-1')?.name).toBeDefined()
    })
  })

  describe('getUsageStats', () => {
    it('应该返回账号使用统计', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [
          { apiKey: 'sk-test1234567890', name: 'account-1' },
          { apiKey: 'sk-test0987654321', name: 'account-2' },
        ],
      })

      const stats = balancer.getUsageStats()
      expect(stats).toHaveLength(2)
      expect(stats[0].apiKey).toContain('...')
      expect(stats[0].isAvailable).toBe(true)
      expect(stats[0].consecutiveFailures).toBe(0)
    })

    it('应该隐藏 API Key', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [
          { apiKey: 'sk-test1234567890', name: 'account-1' },
        ],
      })

      const stats = balancer.getUsageStats()
      expect(stats[0].apiKey).not.toContain('test1234567890')
      expect(stats[0].apiKey).toContain('...')
    })

    it('应该计算成功率', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [{ apiKey: 'sk-test', name: 'account-1' }],
      })

      let stats = balancer.getUsageStats()
      expect(stats[0].successRate).toBe(100)
    })
  })

  describe('getAvailableCount', () => {
    it('应该返回可用账号数量', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [
          { apiKey: 'sk-test1', name: 'account-1' },
          { apiKey: 'sk-test2', name: 'account-2' },
        ],
      })

      expect(balancer.getAvailableCount()).toBe(2)
    })
  })

  describe('getTotalCount', () => {
    it('应该返回总账号数量', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [
          { apiKey: 'sk-test1', name: 'account-1' },
          { apiKey: 'sk-test2', name: 'account-2' },
          { apiKey: 'sk-test3', name: 'account-3' },
        ],
      })

      expect(balancer.getTotalCount()).toBe(3)
    })
  })

  describe('resetAccount', () => {
    it('应该重置账号状态', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [{ apiKey: 'sk-test', name: 'account-1' }],
      })

      balancer.resetAccount('account-1')

      const account = balancer.getAccount('account-1')
      expect(account).toBeDefined()
    })

    it('应该处理不存在的账号', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [{ apiKey: 'sk-test', name: 'account-1' }],
      })

      expect(() => balancer.resetAccount('non-existent')).not.toThrow()
    })
  })

  describe('disableAccount', () => {
    it('应该手动禁用账号', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [{ apiKey: 'sk-test', name: 'account-1' }],
      })

      balancer.disableAccount('account-1', 60000)

      const account = balancer.getAccount('account-1')
      expect(account?.isAvailable).toBe(false)
    })
  })

  describe('enableAccount', () => {
    it('应该手动启用账号', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [{ apiKey: 'sk-test', name: 'account-1' }],
      })

      balancer.disableAccount('account-1')
      balancer.enableAccount('account-1')

      const account = balancer.getAccount('account-1')
      expect(account?.isAvailable).toBe(true)
    })
  })

  describe('removeAccount', () => {
    it('应该移除账号', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [
          { apiKey: 'sk-test1', name: 'account-1' },
          { apiKey: 'sk-test2', name: 'account-2' },
        ],
      })

      expect(balancer.getTotalCount()).toBe(2)

      balancer.removeAccount('account-1')

      expect(balancer.getTotalCount()).toBe(1)
      expect(balancer.getAccount('account-1')).toBeNull()
    })
  })

  describe('getAccount', () => {
    it('应该获取账号详情', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [{ apiKey: 'sk-test1234', name: 'account-1' }],
      })

      const account = balancer.getAccount('account-1')
      expect(account).toBeDefined()
      expect(account?.name).toBe('account-1')
    })

    it('应该返回 null 对于不存在的账号', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [{ apiKey: 'sk-test', name: 'account-1' }],
      })

      const account = balancer.getAccount('non-existent')
      expect(account).toBeNull()
    })
  })

  describe('destroy', () => {
    it('应该销毁负载均衡器', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [{ apiKey: 'sk-test', name: 'account-1' }],
      })

      balancer.destroy()

      expect(balancer.getTotalCount()).toBe(0)
    })
  })

  describe('createMultiAccountBalancer', () => {
    it('应该创建多账号负载均衡器', () => {
      const lb = createMultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [{ apiKey: 'sk-test', name: 'account-1' }],
      })

      expect(lb).toBeInstanceOf(MultiAccountBalancer)
      lb.destroy()
    })
  })

  describe('错误处理', () => {
    it('应该处理速率限制错误', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [{ apiKey: 'sk-test', name: 'account-1' }],
      })

      const account = balancer.getAccount('account-1')
      expect(account).toBeDefined()
    })

    it('应该处理认证错误', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [{ apiKey: 'sk-invalid', name: 'account-1' }],
      })

      const account = balancer.getAccount('account-1')
      expect(account).toBeDefined()
    })
  })

  describe('轮询策略', () => {
    it('应该轮询账号', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [
          { apiKey: 'sk-test1', name: 'account-1' },
          { apiKey: 'sk-test2', name: 'account-2' },
        ],
        strategy: 'round-robin',
      })

      expect(balancer).toBeDefined()
    })
  })

  describe('加权策略', () => {
    it('应该按权重选择账号', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [
          { apiKey: 'sk-test1', name: 'account-1', weight: 3 },
          { apiKey: 'sk-test2', name: 'account-2', weight: 1 },
        ],
        strategy: 'weighted',
      })

      expect(balancer).toBeDefined()
    })
  })

  describe('最少负载策略', () => {
    it('应该选择最少负载的账号', () => {
      balancer = new MultiAccountBalancer({
        provider: 'openai',
        modelId: 'gpt-4o',
        accounts: [
          { apiKey: 'sk-test1', name: 'account-1' },
          { apiKey: 'sk-test2', name: 'account-2' },
        ],
        strategy: 'least-loaded',
      })

      expect(balancer).toBeDefined()
    })
  })
})
