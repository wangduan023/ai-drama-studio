/**
 * Template Store 高级测试
 * 测试 LRU 缓存淘汰策略、多并发加载场景、模板根目录动态切换
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getPromptTemplate,
  getPromptTemplateAsync,
  clearTemplateCache,
  setTemplateRoot,
  setHotReload,
  getCacheStats,
  preloadTemplates,
  dispose
} from '../src/template-store'
import { LRUCache } from '../src/lru-cache'
import { PromptError } from '../src/types'
import { PROMPT_IDS } from '../src/prompt-ids'
import fs from 'fs'
import path from 'path'

describe('Template Store Advanced Features', () => {
  const TEST_TEMPLATE_ROOT = '/tmp/test-templates-store-advanced'

  beforeEach(() => {
    // 清理环境
    if (fs.existsSync(TEST_TEMPLATE_ROOT)) {
      fs.rmSync(TEST_TEMPLATE_ROOT, { recursive: true })
    }
    fs.mkdirSync(TEST_TEMPLATE_ROOT, { recursive: true })
    fs.mkdirSync(path.join(TEST_TEMPLATE_ROOT, 'novel-promotion'), { recursive: true })
    
    // 清理所有资源
    dispose()
    clearTemplateCache()
    delete process.env.PROMPT_TEMPLATE_ROOT
    delete process.env.PROMPT_HOT_RELOAD
    delete process.env.PROMPT_CACHE_SIZE
  })

  afterEach(() => {
    dispose()
    clearTemplateCache()
    if (fs.existsSync(TEST_TEMPLATE_ROOT)) {
      fs.rmSync(TEST_TEMPLATE_ROOT, { recursive: true })
    }
    delete process.env.PROMPT_TEMPLATE_ROOT
    delete process.env.PROMPT_HOT_RELOAD
    delete process.env.PROMPT_CACHE_SIZE
  })

  describe('LRU 缓存功能', () => {
    it('应该正确实现 LRU 缓存基本功能', () => {
      const cache = new LRUCache<string, string>({ maxSize: 3 })

      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      expect(cache.get('key1')).toBe('value1')
      expect(cache.get('key2')).toBe('value2')
      expect(cache.get('key3')).toBe('value3')
      expect(cache.size).toBe(3)

      // 添加第四个，应该淘汰最久未使用的
      cache.set('key4', 'value4')
      expect(cache.size).toBe(3)
      expect(cache.get('key1')).toBeUndefined() // key1 被淘汰
      expect(cache.get('key2')).toBe('value2')
      expect(cache.get('key3')).toBe('value3')
      expect(cache.get('key4')).toBe('value4')
    })

    it('应该在访问时更新使用顺序', () => {
      const cache = new LRUCache<string, string>({ maxSize: 3 })

      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      // 访问 key1，使其变为最近使用
      cache.get('key1')

      // 添加第四个，应该淘汰 key2
      cache.set('key4', 'value4')
      expect(cache.get('key1')).toBe('value1') // key1 还在
      expect(cache.get('key2')).toBeUndefined() // key2 被淘汰
    })

    it('应该支持删除指定缓存', () => {
      const cache = new LRUCache<string, string>({ maxSize: 3 })

      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      cache.delete('key1')

      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBe('value2')
      expect(cache.size).toBe(1)
    })

    it('应该支持清空所有缓存', () => {
      const cache = new LRUCache<string, string>({ maxSize: 3 })

      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      cache.clear()

      expect(cache.size).toBe(0)
      expect(cache.get('key1')).toBeUndefined()
    })

    it('应该正确检查缓存是否存在', () => {
      const cache = new LRUCache<string, string>({ maxSize: 3 })

      cache.set('key1', 'value1')

      expect(cache.has('key1')).toBe(true)
      expect(cache.has('key2')).toBe(false)
    })

    it('应该返回所有 keys', () => {
      const cache = new LRUCache<string, string>({ maxSize: 3 })

      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      const keys = Array.from(cache.keys())
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).toHaveLength(2)
    })
  })

  describe('模板缓存功能', () => {
    it('应该缓存已加载的模板', () => {
      // 首次加载
      const result1 = getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')
      
      // 再次加载（应该使用缓存）
      const result2 = getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')
      
      expect(result1).toBe(result2)
      
      const stats = getCacheStats()
      expect(stats.size).toBeGreaterThan(0)
    })

    it('应该支持清除特定模板的缓存', () => {
      // 加载多个模板
      getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')
      getPromptTemplate(PROMPT_IDS.NP_EPISODE_SPLIT, 'en')

      const statsBefore = getCacheStats()
      expect(statsBefore.size).toBeGreaterThanOrEqual(2)

      // 清除特定模板
      clearTemplateCache(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')

      const statsAfter = getCacheStats()
      expect(statsAfter.size).toBeLessThan(statsBefore.size)
    })

    it('应该支持清除所有缓存', () => {
      // 加载多个模板
      getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')
      getPromptTemplate(PROMPT_IDS.NP_EPISODE_SPLIT, 'en')

      expect(getCacheStats().size).toBeGreaterThan(0)

      // 清除所有缓存
      clearTemplateCache()

      expect(getCacheStats().size).toBe(0)
    })

    it('应该支持强制刷新缓存', () => {
      // 加载模板
      const result1 = getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')
      
      // 强制重新加载
      const result2 = getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en', { forceReload: true })
      
      // 内容应该相同
      expect(result1).toBe(result2)
    })
  })

  describe('模板根目录动态切换', () => {
    it('应该在切换根目录时清除缓存', () => {
      // 先加载一些模板
      getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')
      expect(getCacheStats().size).toBeGreaterThan(0)

      // 切换到新根目录
      setTemplateRoot(TEST_TEMPLATE_ROOT)

      // 缓存应该被清除
      expect(getCacheStats().size).toBe(0)
    })

    it('应该支持多次切换根目录', () => {
      const root1 = '/tmp/test-root-1'
      const root2 = '/tmp/test-root-2'

      // 创建测试目录
      [root1, root2].forEach(root => {
        if (!fs.existsSync(root)) {
          fs.mkdirSync(root, { recursive: true })
        }
      })

      // 切换根目录
      setTemplateRoot(root1)
      expect(getCacheStats().size).toBe(0)

      setTemplateRoot(root2)
      expect(getCacheStats().size).toBe(0)

      setTemplateRoot(root1)
      expect(getCacheStats().size).toBe(0)

      // 清理
      [root1, root2].forEach(root => {
        if (fs.existsSync(root)) {
          fs.rmSync(root, { recursive: true })
        }
      })
    })
  })

  describe('多并发加载场景', () => {
    it('应该处理并发的模板加载请求', async () => {
      // 并发加载多个不同的模板
      const promises = [
        getPromptTemplateAsync(PROMPT_IDS.NP_CHARACTER_CREATE, 'en'),
        getPromptTemplateAsync(PROMPT_IDS.NP_EPISODE_SPLIT, 'en'),
        getPromptTemplateAsync(PROMPT_IDS.NP_AGENT_ACTING_DIRECTION, 'en'),
        getPromptTemplateAsync(PROMPT_IDS.NP_LOCATION_CREATE, 'en')
      ]

      const results = await Promise.all(promises)

      // 所有结果都应该存在
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.length).toBeGreaterThan(0)
      })

      // 缓存中应该有这些模板
      const stats = getCacheStats()
      expect(stats.size).toBeGreaterThanOrEqual(4)
    })

    it('应该处理并发的相同模板加载', async () => {
      // 并发加载同一个模板多次
      const promises = Array.from({ length: 10 }, () =>
        getPromptTemplateAsync(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')
      )

      const results = await Promise.all(promises)

      // 所有结果应该相同
      results.forEach(result => {
        expect(result).toBe(results[0])
      })
    })
  })

  describe('热重载功能', () => {
    it('应该支持启用和禁用热重载', () => {
      // 启用热重载
      setHotReload(true)
      
      let stats = getCacheStats()
      expect(stats.hotReloadEnabled).toBe(true)

      // 禁用热重载
      setHotReload(false)
      
      stats = getCacheStats()
      expect(stats.hotReloadEnabled).toBe(false)
    })

    it('应该在禁用热重载时清除监听器', () => {
      // 启用热重载并加载模板
      setTemplateRoot(TEST_TEMPLATE_ROOT, { enableHotReload: true })

      // 禁用热重载
      setHotReload(false)

      const stats = getCacheStats()
      expect(stats.watcherCount).toBe(0)
    })
  })

  describe('预加载功能', () => {
    it('应该预加载模板', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      preloadTemplates(['en'])

      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('应该在预加载失败时记录警告但不中断', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // 尝试预加载可能不存在的语言
      preloadTemplates(['nonexistent'])

      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('缓存统计信息', () => {
    it('应该返回正确的缓存统计信息', () => {
      // 清除缓存
      clearTemplateCache()

      let stats = getCacheStats()
      expect(stats.size).toBe(0)
      expect(stats.maxSize).toBeGreaterThan(0)
      expect(Array.isArray(stats.keys)).toBe(true)
      expect(stats.keys).toHaveLength(0)

      // 加载模板
      getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')

      stats = getCacheStats()
      expect(stats.size).toBeGreaterThan(0)
      expect(stats.keys.length).toBeGreaterThan(0)
      expect(stats.keys[0]).toContain(PROMPT_IDS.NP_CHARACTER_CREATE)
    })
  })

  describe('资源清理', () => {
    it('应该在调用 dispose 时清理所有资源', () => {
      // 加载一些模板
      getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')
      getPromptTemplate(PROMPT_IDS.NP_EPISODE_SPLIT, 'en')

      let stats = getCacheStats()
      expect(stats.size).toBeGreaterThan(0)

      // 调用 dispose
      dispose()

      stats = getCacheStats()
      expect(stats.size).toBe(0)
    })
  })

  describe('错误处理', () => {
    it('应该抛出错误对于未注册的提示词 ID', () => {
      expect(() => {
        getPromptTemplate('nonexistent_id' as any, 'en')
      }).toThrow(PromptError)
    })

    it('应该在异步加载时抛出错误', async () => {
      await expect(async () => {
        await getPromptTemplateAsync('nonexistent_id' as any, 'en')
      }).rejects.toThrow(PromptError)
    })
  })
})
