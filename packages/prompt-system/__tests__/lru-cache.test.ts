import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LRUCache } from '../src/lru-cache'

describe('LRUCache Module', () => {
  it('should create an LRU cache with specified max size', () => {
    const cache = new LRUCache<string, string>({ maxSize: 3 })
    expect(cache.size).toBe(0)
  })

  it('should set and get values', () => {
    const cache = new LRUCache<string, string>({ maxSize: 3 })

    cache.set('key1', 'value1')
    expect(cache.get('key1')).toBe('value1')

    cache.set('key2', 'value2')
    expect(cache.get('key2')).toBe('value2')
    expect(cache.get('key1')).toBe('value1')
  })

  it('should handle cache eviction when exceeding max size', () => {
    const cache = new LRUCache<string, string>({ maxSize: 2 })

    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    cache.set('key3', 'value3') // This should evict key1

    expect(cache.get('key1')).toBeUndefined() // Evicted
    expect(cache.get('key2')).toBe('value2')
    expect(cache.get('key3')).toBe('value3')
  })

  it('should update existing values', () => {
    const cache = new LRUCache<string, string>({ maxSize: 3 })

    cache.set('key1', 'value1')
    expect(cache.get('key1')).toBe('value1')

    cache.set('key1', 'newValue1')
    expect(cache.get('key1')).toBe('newValue1')
  })

  it('should maintain LRU order correctly', () => {
    const cache = new LRUCache<string, string>({ maxSize: 3 })

    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    cache.set('key3', 'value3')

    // Access key1 to make it recently used
    cache.get('key1')

    // Add another item - key2 should be evicted, not key1
    cache.set('key4', 'value4')

    expect(cache.get('key2')).toBeUndefined() // Least recently used
    expect(cache.get('key1')).toBe('value1') // Recently accessed
    expect(cache.get('key3')).toBe('value3')
    expect(cache.get('key4')).toBe('value4')
  })

  it('should delete specific keys', () => {
    const cache = new LRUCache<string, string>({ maxSize: 3 })

    cache.set('key1', 'value1')
    cache.set('key2', 'value2')

    expect(cache.has('key1')).toBe(true)
    expect(cache.has('key2')).toBe(true)

    const deleted = cache.delete('key1')
    expect(deleted).toBe(true)
    expect(cache.has('key1')).toBe(false)
    expect(cache.has('key2')).toBe(true)

    // Deleting non-existent key should return false
    const notDeleted = cache.delete('nonexistent')
    expect(notDeleted).toBe(false)
  })

  it('should clear the entire cache', () => {
    const cache = new LRUCache<string, string>({ maxSize: 3 })

    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    cache.set('key3', 'value3')

    expect(cache.size).toBe(3)

    cache.clear()

    expect(cache.size).toBe(0)
    expect(cache.has('key1')).toBe(false)
    expect(cache.has('key2')).toBe(false)
    expect(cache.has('key3')).toBe(false)
  })

  it('should return correct size', () => {
    const cache = new LRUCache<string, string>({ maxSize: 5 })

    expect(cache.size).toBe(0)

    cache.set('key1', 'value1')
    expect(cache.size).toBe(1)

    cache.set('key2', 'value2')
    expect(cache.size).toBe(2)

    cache.set('key3', 'value3')
    expect(cache.size).toBe(3)

    cache.delete('key2')
    expect(cache.size).toBe(2)

    cache.clear()
    expect(cache.size).toBe(0)
  })

  it('should correctly report if key exists', () => {
    const cache = new LRUCache<string, string>({ maxSize: 3 })

    expect(cache.has('nonexistent')).toBe(false)

    cache.set('key1', 'value1')
    expect(cache.has('key1')).toBe(true)

    cache.delete('key1')
    expect(cache.has('key1')).toBe(false)
  })

  it('should provide keys iterator', () => {
    const cache = new LRUCache<string, string>({ maxSize: 3 })

    cache.set('key1', 'value1')
    cache.set('key2', 'value2')

    const keys = Array.from(cache.keys())
    expect(keys).toContain('key1')
    expect(keys).toContain('key2')
    expect(keys).not.toContain('nonexistent')

    expect(keys.length).toBe(2)
  })
})