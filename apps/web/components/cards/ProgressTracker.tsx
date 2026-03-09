import { CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react'

export interface TaskProgress {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  error?: string
}

export interface ProgressTrackerProps {
  tasks: TaskProgress[]
  title?: string
  collapsed?: boolean
  onToggle?: () => void
}

export function ProgressTracker({
  tasks,
  title = '任务进度',
  collapsed = false,
  onToggle,
}: ProgressTrackerProps) {
  const completedCount = tasks.filter((t) => t.status === 'completed').length
  const totalCount = tasks.length
  const overallProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="card">
      <div
        className="flex items-center justify-between mb-3 cursor-pointer"
        onClick={onToggle}
      >
        <h3 className="font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-muted-fg)]">
            {completedCount}/{totalCount}
          </span>
          {onToggle && (
            <span className={`transform transition-transform ${collapsed ? '-rotate-90' : ''}`}>
              ▼
            </span>
          )}
        </div>
      </div>

      {/* 总体进度条 */}
      <div className="progress mb-4">
        <div
          className="progress-bar"
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {!collapsed && (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskItem({ task }: { task: TaskProgress }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors">
      <StatusIcon status={task.status} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.name}</p>
        {task.status === 'processing' && task.progress !== undefined && (
          <div className="mt-1">
            <div className="progress h-1.5">
              <div
                className="progress-bar"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        )}
        {task.status === 'failed' && task.error && (
          <p className="text-xs text-[var(--color-error)] mt-1">{task.error}</p>
        )}
      </div>
      {task.status === 'processing' && (
        <Clock className="h-4 w-4 text-[var(--color-primary)] animate-spin" />
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: TaskProgress['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
    case 'processing':
      return <Clock className="h-5 w-5 text-[var(--color-primary)]" />
    case 'failed':
      return <AlertCircle className="h-5 w-5 text-[var(--color-error)]" />
    default:
      return <Circle className="h-5 w-5 text-[var(--color-muted-fg)]" />
  }
}

export function ProgressTrackerSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 bg-[var(--color-secondary)] rounded w-24" />
        <div className="h-4 bg-[var(--color-secondary)] rounded w-12" />
      </div>
      <div className="h-2 bg-[var(--color-secondary)] rounded mb-4" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <div className="h-5 w-5 bg-[var(--color-secondary)] rounded-full" />
            <div className="h-4 bg-[var(--color-secondary)] rounded flex-1" />
          </div>
        ))}
      </div>
    </div>
  )
}
