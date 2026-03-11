'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSocket, UserPresenceData } from './useSocket';

/**
 * 在线用户信息
 */
interface OnlineUser {
  id: string;
  name: string;
  avatar?: string;
  joinedAt: Date;
}

/**
 * useOnlineUsers Hook 返回类型
 */
interface UseOnlineUsersReturn {
  /** 当前在线用户ID列表 */
  onlineUserIds: string[];
  /** 当前在线用户详细信息列表（需要配合其他Hook或API获取详细信息） */
  onlineUsers: OnlineUser[];
  /** 是否已连接到Socket服务器 */
  isConnected: boolean;
  /** 当前用户数量 */
  count: number;
  /** 手动刷新在线用户列表 */
  refresh: () => void;
}

/**
 * 在线用户状态管理 Hook
 * 
 * 用于追踪项目中的在线用户，自动加入/离开项目房间，
 * 并监听用户加入/离开事件。
 * 
 * @param projectId - 项目ID
 * @returns 在线用户状态和操作方法
 * 
 * @example
 * ```tsx
 * function OnlineUsersBadge({ projectId }: { projectId: string }) {
 *   const { onlineUserIds, count, isConnected } = useOnlineUsers(projectId);
 *   
 *   return (
 *     <div className="flex items-center gap-2">
 *       <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
 *       <span>{count} 人在线</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function useOnlineUsers(projectId: string | null | undefined): UseOnlineUsersReturn {
  const { 
    socket, 
    isConnected, 
    joinProject, 
    leaveProject, 
    onUserJoined, 
    onUserLeft,
    onOnlineUsers 
  } = useSocket();
  
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  // 加入项目房间并监听在线用户
  useEffect(() => {
    if (!projectId || !isConnected) {
      setOnlineUserIds([]);
      return;
    }

    // 加入项目房间
    joinProject(projectId);

    // 监听在线用户列表
    const unsubscribeOnlineUsers = onOnlineUsers(({ projectId: pid, users }) => {
      if (pid === projectId) {
        setOnlineUserIds(users);
      }
    });

    // 监听用户加入
    const unsubscribeUserJoined = onUserJoined(({ userId }: UserPresenceData) => {
      setOnlineUserIds((prev) => {
        if (prev.includes(userId)) return prev;
        return [...prev, userId];
      });
    });

    // 监听用户离开
    const unsubscribeUserLeft = onUserJoined(({ userId }: UserPresenceData) => {
      setOnlineUserIds((prev) => prev.filter((id) => id !== userId));
    });

    // 清理函数
    return () => {
      unsubscribeOnlineUsers();
      unsubscribeUserJoined();
      unsubscribeUserLeft();
      
      if (isConnected && projectId) {
        leaveProject(projectId);
      }
    };
  }, [projectId, isConnected, joinProject, leaveProject, onUserJoined, onUserLeft, onOnlineUsers]);

  // 手动刷新（重新加入房间以获取最新状态）
  const refresh = useCallback(() => {
    if (!projectId || !isConnected) return;
    
    leaveProject(projectId);
    // 短暂延迟后重新加入
    setTimeout(() => {
      joinProject(projectId);
    }, 100);
  }, [projectId, isConnected, joinProject, leaveProject]);

  // 构建在线用户列表（基础信息）
  const onlineUsers: OnlineUser[] = onlineUserIds.map((id) => ({
    id,
    name: '', // 需要通过其他方式获取用户信息
    joinedAt: new Date(),
  }));

  return {
    onlineUserIds,
    onlineUsers,
    isConnected,
    count: onlineUserIds.length,
    refresh,
  };
}

export type { OnlineUser, UseOnlineUsersReturn };
