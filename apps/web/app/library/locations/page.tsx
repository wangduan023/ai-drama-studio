'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Search,
  Grid,
  List,
  MapPin,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Home,
  Trees,
  Monitor,
  Building2,
  ArrowRight,
  RefreshCw,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useLocationList, useDeleteLocation, type Location } from '@/hooks/useLocation'
import { useProjectList } from '@/hooks/useProject'

type ViewMode = 'grid' | 'list'
type TypeFilter = 'all' | 'INDOOR' | 'OUTDOOR' | 'VIRTUAL' | 'TRANSITION'

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  INDOOR: { label: '室内', icon: Home, color: 'bg-blue-500/20 text-blue-500' },
  OUTDOOR: { label: '室外', icon: Trees, color: 'bg-green-500/20 text-green-500' },
  VIRTUAL: { label: '虚拟', icon: Monitor, color: 'bg-purple-500/20 text-purple-500' },
  TRANSITION: { label: '过渡', icon: ArrowRight, color: 'bg-orange-500/20 text-orange-500' },
}

export default function LocationsLibraryPage() {
  const searchParams = useSearchParams()
  const projectIdFromUrl = searchParams.get('project')
  
  const { data: locations = [], isLoading, error, refetch } = useLocationList(projectIdFromUrl || undefined)
  const { data: projects = [] } = useProjectList()
  const deleteLocation = useDeleteLocation()
  
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [projectFilter, setProjectFilter] = useState<string>(projectIdFromUrl || 'all')
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])

  // 当URL参数变化时更新筛选
  useEffect(() => {
    if (projectIdFromUrl) {
      setProjectFilter(projectIdFromUrl)
    }
  }, [projectIdFromUrl])

  // 筛选场景
  const filteredLocations = useMemo(() => {
    let result = [...locations]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          (l.description?.toLowerCase() || '').includes(query)
      )
    }

    if (typeFilter !== 'all') {
      result = result.filter((l) => l.locationType === typeFilter)
    }

    if (projectFilter !== 'all') {
      result = result.filter((l) => l.projectId === projectFilter)
    }

    return result
  }, [locations, searchQuery, typeFilter, projectFilter])

  const toggleSelection = (id: string) => {
    setSelectedLocations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleDeleteLocation = async (id: string, name: string, projectId: string) => {
    try {
      await deleteLocation.mutateAsync({ projectId, locationId: id })
      toast.success(`场景 "${name}" 已删除`)
    } catch {
      toast.error('删除场景失败')
    }
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">场景库</h1>
            <p className="text-muted-foreground">管理所有项目中的场景</p>
          </div>
        </div>
        <LocationListSkeleton viewMode={viewMode} />
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">场景库</h1>
            <p className="text-muted-foreground">管理所有项目中的场景</p>
          </div>
        </div>
        <ErrorState 
          message={error instanceof Error ? error.message : '加载场景失败'} 
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面头部 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">场景库</h1>
          <p className="text-muted-foreground">管理所有项目中的场景</p>
        </div>
        <Button data-testid="create-location-button">
          <Plus className="h-5 w-5 mr-2" />
          新建场景
        </Button>
      </motion.div>

      {/* 工具栏 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col lg:flex-row gap-4 mb-6"
      >
        {/* 搜索框 */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索场景..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 筛选器 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 类型筛选 */}
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="INDOOR">室内</SelectItem>
              <SelectItem value="OUTDOOR">室外</SelectItem>
              <SelectItem value="VIRTUAL">虚拟</SelectItem>
              <SelectItem value="TRANSITION">过渡</SelectItem>
            </SelectContent>
          </Select>

          {/* 项目筛选 */}
          <Select value={projectFilter} onValueChange={(value) => setProjectFilter(value || 'all')}>
            <SelectTrigger className="w-[180px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="项目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部项目</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 视图切换 */}
          <div className="flex items-center border rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 批量操作栏 */}
      {selectedLocations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 mb-4 bg-muted rounded-lg"
        >
          <span className="text-sm">已选择 {selectedLocations.length} 个场景</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              批量编辑
            </Button>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </Button>
          </div>
        </motion.div>
      )}

      {/* 结果统计 */}
      <div className="mb-4 text-sm text-muted-foreground">
        共 {filteredLocations.length} 个场景
      </div>

      {/* 场景列表 */}
      {filteredLocations.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLocations.map((location, index) => (
            <motion.div
              key={location.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <LocationCard
                location={location}
                selected={selectedLocations.includes(location.id)}
                onSelect={() => toggleSelection(location.id)}
                onDelete={() => handleDeleteLocation(location.id, location.name, location.projectId)}
                isDeleting={deleteLocation.isPending}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLocations.map((location, index) => (
            <motion.div
              key={location.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <LocationListItem
                location={location}
                selected={selectedLocations.includes(location.id)}
                onSelect={() => toggleSelection(location.id)}
                onDelete={() => handleDeleteLocation(location.id, location.name, location.projectId)}
                isDeleting={deleteLocation.isPending}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

interface LocationCardProps {
  location: Location
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  isDeleting: boolean
}

function LocationCard({ location, selected, onSelect, onDelete, isDeleting }: LocationCardProps) {
  const typeKey = location.locationType || 'OUTDOOR'
  const typeInfo = typeConfig[typeKey] || typeConfig.OUTDOOR
  const TypeIcon = typeInfo.icon

  return (
    <Card className={`group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden ${selected ? 'ring-2 ring-primary' : ''}`} data-testid="location-card">
      <CardContent className="p-0">
        <div className="aspect-video bg-muted flex items-center justify-center relative">
          <MapPin className="h-12 w-12 text-muted-foreground" />
          <div className="absolute top-2 left-2">
            <Checkbox
              checked={selected}
              onCheckedChange={onSelect}
              className="bg-background/80"
            />
          </div>
          <div className="absolute top-2 right-2">
            <Badge className={typeInfo.color}>
              <TypeIcon className="h-3 w-3 mr-1" />
              {typeInfo.label}
            </Badge>
          </div>
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} >
                <Button variant="secondary" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem >
                  <Link href={`/projects/${location.projectId}/locations/${location.id}`}>
                    <Edit className="h-4 w-4 mr-2" />
                    编辑
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? '删除中...' : '删除'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
            {location.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {location.description || '暂无描述'}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>项目: {location.projectId.slice(0, 8)}...</span>
            <span>{location.eraPeriod || '现代'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface LocationListItemProps {
  location: Location
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  isDeleting: boolean
}

function LocationListItem({ location, selected, onSelect, onDelete, isDeleting }: LocationListItemProps) {
  const typeKey = location.locationType || 'OUTDOOR'
  const typeInfo = typeConfig[typeKey] || typeConfig.OUTDOOR
  const TypeIcon = typeInfo.icon

  return (
    <Card className={`group hover:shadow-md transition-all cursor-pointer ${selected ? 'ring-2 ring-primary' : ''}`} data-testid="location-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Checkbox checked={selected} onCheckedChange={onSelect} />
          
          <Link
            href={`/projects/${location.projectId}/locations/${location.id}`}
            className="flex items-center gap-4 flex-1"
          >
            <div className="w-20 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                  {location.name}
                </h3>
                <Badge className={`text-xs ${typeInfo.color}`}>
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {typeInfo.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {location.description || '暂无描述'}
              </p>
            </div>

            <div className="hidden md:block text-sm text-muted-foreground">
              项目: {location.projectId.slice(0, 8)}...
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{location.eraPeriod || '现代'}</span>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger >
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem >
                <Link href={`/projects/${location.projectId}/locations/${location.id}`}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? '删除中...' : '删除'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

function LocationListSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-0">
              <Skeleton className="aspect-video" />
              <div className="p-4">
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="w-20 h-14 rounded" />
              <div className="flex-1">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
        <MapPin className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">暂无场景</h3>
      <p className="text-muted-foreground mb-6">开始创建你的第一个场景吧</p>
      <Button>
        <Plus className="h-5 w-5 mr-2" />
        创建场景
      </Button>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-full bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
        <RefreshCw className="h-10 w-10 text-destructive" />
      </div>
      <h3 className="text-xl font-semibold mb-2">加载失败</h3>
      <p className="text-muted-foreground mb-6">{message}</p>
      <Button onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        重试
      </Button>
    </div>
  )
}
