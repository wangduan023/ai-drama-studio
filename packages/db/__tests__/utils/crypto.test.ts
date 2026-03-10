/**
 * Crypto Utils Tests
 * 加密解密工具测试
 */
import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, encryptFields, decryptFields } from '../../src/utils/crypto'

describe('Crypto Utils', () => {
  describe('encrypt', () => {
    it('应该正确加密字符串', () => {
      const text = 'sk-test-api-key-12345'
      const encrypted = encrypt(text)
      
      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(text)
      expect(typeof encrypted).toBe('string')
    })

    it('空值应该返回 null', () => {
      expect(encrypt(null)).toBeNull()
      expect(encrypt(undefined)).toBeNull()
      expect(encrypt('')).toBeNull()
    })
  })

  describe('decrypt', () => {
    it('应该正确解密加密后的字符串', () => {
      const original = 'sk-test-api-key-12345'
      const encrypted = encrypt(original)
      const decrypted = decrypt(encrypted)
      
      expect(decrypted).toBe(original)
    })

    it('空值应该返回 null', () => {
      expect(decrypt(null)).toBeNull()
      expect(decrypt(undefined)).toBeNull()
      expect(decrypt('')).toBeNull()
    })

    it('解密失败时应返回原文（兼容旧数据）', () => {
      // 模拟明文存储的旧数据
      const plainText = 'plain-api-key'
      const decrypted = decrypt(plainText)
      
      expect(decrypted).toBe(plainText)
    })
  })

  describe('encrypt/decrypt roundtrip', () => {
    it('应该支持各种特殊字符', () => {
      const testCases = [
        'sk-1234567890abcdef',
        'Bearer token_with-special.chars',
        '中文测试密钥',
        'key=with&special=chars',
        'very-long-key-' + 'x'.repeat(100),
      ]

      for (const original of testCases) {
        const encrypted = encrypt(original)
        const decrypted = decrypt(encrypted)
        expect(decrypted).toBe(original)
      }
    })
  })

  describe('encryptFields', () => {
    it('应该加密指定字段', () => {
      const obj = {
        name: 'Test Provider',
        apiKey: 'secret-key-123',
        baseUrl: 'https://api.example.com',
      }

      const encrypted = encryptFields(obj, ['apiKey'])

      expect(encrypted.name).toBe(obj.name)
      expect(encrypted.baseUrl).toBe(obj.baseUrl)
      expect(encrypted.apiKey).not.toBe(obj.apiKey)
      expect(typeof encrypted.apiKey).toBe('string')
    })

    it('应该跳过不存在的字段', () => {
      const obj = {
        name: 'Test Provider',
      }

      const encrypted = encryptFields(obj, ['apiKey', 'secret'])

      expect(encrypted.name).toBe(obj.name)
      expect(encrypted.apiKey).toBeUndefined()
    })
  })

  describe('decryptFields', () => {
    it('应该解密指定字段', () => {
      const originalKey = 'secret-key-123'
      const encryptedKey = encrypt(originalKey)
      
      const obj = {
        name: 'Test Provider',
        apiKey: encryptedKey,
        baseUrl: 'https://api.example.com',
      }

      const decrypted = decryptFields(obj, ['apiKey'])

      expect(decrypted.name).toBe(obj.name)
      expect(decrypted.baseUrl).toBe(obj.baseUrl)
      expect(decrypted.apiKey).toBe(originalKey)
    })

    it('应该跳过 null 值字段', () => {
      const obj = {
        name: 'Test Provider',
        apiKey: null,
      }

      const decrypted = decryptFields(obj, ['apiKey'])

      expect(decrypted.apiKey).toBeNull()
    })
  })
})
