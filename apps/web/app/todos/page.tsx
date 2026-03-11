'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Trash2,
  Check,
  Calendar,
  Flag,
  X,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  useTodoList,
  useCreateTodo,
  useUpdateTodo,
  useDeleteTodo,
  useToggleTodo,
  useClearCompleted,
  type Todo,
} from '@/hooks/useTodo'

type FilterType = 'all' | 'active' | 'completed'
type PriorityFilter = 'all' | 'low' | 'medium' | 'high'

export default function TodosPage() {
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [newTodoPriority, setNewTodoPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [filter, setFilter] = useState<FilterType>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')

  const { data: todos = [], isLoading } = useTodoList()
  const createTodo = useCreateTodo()
  const deleteTodo = useDeleteTodo()
  const toggleTodo = useToggleTodo()
  const clearCompleted = useClearCompleted()

  // 筛选 Todo
  const filteredTodos = todos.filter((todo) => {
    // 状态筛选
    if (filter === 'active' && todo.completed) return false
    if (filter === 'completed' && !todo.completed) return false
    
    // 优先级筛选
    if (priorityFilter !== 'all' && todo.priority !== priorityFilter) return false
    
    return true
  })

  // 统计
  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    active: todos.filter(t => !t.completed).length,
  }

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodoTitle.trim()) return

    try {
      await createTodo.mutateAsync({
        title: newTodoTitle.trim(),
        priority: newTodoPriority,
      })
      setNewTodoTitle('')
      toast.success('任务已添加')
    } catch {
      toast.error('添加任务失败')
    }
  }

  const handleToggleTodo = async (id: string, completed: boolean) => {
    try {
      await toggleTodo.mutateAsync({ id, completed: !completed })
    } catch {
      toast.error('更新失败')
    }
  }

  const handleDeleteTodo = async (id: string) => {
    try {
      await deleteTodo.mutateAsync(id)
      toast.success('任务已删除')
    } catch {
      toast.error('删除失败')
    }
  }

  const handleClearCompleted = async () => {
    try {
      await clearCompleted.mutateAsync()
      toast.success('已完成任务已清空')
    } catch {
      toast.error('清空失败')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return '高'
      case 'medium':
        return '中'
      case 'low':
        return '低'
      default:
        return priority
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 页面头部 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">待办事项</h1>
        <p className="text-muted-foreground">管理你的任务清单</p>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4 mb-6"
      >
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">总任务</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-muted-foreground">待完成</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">已完成</div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 添加任务表单 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <form onSubmit={handleAddTodo} className="flex gap-2">
          <Input
            placeholder="添加新任务..."
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            className="flex-1"
          />
          <Select
            value={newTodoPriority}
            onValueChange={(v) => setNewTodoPriority(v as 'low' | 'medium' | 'high')}
          >
            <SelectTrigger className="w-[120px]">
              <Flag className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">高优先级</SelectItem>
              <SelectItem value="medium">中优先级</SelectItem>
              <SelectItem value="low">低优先级</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={!newTodoTitle.trim() || createTodo.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            添加
          </Button>
        </form>
      </motion.div>

      {/* 筛选器 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap gap-2 mb-4"
      >
        <div className="flex items-center border rounded-md p-1">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'all' && '全部'}
              {f === 'active' && '待完成'}
              {f === 'completed' && '已完成'}
            </Button>
          ))}
        </div>

        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}>
          <SelectTrigger className="w-[140px]">
            <Flag className="h-4 w-4 mr-2" />
            <SelectValue placeholder="优先级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部优先级</SelectItem>
            <SelectItem value="high">高优先级</SelectItem>
            <SelectItem value="medium">中优先级</SelectItem>
            <SelectItem value="low">低优先级</SelectItem>
          </SelectContent>
        </Select>

        {stats.completed > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCompleted}
            disabled={clearCompleted.isPending}
            className="ml-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            清空已完成
          </Button>
        )}
      </motion.div>

      {/* 任务列表 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-2"
      >
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        ) : filteredTodos.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">暂无任务</h3>
            <p className="text-muted-foreground text-sm">
              {filter === 'completed' ? '还没有已完成的任务' : '添加一个新任务开始吧'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredTodos.map((todo, index) => (
              <motion.div
                key={todo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <TodoItem
                  todo={todo}
                  onToggle={() => handleToggleTodo(todo.id, todo.completed)}
                  onDelete={() => handleDeleteTodo(todo.id)}
                  getPriorityColor={getPriorityColor}
                  getPriorityLabel={getPriorityLabel}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      {/* 结果统计 */}
      {!isLoading && filteredTodos.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          共 {filteredTodos.length} 个任务
          {filter !== 'all' && ` (${filter === 'active' ? '待完成' : '已完成'})`}
        </div>
      )}
    </div>
  )
}

interface TodoItemProps {
  todo: Todo
  onToggle: () => void
  onDelete: () => void
  getPriorityColor: (priority: string) => string
  getPriorityLabel: (priority: string) => string
}

function TodoItem({ todo, onToggle, onDelete, getPriorityColor, getPriorityLabel }: TodoItemProps) {
  return (
    <div
      className={`
        group flex items-center gap-3 p-4 rounded-lg border bg-card
        hover:shadow-md transition-all duration-200
        ${todo.completed ? 'opacity-60' : ''}
      `}
    >
      <button
        onClick={onToggle}
        className={`
          flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
          transition-colors duration-200
          ${todo.completed
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-muted-foreground hover:border-primary'
          }
        `}
      >
        {todo.completed && <Check className="h-4 w-4" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
          {todo.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className={`text-xs ${getPriorityColor(todo.priority)}`}>
            {getPriorityLabel(todo.priority)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 inline mr-1" />
            {new Date(todo.createdAt).toLocaleDateString('zh-CN')}
          </span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
      >
        <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
      </Button>
    </div>
  )
}
