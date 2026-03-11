/**
 * 本地认证核心函数
 * 提供用户注册、登录、令牌验证等功能
 */

import * as jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword, validatePasswordStrength } from './password';
import { createSession, UserWithProfile } from './session';
import type { User, Profile, Prisma } from '@prisma/client';

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

/**
 * 注册数据接口
 */
export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  user: Omit<User, 'passwordHash'> & { profile: Profile | null };
  token: string;
}

/**
 * 验证结果
 */
export interface VerificationResult {
  valid: boolean;
  user?: Omit<User, 'passwordHash'> & { profile: Profile | null };
  error?: string;
}

/**
 * 注册新用户
 * @param data - 注册数据
 * @returns 创建的用户信息（不包含密码）
 */
export async function registerLocalUser(data: RegisterData): Promise<Omit<User, 'passwordHash'> & { profile: Profile | null }> {
  // 1. 验证输入
  if (!data.email || !data.email.trim()) {
    throw new Error('Email is required');
  }

  if (!data.password) {
    throw new Error('Password is required');
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email.trim())) {
    throw new Error('Invalid email format');
  }

  // 2. 检查用户是否已存在
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.trim().toLowerCase() },
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // 3. 验证密码强度
  const passwordValidation = validatePasswordStrength(data.password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.message || 'Password does not meet requirements');
  }

  // 4. 使用 bcrypt 哈希密码（salt rounds: 12）
  const passwordHash = await hashPassword(data.password);

  // 5. 创建用户和默认 Profile
  const user = await prisma.user.create({
    data: {
      email: data.email.trim().toLowerCase(),
      name: data.name?.trim() || null,
      passwordHash,
      isActive: true,
      emailVerified: false,
      profile: {
        create: {
          bio: null,
          website: null,
          preferences: {},
        },
      },
    },
    include: {
      profile: true,
    },
  });

  // 6. 返回用户信息（不包含密码）
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * 用户登录
 * @param email - 用户邮箱
 * @param password - 用户密码
 * @returns 用户信息和 JWT 令牌
 */
export async function loginLocalUser(email: string, password: string): Promise<LoginResponse> {
  // 1. 查找用户（包含 profile）
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: {
      profile: true,
    },
  });

  // 2. 验证用户存在且 isActive 为 true
  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    throw new Error('User account is deactivated');
  }

  // 3. 验证密码
  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // 4. 更新 lastLoginAt
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // 5. 生成 JWT 令牌（有效期7天）
  const token = await createSession(user.id);

  // 6. 返回用户信息和令牌
  const { passwordHash: _, ...userWithoutPassword } = user;
  return {
    user: userWithoutPassword,
    token,
  };
}

/**
 * 验证 JWT 令牌
 * @param token - JWT 令牌
 * @returns 验证结果
 */
export async function verifyToken(token: string): Promise<VerificationResult> {
  if (!token) {
    return {
      valid: false,
      error: 'Token is required',
    };
  }

  try {
    // 1. 验证 JWT
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };

    // 2. 查找用户
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

    // 3. 检查用户是否激活
    if (!user.isActive) {
      return {
        valid: false,
        error: 'User account is deactivated',
      };
    }

    // 4. 返回用户信息
    const { passwordHash: _, ...userWithoutPassword } = user;
    return {
      valid: true,
      user: userWithoutPassword,
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
 * 获取当前用户
 * @param userId - 用户ID
 * @returns 用户信息（包含 profile）
 */
export async function getCurrentUser(userId: string): Promise<Omit<User, 'passwordHash'> & { profile: Profile | null } | null> {
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
    },
  });

  if (!user) {
    return null;
  }

  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * 更新用户信息
 * @param userId - 用户ID
 * @param data - 更新的数据
 * @returns 更新后的用户信息
 */
export async function updateUser(
  userId: string,
  data: Partial<Pick<User, 'name' | 'avatar'>> & Partial<Pick<Profile, 'bio' | 'website' | 'preferences'>>
): Promise<Omit<User, 'passwordHash'> & { profile: Profile | null }> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  // 检查用户是否存在
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  // 更新用户基本信息
  const userUpdateData: Partial<Pick<User, 'name' | 'avatar'>> = {};
  if ('name' in data) userUpdateData.name = data.name;
  if ('avatar' in data) userUpdateData.avatar = data.avatar;

  // 先更新用户
  if (Object.keys(userUpdateData).length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: userUpdateData,
    });
  }

  // 更新或创建 Profile
  if ('bio' in data || 'website' in data || 'preferences' in data) {
    if (existingUser.profile) {
      const updateData: Prisma.ProfileUpdateInput = {};
      if (data.bio !== undefined) updateData.bio = data.bio;
      if (data.website !== undefined) updateData.website = data.website;
      if (data.preferences !== undefined) updateData.preferences = data.preferences as Prisma.InputJsonValue;
      await prisma.profile.update({
        where: { userId },
        data: updateData,
      });
    } else {
      await prisma.profile.create({
        data: {
          userId,
          bio: data.bio || null,
          website: data.website || null,
          preferences: data.preferences || {},
        },
      });
    }
  }

  // 获取更新后的用户
  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!updatedUser) {
    throw new Error('Failed to update user');
  }

  const { passwordHash: _, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword as Omit<User, 'passwordHash'> & { profile: Profile | null };
}

/**
 * 修改密码
 * @param userId - 用户ID
 * @param oldPassword - 旧密码
 * @param newPassword - 新密码
 * @returns 是否成功
 */
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!oldPassword || !newPassword) {
    throw new Error('Both old and new passwords are required');
  }

  // 查找用户
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // 验证旧密码
  const isOldPasswordValid = await verifyPassword(oldPassword, user.passwordHash);
  if (!isOldPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // 验证新密码强度
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.message || 'New password does not meet requirements');
  }

  // 确保新密码与旧密码不同
  if (oldPassword === newPassword) {
    throw new Error('New password must be different from the current password');
  }

  // 哈希新密码
  const newPasswordHash = await hashPassword(newPassword);

  // 更新密码
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  return true;
}

/**
 * 重置密码（管理员功能）
 * @param userId - 用户ID
 * @param newPassword - 新密码
 * @returns 是否成功
 */
export async function resetPassword(userId: string, newPassword: string): Promise<boolean> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!newPassword) {
    throw new Error('New password is required');
  }

  // 查找用户
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // 验证新密码强度
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.message || 'New password does not meet requirements');
  }

  // 哈希新密码
  const newPasswordHash = await hashPassword(newPassword);

  // 更新密码
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  return true;
}

/**
 * 注销用户
 * @param userId - 用户ID
 * @returns 是否成功
 */
export async function deactivateUser(userId: string): Promise<boolean> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  return true;
}

/**
 * 激活用户
 * @param userId - 用户ID
 * @returns 是否成功
 */
export async function activateUser(userId: string): Promise<boolean> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: true },
  });

  return true;
}
