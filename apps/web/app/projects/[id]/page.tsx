'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Film,
  Users,
  MapPin,
  Clock,
  Plus,
  Play,
  Settings,
  ChevronRight,
  Activity,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

// 模拟项目详情数据
const mockProject = {
  id: '1',
  title: '我的第一个短剧',
  description: '这是一个测试项目，用于学习平台功能',
  novel: '从前有一个年轻人，他梦想成为一名伟大的艺术家...',
  status: 'in_progress' as const,
  progress: 65,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  characters: [
    { id: '1', name: '张三', role: '主角', avatar: null, grade: 'S' },
    { id: '2', name: '李四', role: '配角', avatar: null, grade: 'A' },
    { id: '3', name: '王五', role: '反派', avatar: null, grade: 'B' },
  ],
  locations: [
    { id: '1', name: '城市广场', type: '室外', thumbnail: null },
    { id: '2', name: '咖啡厅', type: '室内', thumbnail: null },
    { id: '3', name: '公园', type: '室外', thumbnail: null },
  ],
  episodes: [
    { id: '1', title: '第一集：初遇', status: 'completed' as const, duration: 120, progress: 100 },
    { id: '2', title: '第二集：误会', status: 'in_progress' as const, duration: 0, progress: 60 },
    { id: '3', title: '第三集：和解', status: 'pending' as const, duration: 0, progress: 0 },
  ],
  activities: [
    { id: '1', type: 'generate', message: '第一集图像生成完成', time: '5分钟前' },
    { id: '2', type: 'edit', message: '修改了角色"张三"的设定', time: '1小时前' },
    { id: '3', type: 'create', message: '创建了新场景"咖啡厅"', time: '2小时前' },
    { id: '4', type: 'complete', message: '第一集制作完成', time: '3小时前' },
  ],
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project] = useState(mockProject)
  const [activeTab, setActiveTab] = useState('overview')

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">项目不存在</h2>
          <Button onClick={() => router.back()}>返回</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 返回按钮和标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Link href="/projects">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回项目列表
          </Button>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center">
              <Film className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{project.title}</h1>
              <p className="text-muted-foreground">{project.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/projects/${project.id}/episodes/${project.episodes[0]?.id}`}>
              <Button>
                <Play className="h-4 w-4 mr-2" />
                继续编辑
              </Button>
            </Link>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              设置
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        <StatCard icon={Film} label="剧集数" value={`${project.episodes.length}`} />
        <StatCard icon={Users} label="角色数" value={`${project.characters.length}`} />
        <StatCard icon={MapPin} label="场景数" value={`${project.locations.length}`} />
        <StatCard icon={Clock} label="最后更新" value={new Date(project.updatedAt).toLocaleDateString('zh-CN')} />
      </motion.div>

      {/* 主要内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="episodes">剧集</TabsTrigger>
          <TabsTrigger value="characters">角色</TabsTrigger>
          <TabsTrigger value="locations">场景</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 进度概览 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  项目进度
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">整体进度</span>
                      <span className="text-sm text-muted-foreground">{project.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {project.episodes.filter((e) => e.status === 'completed').length}
                      </div>
                      <div className="text-sm text-muted-foreground">已完成</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-secondary">
                        {project.episodes.filter((e) => e.status === 'in_progress').length}
                      </div>
                      <div className="text-sm text-muted-foreground">制作中</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-muted-foreground">
                        {project.episodes.filter((e) => e.status === 'pending').length}
                      </div>
                      <div className="text-sm text-muted-foreground">待制作</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 活动日志 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  活动日志
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {project.activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                        <div>
                          <p className="text-sm">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* 快捷入口 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-6">
                <Link href={`/projects/${project.id}/characters`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">角色库</h3>
                      <p className="text-sm text-muted-foreground">
                        管理 {project.characters.length} 个角色
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-6">
                <Link href={`/projects/${project.id}/locations`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">场景库</h3>
                      <p className="text-sm text-muted-foreground">
                        管理 {project.locations.length} 个场景
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="episodes" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">剧集列表</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              添加剧集
            </Button>
          </div>

          <div className="space-y-3">
            {project.episodes.map((episode, index) => (
              <Link key={episode.id} href={`/projects/${project.id}/episodes/${episode.id}`}>
                <Card className="hover:shadow-md transition-all group cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{episode.title}</h3>
                        <p className="text-muted-foreground text-sm">
                          {episode.duration > 0 ? `${episode.duration}秒` : '未生成'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">进度</span>
                            <span className="text-muted-foreground">{episode.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-500"
                              style={{ width: `${episode.progress}%` }}
                            />
                          </div>
                        </div>
                        <Badge
                          variant={
                            episode.status === 'completed'
                              ? 'default'
                              : episode.status === 'in_progress'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {episode.status === 'completed'
                            ? '已完成'
                            : episode.status === 'in_progress'
                            ? '制作中'
                            : '待制作'}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="characters" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">角色列表</h2>
            <Link href={`/projects/${project.id}/characters/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                添加角色
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.characters.map((character) => (
              <Link key={character.id} href={`/projects/${project.id}/characters/${character.id}`}>
                <Card className="hover:shadow-md transition-all group cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {character.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{character.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {character.grade}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">{character.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            <Link href={`/projects/${project.id}/characters/new`}>
              <Card className="border-dashed hover:border-primary transition-colors cursor-pointer min-h-[100px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Plus className="h-6 w-6" />
                  <span className="text-sm">添加角色</span>
                </div>
              </Card>
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">场景列表</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              添加场景
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.locations.map((location) => (
              <Card key={location.id} className="hover:shadow-md transition-all group cursor-pointer overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <MapPin className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold">{location.name}</h3>
                    <Badge variant="secondary" className="mt-2">
                      {location.type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="border-dashed hover:border-primary transition-colors cursor-pointer min-h-[200px] flex flex-col items-center justify-center">
              <Plus className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-muted-foreground">添加场景</span>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | number
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
