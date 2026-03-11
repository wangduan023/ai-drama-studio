'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Search,
  Grid,
  List,
  Users,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Crown,
  Star,
  User,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { ScrollArea } from '@/components/ui/scroll-area'

// 模拟角色数据
const mockCharacters = [
  {
    id: '1',
    name: '张三',
    role: '主角',
    grade: 'S',
    description: '年轻有为的艺术家，性格内向但才华横溢',
    projectId: '1',
    projectName: '我的第一个短剧',
    avatar: null,
    episodeCount: 3,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: '李四',
    role: '主角',
    grade: 'S',
    description: '活泼开朗的城市女孩，热爱生活',
    projectId: '1',
    projectName: '我的第一个短剧',
    avatar: null,
    episodeCount: 3,
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    name: '王五',
    role: '配角',
    grade: 'A',
    description: '张三的好友，经常给主角提供建议',
    projectId: '1',
    projectName: '我的第一个短剧',
    avatar: null,
    episodeCount: 2,
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '4',
    name: '赵六',
    role: '反派',
    grade: 'B',
    description: '竞争对手，性格狡猾',
    projectId: '2',
    projectName: '都市爱情故事',
    avatar: null,
    episodeCount: 5,
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: '5',
    name: '钱七',
    role: '配角',
    grade: 'C',
    description: '李四的闺蜜',
    projectId: '2',
    projectName: '都市爱情故事',
    avatar: null,
    episodeCount: 2,
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
]

type ViewMode = 'grid' | 'list'
type GradeFilter = 'all' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E'

const gradeColors: Record<string, string> = {
  S: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
  A: 'bg-purple-500/20 text-purple-500 border-purple-500/50',
  B: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
  C: 'bg-green-500/20 text-green-500 border-green-500/50',
  D: 'bg-gray-500/20 text-gray-500 border-gray-500/50',
  E: 'bg-muted text-muted-foreground',
}

const gradeIcons: Record<string, React.ElementType> = {
  S: Crown,
  A: Star,
  B: User,
  C: User,
  D: User,
  E: User,
}

export default function CharactersLibraryPage() {
  const [characters] = useState(mockCharacters)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([])

  // 筛选角色
  const filteredCharacters = useMemo(() => {
    let result = [...characters]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.role.toLowerCase().includes(query)
      )
    }

    if (gradeFilter !== 'all') {
      result = result.filter((c) => c.grade === gradeFilter)
    }

    if (projectFilter !== 'all') {
      result = result.filter((c) => c.projectId === projectFilter)
    }

    return result
  }, [characters, searchQuery, gradeFilter, projectFilter])

  // 获取项目列表
  const projects = useMemo(() => {
    const uniqueProjects = new Map()
    characters.forEach((c) => {
      if (!uniqueProjects.has(c.projectId)) {
        uniqueProjects.set(c.projectId, { id: c.projectId, name: c.projectName })
      }
    })
    return Array.from(uniqueProjects.values())
  }, [characters])

  const toggleSelection = (id: string) => {
    setSelectedCharacters((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    if (selectedCharacters.length === filteredCharacters.length) {
      setSelectedCharacters([])
    } else {
      setSelectedCharacters(filteredCharacters.map((c) => c.id))
    }
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
          <h1 className="text-3xl font-bold mb-2">角色库</h1>
          <p className="text-muted-foreground">管理所有项目中的角色</p>
        </div>
        <Button>
          <Plus className="h-5 w-5 mr-2" />
          新建角色
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
            placeholder="搜索角色..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 筛选器 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 等级筛选 */}
          <Select value={gradeFilter} onValueChange={(v) => setGradeFilter(v as GradeFilter)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="等级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部等级</SelectItem>
              <SelectItem value="S">S 级</SelectItem>
              <SelectItem value="A">A 级</SelectItem>
              <SelectItem value="B">B 级</SelectItem>
              <SelectItem value="C">C 级</SelectItem>
              <SelectItem value="D">D 级</SelectItem>
              <SelectItem value="E">E 级</SelectItem>
            </SelectContent>
          </Select>

          {/* 项目筛选 */}
          <Select value={projectFilter} onValueChange={(value) => setProjectFilter(value || 'all')}>
            <SelectTrigger className="w-[180px]">
              <Users className="h-4 w-4 mr-2" />
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
      {selectedCharacters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 mb-4 bg-muted rounded-lg"
        >
          <span className="text-sm">
            已选择 {selectedCharacters.length} 个角色
          </span>
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
        共 {filteredCharacters.length} 个角色
      </div>

      {/* 角色列表 */}
      {filteredCharacters.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCharacters.map((character, index) => (
            <motion.div
              key={character.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <CharacterCard
                character={character}
                selected={selectedCharacters.includes(character.id)}
                onSelect={() => toggleSelection(character.id)}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCharacters.map((character, index) => (
            <motion.div
              key={character.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <CharacterListItem
                character={character}
                selected={selectedCharacters.includes(character.id)}
                onSelect={() => toggleSelection(character.id)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

interface Character {
  id: string
  name: string
  role: string
  grade: string
  description: string
  projectId: string
  projectName: string
  avatar: string | null
  episodeCount: number
  updatedAt: string
}

function CharacterCard({
  character,
  selected,
  onSelect,
}: {
  character: Character
  selected: boolean
  onSelect: () => void
}) {
  const GradeIcon = gradeIcons[character.grade] || User

  return (
    <Card className={`group hover:shadow-lg transition-all duration-300 cursor-pointer ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            className="mt-1"
          />
          <Link href={`/projects/${character.projectId}/characters/${character.id}`} className="flex-1">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14">
                <AvatarImage src={character.avatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {character.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                  {character.name}
                </h3>
                <p className="text-sm text-muted-foreground">{character.role}</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Badge
            variant="outline"
            className={`flex items-center gap-1 ${gradeColors[character.grade]}`}
          >
            <GradeIcon className="h-3 w-3" />
            {character.grade} 级
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {character.description}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{character.projectName}</span>
          <span>{character.episodeCount} 集</span>
        </div>
      </CardContent>
    </Card>
  )
}

function CharacterListItem({
  character,
  selected,
  onSelect,
}: {
  character: Character
  selected: boolean
  onSelect: () => void
}) {
  const GradeIcon = gradeIcons[character.grade] || User

  return (
    <Card className={`group hover:shadow-md transition-all cursor-pointer ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Checkbox checked={selected} onCheckedChange={onSelect} />
          
          <Link
            href={`/projects/${character.projectId}/characters/${character.id}`}
            className="flex items-center gap-4 flex-1"
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={character.avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {character.name[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                  {character.name}
                </h3>
                <Badge
                  variant="outline"
                  className={`text-xs ${gradeColors[character.grade]}`}
                >
                  <GradeIcon className="h-3 w-3 mr-1" />
                  {character.grade}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {character.role} · {character.projectName}
              </p>
            </div>

            <div className="hidden md:block text-sm text-muted-foreground max-w-xs truncate">
              {character.description}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{character.episodeCount} 集</span>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
        <Users className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">暂无角色</h3>
      <p className="text-muted-foreground mb-6">开始创建你的第一个角色吧</p>
      <Button>
        <Plus className="h-5 w-5 mr-2" />
        创建角色
      </Button>
    </div>
  )
}
