'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

/**
 * Socket.io 连接配置
 */
const SOCKET_CONFIG = {
  path: '/api/socket',
  transports: ['websocket', 'polling'] as const,
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
};

/**
 * 内容更新数据类型
 */
interface ContentUpdateData {
  userId: string;
  userName: string;
  resource: string;
  resourceId: string;
  content?: any;
  patch?: any;
  version?: number;
  cursor?: {
    position: number;
    selection?: { start: number; end: number };
  };
  timestamp: string;
}

/**
 * 光标移动数据类型
 */
interface CursorMoveData {
  userId: string;
  userName: string;
  resource: string;
  resourceId?: string;
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
  timestamp: string;
}

/**
 * 资源锁定数据类型
 */
interface ResourceLockData {
  userId: string;
  userName: string;
  resource: string;
  resourceId: string;
  resourceName?: string;
  timestamp: string;
}

/**
 * 用户加入/离开数据类型
 */
interface UserPresenceData {
  userId: string;
  userName: string;
  timestamp: string;
}

/**
 * 评论数据类型
 */
interface CommentData {
  userId: string;
  userName: string;
  comment: {
    id: string;
    content: string;
    targetType: string;
    targetId: string;
  };
  timestamp: string;
}

/**
 * Socket.io Hook 返回类型
 */
interface UseSocketReturn {
  /** Socket.io 客户端实例 */
  socket: Socket | null;
  /** 是否已连接到服务器 */
  isConnected: boolean;
  /** 是否正在连接中 */
  isConnecting: boolean;
  /** 连接错误信息 */
  error: Error | null;
  
  // 房间管理
  /** 加入项目房间 */
  joinProject: (projectId: string) => void;
  /** 离开项目房间 */
  leaveProject: (projectId: string) => void;
  
  // 资源锁定
  /** 锁定资源 */
  lockResource: (projectId: string, resource: string, resourceId: string, resourceName?: string) => void;
  /** 解锁资源 */
  unlockResource: (projectId: string, resource: string, resourceId: string) => void;
  
  // 内容协作
  /** 发送内容更新 */
  updateContent: (data: Omit<ContentUpdateData, 'userId' | 'userName' | 'timestamp'>) => void;
  /** 发送光标位置 */
  moveCursor: (data: Omit<CursorMoveData, 'userId' | 'userName' | 'timestamp'>) => void;
  
  // 评论
  /** 发送新评论通知 */
  addComment: (projectId: string, comment: CommentData['comment']) => void;
  /** 发送评论回复通知 */
  replyComment: (projectId: string, parentCommentId: string, reply: { id: string; content: string }) => void;
  
  // 打字指示器
  /** 发送打字状态 */
  setTyping: (projectId: string, resource: string, resourceId: string, isTyping: boolean) => void;
  
  // 事件监听
  /** 监听内容更新 */
  onContentUpdate: (callback: (data: ContentUpdateData) => void) => () => void;
  /** 监听光标移动 */
  onCursorMove: (callback: (data: CursorMoveData) => void) => () => void;
  /** 监听资源锁定 */
  onResourceLocked: (callback: (data: ResourceLockData) => void) => () => void;
  /** 监听资源解锁 */
  onResourceUnlocked: (callback: (data: ResourceLockData) => void) => () => void;
  /** 监听用户加入 */
  onUserJoined: (callback: (data: UserPresenceData) => void) => () => void;
  /** 监听用户离开 */
  onUserLeft: (callback: (data: UserPresenceData) => void) => () => void;
  /** 监听在线用户列表 */
  onOnlineUsers: (callback: (data: { projectId: string; users: string[] }) => void) => () => void;
  /** 监听评论添加 */
  onCommentAdded: (callback: (data: CommentData) => void) => () => void;
  /** 监听评论回复 */
  onCommentReplied: (callback: (data: any) => void) => () => void;
  /** 监听用户打字 */
  onUserTyping: (callback: (data: any) => void) => () => void;
  /** 监听资源变更 */
  onResourceChanged: (callback: (data: any) => void) => () => void;
  
  // 连接管理
  /** 手动重新连接 */
  reconnect: () => void;
  /** 断开连接 */
  disconnect: () => void;
}

/**
 * Socket.io Hook
 * 提供实时协作功能的 Socket.io 连接和事件处理
 * 
 * @example
 * ```tsx
 * function Editor({ projectId }: { projectId: string }) {
 *   const { socket, isConnected, joinProject, onContentUpdate } = useSocket();
 *   
 *   useEffect(() => {
 *     if (isConnected) {
 *       joinProject(projectId);
 *     }
 *   }, [isConnected, projectId]);
 *   
 *   useEffect(() => {
 *     return onContentUpdate((data) => {
 *       console.log('Content updated:', data);
 *     });
 *   }, [onContentUpdate]);
 *   
 *   return <div>Connection: {isConnected ? 'Connected' : 'Disconnected'}</div>;
 * }
 * ```
 */
export function useSocket(): UseSocketReturn {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 初始化 Socket.io 连接
  useEffect(() => {
    // 只在客户端执行
    if (typeof window === 'undefined') return;
    
    // 如果未认证，不建立连接
    if (!isAuthenticated || !user) {
      setIsConnected(false);
      setIsConnecting(false);
      return;
    }

    setIsConnecting(true);
    setError(null);

    // 从 localStorage 获取令牌
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      setError(new Error('Authentication token not found'));
      setIsConnecting(false);
      return;
    }

    // 创建 Socket.io 客户端
    const socket = io(SOCKET_CONFIG.path, {
      ...SOCKET_CONFIG,
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    socketRef.current = socket;

    // 连接事件
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
    });

    // 断开连接事件
    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
      setIsConnecting(false);
    });

    // 连接错误事件
    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err);
      setError(err);
      setIsConnected(false);
      setIsConnecting(false);
    });

    // 认证错误事件
    socket.on('error', (err: Error) => {
      console.error('[Socket] Error:', err);
      setError(err);
    });

    // 清理函数
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user]);

  // 加入项目房间
  const joinProject = useCallback((projectId: string) => {
    if (!socketRef.current || !isConnected) {
      console.warn('[Socket] Cannot join project: not connected');
      return;
    }
    socketRef.current.emit('join-project', projectId);
  }, [isConnected]);

  // 离开项目房间
  const leaveProject = useCallback((projectId: string) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('leave-project', projectId);
  }, [isConnected]);

  // 锁定资源
  const lockResource = useCallback((
    projectId: string, 
    resource: string, 
    resourceId: string,
    resourceName?: string
  ) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('lock-resource', { projectId, resource, resourceId, resourceName });
  }, [isConnected]);

  // 解锁资源
  const unlockResource = useCallback((projectId: string, resource: string, resourceId: string) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('unlock-resource', { projectId, resource, resourceId });
  }, [isConnected]);

  // 更新内容
  const updateContent = useCallback((data: Omit<ContentUpdateData, 'userId' | 'userName' | 'timestamp'>) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('content-update', data);
  }, [isConnected]);

  // 移动光标
  const moveCursor = useCallback((data: Omit<CursorMoveData, 'userId' | 'userName' | 'timestamp'>) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('cursor-move', data);
  }, [isConnected]);

  // 添加评论
  const addComment = useCallback((projectId: string, comment: CommentData['comment']) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('new-comment', { projectId, comment });
  }, [isConnected]);

  // 回复评论
  const replyComment = useCallback((projectId: string, parentCommentId: string, reply: { id: string; content: string }) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('reply-comment', { projectId, parentCommentId, reply });
  }, [isConnected]);

  // 设置打字状态
  const setTyping = useCallback((projectId: string, resource: string, resourceId: string, isTyping: boolean) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('typing', { projectId, resource, resourceId, isTyping });
  }, [isConnected]);

  // 事件监听函数工厂
  const createEventListener = useCallback(<T,>(event: string) => {
    return (callback: (data: T) => void) => {
      if (!socketRef.current) return () => {};
      
      socketRef.current.on(event, callback);
      return () => {
        socketRef.current?.off(event, callback);
      };
    };
  }, []);

  // 预定义的事件监听
  const onContentUpdate = useCallback(
    (callback: (data: ContentUpdateData) => void) => createEventListener<ContentUpdateData>('content-updated')(callback),
    [createEventListener]
  );

  const onCursorMove = useCallback(
    (callback: (data: CursorMoveData) => void) => createEventListener<CursorMoveData>('cursor-moved')(callback),
    [createEventListener]
  );

  const onResourceLocked = useCallback(
    (callback: (data: ResourceLockData) => void) => createEventListener<ResourceLockData>('resource-locked')(callback),
    [createEventListener]
  );

  const onResourceUnlocked = useCallback(
    (callback: (data: ResourceLockData) => void) => createEventListener<ResourceLockData>('resource-unlocked')(callback),
    [createEventListener]
  );

  const onUserJoined = useCallback(
    (callback: (data: UserPresenceData) => void) => createEventListener<UserPresenceData>('user-joined')(callback),
    [createEventListener]
  );

  const onUserLeft = useCallback(
    (callback: (data: UserPresenceData) => void) => createEventListener<UserPresenceData>('user-left')(callback),
    [createEventListener]
  );

  const onOnlineUsers = useCallback(
    (callback: (data: { projectId: string; users: string[] }) => void) => 
      createEventListener<{ projectId: string; users: string[] }>('online-users')(callback),
    [createEventListener]
  );

  const onCommentAdded = useCallback(
    (callback: (data: CommentData) => void) => createEventListener<CommentData>('comment-added')(callback),
    [createEventListener]
  );

  const onCommentReplied = useCallback(
    (callback: (data: any) => void) => createEventListener<any>('comment-replied')(callback),
    [createEventListener]
  );

  const onUserTyping = useCallback(
    (callback: (data: any) => void) => createEventListener<any>('user-typing')(callback),
    [createEventListener]
  );

  const onResourceChanged = useCallback(
    (callback: (data: any) => void) => createEventListener<any>('resource-changed')(callback),
    [createEventListener]
  );

  // 重新连接
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.connect();
    }
  }, []);

  // 断开连接
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    error,
    joinProject,
    leaveProject,
    lockResource,
    unlockResource,
    updateContent,
    moveCursor,
    addComment,
    replyComment,
    setTyping,
    onContentUpdate,
    onCursorMove,
    onResourceLocked,
    onResourceUnlocked,
    onUserJoined,
    onUserLeft,
    onOnlineUsers,
    onCommentAdded,
    onCommentReplied,
    onUserTyping,
    onResourceChanged,
    reconnect,
    disconnect,
  };
}

export type {
  ContentUpdateData,
  CursorMoveData,
  ResourceLockData,
  UserPresenceData,
  CommentData,
  UseSocketReturn,
};
