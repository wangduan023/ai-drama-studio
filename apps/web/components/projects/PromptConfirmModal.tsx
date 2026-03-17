'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Wand2,
  Coins,
  AlertCircle,
  Info,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  User,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface PromptConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  prompt: string
  onUpdatePrompt?: (prompt: string) => void
  cost?: number
  count?: number
  parameters?: Record<string, string | number>
  negativePrompt?: string
  estimatedTime?: string
  loading?: boolean
  assets?: {
    scenes?: string[]
    characters?: string[]
    props?: string[]
  }
}

export function PromptConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  prompt,
  onUpdatePrompt,
  cost,
  count,
  parameters,
  negativePrompt,
  estimatedTime,
  loading,
  assets,
}: PromptConfirmModalProps) {
  const [editedPrompt, setEditedPrompt] = useState(prompt)

  if (!open) return null

  const handleConfirm = () => {
    if (onUpdatePrompt && editedPrompt !== prompt) {
      onUpdatePrompt(editedPrompt)
    }
    onConfirm()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 space-y-6">
          {/* 头部 */}
          <div className="text-center">
            <Wand2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>

          {/* 提示词编辑区 */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">AI 提示词</h3>
              {onUpdatePrompt && (
                <Badge variant="outline" className="text-xs">
                  可编辑
                </Badge>
              )}
            </div>
            {onUpdatePrompt ? (
              <textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="w-full h-32 p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            ) : (
              <div className="p-3 text-sm border rounded-md bg-muted/50">
                {prompt}
              </div>
            )}
          </section>

          {/* 参数列表 */}
          {parameters && Object.keys(parameters).length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">生成参数</h3>
              <Card>
                <CardContent className="p-4 space-y-2">
                  {Object.entries(parameters).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}

          {/* 负向提示词 */}
          {negativePrompt && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">负向提示词</h3>
              <div className="p-3 text-sm border rounded-md bg-muted/50">
                {negativePrompt}
              </div>
            </section>
          )}

          {/* 引用资产 */}
          {assets && (assets.scenes?.length || assets.characters?.length || assets.props?.length) && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">引用资产</h3>
              <div className="flex flex-wrap gap-2">
                {assets.scenes?.map((scene) => (
                  <Badge key={scene} variant="outline" className="text-xs">
                    <ImageIcon className="h-3 w-3 mr-1" />
                    场景：{scene}
                  </Badge>
                ))}
                {assets.characters?.map((char) => (
                  <Badge key={char} variant="outline" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    角色：{char}
                  </Badge>
                ))}
                {assets.props?.map((prop) => (
                  <Badge key={prop} variant="outline" className="text-xs">
                    <Package className="h-3 w-3 mr-1" />
                    道具：{prop}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* 费用和预计时长 */}
          {(cost !== undefined || count || estimatedTime) && (
            <Card className={cn(
              'border-primary/20',
              cost !== undefined && 'bg-primary/5'
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-primary" />
                    <span className="font-medium">
                      {count ? `总费用` : `预计消耗`}
                    </span>
                  </div>
                  <div className="text-right">
                    {cost !== undefined && (
                      <div className="font-bold text-primary">
                        🪙 {cost * (count || 1)}
                      </div>
                    )}
                    {count && (
                      <div className="text-xs text-muted-foreground">
                        {count} 个任务 × {cost}🪙/个
                      </div>
                    )}
                    {estimatedTime && (
                      <div className="text-xs text-muted-foreground mt-1">
                        预计时长：约 {estimatedTime}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 提示信息 */}
          <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p>任务提交后将在后台处理，您可以：</p>
              <ul className="list-disc list-inside ml-2">
                <li>在当前页面等待完成</li>
                <li>离开页面继续其他操作</li>
                <li>在站内信查看完成通知</li>
              </ul>
            </div>
          </div>

          {/* 警告提示（高费用时） */}
          {cost && cost > 100 && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                本次生成消耗积分较高，请确认已了解费用详情
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                确认生成
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
