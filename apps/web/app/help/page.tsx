'use client'

import { motion } from 'framer-motion'
import {
  Book,
  Video,
  MessageCircle,
  Mail,
  HelpCircle,
  FileText,
  Play,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqs = [
  {
    question: '如何开始创建第一个项目？',
    answer: '点击首页或项目列表页面的"创建项目"按钮，按照向导填写项目信息、上传剧本或粘贴剧本内容，然后点击创建即可。',
  },
  {
    question: '支持哪些剧本格式？',
    answer: '目前支持 TXT、Word (DOC/DOCX) 和 PDF 格式的剧本文件。你也可以直接在编辑器中粘贴剧本内容。',
  },
  {
    question: '生成一个视频需要多长时间？',
    answer: '生成时间取决于视频长度和选中的生成阶段。一般来说，1分钟的视频大约需要 5-15 分钟完成全部生成流程。',
  },
  {
    question: '如何确保角色外观一致性？',
    answer: '在角色管理页面，为每个角色添加详细的外观描述，并设置合适的角色等级。系统会自动进行一致性验证。',
  },
  {
    question: '生成的视频可以商用吗？',
    answer: '取决于你使用的 AI 模型的许可协议。请在设置中查看各模型的使用条款。',
  },
  {
    question: '如何导出最终视频？',
    answer: '在剧集详情页的"素材"标签下，点击"导出全部"按钮即可下载生成的视频文件。',
  },
]

const guides = [
  {
    title: '快速入门指南',
    description: '了解平台的基本使用方法',
    icon: Book,
    link: '#',
  },
  {
    title: '视频教程',
    description: '观看详细的操作演示',
    icon: Video,
    link: '#',
  },
  {
    title: '剧本写作规范',
    description: '学习如何编写适合 AI 处理的剧本',
    icon: FileText,
    link: '#',
  },
]

export default function HelpPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl font-bold mb-2">帮助中心</h1>
        <p className="text-muted-foreground">找到你需要的帮助和文档</p>
      </motion.div>

      {/* 指南卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
      >
        {guides.map((guide) => (
          <Card key={guide.title} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <guide.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{guide.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{guide.description}</p>
              <Button variant="ghost" size="sm" className="p-0 h-auto">
                查看详情 <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* FAQ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          常见问题
        </h2>
        <Card>
          <CardContent className="p-6">
            <Accordion className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </motion.div>

      {/* 联系支持 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-12"
      >
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold mb-1">还有其他问题？</h3>
                <p className="text-sm text-muted-foreground">
                  联系我们的支持团队获取帮助
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  在线客服
                </Button>
                <Button>
                  <Mail className="h-4 w-4 mr-2" />
                  发送邮件
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
