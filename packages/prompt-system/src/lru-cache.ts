/**
 * 简单的 LRU 缓存实现
 * 用于限制模板缓存大小，防止内存泄漏
 */

export interface LRUCacheOptions {
  maxSize: number
}

export class LRUCache<K, V> {
  private cache: Map<K, V>
  private maxSize: number

  constructor(options: LRUCacheOptions) {
    this.cache = new Map()
    this.maxSize = options.maxSize
  }

  /**
   * 获取缓存值
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // 移动到最近使用
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  /**
   * 设置缓存值
   */
  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // 更新已有值，先删除再添加（移动到最近使用）
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // 超出限制，删除最久未使用的（第一个）
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }

  /**
   * 删除指定缓存
   */
  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * 检查是否包含 key
   */
  has(key: K): boolean {
    return this.cache.has(key)
  }

  /**
   * 获取所有 keys
   */
  keys(): IterableIterator<K> {
    return this.cache.keys()
  }
}
