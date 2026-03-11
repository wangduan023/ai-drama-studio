/**
 * Socket.io WebSocket 服务器路由
 * 处理 WebSocket 连接升级和 Socket.io 握手
 * 
 * @route GET /api/socket
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSocketServer } from '@/lib/collaboration/socket';
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';

// 扩展 Next.js 的 HTTP 服务器类型
interface SocketWithIO extends NetSocket {
  server: HTTPServer & {
    io?: ReturnType<typeof createSocketServer>;
  };
}

interface NextResponseWithSocket extends NextResponse {
  socket: SocketWithIO;
}

/**
 * 全局 Socket.io 服务器实例（单例模式）
 * 用于在开发模式下防止热重载时重复创建服务器
 */
declare global {
  // eslint-disable-next-line no-var
  var __socketIoServer: ReturnType<typeof createSocketServer> | undefined;
}

/**
 * 获取或创建 Socket.io 服务器实例
 * @param req - Next.js 请求对象
 * @returns Socket.io 服务器实例
 */
function getSocketServer(req: NextRequest): ReturnType<typeof createSocketServer> | null {
  // 在 Next.js App Router 中，我们需要访问底层的 HTTP 服务器
  // 由于 App Router 的限制，我们需要通过不同的方式来初始化 Socket.io
  
  // 检查是否已经存在全局实例
  if (global.__socketIoServer) {
    return global.__socketIoServer;
  }

  // 注意：在 Next.js App Router 中，Socket.io 需要特殊的配置
  // 由于 App Router 使用 Edge Runtime 或 Serverless 函数，
  // 我们需要在单独的进程中运行 Socket.io 服务器或使用第三方服务
  
  // 返回 null 表示需要在其他地方初始化服务器
  // 实际生产环境中，建议使用独立的 Socket.io 服务器
  return null;
}

/**
 * GET 请求处理
 * 用于 Socket.io 的 HTTP 长轮询握手
 */
export async function GET(req: NextRequest): Promise<Response> {
  // 检查请求是否为 Socket.io 握手请求
  const isSocketIoRequest = req.headers.get('connection')?.toLowerCase().includes('upgrade') ||
    req.nextUrl.searchParams.has('EIO');

  if (!isSocketIoRequest) {
    // 返回 Socket.io 状态信息
    const socketServer = getSocketServer(req);
    
    return NextResponse.json({
      success: true,
      message: 'Socket.io endpoint',
      status: socketServer ? 'initialized' : 'not_initialized',
      transports: ['websocket', 'polling'],
      timestamp: new Date().toISOString(),
    });
  }

  // Socket.io 请求需要通过 HTTP 升级处理
  // 在 App Router 中，这需要特殊的配置
  return NextResponse.json(
    {
      success: false,
      error: 'Socket.io WebSocket upgrade requires custom server configuration',
      message: 'Please use the standalone Socket.io server or configure custom Next.js server',
    },
    { status: 426 }
  );
}

/**
 * POST 请求处理
 * 用于 Socket.io 的 HTTP 长轮询传输
 */
export async function POST(req: NextRequest): Promise<Response> {
  // Socket.io 长轮询请求
  return NextResponse.json(
    {
      success: false,
      error: 'Socket.io HTTP long-polling requires custom server configuration',
    },
    { status: 426 }
  );
}

/**
 * 导出 Socket.io 服务器配置
 * 用于在其他地方（如自定义服务器）初始化 Socket.io
 */
export { createSocketServer };

// 路由配置
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
