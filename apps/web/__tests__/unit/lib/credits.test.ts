import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateScriptCost,
  calculateImageCost,
  calculateVideoCost,
  calculateAudioCost,
  calculateTaskCost,
  COST_CONFIG,
} from '@/lib/credits/cost'

describe('积分成本计算', () => {
  describe('calculateScriptCost', () => {
    it('应该正确计算剧本生成成本', () => {
      expect(calculateScriptCost(0)).toBeGreaterThanOrEqual(1)
      expect(calculateScriptCost(500)).toBeGreaterThanOrEqual(1)
      expect(calculateScriptCost(1000)).toBeGreaterThanOrEqual(1)
      expect(calculateScriptCost(2000)).toBeGreaterThanOrEqual(1)
    })

    it('成本应该随着 token 数量增加而增加', () => {
      const cost1 = calculateScriptCost(1000)
      const cost2 = calculateScriptCost(3000)
      expect(cost2).toBeGreaterThanOrEqual(cost1)
    })
  })

  describe('calculateImageCost', () => {
    it('应该正确计算不同分辨率的图片成本', () => {
      expect(calculateImageCost('256x256')).toBe(COST_CONFIG.image.low)
      expect(calculateImageCost('512x512')).toBe(COST_CONFIG.image.medium)
      expect(calculateImageCost('1024x1024')).toBe(COST_CONFIG.image.high)
      expect(calculateImageCost('2048x2048')).toBe(COST_CONFIG.image.ultra)
    })

    it('应该使用默认成本当分辨率未知时', () => {
      expect(calculateImageCost('unknown')).toBe(COST_CONFIG.image.medium)
    })
  })

  describe('calculateVideoCost', () => {
    it('应该正确计算视频生成成本', () => {
      const cost = calculateVideoCost(5, '720p')
      expect(cost).toBe(5 * COST_CONFIG.video.hd)
    })

    it('应该根据时长计算成本', () => {
      const cost5s = calculateVideoCost(5, '720p')
      const cost10s = calculateVideoCost(10, '720p')
      expect(cost10s).toBe(cost5s * 2)
    })
  })

  describe('calculateAudioCost', () => {
    it('应该正确计算语音合成成本', () => {
      expect(calculateAudioCost(0)).toBeGreaterThanOrEqual(1)
      expect(calculateAudioCost(100)).toBeGreaterThanOrEqual(1)
      expect(calculateAudioCost(200)).toBeGreaterThanOrEqual(1)
    })
  })

  describe('calculateTaskCost', () => {
    it('应该为剧本生成任务计算成本', () => {
      const cost = calculateTaskCost('SCRIPT_GENERATE', { tokens: 2000 })
      expect(cost).toBeGreaterThan(0)
    })

    it('应该为图片生成任务计算成本', () => {
      const cost = calculateTaskCost('IMAGE_GENERATE', { resolution: '1024x1024' })
      expect(cost).toBe(COST_CONFIG.image.high)
    })

    it('应该为视频生成任务计算成本', () => {
      const cost = calculateTaskCost('VIDEO_GENERATE', { duration: 10, resolution: '720p' })
      expect(cost).toBe(10 * COST_CONFIG.video.hd)
    })

    it('应该为分析任务计算固定成本', () => {
      expect(calculateTaskCost('NOVEL_ANALYZE')).toBe(COST_CONFIG.analysis.novelAnalyze)
      expect(calculateTaskCost('CHARACTER_PROFILE_ANALYZE')).toBe(COST_CONFIG.analysis.characterProfile)
    })

    it('未知任务类型应该返回默认成本', () => {
      expect(calculateTaskCost('UNKNOWN_TASK')).toBe(1)
    })
  })
})
