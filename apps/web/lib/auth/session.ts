/**
 * 会话管理
 * 提供 JWT 会话的创建、验证和销毁功能
 */

import * as jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db';
import type { User, Profile } from '@prisma/client';

/**
 * JWT 配置
 */
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET or NEXTAUTH_SECRET must be set in environment variables. ' +
    'Please check your .env file and ensure one of these variables is defined.'
  );
}
const JWT_EXPIRES_IN = '7d'; // 7天有效期
const JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60; // 7天（秒）

/**
 * 记住我模式的过期时间（30天）
 */
const JWT_EXPIRES_IN_REMEMBER = '30d';
const JWT_EXPIRES_IN_REMEMBER_SECONDS = 30 * 24 * 60 * 60; // 30天（秒）

/**
 * JWT 载荷类型
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * 会话验证结果
 */
export interface SessionResult {
  valid: boolean;
  user?: UserWithProfile;
  error?: string;
}

/**
 * 包含 Profile 的用户类型
 */
export type UserWithProfile = User & {
  profile: Profile | null;
};

/**
 * 创建会话
 * @param userId - 用户ID
 * @param remember - 是否记住我（延长过期时间）
 * @returns JWT 令牌
 */
export async function createSession(userId: string, remember: boolean = false): Promise<string> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  // 查找用户
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.isActive) {
    throw new Error('User account is deactivated');
  }

  // 生成 JWT
  const expiresIn = remember ? JWT_EXPIRES_IN_REMEMBER : JWT_EXPIRES_IN;
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn }
  );

  // 计算过期时间
  const expiresInSeconds = remember ? JWT_EXPIRES_IN_REMEMBER_SECONDS : JWT_EXPIRES_IN_SECONDS;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  // 保存刷新令牌到数据库
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: token,
      expiresAt: expiresAt,
    },
  });

  return token;
}

/**
 * 验证会话
 * @param token - JWT 令牌
 * @returns 会话验证结果
 */
export async function verifySession(token: string): Promise<SessionResult> {
  if (!token) {
    return {
      valid: false,
      error: 'Token is required',
    };
  }

  try {
    // 验证 JWT
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // 检查令牌是否在数据库中存在且未过期
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!refreshToken) {
      return {
        valid: false,
        error: 'Token not found or revoked',
      };
    }

    if (refreshToken.expiresAt < new Date()) {
      // 删除过期令牌
      await prisma.refreshToken.delete({
        where: { id: refreshToken.id },
      });
      return {
        valid: false,
        error: 'Token has expired',
      };
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return {
        valid: false,
        error: 'User not found',
      };
    }

    if (!user.isActive) {
      return {
        valid: false,
        error: 'User account is deactivated',
      };
    }

    // 排除密码字段
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      valid: true,
      user: userWithoutPassword as UserWithProfile,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        valid: false,
        error: 'Token has expired',
      };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return {
        valid: false,
        error: 'Invalid token',
      };
    }

    return {
      valid: false,
      error: 'Token verification failed',
    };
  }
}

/**
 * 销毁会话
 * @param token - JWT 令牌
 * @returns 是否成功销毁
 */
export async function destroySession(token: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    // 从数据库中删除令牌
    await prisma.refreshToken.deleteMany({
      where: { token },
    });

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 销毁用户的所有会话
 * @param userId - 用户ID
 * @returns 是否成功销毁
 */
export async function destroyAllUserSessions(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }

  try {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 清理过期的令牌
 * @returns 清理的令牌数量
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  } catch (error) {
    return 0;
  }
}

/**
 * 解码 JWT（不验证）
 * @param token - JWT 令牌
 * @returns 解码后的载荷
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * 刷新会话
 * @param token - 当前 JWT 令牌
 * @returns 新的 JWT 令牌
 */
export async function refreshSession(token: string): Promise<string> {
  const result = await verifySession(token);

  if (!result.valid || !result.user) {
    throw new Error(result.error || 'Invalid session');
  }

  // 销毁旧会话
  await destroySession(token);

  // 创建新会话
  const newToken = await createSession(result.user.id);

  return newToken;
}
