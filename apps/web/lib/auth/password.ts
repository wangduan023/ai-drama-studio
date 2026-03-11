/**
 * 密码工具函数
 * 提供密码哈希、验证和密码强度检查功能
 */

import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

/**
 * 密码配置
 */
const SALT_ROUNDS = 12;

/**
 * 密码强度验证结果
 */
export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * 哈希密码
 * @param password - 明文密码
 * @returns 哈希后的密码
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error('Password is required');
  }
  
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}

/**
 * 验证密码
 * @param password - 明文密码
 * @param hash - 哈希后的密码
 * @returns 是否匹配
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  
  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    return false;
  }
}

/**
 * 验证密码强度
 * @param password - 明文密码
 * @returns 验证结果
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  if (!password) {
    return {
      valid: false,
      message: '密码不能为空',
    };
  }

  // 最小长度检查（8位）
  if (password.length < 8) {
    return {
      valid: false,
      message: '密码长度至少需要8个字符',
    };
  }

  // 最大长度限制（128位，防止 DoS 攻击）
  if (password.length > 128) {
    return {
      valid: false,
      message: '密码长度不能超过128个字符',
    };
  }

  // 检查是否包含至少一个大写字母
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: '密码需要包含至少一个大写字母',
    };
  }

  // 检查是否包含至少一个小写字母
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: '密码需要包含至少一个小写字母',
    };
  }

  // 检查是否包含至少一个数字
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: '密码需要包含至少一个数字',
    };
  }

  // 检查是否包含至少一个特殊字符
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      message: '密码需要包含至少一个特殊字符（如 !@#$%^&*）',
    };
  }

  // 检查是否包含常见弱密码模式
  const commonPatterns = [
    /^password/i,
    /^123456/i,
    /^qwerty/i,
    /^admin/i,
    /^letmein/i,
    /^welcome/i,
    /^monkey/i,
    /^dragon/i,
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      return {
        valid: false,
        message: '密码过于简单，请不要使用常见密码',
      };
    }
  }

  return {
    valid: true,
  };
}

/**
 * 生成随机密码
 * @param length - 密码长度（默认 16）
 * @returns 随机密码
 */
export function generateRandomPassword(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const charsLength = chars.length;
  
  // 使用加密安全的随机数生成器
  const bytes = randomBytes(length);
  let password = '';
  
  for (let i = 0; i < length; i++) {
    // 使用取模运算将随机字节映射到字符集
    password += chars[bytes[i] % charsLength];
  }
  
  return password;
}
