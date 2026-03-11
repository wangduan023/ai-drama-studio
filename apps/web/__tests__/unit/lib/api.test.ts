import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api, ApiClientError, buildSSEUrl } from '@/lib/api/client'
import { server } from '@/test/mocks/server'
import { errorHandlers } from '@/test/mocks/handlers'

describe('API Client', () => {
  describe('GET 请求', () => {
    it('应该成功获取项目列表', async () => {
      const projects = await api.get('/api/projects')

      expect(projects).toBeDefined()
      expect(Array.isArray(projects)).toBe(true)
      expect(projects.length).toBeGreaterThan(0)
    })

    it('应该成功获取单个项目', async () => {
      const project = await api.get('/api/projects/test-project-1')

      expect(project).toBeDefined()
      expect(project.id).toBe('test-project-1')
      expect(project.title).toBeDefined()
    })

    it('应该支持自定义 headers', async () => {
      const customHeader = { 'X-Custom-Header': 'test-value' }
      
      // 使用 MSW 来验证 headers 是否正确传递
      const requestInterceptor = vi.fn()
      server.events.on('request:start', requestInterceptor)

      await api.get('/api/projects', { headers: customHeader })

      server.events.removeListener('request:start', requestInterceptor)
    })

    it('应该在 404 错误时抛出 ApiClientError', async () => {
      server.use(...errorHandlers)

      await expect(api.get('/api/projects/proj-nonexistent'))
        .rejects
        .toThrow(ApiClientError)
    })

    it('应该在 500 错误时抛出 ApiClientError', async () => {
      server.use(...errorHandlers)

      await expect(api.get('/api/projects'))
        .rejects
        .toThrow(ApiClientError)
    })

    it('错误消息应该包含 HTTP 状态码', async () => {
      server.use(...errorHandlers)

      try {
        await api.get('/api/projects')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        if (error instanceof ApiClientError) {
          expect(error.message).toContain('500')
        }
      }
    })
  })

  describe('POST 请求', () => {
    it('应该成功创建项目', async () => {
      const newProject = {
        title: 'Test Project',
        description: 'Test Description',
      }

      const response = await api.post('/api/projects', newProject)

      expect(response).toBeDefined()
      expect(response.title).toBe(newProject.title)
      expect(response.description).toBe(newProject.description)
      expect(response.id).toBeDefined()
      expect(response.createdAt).toBeDefined()
    })

    it('应该正确发送请求体数据', async () => {
      const projectData = {
        title: 'New Project',
        description: 'Project Description',
      }

      const response = await api.post('/api/projects', projectData)

      expect(response.title).toBe(projectData.title)
      expect(response.description).toBe(projectData.description)
    })

    it('应该支持自定义 headers', async () => {
      const projectData = { title: 'Test' }
      const customHeaders = { 'Authorization': 'Bearer token123' }

      const response = await api.post('/api/projects', projectData, {
        headers: customHeaders,
      })

      expect(response).toBeDefined()
    })

    it('应该正确处理 POST 404 错误', async () => {
      const { http, HttpResponse } = await import('msw')
      server.use(
        http.post('/api/nonexistent', () => {
          return HttpResponse.json(
            { error: 'Not Found', message: 'Endpoint not found' },
            { status: 404 }
          )
        })
      )

      await expect(api.post('/api/nonexistent', { title: 'Test' }))
        .rejects
        .toThrow(ApiClientError)
    })
  })

  describe('PUT 请求', () => {
    it('应该成功更新项目', async () => {
      const updateData = {
        title: 'Updated Project Title',
        description: 'Updated Description',
      }

      const response = await api.put('/api/projects/test-project-1', updateData)

      expect(response).toBeDefined()
      expect(response.title).toBe(updateData.title)
    })

    it('应该正确发送 PUT 请求体', async () => {
      const updateData = {
        title: 'New Title',
        status: 'ACTIVE',
      }

      const response = await api.put('/api/projects/test-project-1', updateData)

      expect(response.title).toBe(updateData.title)
      expect(response.status).toBe(updateData.status)
    })

    it('应该在更新不存在的项目时抛出错误', async () => {
      await expect(api.put('/api/projects/nonexistent', { title: 'Test' }))
        .rejects
        .toThrow(ApiClientError)
    })
  })

  describe('DELETE 请求', () => {
    it('应该成功删除项目', async () => {
      const response = await api.delete('/api/projects/test-project-1')

      expect(response).toBeDefined()
      expect(response.success).toBe(true)
    })

    it('应该支持不带返回值的 DELETE 请求 (204)', async () => {
      // Mock 204 响应
      const { http, HttpResponse } = await import('msw')
      server.use(
        http.delete('/api/projects/test-project-2', () => {
          return new HttpResponse(null, { status: 204 })
        })
      )

      const response = await api.delete('/api/projects/test-project-2')

      expect(response).toBeUndefined()
    })

    it('应该支持自定义 headers', async () => {
      const customHeaders = { 'X-Delete-Reason': 'test' }

      const response = await api.delete('/api/projects/test-project-1', {
        headers: customHeaders,
      })

      expect(response).toBeDefined()
    })
  })

  describe('ApiClientError', () => {
    it('应该正确创建 ApiClientError', () => {
      const error = new ApiClientError('Test error', 'TEST_CODE', { detail: 'test' })

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ApiClientError)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.details).toEqual({ detail: 'test' })
      expect(error.name).toBe('ApiClientError')
    })

    it('应该支持不带 code 和 details 的错误', () => {
      const error = new ApiClientError('Simple error')

      expect(error.message).toBe('Simple error')
      expect(error.code).toBeUndefined()
      expect(error.details).toBeUndefined()
    })

    it('应该可以被 instanceof 正确识别', () => {
      const error = new ApiClientError('Test')

      expect(error instanceof ApiClientError).toBe(true)
      expect(error instanceof Error).toBe(true)
    })
  })

  describe('buildSSEUrl', () => {
    const originalWindow = global.window

    beforeEach(() => {
      // 重置 window 对象
      global.window = {
        location: {
          origin: 'http://localhost:3000',
        },
      } as unknown as Window & typeof globalThis
    })

    afterEach(() => {
      global.window = originalWindow
    })

    it('应该构建基本的 SSE URL', () => {
      const url = buildSSEUrl('/api/sse')

      expect(url).toBe('http://localhost:3000/api/sse')
    })

    it('应该构建带参数的 SSE URL', () => {
      const url = buildSSEUrl('/api/sse', {
        projectId: 'proj-1',
        stream: 'true',
      })

      expect(url).toContain('projectId=proj-1')
      expect(url).toContain('stream=true')
      expect(url).toContain('/api/sse')
    })

    it('应该正确处理空参数', () => {
      const url = buildSSEUrl('/api/sse', {})

      expect(url).toBe('http://localhost:3000/api/sse')
    })

    it('应该正确处理多个参数', () => {
      const params = {
        a: '1',
        b: '2',
        c: '3',
      }

      const url = buildSSEUrl('/api/sse', params)

      expect(url).toContain('a=1')
      expect(url).toContain('b=2')
      expect(url).toContain('c=3')
    })

    it('应该正确处理需要编码的参数', () => {
      const url = buildSSEUrl('/api/sse', {
        message: 'hello world',
        special: 'a+b=c',
      })

      // URLSearchParams 使用 '+' 编码空格，使用 %XX 编码特殊字符
      expect(url).toContain('message=hello+world')
      expect(url).toContain('special=a%2Bb%3Dc')
    })
  })

  describe('请求配置', () => {
    it('应该默认设置 Content-Type 为 application/json', async () => {
      let capturedRequest: Request | null = null

      const { http, HttpResponse } = await import('msw')
      server.use(
        http.get('/api/test-headers', async ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({ success: true })
        })
      )

      await api.get('/api/test-headers')

      expect(capturedRequest).not.toBeNull()
      expect(capturedRequest?.headers.get('Content-Type')).toBe('application/json')
    })

    it('应该允许覆盖默认 headers', async () => {
      let capturedRequest: Request | null = null

      const { http, HttpResponse } = await import('msw')
      server.use(
        http.get('/api/test-headers', async ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({ success: true })
        })
      )

      await api.get('/api/test-headers', {
        headers: { 'Content-Type': 'text/plain' },
      })

      expect(capturedRequest?.headers.get('Content-Type')).toBe('text/plain')
    })
  })

  describe('角色 API', () => {
    it('应该获取角色列表', async () => {
      const characters = await api.get('/api/characters')

      expect(Array.isArray(characters)).toBe(true)
    })

    it('应该支持按项目 ID 筛选角色', async () => {
      const { http, HttpResponse } = await import('msw')
      
      let capturedUrl: URL | null = null
      server.use(
        http.get('/api/characters', async ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json([])
        })
      )

      await api.get('/api/characters?projectId=test-project-1')

      expect(capturedUrl?.searchParams.get('projectId')).toBe('test-project-1')
    })

    it('应该成功创建角色', async () => {
      const newCharacter = {
        name: 'New Character',
        projectId: 'test-project-1',
        description: 'A test character',
      }

      const response = await api.post('/api/characters', newCharacter)

      expect(response.name).toBe(newCharacter.name)
      expect(response.projectId).toBe(newCharacter.projectId)
      expect(response.id).toBeDefined()
    })
  })

  describe('剧集 API', () => {
    it('应该获取剧集列表', async () => {
      const episodes = await api.get('/api/episodes')

      expect(Array.isArray(episodes)).toBe(true)
    })

    it('应该支持按项目 ID 筛选剧集', async () => {
      const { http, HttpResponse } = await import('msw')
      
      let capturedUrl: URL | null = null
      server.use(
        http.get('/api/episodes', async ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json([])
        })
      )

      await api.get('/api/episodes?projectId=test-project-1')

      expect(capturedUrl?.searchParams.get('projectId')).toBe('test-project-1')
    })
  })

  describe('地点 API', () => {
    it('应该获取地点列表', async () => {
      const locations = await api.get('/api/locations')

      expect(Array.isArray(locations)).toBe(true)
    })

    it('应该支持按项目 ID 筛选地点', async () => {
      const { http, HttpResponse } = await import('msw')
      
      let capturedUrl: URL | null = null
      server.use(
        http.get('/api/locations', async ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json([])
        })
      )

      await api.get('/api/locations?projectId=test-project-1')

      expect(capturedUrl?.searchParams.get('projectId')).toBe('test-project-1')
    })
  })
})
