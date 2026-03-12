/**
 * Repositories Index
 * 统一导出所有仓储层
 */

export { BaseRepository } from './base.repository'

export { RoleRepository, type CreateRoleInput, type UpdateRoleInput } from './role.repository'
export { PermissionRepository, type CreatePermissionInput, type UpdatePermissionInput } from './permission.repository'
export { AiApiKeyRepository, type CreateAiApiKeyInput, type UpdateAiApiKeyInput } from './ai-api-key.repository'
export { 
  AiProxyRepository, 
  type CreateAiProxyInput, 
  type UpdateAiProxyInput,
  type UpdateHealthStatusInput 
} from './proxy.repository'
