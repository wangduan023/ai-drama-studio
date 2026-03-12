/**
 * LRU Cache 测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { LRUCache } from '../src/lru-cache'

describe('LRUCache', () => {
  let cache: LRUCache<string, string>

  beforeEach(() => {
    cache = new LRUCache({ maxSize: 3 })
  })

  describe('基本操作', () => {
    it('应该能够设置和获取值', () => {
      cache.set('key1', 'value1')
      
      expect(cache.get('key1')).toBe('value1')
    })

    it('应该对不存在的 key 返回 undefined', () => {
      expect(cache.get('nonexistent')).toBeUndefined()
    })

    it('应该能够检查 key 是否存在', () => {
      cache.set('key1', 'value1')
      
      expect(cache.has('key1')).toBe(true)
      expect(cache.has('key2')).toBe(false)
    })

    it('应该能够删除指定 key', () => {
      cache.set('key1', 'value1')
      const deleted = cache.delete('key1')
      
      expect(deleted).toBe(true)
      expect(cache.get('key1')).toBeUndefined()
      expect(cache.has('key1')).toBe(false)
    })

    it('删除不存在的 key 应该返回 false', () => {
      const deleted = cache.delete('nonexistent')
      
      expect(deleted).toBe(false)
    })

    it('应该能够清空所有缓存', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      
      cache.clear()
      
      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBeUndefined()
      expect(cache.size).toBe(0)
    })

    it('应该返回正确的缓存大小', () => {
      expect(cache.size).toBe(0)
      
      cache.set('key1', 'value1')
      expect(cache.size).toBe(1)
      
      cache.set('key2', 'value2')
      expect(cache.size).toBe(2)
    })
  })

  describe('LRU 淘汰策略', () => {
    it('应该淘汰最久未使用的项', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      
      // 添加第4个，应该淘汰 key1
      cache.set('key4', 'value4')
      
      expect(cache.size).toBe(3)
      expect(cache.has('key1')).toBe(false)
      expect(cache.has('key2')).toBe(true)
      expect(cache.has('key3')).toBe(true)
      expect(cache.has('key4')).toBe(true)
    })

    it('访问项应该更新其为最近使用', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      
      // 访问 key1，使其变为最近使用
      cache.get('key1')
      
      // 添加第4个，应该淘汰 key2（现在最久未使用）
      cache.set('key4', 'value4')
      
      expect(cache.has('key1')).toBe(true)
      expect(cache.has('key2')).toBe(false)
      expect(cache.has('key3')).toBe(true)
      expect(cache.has('key4')).toBe(true)
    })

    it('更新已有项应该更新其为最近使用', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      
      // 更新 key1，使其变为最近使用
      cache.set('key1', 'updated')
      
      // 添加第4个，应该淘汰 key2
      cache.set('key4', 'value4')
      
      expect(cache.get('key1')).toBe('updated')
      expect(cache.has('key2')).toBe(false)
    })
  })

  describe('keys 迭代器', () => {
    it('应该能够遍历所有 keys', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      
      const keys = Array.from(cache.keys())
      
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).toContain('key3')
      expect(keys.length).toBe(3)
    })

    it('遍历后顺序应该反映使用顺序', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      
      // 访问 key1 使其变为最近使用
      cache.get('key1')
      
      const keys = Array.from(cache.keys())
      // 顺序应该是：key2, key3, key1
      expect(keys[0]).toBe('key2')
      expect(keys[1]).toBe('key3')
      expect(keys[2]).toBe('key1')
    })
  })

  describe('边界情况', () => {
    it('应该处理 maxSize 为 1 的情况', () => {
      const smallCache = new LRUCache<string, string>({ maxSize: 1 })
      
      smallCache.set('key1', 'value1')
      smallCache.set('key2', 'value2')
      
      expect(smallCache.size).toBe(1)
      expect(smallCache.has('key1')).toBe(false)
      expect(smallCache.has('key2')).toBe(true)
    })

    it('应该处理空字符串 key', () => {
      cache.set('', 'empty')
      
      expect(cache.get('')).toBe('empty')
      expect(cache.has('')).toBe(true)
    })

    it('应该能够存储各种类型的值', () => {
      const numberCache = new LRUCache<string, number>({ maxSize: 3 })
      numberCache.set('num', 42)
      expect(numberCache.get('num')).toBe(42)

      const objectCache = new LRUCache<string, { a: number }>({ maxSize: 3 })
      objectCache.set('obj', { a: 1 })
      expect(objectCache.get('obj')).toEqual({ a: 1 })
    })

    it('应该支持不同类型的 key', () => {
      const numberKeyCache = new LRUCache<number, string>({ maxSize: 3 })
      numberKeyCache.set(1, 'one')
      numberKeyCache.set(2, 'two')
      
      expect(numberKeyCache.get(1)).toBe('one')
      expect(numberKeyCache.get(2)).toBe('two')
    })
  })
})
