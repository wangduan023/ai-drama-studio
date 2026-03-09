/**
 * API 客户端配置
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

export class ApiClientError extends Error {
  code?: string
  details?: unknown

  constructor(message: string, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.details = details
  }
}

/**
 * 简化的 API 客户端
 */
export const api = {
  /**
   * GET 请求
   */
  async get<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${BASE_URL}${url}`, {
      ...init,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })

    if (!response.ok) {
      await handleErrorResponse(response)
    }

    return response.json()
  },

  /**
   * POST 请求
   */
  async post<T>(url: string, data?: unknown, init?: RequestInit): Promise<T> {
    const response = await fetch(`${BASE_URL}${url}`, {
      ...init,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      await handleErrorResponse(response)
    }

    return response.json()
  },

  /**
   * PUT 请求
   */
  async put<T>(url: string, data?: unknown, init?: RequestInit): Promise<T> {
    const response = await fetch(`${BASE_URL}${url}`, {
      ...init,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      await handleErrorResponse(response)
    }

    return response.json()
  },

  /**
   * DELETE 请求
   */
  async delete<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${BASE_URL}${url}`, {
      ...init,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })

    if (!response.ok) {
      await handleErrorResponse(response)
    }

    // DELETE 请求可能没有返回值
    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  },
}

async function handleErrorResponse(response: Response) {
  let errorData: ApiError | undefined

  try {
    errorData = await response.json()
  } catch {
    // 非 JSON 响应
  }

  throw new ApiClientError(
    errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
    errorData?.code,
    errorData?.details
  )
}

/**
 * 构建 SSE 连接 URL
 */
export function buildSSEUrl(endpoint: string, params?: Record<string, string>): string {
  const url = new URL(endpoint, BASE_URL || window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return url.toString()
}
