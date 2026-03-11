'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Film,
  Users,
  MapPin,
  Play,
  Sparkles,
  FileText,
  Grid,
  List,
  Wand2,
  Download,
  Clock,
  Image as ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { StoryboardEditor } from '@/components/storyboard/StoryboardEditor'
import { GenerationControl } from '@/components/generation/GenerationControl'

// 模拟剧集数据
const mockEpisode = {
  id: '1',
  projectId: '1',
  title: '第一集：初遇',
  description: '两个主角在城市广场相遇的场景',
  status: 'in_progress' as const,
  script: `
场景一：城市广场 - 白天

张三站在广场中央，看着周围熙熙攘攘的人群。

张三：（独白）这就是大城市吗？真是热闹啊。

突然，李四不小心撞到了张三。

李四：啊，对不起！我没注意到你。

张三：没关系，是我站得太中间了。

李四：（微笑）你是第一次来这里吗？

张三：是的，刚来不久。

李四：那我带你逛逛吧，这里我很熟。

张三：（犹豫）这...不太好吧？

李四：没关系，就当是赔礼道歉了。

两人相视一笑，一起走向人群。

淡出。
  `,
  storyboards: [
    {
      id: '1',
      sceneNumber: 1,
      shotNumber: 1,
      description: '广角镜头，张三站在广场中央',
      location: '城市广场',
      camera: '广角',
      movement: '静止',
      duration: 3,
      imageUrl: null,
      videoUrl: null,
      status: 'completed' as const,
    },
    {
      id: '2',
      sceneNumber: 1,
      shotNumber: 2,
      description: '特写，张三的表情',
      location: '城市广场',
      camera: '特写',
      movement: '推近',
      duration: 2,
      imageUrl: null,
      videoUrl: null,
      status: 'completed' as const,
    },
    {
      id: '3',
      sceneNumber: 2,
      shotNumber: 1,
      description: '李四撞到张三的瞬间',
      location: '城市广场',
      camera: '中景',
      movement: '跟随',
      duration: 2,
      imageUrl: null,
      videoUrl: null,
      status: 'pending' as const,
    },
  ],
  characters: [
    { id: '1', name: '张三', role: '主角' },
    { id: '2', name: '李四', role: '主角' },
  ],
  locations: [
    { id: '1', name: '城市广场', type: '室外' },
  ],
}

export default function EpisodeDetailPage() {
  const params = useParams()
  const [episode] = useState(mockEpisode)
  const [script, setScript] = useState(episode.script)
  const [activeTab, setActiveTab] = useState('script')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 返回按钮和标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Link href={`/projects/${params.id}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回项目
          </Button>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{episode.title}</h1>
            <p className="text-muted-foreground">{episode.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Play className="h-4 w-4 mr-2" />
              预览
            </Button>
            <Button>
              <Wand2 className="h-4 w-4 mr-2" />
              开始生成
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 状态栏 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg"
      >
        <Badge variant="secondary">制作中</Badge>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{episode.storyboards.reduce((acc, s) => acc + s.duration, 0)}秒</span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          <span>{episode.storyboards.length} 个分镜</span>
        </div>
      </motion.div>

      {/* 主要内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="script" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            剧本
          </TabsTrigger>
          <TabsTrigger value="storyboard" className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            分镜
          </TabsTrigger>
          <TabsTrigger value="characters" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            角色
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Film className="h-4 w-4" />
            素材
          </TabsTrigger>
          <TabsTrigger value="generation" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            生成
          </TabsTrigger>
        </TabsList>

        <TabsContent value="script" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                剧本编辑
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Wand2 className="h-4 w-4 mr-2" />
                  AI 解析
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  导出
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="min-h-[500px] font-mono text-sm leading-relaxed"
                placeholder="在此输入或粘贴剧本内容..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storyboard" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">分镜列表</h2>
            <div className="flex items-center gap-2">
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
              <Button>
                <Sparkles className="h-4 w-4 mr-2" />
                生成分镜
              </Button>
            </div>
          </div>

          <StoryboardEditor
            storyboards={episode.storyboards}
            viewMode={viewMode}
            onEdit={(id) => console.log('Edit', id)}
            onGenerateImage={(id) => console.log('Generate image', id)}
            onGenerateVideo={(id) => console.log('Generate video', id)}
          />
        </TabsContent>

        <TabsContent value="characters" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">关联角色</h2>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              管理角色
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {episode.characters.map((character) => (
              <Card key={character.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{character.name}</h3>
                      <Badge variant="secondary" className="mt-1">
                        {character.role}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">媒体素材</h2>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              导出全部
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {episode.storyboards
              .filter((s) => s.imageUrl || s.videoUrl)
              .map((storyboard) => (
                <Card key={storyboard.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    {storyboard.imageUrl ? (
                      <img
                        src={storyboard.imageUrl}
                        alt={`分镜 ${storyboard.sceneNumber}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Film className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium">场景 {storyboard.sceneNumber}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {storyboard.description}
                    </p>
                  </CardContent>
                </Card>
              ))}

            {episode.storyboards.filter((s) => s.imageUrl || s.videoUrl).length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无素材</p>
                <p className="text-sm">生成分镜后将在此处显示</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="generation" className="space-y-4">
          <GenerationControl
            projectId={episode.projectId}
            episodeId={episode.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
