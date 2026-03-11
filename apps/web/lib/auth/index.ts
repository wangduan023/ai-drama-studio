/**
 * 认证模块统一导出
 * 
 * @module auth
 * 
 * 包含以下功能:
 * - 本地认证 (local.ts): 注册、登录、令牌验证
 * - 密码管理 (password.ts): 密码哈希、验证、强度检查
 * - 会话管理 (session.ts): JWT 会话创建和验证
 * - 中间件工具 (middleware.ts): Next.js 中间件辅助函数
 */

// ==================== 本地认证 ====================
export {
  // 注册和登录
  registerLocalUser,
  loginLocalUser,
  
  // 令牌验证
  verifyToken,
  
  // 用户管理
  getCurrentUser,
  updateUser,
  changePassword,
  resetPassword,
  deactivateUser,
  activateUser,
  
  // 类型
  type RegisterData,
  type LoginResponse,
  type VerificationResult,
} from './local'

// ==================== 密码管理 ====================
export {
  // 密码哈希和验证
  hashPassword,
  verifyPassword,
  
  // 密码强度检查
  validatePasswordStrength,
  generateRandomPassword,
  
  // 类型
  type PasswordValidationResult,
} from './password'

// ==================== 会话管理 ====================
export {
  // 会话创建
  createSession,
  verifySession,
  destroySession,
  destroyAllUserSessions,
  
  // 清理
  cleanupExpiredTokens,
  
  // 工具
  decodeToken,
  refreshSession,
  
  // 类型
  type UserWithProfile,
  type JWTPayload,
  type SessionResult,
} from './session'

// ==================== 中间件工具 ====================
export {
  // 认证验证
  verifyAuth,
  
  // 路由检查
  isPublicRoute,
  isProtectedRoute,
  getRedirectUrl,
  
  // 角色权限检查
  hasRequiredRole,
  hasMinimumRole,
  getRoleLevel,
  
  // 响应头
  createAuthHeaders,
  
  // 类型
  type AuthUser,
  type AuthResult,
} from './middleware'
