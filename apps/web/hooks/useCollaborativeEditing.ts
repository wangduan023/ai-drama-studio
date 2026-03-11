'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket, ContentUpdateData, CursorMoveData, ResourceLockData } from './useSocket';

/**
 * 协作光标信息
 */
interface CollaborativeCursor {
  userId: string;
  userName: string;
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
  lastUpdate: Date;
}

/**
 * 资源锁定信息
 */
interface ResourceLock {
  userId: string;
  userName: string;
  resource: string;
  resourceId: string;
  resourceName?: string;
  lockedAt: Date;
}

/**
 * 内容更新处理器
 */
type ContentUpdateHandler = (data: ContentUpdateData) => void;

/**
 * useCollaborativeEditing Hook 返回类型
 */
interface UseCollaborativeEditingReturn {
  // 连接状态
  /** 是否已连接到协作服务器 */
  isConnected: boolean;
  
  // 锁定状态
  /** 当前资源是否被锁定 */
  isLocked: boolean;
  /** 锁定当前资源的用户ID */
  lockedBy: string | null;
  /** 锁定当前资源的用户名 */
  lockedByName: string | null;
  /** 锁定信息 */
  lockInfo: ResourceLock | null;
  /** 当前用户是否持有锁定 */
  isLockedByMe: boolean;
  
  // 锁定操作
  /** 锁定资源 */
  lock: () => void;
  /** 解锁资源 */
  unlock: () => void;
  /** 尝试获取锁定（如果未被锁定） */
  tryLock: () => boolean;
  
  // 内容同步
  /** 发送内容更新 */
  sendUpdate: (content: any, options?: {
    patch?: any;
    version?: number;
    cursor?: ContentUpdateData['cursor'];
  }) => void;
  /** 注册内容更新处理器 */
  onUpdate: (handler: ContentUpdateHandler) => () => void;
  
  // 光标同步
  /** 发送光标位置 */
  sendCursor: (position: CursorMoveData['position'], selection?: CursorMoveData['selection']) => void;
  /** 其他用户的光标列表 */
  cursors: CollaborativeCursor[];
  
  // 打字指示器
  /** 发送打字状态 */
  setTyping: (isTyping: boolean) => void;
  /** 正在输入的用户列表 */
  typingUsers: string[];
}

/**
 * 协作编辑 Hook
 * 
 * 提供资源锁定、内容同步、光标追踪等实时协作功能。
 * 用于剧本编辑器、角色编辑器等需要防止冲突的场景。
 * 
 * @param projectId - 项目ID
 * @param resource - 资源类型（如 'script', 'character', 'episode'）
 * @param resourceId - 资源ID
 * @param options - 配置选项
 * @returns 协作编辑状态和操作方法
 * 
 * @example
 * ```tsx
 * function ScriptEditor({ projectId, scriptId }: { projectId: string; scriptId: string }) {
 *   const {
 *     isLocked,
 *     lockedByName,
 *     isLockedByMe,
 *     lock,
 *     unlock,
 *     sendUpdate,
 *     onUpdate,
 *     sendCursor,
 *     cursors,
 *     setTyping,
 *     typingUsers,
 *   } = useCollaborativeEditing(projectId, 'script', scriptId);
 *   
 *   const [content, setContent] = useState('');
 *   
 *   // 监听远程更新
 *   useEffect(() => {
 *     return onUpdate((data) => {
 *       setContent(data.content);
 *     });
 *   }, [onUpdate]);
 *   
 *   // 发送本地更新
 *   const handleChange = (newContent: string) => {
 *     setContent(newContent);
 *     if (isLockedByMe) {
 *       sendUpdate(newContent);
 *     }
 *   };
 *   
 *   if (isLocked && !isLockedByMe) {
 *     return <div>正在编辑：{lockedByName}</div>;
 *   }
 *   
 *   return (
 *     <div>
 *       <button onClick={lock} disabled={isLocked}>开始编辑</button>
 *       <textarea 
 *         value={content} 
 *         onChange={(e) => handleChange(e.target.value)}
 *         onFocus={() => { lock(); setTyping(true); }}
 *         onBlur={() => { setTyping(false); }}
 *       />
 *       {typingUsers.length > 0 && (
 *         <div>{typingUsers.join(', ')} 正在输入...</div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCollaborativeEditing(
  projectId: string | null | undefined,
  resource: string | null | undefined,
  resourceId: string | null | undefined,
  options: {
    /** 是否自动锁定资源 */
    autoLock?: boolean;
    /** 光标同步节流间隔（毫秒） */
    cursorThrottleMs?: number;
    /** 内容更新节流间隔（毫秒） */
    updateThrottleMs?: number;
  } = {}
): UseCollaborativeEditingReturn {
  const { autoLock = false, cursorThrottleMs = 50, updateThrottleMs = 100 } = options;
  
  const {
    socket,
    isConnected,
    lockResource,
    unlockResource,
    updateContent,
    moveCursor,
    setTyping: sendTyping,
    onContentUpdate,
    onCursorMove,
    onResourceLocked,
    onResourceUnlocked,
    onUserTyping,
  } = useSocket();

  // 锁定状态
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [lockedByName, setLockedByName] = useState<string | null>(null);
  const [lockInfo, setLockInfo] = useState<ResourceLock | null>(null);
  
  // 光标状态
  const [cursors, setCursors] = useState<CollaborativeCursor[]>([]);
  
  // 打字指示器状态
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  // 当前用户信息
  const currentUserId = (socket as any)?.data?.user?.id;
  const isLockedByMe = lockedBy === currentUserId;

  // 节流定时器
  const cursorThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const updateThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const pendingCursorUpdate = useRef<{ position: CursorMoveData['position']; selection?: CursorMoveData['selection'] } | null>(null);
  const pendingContentUpdate = useRef<any>(null);

  // 监听资源锁定事件
  useEffect(() => {
    if (!projectId || !resource || !resourceId) return;

    const unsubscribe = onResourceLocked((data: ResourceLockData) => {
      if (data.resource === resource && data.resourceId === resourceId) {
        setIsLocked(true);
        setLockedBy(data.userId);
        setLockedByName(data.userName);
        setLockInfo({
          userId: data.userId,
          userName: data.userName,
          resource: data.resource,
          resourceId: data.resourceId,
          resourceName: data.resourceName,
          lockedAt: new Date(data.timestamp),
        });
      }
    });

    return unsubscribe;
  }, [projectId, resource, resourceId, onResourceLocked]);

  // 监听资源解锁事件
  useEffect(() => {
    if (!projectId || !resource || !resourceId) return;

    const unsubscribe = onResourceUnlocked((data: ResourceLockData) => {
      if (data.resource === resource && data.resourceId === resourceId) {
        setIsLocked(false);
        setLockedBy(null);
        setLockedByName(null);
        setLockInfo(null);
      }
    });

    return unsubscribe;
  }, [projectId, resource, resourceId, onResourceUnlocked]);

  // 监听光标移动
  useEffect(() => {
    if (!projectId || !resource) return;

    const unsubscribe = onCursorMove((data: CursorMoveData) => {
      if (data.resource === resource && data.resourceId === resourceId) {
        setCursors((prev) => {
          const filtered = prev.filter((c) => c.userId !== data.userId);
          return [
            ...filtered,
            {
              userId: data.userId,
              userName: data.userName,
              position: data.position,
              selection: data.selection,
              lastUpdate: new Date(),
            },
          ];
        });
      }
    });

    return unsubscribe;
  }, [projectId, resource, resourceId, onCursorMove]);

  // 清理过期光标
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCursors((prev) =>
        prev.filter((cursor) => now.getTime() - cursor.lastUpdate.getTime() < 30000)
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // 监听打字指示器
  useEffect(() => {
    if (!projectId || !resource || !resourceId) return;

    const unsubscribe = onUserTyping((data: any) => {
      if (data.resource === resource && data.resourceId === resourceId) {
        setTypingUsers((prev) => {
          if (data.isTyping) {
            if (prev.includes(data.userName)) return prev;
            return [...prev, data.userName];
          } else {
            return prev.filter((name) => name !== data.userName);
          }
        });
      }
    });

    return unsubscribe;
  }, [projectId, resource, resourceId, onUserTyping]);

  // 锁定资源
  const lock = useCallback(() => {
    if (!projectId || !resource || !resourceId) return;
    lockResource(projectId, resource, resourceId);
  }, [projectId, resource, resourceId, lockResource]);

  // 解锁资源
  const unlock = useCallback(() => {
    if (!projectId || !resource || !resourceId) return;
    unlockResource(projectId, resource, resourceId);
  }, [projectId, resource, resourceId, unlockResource]);

  // 尝试获取锁定
  const tryLock = useCallback(() => {
    if (isLocked && !isLockedByMe) {
      return false;
    }
    lock();
    return true;
  }, [isLocked, isLockedByMe, lock]);

  // 发送内容更新（带节流）
  const sendUpdate = useCallback(
    (content: any, updateOptions: {
      patch?: any;
      version?: number;
      cursor?: ContentUpdateData['cursor'];
    } = {}) => {
      if (!projectId || !resource || !resourceId) return;

      pendingContentUpdate.current = {
        projectId,
        resource,
        resourceId,
        content,
        ...updateOptions,
      };

      if (updateThrottleRef.current) {
        return;
      }

      updateContent(pendingContentUpdate.current);
      pendingContentUpdate.current = null;

      updateThrottleRef.current = setTimeout(() => {
        updateThrottleRef.current = null;
        if (pendingContentUpdate.current) {
          updateContent(pendingContentUpdate.current);
          pendingContentUpdate.current = null;
        }
      }, updateThrottleMs);
    },
    [projectId, resource, resourceId, updateContent, updateThrottleMs]
  );

  // 注册内容更新处理器
  const onUpdate = useCallback(
    (handler: ContentUpdateHandler) => {
      return onContentUpdate((data: ContentUpdateData) => {
        if (data.resource === resource && data.resourceId === resourceId) {
          handler(data);
        }
      });
    },
    [onContentUpdate, resource, resourceId]
  );

  // 发送光标位置（带节流）
  const sendCursor = useCallback(
    (position: CursorMoveData['position'], selection?: CursorMoveData['selection']) => {
      if (!projectId || !resource || !resourceId) return;

      pendingCursorUpdate.current = { position, selection };

      if (cursorThrottleRef.current) {
        return;
      }

      moveCursor({
        projectId,
        resource,
        resourceId,
        position,
        selection,
      } as any);
      pendingCursorUpdate.current = null;

      cursorThrottleRef.current = setTimeout(() => {
        cursorThrottleRef.current = null;
        if (pendingCursorUpdate.current) {
          moveCursor({
            projectId,
            resource,
            resourceId,
            position: pendingCursorUpdate.current.position,
            selection: pendingCursorUpdate.current.selection,
          } as any);
          pendingCursorUpdate.current = null;
        }
      }, cursorThrottleMs);
    },
    [projectId, resource, resourceId, moveCursor, cursorThrottleMs]
  );

  // 发送打字状态
  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!projectId || !resource || !resourceId) return;
      sendTyping(projectId, resource, resourceId, isTyping);
    },
    [projectId, resource, resourceId, sendTyping]
  );

  // 自动锁定
  useEffect(() => {
    if (autoLock && projectId && resource && resourceId && isConnected) {
      lock();
    }

    return () => {
      if (isLockedByMe) {
        unlock();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLock, projectId, resource, resourceId, isConnected]);

  return {
    isConnected,
    isLocked,
    lockedBy,
    lockedByName,
    lockInfo,
    isLockedByMe,
    lock,
    unlock,
    tryLock,
    sendUpdate,
    onUpdate,
    sendCursor,
    cursors,
    setTyping,
    typingUsers,
  };
}

export type {
  CollaborativeCursor,
  ResourceLock,
  ContentUpdateHandler,
  UseCollaborativeEditingReturn,
};
