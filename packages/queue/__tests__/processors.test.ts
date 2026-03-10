import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Worker } from 'bullmq'
import {
  startAllWorkers,
  stopAllWorkers,
  getAllWorkers,
  getProcessorConfig
} from '../src/processors'

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => {})

describe('Processors Module', () => {
  beforeEach(() => {
    // Clean up environment before each test
    delete process.env.QUEUE_CONCURRENCY_LLM
    delete process.env.QUEUE_CONCURRENCY_IMAGE
    delete process.env.QUEUE_CONCURRENCY_VIDEO
    delete process.env.QUEUE_CONCURRENCY_VOICE
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should have proper function exports', () => {
    expect(typeof startAllWorkers).toBe('function')
    expect(typeof stopAllWorkers).toBe('function')
    expect(typeof getAllWorkers).toBe('function')
    expect(typeof getProcessorConfig).toBe('function')
  })

  it('should start all workers with console logs', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    startAllWorkers()

    expect(consoleSpy).toHaveBeenCalledWith('[Worker] Starting all workers...')
    expect(consoleSpy).toHaveBeenCalledWith('[Worker] Note: Worker implementations are in @ai-drama-studio/worker package')
    expect(consoleSpy).toHaveBeenCalledWith('[Worker] All workers started')
  })

  it('should get all workers (initially all null)', () => {
    const workers = getAllWorkers()

    expect(workers).toEqual({
      llm: null,
      image: null,
      video: null,
      voice: null
    })
  })

  it('should stop all workers without errors', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await stopAllWorkers()

    expect(consoleSpy).toHaveBeenCalledWith('[Worker] Stopping all workers...')
    expect(consoleSpy).toHaveBeenCalledWith('[Worker] All workers stopped')
  })

  it('should get processor config with default values', () => {
    const llmConfig = getProcessorConfig('llm')
    const imageConfig = getProcessorConfig('image')
    const videoConfig = getProcessorConfig('video')
    const voiceConfig = getProcessorConfig('voice')

    expect(llmConfig.concurrency).toBe(4) // Default value
    expect(imageConfig.concurrency).toBe(4)
    expect(videoConfig.concurrency).toBe(4)
    expect(voiceConfig.concurrency).toBe(4)

    expect(llmConfig).not.toHaveProperty('limiter') // limiter should not be present by default
  })

  it('should get processor config with environment variable overrides', () => {
    process.env.QUEUE_CONCURRENCY_LLM = '8'
    process.env.QUEUE_CONCURRENCY_IMAGE = '2'
    process.env.QUEUE_CONCURRENCY_VIDEO = '1'
    process.env.QUEUE_CONCURRENCY_VOICE = '6'

    expect(getProcessorConfig('llm').concurrency).toBe(8)
    expect(getProcessorConfig('image').concurrency).toBe(2)
    expect(getProcessorConfig('video').concurrency).toBe(1)
    expect(getProcessorConfig('voice').concurrency).toBe(6)
  })

  it('should handle invalid environment variable values gracefully', () => {
    process.env.QUEUE_CONCURRENCY_LLM = 'invalid-number'

    // Should default to 4 when parsing fails
    const config = getProcessorConfig('llm')
    expect(config.concurrency).toBe(4)
  })

  it('should handle empty environment variable values gracefully', () => {
    process.env.QUEUE_CONCURRENCY_LLM = ''

    // Should default to 4 when value is empty
    const config = getProcessorConfig('llm')
    expect(config.concurrency).toBe(4)
  })
})