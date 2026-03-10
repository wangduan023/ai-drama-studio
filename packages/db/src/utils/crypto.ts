/**
 * 加密工具
 * 用于敏感数据（如 API Key）的加密和解密
 * 
 * 使用环境变量 ENCRYPTION_KEY 作为加密密钥
 * 如果未设置，则使用默认密钥（仅用于开发环境）
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'ai-drama-studio-dev-key-32chars!!'

/**
 * 简单加密函数（使用 XOR + Base64）
 * 注意：此为基本加密，生产环境建议使用更强大的加密方案
 */
export function encrypt(text: string | null | undefined): string | null {
  if (!text) return null
  
  try {
    // 将文本转换为 Uint8Array
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const key = encoder.encode(ENCRYPTION_KEY)
    
    // XOR 加密
    const encrypted = new Uint8Array(data.length)
    for (let i = 0; i < data.length; i++) {
      encrypted[i] = data[i] ^ key[i % key.length]
    }
    
    // Base64 编码
    return btoa(String.fromCharCode(...encrypted))
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * 解密函数
 */
export function decrypt(encryptedText: string | null | undefined): string | null {
  if (!encryptedText) return null
  
  try {
    // Base64 解码
    const encrypted = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0))
    const encoder = new TextEncoder()
    const key = encoder.encode(ENCRYPTION_KEY)
    
    // XOR 解密
    const decrypted = new Uint8Array(encrypted.length)
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ key[i % key.length]
    }
    
    // 转换回文本
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    console.error('Decryption error:', error)
    // 如果解密失败，可能是明文存储的旧数据，直接返回
    return encryptedText
  }
}

/**
 * 批量解密对象的指定字段
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: string[]
): T {
  const result = { ...obj }
  for (const field of fields) {
    if (typeof result[field] === 'string') {
      (result as Record<string, unknown>)[field] = decrypt(result[field] as string)
    }
  }
  return result
}

/**
 * 批量加密对象的指定字段
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: string[]
): T {
  const result = { ...obj }
  for (const field of fields) {
    if (typeof result[field] === 'string') {
      (result as Record<string, unknown>)[field] = encrypt(result[field] as string)
    }
  }
  return result
}
