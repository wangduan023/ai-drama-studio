'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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
  RefreshCw,
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
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useCharacterList, useDeleteCharacter, type Character } from '@/hooks/useCharacter'
import { useProjectList } from '@/hooks/useProject'

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
  const searchParams = useSearchParams()
  const projectIdFromUrl = searchParams.get('project')
  
  const { data: characters = [], isLoading, error, refetch } = useCharacterList(projectIdFromUrl || undefined)
  const { data: projects = [] } = useProjectList()
  const deleteCharacter = useDeleteCharacter()
  
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('all')
  const [projectFilter, setProjectFilter] = useState<string>(projectIdFromUrl || 'all')
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([])

  // 当URL参数变化时更新筛选
  useEffect(() => {
    if (projectIdFromUrl) {
      setProjectFilter(projectIdFromUrl)
    }
  }, [projectIdFromUrl])

  // 筛选角色
  const filteredCharacters = useMemo(() => {
    let result = [...characters]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.introduction?.toLowerCase() || '').includes(query) ||
          (c.archetype?.toLowerCase() || '').includes(query)
      )
    }

    if (gradeFilter !== 'all') {
      result = result.filter((c) => c.roleLevel === gradeFilter)
    }

    if (projectFilter !== 'all') {
      result = result.filter((c) => c.projectId === projectFilter)
    }

    return result
  }, [characters, searchQuery, gradeFilter, projectFilter])

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

  const handleDeleteCharacter = async (id: string, name: string, projectId: string) => {
    try {
      await deleteCharacter.mutateAsync({ projectId, characterId: id })
      toast.success(`角色 "${name}" 已删除`)
    } catch {
      toast.error('删除角色失败')
    }
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">角色库</h1>
            <p className="text-muted-foreground">管理所有项目中的角色</p>
          </div>
        </div>
        <CharacterListSkeleton viewMode={viewMode} />
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">角色库</h1>
            <p className="text-muted-foreground">管理所有项目中的角色</p>
          </div>
        </div>
        <ErrorState 
          message={error instanceof Error ? error.message : '加载角色失败'} 
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
          <h1 className="text-3xl font-bold mb-2">角色库</h1>
          <p className="text-muted-foreground">管理所有项目中的角色</p>
        </div>
        <Button data-testid="create-character-button">
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
              data-testid="character-card"
            >
              <CharacterCard
                character={character}
                selected={selectedCharacters.includes(character.id)}
                onSelect={() => toggleSelection(character.id)}
                onDelete={() => handleDeleteCharacter(character.id, character.name, character.projectId)}
                isDeleting={deleteCharacter.isPending}
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
                onDelete={() => handleDeleteCharacter(character.id, character.name, character.projectId)}
                isDeleting={deleteCharacter.isPending}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

interface CharacterCardProps {
  character: Character
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  isDeleting: boolean
}

function CharacterCard({ character, selected, onSelect, onDelete, isDeleting }: CharacterCardProps) {
  const grade = character.roleLevel || 'E'
  const GradeIcon = gradeIcons[grade] || User

  return (
    <Card className={`group hover:shadow-lg transition-all duration-300 cursor-pointer ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4 relative">
        <div className="flex items-start gap-3 mb-4">
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            className="mt-1"
          />
          <Link href={`/projects/${character.projectId}/characters/${character.id}`} className="flex-1">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14">
                <AvatarImage src={character.primaryIdentifier || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {character.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate group-hover:text-primary transition-colors" data-testid="character-name">
                  {character.name}
                </h3>
                <p className="text-sm text-muted-foreground">{character.archetype || '未知角色'}</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Badge
            variant="outline"
            className={`flex items-center gap-1 ${gradeColors[grade]}`}
          >
            <GradeIcon className="h-3 w-3" />
            {grade} 级
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {character.introduction || '暂无描述'}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>项目: {character.projectId.slice(0, 8)}...</span>
          <span>{character.appearanceCount || 0} 次出场</span>
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} >
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem >
                <Link href={`/projects/${character.projectId}/characters/${character.id}`}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
                data-testid="delete-character-button"
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

interface CharacterListItemProps {
  character: Character
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  isDeleting: boolean
}

function CharacterListItem({ character, selected, onSelect, onDelete, isDeleting }: CharacterListItemProps) {
  const grade = character.roleLevel || 'E'
  const GradeIcon = gradeIcons[grade] || User

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
              <AvatarImage src={character.primaryIdentifier || undefined} />
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
                  className={`text-xs ${gradeColors[grade]}`}
                >
                  <GradeIcon className="h-3 w-3 mr-1" />
                  {grade}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {character.archetype || '未知角色'} · 项目: {character.projectId.slice(0, 8)}...
              </p>
            </div>

            <div className="hidden md:block text-sm text-muted-foreground max-w-xs truncate">
              {character.introduction || '暂无描述'}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{character.appearanceCount || 0} 次出场</span>
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
                <Link href={`/projects/${character.projectId}/characters/${character.id}`}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
                data-testid="delete-character-button"
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

function CharacterListSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-24 mb-2" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
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
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
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
