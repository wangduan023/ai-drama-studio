/**
 * AI Client - 配置管理器
 *
 * 从数据库读取 AI 提供商配置，支持动态配置更新
 */

import type { AiProvider, AiModel, AiModelType, Prisma } from '@prisma/client'

// Import types only from db package
interface AiProviderWithModels extends AiProvider {
  models?: AiModel[]
}

// Repository input types
interface CreateAiProviderInput {
  name: string
  baseUrl: string
  apiKey?: string
  isActive?: boolean
  priority?: number
  weight?: number
  rateLimit?: number
  quotaDaily?: number
  metadata?: Prisma.InputJsonValue
  description?: string
}

interface UpdateAiProviderInput {
  baseUrl?: string
  apiKey?: string
  isActive?: boolean
  priority?: number
  weight?: number
  rateLimit?: number
  quotaDaily?: number
  metadata?: Prisma.InputJsonValue
  description?: string
}

interface CreateAiModelInput {
  providerId: string
  modelId: string
  name: string
  type: AiModelType
  isEnabled?: boolean
  isDefault?: boolean
  maxTokens?: number
  contextWindow?: number
  inputCost?: number
  outputCost?: number
  imageCost?: number
  videoCost?: number
  currency?: string
  rateLimit?: number
  rpm?: number
  tpm?: number
  metadata?: Prisma.InputJsonValue
  description?: string
}

interface UpdateAiModelInput {
  name?: string
  type?: AiModelType
  isEnabled?: boolean
  isDefault?: boolean
  maxTokens?: number
  contextWindow?: number
  inputCost?: number
  outputCost?: number
  imageCost?: number
  videoCost?: number
  currency?: string
  rateLimit?: number
  rpm?: number
  tpm?: number
  metadata?: Prisma.InputJsonValue
  description?: string
}

// Repository interfaces
interface IAiProviderRepository {
  findActive(): Promise<AiProviderWithModels[]>
  findAll(options?: { includeModels?: boolean; onlyActive?: boolean }): Promise<AiProviderWithModels[]>
  create(input: CreateAiProviderInput): Promise<AiProvider>
  update(id: string, input: UpdateAiProviderInput): Promise<AiProvider>
  delete(id: string): Promise<AiProvider>
}

interface IAiModelRepository {
  create(input: CreateAiModelInput): Promise<AModel>
  update(id: string, input: UpdateAiModelInput): Promise<AiModel>
  delete(id: string): Promise<AiModel>
}

// Type alias to avoid conflict
import type { AiModel as AModel } from '@prisma/client'
import type {
  ProviderConfig,
  ModelConfig,
} from '../types/enhanced'
import type { AIProvider } from '../types/enhanced'
import { createProvider } from '../providers'

// ============================================================
// 配置管理器选项
// ============================================================

/**
 * 配置管理器选项
 */
export interface ConfigManagerOptions {
  /** 是否自动刷新配置（默认：false） */
  autoRefresh?: boolean
  /** 自动刷新间隔（毫秒，默认：60000） */
  refreshInterval?: number
  /** 是否只加载启用的提供商（默认：true） */
  onlyActive?: boolean
}

// ============================================================
// 配置管理器类
// ============================================================

/**
 * AI 配置管理器
 *
 * 负责从数据库读取和管理 AI 提供商配置
 *
 * @example
 * ```typescript
 * const manager = new ConfigManager()
 *
 * // 加载所有配置
 * await manager.load()
 *
 * // 获取提供商配置
 * const provider = manager.getProvider('openai')
 *
 * // 获取模型配置
 * const model = manager.getModel('gpt-4o')
 *
 * // 创建 AI 客户端
 * const client = manager.createClient('openai', 'gpt-4o')
 * ```
 */
export class ConfigManager {
  private providerRepository: IAiProviderRepository
  private modelRepository: IAiModelRepository
  private options: Required<ConfigManagerOptions>

  private providers: Map<string, ProviderConfig> = new Map()
  private models: Map<string, ModelConfig> = new Map()
  private providerModels: Map<string, ModelConfig[]> = new Map()

  private refreshTimer?: NodeJS.Timeout
  private isLoaded = false

  constructor(options: ConfigManagerOptions = {}) {
    this.options = {
      autoRefresh: options.autoRefresh ?? false,
      refreshInterval: options.refreshInterval ?? 60000,
      onlyActive: options.onlyActive ?? true,
    }

    // Lazy load repositories to avoid circular dependencies
    this.providerRepository = this.createProviderRepository()
    this.modelRepository = this.createModelRepository()
  }

  // ============================================================
  // 配置加载
  // ============================================================

  /**
   * 加载所有配置
   *
   * @returns 加载的提供商数量
   */
  async load(): Promise<number> {
    const dbProviders = this.options.onlyActive
      ? await this.providerRepository.findActive()
      : await this.providerRepository.findAll({ includeModels: true })

    this.providers.clear()
    this.models.clear()
    this.providerModels.clear()

    for (const dbProvider of dbProviders) {
      const providerConfig = this.mapProviderConfig(dbProvider)
      this.providers.set(dbProvider.name, providerConfig)

      // 加载关联的模型
      const models = dbProvider.models || []
      const modelConfigs: ModelConfig[] = []

      for (const dbModel of models) {
        const modelConfig = this.mapModelConfig(dbModel)
        this.models.set(`${dbProvider.name}/${dbModel.modelId}`, modelConfig)
        this.models.set(dbModel.modelId, modelConfig) // 也单独存储方便查找
        modelConfigs.push(modelConfig)
      }

      this.providerModels.set(dbProvider.name, modelConfigs)
    }

    this.isLoaded = true

    // 启动自动刷新
    if (this.options.autoRefresh) {
      this.startAutoRefresh()
    }

    return this.providers.size
  }

  /**
   * 重新加载配置
   */
  async reload(): Promise<number> {
    return this.load()
  }

  // ============================================================
  // 提供商操作
  // ============================================================

  /**
   * 获取所有提供商配置
   */
  getAllProviders(): ProviderConfig[] {
    this.ensureLoaded()
    return Array.from(this.providers.values())
  }

  /**
   * 获取提供商配置
   *
   * @param name - 提供商名称
   * @returns 提供商配置或 undefined
   */
  getProvider(name: string): ProviderConfig | undefined {
    this.ensureLoaded()
    return this.providers.get(name)
  }

  /**
   * 检查提供商是否存在
   */
  hasProvider(name: string): boolean {
    this.ensureLoaded()
    return this.providers.has(name)
  }

  /**
   * 获取提供商数量
   */
  getProviderCount(): number {
    this.ensureLoaded()
    return this.providers.size
  }

  // ============================================================
  // 模型操作
  // ============================================================

  /**
   * 获取所有模型配置
   */
  getAllModels(): ModelConfig[] {
    this.ensureLoaded()
    return Array.from(this.models.values())
  }

  /**
   * 获取模型配置
   *
   * @param providerName - 提供商名称
   * @param modelId - 模型 ID
   * @returns 模型配置或 undefined
   */
  getModel(providerName: string, modelId: string): ModelConfig | undefined {
    this.ensureLoaded()
    return this.models.get(`${providerName}/${modelId}`)
  }

  /**
   * 通过模型 ID 获取配置（查找第一个匹配的）
   *
   * @param modelId - 模型 ID
   * @returns 模型配置或 undefined
   */
  findModelById(modelId: string): ModelConfig | undefined {
    this.ensureLoaded()
    return this.models.get(modelId)
  }

  /**
   * 获取提供商的所有模型
   *
   * @param providerName - 提供商名称
   * @returns 模型配置列表
   */
  getProviderModels(providerName: string): ModelConfig[] {
    this.ensureLoaded()
    return this.providerModels.get(providerName) || []
  }

  /**
   * 按类型获取模型
   *
   * @param type - 模型类型
   * @returns 模型配置列表
   */
  getModelsByType(type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE' | 'EMBEDDING'): ModelConfig[] {
    this.ensureLoaded()
    return this.getAllModels().filter((model) => model.type === type)
  }

  /**
   * 获取默认模型
   *
   * @param type - 模型类型
   * @returns 默认模型配置或 undefined
   */
  getDefaultModel(type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE' | 'EMBEDDING'): ModelConfig | undefined {
    this.ensureLoaded()
    return this.getAllModels().find((model) => model.type === type && model.isDefault)
  }

  // ============================================================
  // 客户端创建
  // ============================================================

  /**
   * 创建 AI 客户端实例
   *
   * @param providerName - 提供商名称
   * @param modelId - 模型 ID
   * @returns AI 客户端实例
   */
  createClient(providerName: string, modelId: string): AIProvider {
    const provider = this.getProvider(providerName)
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`)
    }

    const model = this.getModel(providerName, modelId)
    if (!model) {
      throw new Error(`Model not found: ${providerName}/${modelId}`)
    }

    if (!model.isEnabled) {
      throw new Error(`Model is disabled: ${providerName}/${modelId}`)
    }

    // Import providers dynamically to avoid circular dependencies
    const { createOpenAIProvider, createAnthropicProvider, createGoogleProvider, createQwenProvider } = require('../providers')

    const providerType = providerName.toLowerCase()
    const commonOptions = {
      model: modelId,
      apiKey: provider.apiKey || '',
      baseURL: provider.baseUrl,
      textCosts: model.inputCost && model.outputCost
        ? {
            inputCost: model.inputCost,
            outputCost: model.outputCost,
          }
        : undefined,
    }

    switch (providerType) {
      case 'openai':
        return createOpenAIProvider({
          ...commonOptions,
          imageCost: model.imageCost,
        })
      case 'anthropic':
        return createAnthropicProvider(commonOptions)
      case 'google':
      case 'gemini':
        return createGoogleProvider({
          ...commonOptions,
          imageCost: model.imageCost,
        })
      case 'qwen':
        return createQwenProvider({
          ...commonOptions,
          imageCost: model.imageCost ? { cost: model.imageCost, currency: model.currency } : undefined,
        })
      default:
        throw new Error(`Unsupported provider: ${providerName}`)
    }
  }

  /**
   * 创建默认类型的客户端
   *
   * @param type - 模型类型
   * @returns AI 客户端实例
   */
  createDefaultClient(type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE'): AIProvider {
    const model = this.getDefaultModel(type)
    if (!model) {
      throw new Error(`No default model found for type: ${type}`)
    }

    // 查找模型所属的提供商
    const provider = this.getAllProviders().find((p) =>
      p.models.some((m) => m.id === model.id)
    )

    if (!provider) {
      throw new Error(`Provider not found for model: ${model.modelId}`)
    }

    return this.createClient(provider.name, model.modelId)
  }

  // ============================================================
  // 数据库操作
  // ============================================================

  /**
   * 创建提供商
   */
  async createProvider(input: CreateAiProviderInput): Promise<AiProvider> {
    return this.providerRepository.create(input)
  }

  /**
   * 更新提供商
   */
  async updateProvider(id: string, input: UpdateAiProviderInput): Promise<AiProvider> {
    return this.providerRepository.update(id, input)
  }

  /**
   * 删除提供商
   */
  async deleteProvider(id: string): Promise<AiProvider> {
    return this.providerRepository.delete(id)
  }

  /**
   * 创建模型
   */
  async createModel(input: CreateAiModelInput): Promise<AiModel> {
    return this.modelRepository.create(input)
  }

  /**
   * 更新模型
   */
  async updateModel(id: string, input: UpdateAiModelInput): Promise<AiModel> {
    return this.modelRepository.update(id, input)
  }

  /**
   * 删除模型
   */
  async deleteModel(id: string): Promise<AiModel> {
    return this.modelRepository.delete(id)
  }

  // ============================================================
  // 自动刷新
  // ============================================================

  /**
   * 启动自动刷新
   */
  startAutoRefresh(): void {
    if (this.refreshTimer) {
      return
    }

    this.refreshTimer = setInterval(async () => {
      try {
        await this.load()
      } catch (error) {
        console.error('[ConfigManager] Failed to refresh config:', error)
      }
    }, this.options.refreshInterval)
  }

  /**
   * 停止自动刷新
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
    }
  }

  // ============================================================
  // 资源清理
  // ============================================================

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.stopAutoRefresh()
    this.providers.clear()
    this.models.clear()
    this.providerModels.clear()
    this.isLoaded = false
  }

  // ============================================================
  // 私有方法
  // ============================================================

  /**
   * 确保配置已加载
   */
  private ensureLoaded(): void {
    if (!this.isLoaded) {
      throw new Error('Config not loaded. Call load() first.')
    }
  }

  /**
   * 创建提供商 Repository（懒加载）
   */
  private createProviderRepository(): IAiProviderRepository {
    // Dynamic import to avoid issues during type checking
    const { AiProviderRepository } = require('@ai-drama-studio/db')
    return new AiProviderRepository()
  }

  /**
   * 创建模型 Repository（懒加载）
   */
  private createModelRepository(): IAiModelRepository {
    const { AiModelRepository } = require('@ai-drama-studio/db')
    return new AiModelRepository()
  }

  /**
   * 映射数据库提供商配置
   */
  private mapProviderConfig(dbProvider: AiProviderWithModels): ProviderConfig {
    return {
      id: dbProvider.id,
      name: dbProvider.name,
      baseUrl: dbProvider.baseUrl,
      apiKey: dbProvider.apiKey || undefined,
      isActive: dbProvider.isActive,
      priority: dbProvider.priority,
      weight: dbProvider.weight,
      rateLimit: dbProvider.rateLimit || undefined,
      quotaDaily: dbProvider.quotaDaily || undefined,
      metadata: (dbProvider.metadata as Record<string, unknown>) || undefined,
      description: dbProvider.description || undefined,
      models: (dbProvider.models || []).map((m) => this.mapModelConfig(m)),
    }
  }

  /**
   * 映射数据库模型配置
   */
  private mapModelConfig(dbModel: AiModel): ModelConfig {
    return {
      id: dbModel.id,
      modelId: dbModel.modelId,
      name: dbModel.name,
      type: dbModel.type as 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE' | 'EMBEDDING',
      isEnabled: dbModel.isEnabled,
      isDefault: dbModel.isDefault,
      maxTokens: dbModel.maxTokens || undefined,
      contextWindow: dbModel.contextWindow || undefined,
      inputCost: dbModel.inputCost || undefined,
      outputCost: dbModel.outputCost || undefined,
      imageCost: dbModel.imageCost || undefined,
      videoCost: dbModel.videoCost || undefined,
      currency: dbModel.currency,
      rateLimit: dbModel.rateLimit || undefined,
      rpm: dbModel.rpm || undefined,
      tpm: dbModel.tpm || undefined,
      metadata: (dbModel.metadata as Record<string, unknown>) || undefined,
    }
  }
}

// ============================================================
// 便捷函数
// ============================================================

/**
 * 创建配置管理器实例
 *
 * @param options - 配置选项
 * @returns 配置管理器实例
 *
 * @example
 * ```typescript
 * const manager = createConfigManager({
 *   autoRefresh: true,
 *   refreshInterval: 60000,
 * })
 *
 * await manager.load()
 * ```
 */
export function createConfigManager(options?: ConfigManagerOptions): ConfigManager {
  return new ConfigManager(options)
}

/**
 * 快速加载配置
 *
 * 创建管理器并立即加载配置
 *
 * @param options - 配置选项
 * @returns 已加载的配置管理器
 */
export async function loadConfig(options?: ConfigManagerOptions): Promise<ConfigManager> {
  const manager = new ConfigManager(options)
  await manager.load()
  return manager
}
