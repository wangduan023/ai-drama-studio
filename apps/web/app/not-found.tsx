import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold">页面未找到</h2>
      <p className="text-center text-muted-foreground max-w-md">
        抱歉，您访问的页面不存在或已被移除
      </p>
      <Button asChild>
        <Link href="/">返回首页</Link>
      </Button>
    </div>
  )
}
