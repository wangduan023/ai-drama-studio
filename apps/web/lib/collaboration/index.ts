/**
 * 项目协作模块统一导出
 * 
 * @module collaboration
 * 
 * 包含以下功能:
 * - Socket.io 服务器 (socket.ts): 实时协作 WebSocket 服务器
 * - 权限检查 (permissions.ts): 项目成员权限管理
 */

// ==================== Socket.io 服务器 ====================
export {
  createSocketServer,
  type SocketWithUser,
} from './socket'

// ==================== 权限检查 ====================
export {
  // 角色查询
  getProjectRole,
  
  // 权限检查
  canViewProject,
  canEditProject,
  canManageMembers,
  hasMinimumProjectRole,
  
  // 成员管理
  getProjectMembers,
  
  // 活动日志
  logProjectActivity,
  
  // 类型
  type ProjectRole,
} from './permissions'
