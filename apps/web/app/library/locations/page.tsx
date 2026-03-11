'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
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
import { Checkbox } from '@/components/ui/checkbox'

// 模拟场景数据
const mockLocations = [
  {
    id: '1',
    name: '城市广场',
    type: 'outdoor',
    description: '繁华的城市中心广场，人流密集',
    projectId: '1',
    projectName: '我的第一个短剧',
    thumbnail: null,
    episodeCount: 2,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: '咖啡厅',
    type: 'indoor',
    description: '温馨舒适的咖啡厅，适合约会',
    projectId: '1',
    projectName: '我的第一个短剧',
    thumbnail: null,
    episodeCount: 1,
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    name: '公园',
    type: 'outdoor',
    description: '绿树成荫的公园，有湖泊和步道',
    projectId: '1',
    projectName: '我的第一个短剧',
    thumbnail: null,
    episodeCount: 1,
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '4',
    name: '公寓',
    type: 'indoor',
    description: '主角居住的现代化公寓',
    projectId: '2',
    projectName: '都市爱情故事',
    thumbnail: null,
    episodeCount: 3,
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: '5',
    name: '办公室',
    type: 'indoor',
    description: '现代化的写字楼办公室',
    projectId: '2',
    projectName: '都市爱情故事',
    thumbnail: null,
    episodeCount: 2,
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
]

type ViewMode = 'grid' | 'list'
type TypeFilter = 'all' | 'indoor' | 'outdoor' | 'virtual'

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  indoor: { label: '室内', icon: Home, color: 'bg-blue-500/20 text-blue-500' },
  outdoor: { label: '室外', icon: Trees, color: 'bg-green-500/20 text-green-500' },
  virtual: { label: '虚拟', icon: Monitor, color: 'bg-purple-500/20 text-purple-500' },
}

export default function LocationsLibraryPage() {
  const [locations] = useState(mockLocations)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])

  // 筛选场景
  const filteredLocations = useMemo(() => {
    let result = [...locations]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.description.toLowerCase().includes(query)
      )
    }

    if (typeFilter !== 'all') {
      result = result.filter((l) => l.type === typeFilter)
    }

    if (projectFilter !== 'all') {
      result = result.filter((l) => l.projectId === projectFilter)
    }

    return result
  }, [locations, searchQuery, typeFilter, projectFilter])

  // 获取项目列表
  const projects = useMemo(() => {
    const uniqueProjects = new Map()
    locations.forEach((l) => {
      if (!uniqueProjects.has(l.projectId)) {
        uniqueProjects.set(l.projectId, { id: l.projectId, name: l.projectName })
      }
    })
    return Array.from(uniqueProjects.values())
  }, [locations])

  const toggleSelection = (id: string) => {
    setSelectedLocations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
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
        <Button>
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
              <SelectItem value="indoor">室内</SelectItem>
              <SelectItem value="outdoor">室外</SelectItem>
              <SelectItem value="virtual">虚拟</SelectItem>
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
                  {p.name}
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
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

interface Location {
  id: string
  name: string
  type: string
  description: string
  projectId: string
  projectName: string
  thumbnail: string | null
  episodeCount: number
  updatedAt: string
}

function LocationCard({
  location,
  selected,
  onSelect,
}: {
  location: Location
  selected: boolean
  onSelect: () => void
}) {
  const typeInfo = typeConfig[location.type] || typeConfig.outdoor
  const TypeIcon = typeInfo.icon

  return (
    <Card className={`group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-0">
        <div className="aspect-video bg-muted flex items-center justify-center relative">
          {location.thumbnail ? (
            <img
              src={location.thumbnail}
              alt={location.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <MapPin className="h-12 w-12 text-muted-foreground" />
          )}
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
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
            {location.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {location.description}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{location.projectName}</span>
            <span>{location.episodeCount} 集</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LocationListItem({
  location,
  selected,
  onSelect,
}: {
  location: Location
  selected: boolean
  onSelect: () => void
}) {
  const typeInfo = typeConfig[location.type] || typeConfig.outdoor
  const TypeIcon = typeInfo.icon

  return (
    <Card className={`group hover:shadow-md transition-all cursor-pointer ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Checkbox checked={selected} onCheckedChange={onSelect} />
          
          <div className="w-20 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
            {location.thumbnail ? (
              <img
                src={location.thumbnail}
                alt={location.name}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <MapPin className="h-6 w-6 text-muted-foreground" />
            )}
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
              {location.description}
            </p>
          </div>

          <div className="hidden md:block text-sm text-muted-foreground">
            {location.projectName}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{location.episodeCount} 集</span>
            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </CardContent>
    </Card>
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
