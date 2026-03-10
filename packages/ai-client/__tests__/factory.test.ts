/**
 * Factory 测试
 */

import { describe, it, expect } from 'vitest'
import { createAIClient, createAIClients, createClientPool, normalizeProvider } from '../src/factory'
import { OpenAIClient } from '../src/clients/openai.client'
import { AnthropicClient } from '../src/clients/anthropic.client'
import { GeminiClient } from '../src/clients/gemini.client'
import { MistralClient } from '../src/clients/mistral.client'
import { CohereClient } from '../src/clients/cohere.client'
import { GroqClient } from '../src/clients/groq.client'
import { StabilityClient } from '../src/clients/stability.client'
import { FalClient } from '../src/clients/fal.client'
import { RunwayClient } from '../src/clients/runway.client'
import { ElevenLabsClient } from '../src/clients/elevenlabs.client'
import { LumaClient } from '../src/clients/luma.client'
import { HuggingFaceClient } from '../src/clients/huggingface.client'
import { DeepSeekClient } from '../src/clients/deepseek.client'
import { QwenClient } from '../src/clients/qwen.client'
import { BaiduClient } from '../src/clients/baidu.client'
import { TencentClient } from '../src/clients/tencent.client'
import { ZhipuClient } from '../src/clients/zhipu.client'
import { MoonshotClient } from '../src/clients/moonshot.client'
import { BaichuanClient } from '../src/clients/baichuan.client'
import { SenseTimeClient } from '../src/clients/sensetime.client'
import { KlingClient } from '../src/clients/kling.client'
import { StepfunClient } from '../src/clients/stepfun.client'
import { LingyiClient } from '../src/clients/lingyi.client'
import { IflytekClient } from '../src/clients/iflytek.client'
import { MiniMaxClient } from '../src/clients/minimax.client'
import { DoubaoClient } from '../src/clients/doubao.client'
import { OllamaClient } from '../src/clients/ollama.client'
import { ComfyUIClient } from '../src/clients/comfyui.client'

describe('factory', () => {
  describe('createAIClient', () => {
    it('应该创建 OpenAI 客户端', () => {
      const client = createAIClient({
        provider: 'openai',
        modelId: 'gpt-4o',
        apiKey: 'sk-test-key',
      })
      expect(client).toBeInstanceOf(OpenAIClient)
    })

    it('应该创建 Anthropic 客户端', () => {
      const client = createAIClient({
        provider: 'anthropic',
        modelId: 'claude-3-7-sonnet-20250219',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(AnthropicClient)
    })

    it('应该创建 Google Gemini 客户端', () => {
      const client = createAIClient({
        provider: 'google',
        modelId: 'gemini-2.0-flash',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(GeminiClient)
    })

    it('应该创建 Mistral 客户端', () => {
      const client = createAIClient({
        provider: 'mistral',
        modelId: 'mistral-large-latest',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(MistralClient)
    })

    it('应该创建 Cohere 客户端', () => {
      const client = createAIClient({
        provider: 'cohere',
        modelId: 'command-r-plus',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(CohereClient)
    })

    it('应该创建 Groq 客户端', () => {
      const client = createAIClient({
        provider: 'groq',
        modelId: 'llama-3.1-70b-versatile',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(GroqClient)
    })

    it('应该创建 Stability 客户端', () => {
      const client = createAIClient({
        provider: 'stability',
        modelId: 'sd3.5-large-turbo',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(StabilityClient)
    })

    it('应该创建 Fal 客户端', () => {
      const client = createAIClient({
        provider: 'fal',
        modelId: 'fal-ai/fast-sd',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(FalClient)
    })

    it('应该创建 Runway 客户端', () => {
      const client = createAIClient({
        provider: 'runway',
        modelId: 'gen3a_turbo',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(RunwayClient)
    })

    it('应该创建 ElevenLabs 客户端', () => {
      const client = createAIClient({
        provider: 'elevenlabs',
        modelId: 'eleven_multilingual_v2',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(ElevenLabsClient)
    })

    it('应该创建 Luma 客户端', () => {
      const client = createAIClient({
        provider: 'luma',
        modelId: 'dream-machine',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(LumaClient)
    })

    it('应该创建 HuggingFace 客户端', () => {
      const client = createAIClient({
        provider: 'huggingface',
        modelId: 'mistralai/Mistral-Large',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(HuggingFaceClient)
    })

    it('应该创建 DeepSeek 客户端', () => {
      const client = createAIClient({
        provider: 'deepseek',
        modelId: 'deepseek-v3',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(DeepSeekClient)
    })

    it('应该创建 Qwen 客户端', () => {
      const client = createAIClient({
        provider: 'qwen',
        modelId: 'qwen2.5-72b-instruct',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(QwenClient)
    })

    it('应该创建 Baidu 客户端', () => {
      const client = createAIClient({
        provider: 'baidu',
        modelId: 'ernie-4.0-turbo-8k',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(BaiduClient)
    })

    it('应该创建 Tencent 客户端', () => {
      const client = createAIClient({
        provider: 'tencent',
        modelId: 'hunyuan-pro',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(TencentClient)
    })

    it('应该创建 Zhipu 客户端', () => {
      const client = createAIClient({
        provider: 'zhipu',
        modelId: 'glm-4',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(ZhipuClient)
    })

    it('应该创建 Moonshot 客户端', () => {
      const client = createAIClient({
        provider: 'moonshot',
        modelId: 'kimi-latest',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(MoonshotClient)
    })

    it('应该创建 Baichuan 客户端', () => {
      const client = createAIClient({
        provider: 'baichuan',
        modelId: 'Baichuan4',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(BaichuanClient)
    })

    it('应该创建 SenseTime 客户端', () => {
      const client = createAIClient({
        provider: 'sensetime',
        modelId: 'sensechat-5',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(SenseTimeClient)
    })

    it('应该创建 Kling 客户端', () => {
      const client = createAIClient({
        provider: 'kling',
        modelId: 'kling-v1',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(KlingClient)
    })

    it('应该创建 Stepfun 客户端', () => {
      const client = createAIClient({
        provider: 'stepfun',
        modelId: 'step-1v',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(StepfunClient)
    })

    it('应该创建 Lingyi 客户端', () => {
      const client = createAIClient({
        provider: 'lingyi',
        modelId: 'yi-large',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(LingyiClient)
    })

    it('应该创建 Iflytek 客户端', () => {
      const client = createAIClient({
        provider: 'iflytek',
        modelId: 'spark-3.5',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(IflytekClient)
    })

    it('应该创建 MiniMax 客户端', () => {
      const client = createAIClient({
        provider: 'minimax',
        modelId: 'abab6.5-chat',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(MiniMaxClient)
    })

    it('应该创建 Doubao 客户端', () => {
      const client = createAIClient({
        provider: 'doubao',
        modelId: 'doubao-seedance-1-0-pro-fast-251015',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(DoubaoClient)
    })

    it('应该创建 Ollama 客户端', () => {
      const client = createAIClient({
        provider: 'ollama',
        modelId: 'llama3.1:8b',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(OllamaClient)
    })

    it('应该创建 ComfyUI 客户端', () => {
      const client = createAIClient({
        provider: 'comfyui',
        baseURL: 'http://localhost:8188',
        apiKey: 'test-key',
        modelId: 'comfyui-workflow', // ComfyUI 现在需要 modelId
      })
      expect(client).toBeInstanceOf(ComfyUIClient)
    })

    it('应该创建 OpenAI 兼容客户端', () => {
      const client = createAIClient({
        provider: 'openai-compatible',
        modelId: 'custom-model',
        apiKey: 'test-key',
        baseURL: 'https://custom.api.com/v1',
      })
      expect(client).toBeInstanceOf(OpenAIClient)
    })

    it('应该返回 OpenAI 兼容客户端对于未知的提供商', () => {
      // normalizeProvider 会将未知提供商规范化为 'openai-compatible'
      const client = createAIClient({
        provider: 'unknown-provider',
        modelId: 'model',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(OpenAIClient)
    })
  })

  describe('normalizeProvider', () => {
    it('应该规范化 OpenAI 兼容提供商', () => {
      expect(normalizeProvider('openai-compatible')).toBe('openai-compatible')
      expect(normalizeProvider('azure-openai')).toBe('openai-compatible')
      expect(normalizeProvider('together-ai')).toBe('openai-compatible')
      // groq-cloud 规范化为 groq
      expect(normalizeProvider('groq-cloud')).toBe('groq')
    })

    it('应该规范化豆包别名', () => {
      expect(normalizeProvider('doubao')).toBe('doubao')
      expect(normalizeProvider('seedance')).toBe('doubao')
      expect(normalizeProvider('seedream')).toBe('doubao')
      expect(normalizeProvider('volc')).toBe('doubao')
      expect(normalizeProvider('volces')).toBe('doubao')
      expect(normalizeProvider('bytedance')).toBe('doubao')
    })

    it('应该规范化 Google 别名', () => {
      expect(normalizeProvider('google')).toBe('google')
      expect(normalizeProvider('gemini')).toBe('google')
      expect(normalizeProvider('imagen')).toBe('google')
      expect(normalizeProvider('vertex')).toBe('google')
    })

    it('应该规范化 Anthropic 别名', () => {
      expect(normalizeProvider('anthropic')).toBe('anthropic')
      expect(normalizeProvider('claude')).toBe('anthropic')
    })

    it('应该规范化 Qwen 别名', () => {
      expect(normalizeProvider('qwen')).toBe('qwen')
      expect(normalizeProvider('aliyun')).toBe('qwen')
      expect(normalizeProvider('dashscope')).toBe('qwen')
    })

    it('应该规范化百度别名', () => {
      expect(normalizeProvider('baidu')).toBe('baidu')
      expect(normalizeProvider('ernie')).toBe('baidu')
      expect(normalizeProvider('wenxin')).toBe('baidu')
      expect(normalizeProvider('qianfan')).toBe('baidu')
    })

    it('应该规范化腾讯别名', () => {
      expect(normalizeProvider('tencent')).toBe('tencent')
      expect(normalizeProvider('hunyuan')).toBe('tencent')
    })

    it('应该规范化科大讯飞别名', () => {
      expect(normalizeProvider('iflytek')).toBe('iflytek')
      expect(normalizeProvider('spark')).toBe('iflytek')
      expect(normalizeProvider('xunfei')).toBe('iflytek')
    })

    it('应该规范化智谱别名', () => {
      expect(normalizeProvider('zhipu')).toBe('zhipu')
      expect(normalizeProvider('glm')).toBe('zhipu')
      expect(normalizeProvider('bigmodel')).toBe('zhipu')
    })

    it('应该规范化月之暗面别名', () => {
      expect(normalizeProvider('moonshot')).toBe('moonshot')
      expect(normalizeProvider('kimi')).toBe('moonshot')
    })

    it('应该规范化 MiniMax 别名', () => {
      expect(normalizeProvider('minimax')).toBe('minimax')
      expect(normalizeProvider('hailuo')).toBe('minimax')
    })

    it('应该规范化零一万物别名', () => {
      expect(normalizeProvider('lingyi')).toBe('lingyi')
      expect(normalizeProvider('yi')).toBe('lingyi')
    })

    it('应该规范化可灵别名', () => {
      expect(normalizeProvider('kling')).toBe('kling')
      expect(normalizeProvider('kuaishou')).toBe('kling')
    })

    it('应该规范化阶跃星辰别名', () => {
      expect(normalizeProvider('stepfun')).toBe('stepfun')
      expect(normalizeProvider('step')).toBe('stepfun')
    })

    it('应该规范化百川智能别名', () => {
      expect(normalizeProvider('baichuan')).toBe('baichuan')
    })

    it('应该规范化商汤科技别名', () => {
      expect(normalizeProvider('sensetime')).toBe('sensetime')
      expect(normalizeProvider('sensenova')).toBe('sensetime')
    })

    it('应该规范化 Mistral 别名', () => {
      expect(normalizeProvider('mistral')).toBe('mistral')
      expect(normalizeProvider('mistral-ai')).toBe('mistral')
    })

    it('应该规范化 Cohere 别名', () => {
      expect(normalizeProvider('cohere')).toBe('cohere')
      expect(normalizeProvider('command-r')).toBe('cohere')
    })

    it('应该规范化 Groq 别名', () => {
      expect(normalizeProvider('groq')).toBe('groq')
      expect(normalizeProvider('groq-cloud')).toBe('groq')
    })

    it('应该规范化 Stability 别名', () => {
      expect(normalizeProvider('stability')).toBe('stability')
      expect(normalizeProvider('stability-ai')).toBe('stability')
      expect(normalizeProvider('stable-diffusion')).toBe('stability')
    })

    it('应该规范化 Fal 别名', () => {
      expect(normalizeProvider('fal')).toBe('fal')
      expect(normalizeProvider('fal-ai')).toBe('fal')
    })

    it('应该规范化 Runway 别名', () => {
      expect(normalizeProvider('runway')).toBe('runway')
      expect(normalizeProvider('runway-ml')).toBe('runway')
      expect(normalizeProvider('gen-3')).toBe('runway')
    })

    it('应该规范化 ElevenLabs 别名', () => {
      expect(normalizeProvider('elevenlabs')).toBe('elevenlabs')
      expect(normalizeProvider('eleven-labs')).toBe('elevenlabs')
    })

    it('应该规范化 Luma 别名', () => {
      expect(normalizeProvider('luma')).toBe('luma')
      expect(normalizeProvider('luma-ai')).toBe('luma')
      expect(normalizeProvider('dream-machine')).toBe('luma')
    })

    it('应该规范化 HuggingFace 别名', () => {
      expect(normalizeProvider('huggingface')).toBe('huggingface')
      expect(normalizeProvider('hf')).toBe('huggingface')
    })

    it('应该默认返回 openai-compatible', () => {
      expect(normalizeProvider('unknown')).toBe('openai-compatible')
    })
  })

  describe('createAIClients', () => {
    it('应该批量创建客户端', () => {
      const clients = createAIClients([
        {
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'test-key-1',
        },
        {
          provider: 'anthropic',
          modelId: 'claude-3-7-sonnet-20250219',
          apiKey: 'test-key-2',
        },
      ])

      expect(clients.openai).toBeInstanceOf(OpenAIClient)
      expect(clients.anthropic).toBeInstanceOf(AnthropicClient)
    })

    it('应该使用自定义名称创建客户端', () => {
      const clients = createAIClients([
        {
          name: 'primary',
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'test-key',
        },
      ])

      expect(clients.primary).toBeInstanceOf(OpenAIClient)
    })
  })

  describe('createClientPool', () => {
    it('应该创建带主备客户端的池', () => {
      const pool = createClientPool(
        {
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: 'test-key-primary',
        },
        [
          {
            provider: 'anthropic',
            modelId: 'claude-3-7-sonnet-20250219',
            apiKey: 'test-key-backup',
          },
        ]
      )

      expect(pool.primary).toBeInstanceOf(OpenAIClient)
      expect(pool.fallbacks).toHaveLength(1)
      expect(pool.fallbacks[0]).toBeInstanceOf(AnthropicClient)
    })

    it('应该创建不带备用的池', () => {
      const pool = createClientPool({
        provider: 'openai',
        modelId: 'gpt-4o',
        apiKey: 'test-key',
      })

      expect(pool.primary).toBeInstanceOf(OpenAIClient)
      expect(pool.fallbacks).toHaveLength(0)
    })
  })

  describe('normalizeProvider edge cases', () => {
    it('应该识别混元图像别名', () => {
      expect(normalizeProvider('hunyuan-image')).toBe('hunyuan-image')
      expect(normalizeProvider('hunyuan_image')).toBe('hunyuan-image')
      expect(normalizeProvider('混元图像')).toBe('hunyuan-image')
      expect(normalizeProvider('hunyuan-tuxiang')).toBe('hunyuan-image')
    })

    it('应该识别文心一格别名', () => {
      expect(normalizeProvider('gewang')).toBe('gewang')
      expect(normalizeProvider('文心一格')).toBe('gewang')
      expect(normalizeProvider('wenxin-yige')).toBe('gewang')
      expect(normalizeProvider('yige')).toBe('gewang')
    })
  })
})
