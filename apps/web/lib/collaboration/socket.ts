/**
 * Socket.io 服务器配置和事件处理
 * 提供实时协作功能：房间管理、编辑锁定、内容同步、光标追踪
 */

import { Server, Socket } from 'socket.io';
import { verifyToken } from '@/lib/auth';

/**
 * 创建 Socket.io 服务器实例
 * @param server - HTTP 服务器实例
 * @returns Socket.io 服务器实例
 */
export function createSocketServer(server: any) {
  const io = new Server(server, {
    path: '/api/socket',
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT 认证中间件
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const result = await verifyToken(token);
      
      if (!result.valid || !result.user) {
        return next(new Error(result.error || 'Invalid token'));
      }

      // 将用户信息附加到 socket
      socket.data.user = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      };
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // 连接处理
  io.on('connection', (socket: any) => {
    const userId = socket.data.user.id;
    const userName = socket.data.user.name || socket.data.user.email;
    
    console.log(`[Socket] User ${userName} (${userId}) connected`);

    // 存储用户当前加入的房间
    const joinedRooms = new Set<string>();

    // 加入项目房间
    socket.on('join-project', (projectId: string) => {
      if (!projectId) return;
      
      const roomName = `project:${projectId}`;
      socket.join(roomName);
      joinedRooms.add(roomName);
      
      console.log(`[Socket] User ${userName} joined project ${projectId}`);
      
      // 通知房间内的其他用户
      socket.to(roomName).emit('user-joined', {
        userId,
        userName,
        timestamp: new Date().toISOString(),
      });
      
      // 发送当前在线用户列表给新加入的用户
      const room = io.sockets.adapter.rooms.get(roomName);
      if (room) {
        const onlineUserIds = Array.from(room)
          .map((socketId: string) => {
            const clientSocket = io.sockets.sockets.get(socketId);
            return clientSocket?.data.user?.id;
          })
          .filter((id: string) => id && id !== userId);
        
        socket.emit('online-users', {
          projectId,
          users: [...new Set(onlineUserIds)],
        });
      }
    });

    // 离开项目房间
    socket.on('leave-project', (projectId: string) => {
      if (!projectId) return;
      
      const roomName = `project:${projectId}`;
      socket.leave(roomName);
      joinedRooms.delete(roomName);
      
      console.log(`[Socket] User ${userName} left project ${projectId}`);
      
      // 通知房间内的其他用户
      socket.to(roomName).emit('user-left', {
        userId,
        userName,
        timestamp: new Date().toISOString(),
      });
    });

    // 编辑锁定
    socket.on('lock-resource', (data: { 
      projectId: string; 
      resource: string; 
      resourceId: string;
      resourceName?: string;
    }) => {
      if (!data?.projectId || !data?.resource || !data?.resourceId) return;
      
      const roomName = `project:${data.projectId}`;
      
      console.log(`[Socket] User ${userName} locked ${data.resource}:${data.resourceId}`);
      
      socket.to(roomName).emit('resource-locked', {
        userId,
        userName,
        resource: data.resource,
        resourceId: data.resourceId,
        resourceName: data.resourceName,
        timestamp: new Date().toISOString(),
      });
    });

    // 解锁资源
    socket.on('unlock-resource', (data: { 
      projectId: string; 
      resource: string; 
      resourceId: string;
    }) => {
      if (!data?.projectId || !data?.resource || !data?.resourceId) return;
      
      const roomName = `project:${data.projectId}`;
      
      console.log(`[Socket] User ${userName} unlocked ${data.resource}:${data.resourceId}`);
      
      socket.to(roomName).emit('resource-unlocked', {
        userId,
        userName,
        resource: data.resource,
        resourceId: data.resourceId,
        timestamp: new Date().toISOString(),
      });
    });

    // 内容更新（用于实时协作编辑）
    socket.on('content-update', (data: {
      projectId: string;
      resource: string;
      resourceId: string;
      content: any;
      patch?: any;
      version?: number;
      cursor?: {
        position: number;
        selection?: { start: number; end: number };
      };
    }) => {
      if (!data?.projectId || !data?.resource || !data?.resourceId) return;
      
      const roomName = `project:${data.projectId}`;
      
      // 广播给房间内其他用户（不包括发送者）
      socket.to(roomName).emit('content-updated', {
        userId,
        userName,
        resource: data.resource,
        resourceId: data.resourceId,
        content: data.content,
        patch: data.patch,
        version: data.version,
        cursor: data.cursor,
        timestamp: new Date().toISOString(),
      });
    });

    // 光标位置
    socket.on('cursor-move', (data: {
      projectId: string;
      resource: string;
      resourceId: string;
      position: { 
        x?: number; 
        y?: number;
        line?: number;
        column?: number;
      };
      selection?: {
        start: { line: number; column: number };
        end: { line: number; column: number };
      };
    }) => {
      if (!data?.projectId || !data?.resource) return;
      
      const roomName = `project:${data.projectId}`;
      
      socket.to(roomName).emit('cursor-moved', {
        userId,
        userName,
        resource: data.resource,
        resourceId: data.resourceId,
        position: data.position,
        selection: data.selection,
        timestamp: new Date().toISOString(),
      });
    });

    // 评论通知
    socket.on('new-comment', (data: { 
      projectId: string; 
      comment: {
        id: string;
        content: string;
        targetType: string;
        targetId: string;
      };
    }) => {
      if (!data?.projectId || !data?.comment) return;
      
      const roomName = `project:${data.projectId}`;
      
      console.log(`[Socket] User ${userName} added comment ${data.comment.id}`);
      
      socket.to(roomName).emit('comment-added', {
        userId,
        userName,
        comment: data.comment,
        timestamp: new Date().toISOString(),
      });
    });

    // 评论回复通知
    socket.on('reply-comment', (data: {
      projectId: string;
      parentCommentId: string;
      reply: {
        id: string;
        content: string;
      };
    }) => {
      if (!data?.projectId || !data?.reply) return;
      
      const roomName = `project:${data.projectId}`;
      
      socket.to(roomName).emit('comment-replied', {
        userId,
        userName,
        parentCommentId: data.parentCommentId,
        reply: data.reply,
        timestamp: new Date().toISOString(),
      });
    });

    // 打字指示器
    socket.on('typing', (data: {
      projectId: string;
      resource: string;
      resourceId: string;
      isTyping: boolean;
    }) => {
      if (!data?.projectId) return;
      
      const roomName = `project:${data.projectId}`;
      
      socket.to(roomName).emit('user-typing', {
        userId,
        userName,
        resource: data.resource,
        resourceId: data.resourceId,
        isTyping: data.isTyping,
        timestamp: new Date().toISOString(),
      });
    });

    // 资源创建/更新/删除通知
    socket.on('resource-change', (data: {
      projectId: string;
      action: 'created' | 'updated' | 'deleted';
      resource: string;
      resourceId: string;
      data?: any;
    }) => {
      if (!data?.projectId || !data?.action || !data?.resource) return;
      
      const roomName = `project:${data.projectId}`;
      
      socket.to(roomName).emit('resource-changed', {
        userId,
        userName,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        data: data.data,
        timestamp: new Date().toISOString(),
      });
    });

    // 断开连接处理
    socket.on('disconnect', (reason: string) => {
      console.log(`[Socket] User ${userName} (${userId}) disconnected: ${reason}`);
      
      // 通知所有加入的房间
      joinedRooms.forEach((roomName) => {
        socket.to(roomName).emit('user-left', {
          userId,
          userName,
          timestamp: new Date().toISOString(),
        });
      });
    });

    // 错误处理
    socket.on('error', (error: Error) => {
      console.error(`[Socket] Error from user ${userName} (${userId}):`, error);
    });
  });

  return io;
}

// 扩展 Socket 类型以包含用户信息
interface SocketWithUser extends Socket {
  data: {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
    };
  };
}

export type { SocketWithUser };
